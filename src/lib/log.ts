import type { Point } from './gps'
import { useCallback, useEffect, useMemo } from 'react'
import { readStored, usePersisted } from './storage'
import { isCompact, roundPoint } from './geo'

export type Run = {
  id: string
  date: string
  km: number
  seconds: number
  kind: 'easy' | 'tempo' | 'interval' | 'long' | 'race' | 'other' | 'walk'
  source: 'gps' | 'manual' | 'gpx'
  route?: Point[]
  times?: number[] // เวลาเคลื่อนที่สะสมของแต่ละจุดใน route
  rpe?: number // ความเหนื่อย 1–10 หลังวิ่ง (session-RPE)
  splits?: number[] // วินาทีต่อกม.
  elapsedSeconds?: number // รวมเวลาพัก
  gapSeconds?: number // ช่วงที่จอปิด GPS ไม่ได้บันทึก
  shoeId?: string
  startedAt?: number // เวลาเริ่ม (ms) — ใช้ส่งออก GPX
  guide?: { work: number; total: number; finished: boolean } // ทำชุดซ้อม (เสียงนำ) ได้กี่ช่วงหลัก
}

export type SetEntry = { kg: number; reps: number }

export type Session = {
  id: string
  date: string
  mode: 'gym' | 'park' | 'home'
  dayKey: string
  title: string
  entries: { name: string; sets: SetEntry[] }[]
  rpe?: number // ความเหนื่อย 1–10 หลังฝึก
  minutes?: number
}

// เส้นทาง (route/times) เก็บแยกใน key 'routes' (id → เส้นทาง) — แก้ข้อมูลรอบวิ่ง (RPE ชนิด รองเท้า)
// จะได้ไม่ต้องส่งเส้นทางทุกรอบขึ้น server ใหม่ทั้งก้อน · useRuns() รวมให้เหมือนเดิม คอมโพเนนต์ไม่ต้องรู้
export type RouteData = { route: Point[]; times?: number[] }
type Routes = Record<string, RouteData>

/** รวมรอบวิ่งกับเส้นทาง (เส้นทางที่ยังค้างอยู่ใน runs จากแอปเวอร์ชันเก่ามาก่อน) */
export function joinRuns(runs: Run[], routes: Routes): Run[] {
  return runs.map(r => (r.route || !routes[r.id] ? r : { ...r, ...routes[r.id] }))
}

/** แยกกลับ: runs ไม่มีเส้นทาง + routes ใหม่ (คงวัตถุเดิมถ้าไม่เปลี่ยน, ลบของรอบที่ถูกลบ) */
export function splitRuns(next: Run[], prev: Routes): { runs: Run[]; routes: Routes; changed: boolean } {
  const routes: Routes = {}
  let changed = false
  const runs = next.map(r => {
    if (!r.route) {
      if (prev[r.id]) routes[r.id] = prev[r.id] // ไม่มีเส้นทางมากับรอบนี้ = ไม่ได้แก้ เก็บของเดิมไว้
      return r
    }
    const { route, times, ...rest } = r
    const old = prev[r.id]
    if (old && old.route === route && old.times === times) routes[r.id] = old
    else { routes[r.id] = times ? { route, times } : { route }; changed = true }
    return rest
  })
  if (Object.keys(prev).some(id => !routes[id])) changed = true
  return { runs, routes, changed }
}

const useRawRuns = () => usePersisted<Run[]>('runs', [])
const useRoutes = () => usePersisted<Routes>('routes', {})
const stored = () => ({ runs: (readStored('runs') as Run[] | undefined) ?? [], routes: (readStored('routes') as Routes | undefined) ?? {} })

export function useRuns() {
  const [raw, setRaw] = useRawRuns()
  const [routes, setRoutes] = useRoutes()
  const runs = useMemo(() => joinRuns(raw, routes), [raw, routes])
  const set = useCallback((next: Run[] | ((prev: Run[]) => Run[])) => {
    const cur = stored()
    const value = typeof next === 'function' ? next(joinRuns(cur.runs, cur.routes)) : next
    const s = splitRuns(value, cur.routes)
    if (s.changed) setRoutes(s.routes) // เส้นทางก่อน — ตอน runs เปลี่ยนจะได้รวมเจอเส้นทางแล้ว
    setRaw(s.runs)
  }, [setRaw, setRoutes])
  return [runs, set] as const
}

