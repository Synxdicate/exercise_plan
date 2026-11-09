import { describe, expect, it } from 'vitest'
import { programSummary } from '../replay'
import type { Run, Session } from '../log'

const run = (date: string, km: number, kind: Run['kind'] = 'easy'): Run => ({ id: date + km, date, km, seconds: km * 420, kind, source: 'manual' })
const lift = (date: string, dayKey = 'strA'): Session => ({ id: date + dayKey, date, mode: 'gym', dayKey, title: '', entries: [] })

describe('programSummary', () => {
  it('counts runs, km, strength (not circuits or walks) inside the program window and finds the race', () => {
    const s = programSummary({
      runs: [run('2026-10-01', 3), run('2026-11-03', 3), run('2026-12-20', 9, 'long'), run('2026-12-22', 4, 'walk'), run('2027-01-10', 11.55, 'race'), run('2027-01-20', 5)],
      sessions: [lift('2026-11-04'), lift('2026-11-06', 'circuit'), lift('2026-12-01')],
      from: '2026-11-02', to: '2027-01-10', planned: 50, done: 40, fiveKBefore: 1900, fiveKNow: 1780,
    })
    expect(s.runs).toBe(3)
    expect(s.km).toBe(23.6)
    expect(s.lifts).toBe(2)
    expect(s.longest?.km).toBe(11.55)
    expect(s.race?.km).toBe(11.55)
    expect(s.adherence).toBe(80)
    expect(s.fiveKGain).toBe(120)
  })
  it('reports no gain when slower and no adherence without a plan', () => {
    const s = programSummary({ runs: [], sessions: [], from: '2026-11-02', to: '2027-01-10', planned: 0, done: 0, fiveKBefore: 1700, fiveKNow: 1800 })
    expect(s.fiveKGain).toBeNull()
    expect(s.adherence).toBeNull()
    expect(s.race).toBeNull()
  })
})
