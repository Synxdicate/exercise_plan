import type { Point } from './gps'
import { usePersisted } from './storage'

export type Run = {
  id: string
  date: string
  km: number
  seconds: number
  kind: 'easy' | 'interval' | 'long' | 'other'
  source: 'gps' | 'manual'
  route?: Point[]
}

export type SetEntry = { kg: number; reps: number }

export type Session = {
  id: string
  date: string
  mode: 'gym' | 'park'
  dayKey: string
  title: string
  entries: { name: string; sets: SetEntry[] }[]
}

export const useRuns = () => usePersisted<Run[]>('runs', [])
export const useSessions = () => usePersisted<Session[]>('sessions', [])

export const runKinds: Record<Run['kind'], string> = {
  easy: 'Easy',
  interval: 'Interval',
  long: 'วิ่งยาว',
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

// เป้าระยะต่อสัปดาห์ตามเฟสใน workouts.ts
export const weeklyKmTarget = (week: number) => (week <= 4 ? 13 : week === 9 ? 8 : 16)

// ครั้งล่าสุดที่เล่นท่านี้ — ใช้โชว์ตัวเลขเดิมเพื่อ progressive overload
export function lastSetsFor(sessions: Session[], name: string) {
  for (let i = sessions.length - 1; i >= 0; i--) {
    const e = sessions[i].entries.find(x => x.name === name)
    if (e?.sets.length) return { date: sessions[i].date, sets: e.sets }
  }
  return null
}
