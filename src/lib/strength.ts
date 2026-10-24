import type { Session } from './log'

// ประมาณ 1RM ด้วยสูตร Epley (แม่นพอสำหรับ ≤12 ครั้ง) — ท่าบอดี้เวท (0 กก.) ใช้จำนวนครั้งแทน
export const e1rm = (kg: number, reps: number) => (kg > 0 ? kg * (1 + reps / 30) : reps)

export type Point = { date: string; value: number; kg: number; reps: number }

// ค่าที่ดีที่สุดของแต่ละวันที่เล่นท่านี้
export function exerciseHistory(sessions: Session[], name: string): Point[] {
  const byDate = new Map<string, Point>()
  for (const s of sessions) {
    const e = s.entries.find(x => x.name === name)
    if (!e) continue
    for (const set of e.sets) {
      const value = e1rm(set.kg, set.reps)
      const cur = byDate.get(s.date)
      if (!cur || value > cur.value) byDate.set(s.date, { date: s.date, value, kg: set.kg, reps: set.reps })
    }
  }
  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date))
}

export function allExercises(sessions: Session[]) {
  const names = new Map<string, number>()
  for (const s of sessions) for (const e of s.entries) names.set(e.name, (names.get(e.name) ?? 0) + 1)
  return [...names.entries()].sort((a, b) => b[1] - a[1]).map(([n]) => n)
}

// ท่าที่ทำสถิติใหม่ในเซสชันนี้ (เทียบกับทุกครั้งก่อนหน้า)
export function prsIn(sessions: Session[], session: Session) {
  const before = sessions.filter(s => s.date < session.date || (s.date === session.date && sessions.indexOf(s) < sessions.indexOf(session)))
  return session.entries.filter(e => {
    const best = Math.max(0, ...e.sets.map(x => e1rm(x.kg, x.reps)))
    const prev = Math.max(0, ...before.flatMap(s => s.entries.filter(x => x.name === e.name).flatMap(x => x.sets.map(y => e1rm(y.kg, y.reps)))))
    return prev > 0 && best > prev
  }).map(e => e.name)
}
