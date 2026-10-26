import type { Point } from './gps'
import { useEffect } from 'react'
import { usePersisted } from './storage'
import { isCompact, roundPoint } from './geo'

export type Run = {
  id: string
  date: string
  km: number
  seconds: number
  kind: 'easy' | 'tempo' | 'interval' | 'long' | 'race' | 'other'
  source: 'gps' | 'manual' | 'gpx'
  route?: Point[]
  times?: number[] // เวลาเคลื่อนที่สะสมของแต่ละจุดใน route
  rpe?: number // ความเหนื่อย 1–10 หลังวิ่ง (session-RPE)
  splits?: number[] // วินาทีต่อกม.
  elapsedSeconds?: number // รวมเวลาพัก
  gapSeconds?: number // ช่วงที่จอปิด GPS ไม่ได้บันทึก
  shoeId?: string
}

export type SetEntry = { kg: number; reps: number }

export type Session = {
  id: string
  date: string
  mode: 'gym' | 'park'
  dayKey: string
  title: string
  entries: { name: string; sets: SetEntry[] }[]
  rpe?: number // ความเหนื่อย 1–10 หลังฝึก
  minutes?: number
}

export const useRuns = () => usePersisted<Run[]>('runs', [])

/** ย่อเส้นทางของการวิ่งเก่า (ก่อน v1.4) ที่เก็บพิกัดเต็มทศนิยม ให้เหลือ 5 ตำแหน่ง — เรียกครั้งเดียวที่ราก */
export function useCompactRuns() {
  const [runs, setRuns] = useRuns()
  useEffect(() => {
    if (!runs.some(r => r.route && !isCompact(r.route))) return
    setRuns(prev => prev.map(r => (r.route && !isCompact(r.route) ? { ...r, route: r.route.map(roundPoint) } : r)))
  }, [runs, setRuns])
}
export const useSessions = () => usePersisted<Session[]>('sessions', [])

// คาร์ดิโอทดแทนการวิ่ง (แรงกระแทกน้อย): ได้ระบบหายใจ-หัวใจโดยไม่กระแทกข้อ — ใช้เพิ่มปริมาณแอโรบิกหรือช่วงบาดเจ็บ
// (Eyestone 1993: วิ่งในน้ำ/ปั่นจักรยาน 6 สัปดาห์รักษา VO2max และเวลาวิ่ง 2 ไมล์ได้เท่าการวิ่ง)
export type CrossKind = 'bike' | 'aquajog' | 'swim' | 'elliptical' | 'other'
export type CrossSession = { id: string; date: string; kind: CrossKind; minutes: number; rpe?: number }
export const crossKinds: Record<CrossKind, string> = { bike: 'ปั่นจักรยาน', aquajog: 'วิ่งในน้ำ', swim: 'ว่ายน้ำ', elliptical: 'เครื่องเดินวงรี', other: 'คาร์ดิโออื่น ๆ' }
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
}

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
