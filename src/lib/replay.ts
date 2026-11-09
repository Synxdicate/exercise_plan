import type { Run, Session } from './log'
import { runsOnly } from './walk'
import { strengthOnly } from './sessionKind'

// สรุปทั้งโปรแกรม (แบบ Plan Replay ของ Runna) — pure, tested
export function programSummary(o: { runs: Run[]; sessions: Session[]; from: string; to: string; planned: number; done: number; fiveKBefore?: number | null; fiveKNow?: number | null }) {
  const inRange = <T extends { date: string }>(xs: T[]) => xs.filter(x => x.date >= o.from && x.date <= o.to)
  const runs = runsOnly(inRange(o.runs))
  const lifts = strengthOnly(inRange(o.sessions))
  const longest = runs.reduce<Run | null>((b, r) => (!b || r.km > b.km ? r : b), null)
  const race = runs.filter(r => r.date === o.to).sort((a, b) => b.km - a.km)[0] ?? null
  return {
    runs: runs.length,
    km: Math.round(runs.reduce((a, r) => a + r.km, 0) * 10) / 10,
    seconds: runs.reduce((a, r) => a + r.seconds, 0),
    lifts: lifts.length,
    longest,
    race,
    adherence: o.planned ? Math.round((o.done / o.planned) * 100) : null,
    fiveKGain: o.fiveKBefore && o.fiveKNow && o.fiveKNow < o.fiveKBefore ? Math.round(o.fiveKBefore - o.fiveKNow) : null,
  }
}
