import { describe, expect, it } from 'vitest'
import { niceTicks, weeklySeries } from '../weekly'
import { BADGES, planStreak } from '../goals'
import { runHighlights } from '../analysis'
import type { Run } from '../log'

const run = (id: string, date: string, km: number, extra: Partial<Run> = {}): Run => ({ id, date, km, seconds: km * 480, kind: 'easy', source: 'manual', ...extra })
const badge = (id: string, runs: Run[], extra = {}) => BADGES.find(b => b.id === id)!.earned({ runs, sessions: [], goalKm: 0, ...extra })

describe('weeklySeries', () => {
  it('sums runs per Monday week, oldest first, skips walks and old weeks', () => {
    const w = weeklySeries([run('a', '2026-11-09', 3), run('b', '2026-11-08', 5, { elev: { gain: 40, loss: 40, max: 0, min: 0 } }),
      run('c', '2026-11-03', 2), run('w', '2026-11-04', 4, { kind: 'walk' }), run('old', '2026-01-05', 9)], '2026-11-09', 12)
    expect(w).toHaveLength(12)
    expect(w[11]).toMatchObject({ monday: '2026-11-09', km: 3, runs: 1, elevRuns: 0 })
    expect(w[10]).toMatchObject({ monday: '2026-11-02', km: 7, runs: 2, gain: 40, elevRuns: 1 })
    expect(w[0].monday).toBe('2026-08-24')
  })
  it('niceTicks covers the max with round steps', () => {
    expect(niceTicks(10.6)).toEqual([0, 5, 10, 15])
    expect(niceTicks(23)).toEqual([0, 10, 20, 30])
    expect(niceTicks(0)).toEqual([0, 0.5, 1])
  })
})

describe('new badges', () => {
  it('distance, climbing and negative split', () => {
    expect(badge('km-50', [run('a', '2026-01-01', 30), run('b', '2026-01-02', 21)])).toBe(true)
    expect(badge('hill-50', [run('a', '2026-01-01', 5, { elev: { gain: 52, loss: 50, max: 0, min: 0 } })])).toBe(true)
    expect(badge('hill-50', [run('a', '2026-01-01', 5, { elev: { gain: 52, loss: 50, max: 0, min: 0 }, kind: 'walk' })])).toBe(false)
    expect(badge('negative-split', [run('a', '2026-01-01', 4, { splits: [500, 495, 470, 465] })])).toBe(true)
    expect(badge('negative-split', [run('a', '2026-01-01', 4, { splits: [460, 470, 490, 500] })])).toBe(false)
  })
  it('plan streak and race finish', () => {
    expect(planStreak([{ planned: 5, done: 4 }, { planned: 5, done: 5 }, { planned: 5, done: 2 }, { planned: 5, done: 4 }])).toBe(2)
    expect(badge('plan-4', [], { planWeeks: 4 })).toBe(true)
    expect(badge('race-finish', [run('r', '2027-01-10', 11.55)], { raceDate: '2027-01-10' })).toBe(true)
    expect(badge('race-finish', [run('r', '2027-01-09', 11.55)], { raceDate: '2027-01-10' })).toBe(false)
  })
})

describe('runHighlights', () => {
  it('flags the longest run and negative splits', () => {
    const runs = [run('a', '2026-10-01', 4), run('b', '2026-11-08', 5.01, { splits: [500, 490, 480, 470, 460] })]
    const h = runHighlights(runs[1], runs)
    expect(h.some(x => x.kind === 'longest')).toBe(true)
    expect(h.some(x => x.kind === 'negative')).toBe(true)
  })
  it('a year best that is not an all-time top 3', () => {
    const runs = [run('a', '2025-03-01', 5, { seconds: 1500 }), run('b', '2025-04-01', 5, { seconds: 1520 }), run('c', '2025-05-01', 5, { seconds: 1540 }),
      run('d', '2026-02-01', 5, { seconds: 1700 })]
    const h = runHighlights(runs[3], runs)
    expect(h).toContainEqual(expect.objectContaining({ kind: 'year', label: '5K', year: '2026' }))
    expect(h.some(x => x.kind === 'pr')).toBe(false)
  })
})
