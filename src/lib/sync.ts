import { supabase } from './supabase'
import { clearKeys, hydrate, onWrite, readStored } from './storage'

// key ที่เก็บขึ้น Supabase (ตาราง user_data: 1 แถวต่อ user ต่อ key)
// 'tab' ไม่ sync — เป็นแค่สถานะหน้าจอของเครื่องนั้น
export const SYNCED_KEYS = ['profile', 'mode', 'week', 'done', 'sessions', 'runs', 'log'] as const

// เจ้าของข้อมูลใน localStorage — กันข้อมูลคนหนึ่งไหลไปบัญชีอื่นบนเครื่องเดียวกัน
const OWNER_KEY = 'owner'

const pending = new Map<string, unknown>()
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

async function flush() {
  if (!userId || pending.size === 0) return
  const rows = [...pending].map(([key, value]) => ({ user_id: userId!, key, value, updated_at: new Date().toISOString() }))
  pending.clear()
  setStatus('saving')
  const { error } = await supabase.from('user_data').upsert(rows)
  if (error) {
    // เก็บกลับเข้าคิว (ค่าที่ใหม่กว่าที่เข้ามาระหว่างนี้ชนะ)
    for (const r of rows) if (!pending.has(r.key)) pending.set(r.key, r.value)
    setStatus('offline')
    return
  }
  setStatus(pending.size ? 'saving' : 'idle')
}

const scheduleFlush = () => {
  clearTimeout(flushTimer)
  flushTimer = setTimeout(flush, 800)
}

onWrite((key, value) => {
  if (!userId || !(SYNCED_KEYS as readonly string[]).includes(key)) return
  pending.set(key, value)
  scheduleFlush()
})

// ดึงข้อมูลจาก server มาแทนของในเครื่อง (server เป็นตัวจริง)
// ยกเว้นครั้งแรกที่เครื่องนี้ยังไม่มีเจ้าของ: รวมข้อมูลเดิมในเครื่องขึ้นไปด้วย
async function pull(migrate: boolean) {
  const { data, error } = await supabase.from('user_data').select('key, value')
  if (error) throw error
  const remote = new Map(data.map(r => [r.key as string, r.value as unknown]))

  for (const key of SYNCED_KEYS) {
    const local = readStored(key)
    const server = remote.get(key)
    if (migrate && local !== undefined) {
      const merged = server === undefined ? local : mergeValues(key, local, server)
      hydrate(key, merged)
      pending.set(key, merged)
    } else if (server !== undefined) {
      hydrate(key, server)
    } else if (local !== undefined) {
      pending.set(key, local)
    }
  }
  await flush()
}

type WithId = { id?: string; date?: string }

function mergeValues(key: string, local: unknown, server: unknown): unknown {
  if (Array.isArray(local) && Array.isArray(server)) {
    // sessions/runs ใช้ id, log น้ำหนักใช้ date
    const idOf = (x: WithId) => (key === 'log' ? x.date : x.id) ?? JSON.stringify(x)
    const byId = new Map<string, WithId>()
    for (const x of [...server, ...local] as WithId[]) byId.set(idOf(x), x)
    return [...byId.values()].sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''))
  }
  if (key === 'done' && local && server && typeof local === 'object' && typeof server === 'object') {
    return { ...(server as object), ...(local as object) }
  }
  return server
}

export async function startSync(uid: string) {
  const owner = readStored(OWNER_KEY)
  if (owner && owner !== uid) clearKeys([...SYNCED_KEYS])
  userId = uid
  await pull(!owner)
  hydrate(OWNER_KEY, uid)
}

export async function refresh() {
  if (!userId) return
  await flush()
  if (pending.size === 0) await pull(false)
}

// คืน false ถ้ายังมีข้อมูลค้างที่ส่งขึ้น server ไม่ได้ (เช่น ออฟไลน์) และไม่ได้สั่ง force
export async function stopSync(force = false) {
  await flush()
  if (pending.size && !force) return false
  userId = null
  pending.clear()
  clearKeys([...SYNCED_KEYS, OWNER_KEY])
  return true
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => void flush())
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') void flush()
    else void refresh().catch(() => setStatus('offline'))
  })
}