/** เรียกครั้งเดียวที่ราก: ย้ายเส้นทางที่ยังอยู่ใน runs (ข้อมูลเก่า/อุปกรณ์ที่ยังใช้เวอร์ชันเก่า) ไป routes
 *  และย่อพิกัดเต็มทศนิยม (ก่อน v1.4) ให้เหลือ 5 ตำแหน่ง */
export function useCompactRuns() {
  const [raw] = useRawRuns()
  const [, setRuns] = useRuns()
  useEffect(() => {
    if (!raw.some(r => r.route)) return
    setRuns(prev => prev.map(r => (r.route && !isCompact(r.route) ? { ...r, route: r.route.map(roundPoint) } : r)))
  }, [raw, setRuns])
}
export const useSessions = () => usePersisted<Session[]>('sessions', [])

// คาร์ดิโอทดแทนการวิ่ง (แรงกระแทกน้อย): ได้ระบบหายใจ-หัวใจโดยไม่กระแทกข้อ — ใช้เพิ่มปริมาณแอโรบิกหรือช่วงบาดเจ็บ
// (Eyestone 1993: วิ่งในน้ำ/ปั่นจักรยาน 6 สัปดาห์รักษา VO2max และเวลาวิ่ง 2 ไมล์ได้เท่าการวิ่ง)
export type CrossKind = 'bike' | 'aquajog' | 'swim' | 'elliptical' | 'other'
export type CrossSession = { id: string; date: string; kind: CrossKind; minutes: number; rpe?: number }
export const crossKinds: Record<CrossKind, string> = { bike: 'ปั่นจักรยาน', aquajog: 'วิ่งในน้ำ', swim: 'ว่ายน้ำ', elliptical: 'เครื่องเดินวงรี', other: 'คาร์ดิโออื่น ๆ' }
export const crossKindsEn: Record<CrossKind, string> = { bike: 'Cycling', aquajog: 'Deep-water running', swim: 'Swimming', elliptical: 'Elliptical', other: 'Other cardio' }
export const useCross = () => usePersisted<CrossSession[]>('cross', [])
/** ให้ภาระการฝึก (ความฟิต/ความล้า) นับคาร์ดิโอทดแทนเหมือนเซสชันหนึ่ง: RPE × นาที */
export const crossAsSession = (c: CrossSession): Session => ({ id: c.id, date: c.date, mode: 'gym', dayKey: 'cross', title: crossKinds[c.kind], entries: [], rpe: c.rpe ?? 5, minutes: c.minutes })

export const runKinds: Record<Run['kind'], string> = {
  easy: 'Easy',
  tempo: 'Tempo',
  interval: 'Interval',
  long: 'วิ่งยาว',
  race: 'แข่ง',
  other: 'อื่น ๆ',
  walk: 'เดิน',
}
export const runKindsEn: Record<Run['kind'], string> = { easy: 'Easy', tempo: 'Tempo', interval: 'Interval', long: 'Long run', race: 'Race', other: 'Other', walk: 'Walk' }


export const uid = () => Math.random().toString(36).slice(2, 10)

export function formatDuration(sec: number) {
  const s = Math.round(sec)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const ss = String(s % 60).padStart(2, '0')
  return h ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`
}

export function formatPace(sec: number, km: number) {
  if (km < 0.05) return '--:--'
  const p = sec / km
  return `${Math.floor(p / 60)}:${String(Math.round(p % 60)).padStart(2, '0')}`
}

// ครั้งล่าสุดที่เล่นท่านี้ — ใช้โชว์ตัวเลขเดิมเพื่อ progressive overload
export function lastSetsFor(sessions: Session[], name: string) {
  for (let i = sessions.length - 1; i >= 0; i--) {
    const e = sessions[i].entries.find(x => x.name === name)
    if (e?.sets.length) return { date: sessions[i].date, sets: e.sets }
  }
  return null
}
