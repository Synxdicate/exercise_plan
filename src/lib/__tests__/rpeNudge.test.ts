import { describe, expect, it } from 'vitest'
import { runsMissingRpe } from '../rpeNudge'
import type { Run } from '../log'

const run = (id: string, date: string, rpe?: number, startedAt?: number): Run => ({ id, date, km: 3, seconds: 1200, kind: 'easy', source: 'gps', splits: [], ...(rpe && { rpe }), ...(startedAt && { startedAt }) })

describe('runs missing RPE', () => {
  it('lists unrated runs from the last 7 days, newest first', () => {
    const runs = [run('a', '2026-11-04'), run('b', '2026-11-06'), run('c', '2026-11-08', 5), run('d', '2026-11-10', undefined, 1), run('e', '2026-11-10', undefined, 2), run('f', '2026-11-13')]
    expect(runsMissingRpe(runs, '2026-11-12').map(r => r.id)).toEqual(['e', 'd', 'b'])
    expect(runsMissingRpe(runs, '2026-11-12', 3).map(r => r.id)).toEqual(['e', 'd'])
    expect(runsMissingRpe([run('x', '2026-11-12', 4)], '2026-11-12')).toEqual([])
  })
})
