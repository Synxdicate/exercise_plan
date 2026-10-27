import { supabase } from './supabase'
import { clearKeys, hydrate, onWrite, readStored } from './storage'
import { mergeValues } from './merge'
import { syncPhotos } from './photos'
import { sendErrors } from './errors'

// key ที่เก็บขึ้น Supabase (ตาราง user_data: 1 แถวต่อ user ต่อ key)
// 'tab', 'activeRun', 'activeWorkout' ไม่ sync — เป็นสถานะของเครื่องนั้น
export const SYNCED_KEYS = [
  'profile', 'mode', 'week', 'done', 'sessions', 'runs', 'log', 'program', 'raceDate', 'dayLocation',
  'onboarded', 'readiness', 'foodLog', 'screening', 'shoes', 'exerciseSwaps', 'extraExercises', 'goals', 'badgesSeen', 'photos', 'mealSets', 'raceChecklist', 'cross', 'soloMode', 'legTests',
] as const

// เจ้าของข้อมูลใน localStorage — กันข้อมูลคนหนึ่งไหลไปบัญชีอื่นบนเครื่องเดียวกัน
const OWNER_KEY = 'owner'
// key ที่แก้แล้วยังไม่ได้ส่งขึ้น server — เก็บถาวรไว้ ปิดแอปตอนออฟไลน์แล้วเปิดใหม่ก็ยังส่งต่อได้
const PENDING_KEY = 'pendingKeys'

const pending = new Set<string>((readStored(PENDING_KEY) as string[] | undefined) ?? [])
const savePending = () => hydrate(PENDING_KEY, [...pending])

let userId: string | null = null
let flushTimer: ReturnType<typeof setTimeout> | undefined
let status: 'idle' | 'saving' | 'offline' = 'idle'
const statusListeners = new Set<() => void>()

const setStatus = (s: typeof status) => {
  status = s
  statusListeners.forEach(l => l())
}
export const getSyncStatus = () => status
export const subscribeSyncStatus = (l: () => void) => {
  statusListeners.add(l)
  return () => void statusListeners.delete(l)
}

// ส่งทีละรอบ — ถ้ามีรอบที่กำลังส่งอยู่ ให้รอรอบนั้นก่อน (กัน pull ไปทับค่าที่ยังส่งไม่เสร็จ)
let inFlight: Promise<void> | null = null
function flush(): Promise<void> {
  if (inFlight) return inFlight.then(() => flush())
  inFlight = doFlush().finally(() => { inFlight = null })
  return inFlight
}

async function doFlush() {
  if (!userId || pending.size === 0) return
  // key ที่ไม่มีค่าแล้วไม่ต้องส่ง; ค่า null (เช่น ลบวันแข่ง) = ลบแถวบน server
  // เพราะคอลัมน์ value เป็น NOT NULL — ส่ง null ไปจะทำให้ทั้งรอบล้มเหลวและค้าง "ยังไม่ได้ซิงก์"
  for (const k of [...pending]) if (readStored(k) === undefined) pending.delete(k)
  const keys = [...pending]
  if (!keys.length) return savePending()
  const cleared = keys.filter(k => readStored(k) === null)
  const rows = keys.filter(k => readStored(k) !== null).map(key => ({ user_id: userId!, key, value: readStored(key), updated_at: new Date().toISOString() }))
  setStatus('saving')
  const [up, del] = await Promise.all([
    rows.length ? supabase.from('user_data').upsert(rows) : { error: null },
    cleared.length ? supabase.from('user_data').delete().eq('user_id', userId).in('key', cleared) : { error: null },
  ])
  if (up.error || del.error) {
    setStatus('offline')
    return
  }
  // ลบเฉพาะ key ที่ค่าไม่ได้เปลี่ยนระหว่างส่ง
  rows.forEach(r => readStored(r.key) === r.value && pending.delete(r.key))
  cleared.forEach(k => readStored(k) === null && pending.delete(k))
  savePending()
  setStatus(pending.size ? 'saving' : 'idle')
}

