import * as idb from './idb'
import { exportData } from './sync'
import { readStored, setStored } from './storage'
import { today } from './date'
import type { Run, Session, RouteData } from './log'

// สำรองอัตโนมัติในเครื่อง วันละครั้ง เก็บ 7 วันล่าสุด (store 'blobs' key 'snap:YYYY-MM-DD' ถูกล้างพร้อมรูปตอนออกจากระบบ)
// กันข้อมูลหายจากบั๊กซิงก์หรือกดลบพลาด: เอารอบวิ่ง/เวท/น้ำหนักที่ไม่มีในตอนนี้กลับมาได้ โดยไม่ทับข้อมูลอื่น
const PREFIX = 'snap:'
export const KEEP_DAYS = 7

type Data = Record<string, unknown>
export type Snapshot = { date: string; data: Data }
type Entry = { date: string; weight: number; waist?: number }

export async function takeSnapshot(day = today()) {
  const all = (await idb.keys('blobs')).filter(k => k.startsWith(PREFIX)).sort()
  if (all.includes(PREFIX + day)) return false
  const data = exportData().data
  if (!(data.runs as unknown[] | null)?.length && !(data.sessions as unknown[] | null)?.length) return false
  await idb.put('blobs', PREFIX + day, data)
  for (const k of [...all, PREFIX + day].sort().slice(0, -KEEP_DAYS)) await idb.del('blobs', k)
  return true
}

export async function listSnapshots(): Promise<Snapshot[]> {
  const ks = (await idb.keys('blobs')).filter(k => k.startsWith(PREFIX)).sort().reverse()
  const out: Snapshot[] = []
  for (const k of ks) {
    const data = await idb.get<Data>('blobs', k)
    if (data) out.push({ date: k.slice(PREFIX.length), data })
  }
  return out
}

/** รายการในสำรองที่ไม่มีในข้อมูลตอนนี้ (pure, tested) */
export function missingItems(cur: { runs: Run[]; sessions: Session[]; log: Entry[] }, snap: Data) {
  const has = <T,>(xs: T[], f: (x: T) => string) => new Set(xs.map(f))
  const runIds = has(cur.runs, r => r.id), sessIds = has(cur.sessions, s => s.id), logDates = has(cur.log, e => e.date)
  return {
    runs: ((snap.runs as Run[] | null) ?? []).filter(r => !runIds.has(r.id)),
    sessions: ((snap.sessions as Session[] | null) ?? []).filter(s => !sessIds.has(s.id)),
    log: ((snap.log as Entry[] | null) ?? []).filter(e => !logDates.has(e.date)),
  }
}

const current = () => ({
  runs: (readStored('runs') as Run[] | undefined) ?? [],
  sessions: (readStored('sessions') as Session[] | undefined) ?? [],
  log: (readStored('log') as Entry[] | undefined) ?? [],
})
export const missingNow = (snap: Data) => missingItems(current(), snap)

// รายการที่ผู้ใช้ลบเอง (ค่าของเครื่อง) การ์ดหน้าหลักไม่ทวงคืน: id รอบวิ่ง/การฝึก หรือ `log:วันที่` ของน้ำหนัก
export const IGNORE_KEY = 'lostIgnored'
const logKey = (e: Entry) => `log:${e.date}`
export const ignoredNow = () => new Set((readStored(IGNORE_KEY) as string[] | undefined) ?? [])
/** จำว่าลบเอง (เรียกตอนผู้ใช้ลบ และตอนกด "ลบเองตั้งใจ" บนการ์ด) */
export function markDeleted(ids: string[]) {
  if (!ids.length) return
  setStored(IGNORE_KEY, [...new Set([...ignoredNow(), ...ids])].slice(-300))
}
export const markLogDeleted = (date: string) => markDeleted([`log:${date}`])

/** รายการที่มีในสำเนาวันใดวันหนึ่งแต่ตอนนี้ไม่มี ยกเว้นที่ลบเอง (รวมทุกสำเนา ไม่ซ้ำ) (pure, tested) */
export function lostItems(cur: { runs: Run[]; sessions: Session[]; log: Entry[] }, snaps: Data[], ignore: Set<string>) {
  const runs = new Map<string, Run>(), sessions = new Map<string, Session>(), log = new Map<string, Entry>()
  for (const s of snaps) {
    const m = missingItems(cur, s)
    for (const r of m.runs) if (!ignore.has(r.id) && !runs.has(r.id)) runs.set(r.id, r)
    for (const x of m.sessions) if (!ignore.has(x.id) && !sessions.has(x.id)) sessions.set(x.id, x)
    for (const e of m.log) if (!ignore.has(logKey(e)) && !log.has(logKey(e))) log.set(logKey(e), e)
  }
  return { runs: [...runs.values()], sessions: [...sessions.values()], log: [...log.values()] }
}
export const lostNow = (snaps: Data[]) => lostItems(current(), snaps, ignoredNow())
/** keys ของรายการ (ใช้กับ markDeleted) */
export const lostKeys = (m: ReturnType<typeof lostItems>) => [...m.runs.map(r => r.id), ...m.sessions.map(s => s.id), ...m.log.map(logKey)]

/** เอารายการที่หายกลับมา (เขียนแบบผู้ใช้แก้ จึงซิงก์ขึ้น server ด้วย) คืนจำนวนที่เพิ่ม `skip` = ไม่เอารายการที่ลบเอง */
export function recover(snap: Data, skip: Set<string> = new Set()) {
  const cur = current()
  const all = missingItems(cur, snap)
  const m = { runs: all.runs.filter(r => !skip.has(r.id)), sessions: all.sessions.filter(s => !skip.has(s.id)), log: all.log.filter(e => !skip.has(logKey(e))) }
  const byDate = <T extends { date: string }>(xs: T[]) => xs.sort((a, b) => a.date.localeCompare(b.date))
  if (m.runs.length) {
    const routes = (readStored('routes') as Record<string, RouteData> | undefined) ?? {}
    const snapRoutes = (snap.routes as Record<string, RouteData> | null) ?? {}
    const add = Object.fromEntries(m.runs.filter(r => snapRoutes[r.id] && !routes[r.id]).map(r => [r.id, snapRoutes[r.id]]))
    if (Object.keys(add).length) setStored('routes', { ...routes, ...add })
    setStored('runs', byDate([...cur.runs, ...m.runs]))
  }
  if (m.sessions.length) setStored('sessions', byDate([...cur.sessions, ...m.sessions]))
  if (m.log.length) setStored('log', byDate([...cur.log, ...m.log]))
  return m.runs.length + m.sessions.length + m.log.length
}
