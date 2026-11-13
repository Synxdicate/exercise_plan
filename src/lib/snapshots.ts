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

/** เอารายการที่หายกลับมา (เขียนแบบผู้ใช้แก้ จึงซิงก์ขึ้น server ด้วย) คืนจำนวนที่เพิ่ม */
export function recover(snap: Data) {
  const cur = current()
  const m = missingItems(cur, snap)
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