const scheduleFlush = () => {
  clearTimeout(flushTimer)
  flushTimer = setTimeout(flush, 800)
}

const markDirty = (key: string) => {
  pending.add(key)
  savePending()
}

onWrite(key => {
  if (!userId || !(SYNCED_KEYS as readonly string[]).includes(key)) return
  markDirty(key)
  scheduleFlush()
})

// ดึงข้อมูลจาก server มาแทนของในเครื่อง (server เป็นตัวจริง) — ยกเว้น key ที่ยังส่งไม่สำเร็จ
// และครั้งแรกที่เครื่องนี้ยังไม่มีเจ้าของ: รวมข้อมูลเดิมในเครื่องขึ้นไปด้วย
async function pull(migrate: boolean) {
  const { data, error } = await supabase.from('user_data').select('key, value')
  if (error) throw error
  const remote = new Map(data.map(r => [r.key as string, r.value as unknown]))

  for (const key of SYNCED_KEYS) {
    if (pending.has(key)) continue
    const local = readStored(key)
    const server = remote.get(key)
    if (migrate && local !== undefined) {
      hydrate(key, server === undefined ? local : mergeValues(key, local, server))
      markDirty(key)
    } else if (server !== undefined && server !== null) {
      hydrate(key, server)
    } else if (local !== undefined && local !== null) {
      markDirty(key)
    }
  }
  await flush()
}

export async function startSync(uid: string) {
  const owner = readStored(OWNER_KEY)
  if (owner && owner !== uid) {
    clearKeys([...SYNCED_KEYS])
    pending.clear()
    savePending()
  }
  userId = uid
  // เครื่องนี้มีข้อมูลของคนนี้อยู่แล้ว → เปิดแอปทันทีจากข้อมูลในเครื่อง แล้วซิงก์เบื้องหลัง
  // (ไม่มีเน็ต/เน็ตช้าก็ใช้งานได้ ข้อมูลที่ยังส่งไม่ได้อยู่ใน pendingKeys และส่งเมื่อกลับมาออนไลน์)
  // pull ข้าม key ที่ค้างส่ง จึงไม่ทับสิ่งที่ผู้ใช้แก้ระหว่างรอ
  if (owner === uid) {
    void refresh().catch(() => setStatus('offline'))
    return
  }
  await flush()
  await pull(!owner)
  hydrate(OWNER_KEY, uid)
  void syncPhotos().catch(() => {})
  void sendErrors()
}

export async function refresh() {
  if (!userId) return
  await flush()
  if (pending.size === 0) await pull(false)
  void syncPhotos().catch(() => {})
  void sendErrors()
}

// คืน false ถ้ายังมีข้อมูลค้างที่ส่งขึ้น server ไม่ได้ (เช่น ออฟไลน์) และไม่ได้สั่ง force
export async function stopSync(force = false) {
  await flush()
  if (pending.size && !force) return false
  userId = null
  pending.clear()
  clearKeys([...SYNCED_KEYS, OWNER_KEY, PENDING_KEY])
  return true
}

// ---------- backup ----------

export function exportData() {
  return { app: 'exercise-plan', version: 1, exportedAt: new Date().toISOString(), data: Object.fromEntries(SYNCED_KEYS.map(k => [k, readStored(k) ?? null])) }
}

export function importData(json: unknown) {
  const d = (json as { app?: string; data?: Record<string, unknown> })
  if (d?.app !== 'exercise-plan' || !d.data) throw new Error('ไม่ใช่ไฟล์ backup ของ Kao')
  for (const key of SYNCED_KEYS) {
    if (d.data[key] === undefined || d.data[key] === null) continue
    hydrate(key, d.data[key])
    markDirty(key)
  }
  void flush()
}

// state ของโมดูลนี้ (userId, คิว) หายถ้า Vite HMR โหลดแค่ไฟล์นี้ใหม่ → ให้รีโหลดทั้งหน้าแทน
if (import.meta.hot) import.meta.hot.accept(() => window.location.reload())

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => void refresh().catch(() => setStatus('offline')))
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') void flush()
    else void refresh().catch(() => setStatus('offline'))
  })
}
