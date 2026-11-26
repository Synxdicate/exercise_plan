import { describe, expect, it } from 'vitest'
import { longRunLadder } from '../ladder'
import type { Run } from '../log'

const R = (date: string, km: number, kind: Run['kind'] = 'easy') => ({ id: date, date, km, seconds: km * 520, kind, source: 'manual' }) as Run
const runs = [R('2026-11-08', 5.01, 'long'), R('2026-11-15', 6.03, 'long'), R('2026-11-22', 4.85, 'long'), R('2026-11-25', 5.03)]
// 10K สัปดาห์ 6–11 (ปรับแล้ว): วิ่งยาว 6, 6, 7.5, 8, 8.5, 6
const weeks = [['2026-11-23', 6], ['2026-11-30', 6], ['2026-12-07', 7.5], ['2026-12-14', 8], ['2026-12-21', 8.5], ['2026-12-28', 6]].map(([monday, plan]) => ({ monday: monday as string, plan: plan as number }))

describe('long-run ladder to race day', () => {
  it('each step stays within 110% of the longest so far, and says when the plan peak is out of reach', () => {
    const l = longRunLadder(runs, '2026-11-26', weeks, 11.55)!
    expect(l.longest).toBe(6.03)
    expect(l.steps.map(s => s.reach)).toEqual([6, 6, 6.6, 7.2, 7.9, 6])
    expect(l.steps.map(s => s.capped)).toEqual([false, false, true, true, true, false])
    expect(l.peakPlan).toBe(8.5)
    expect(l.peakReach).toBe(7.9)
    expect(l.onTrack).toBe(false)
  })
  it('a long run already done this week counts as the real distance', () => {
    const l = longRunLadder([...runs, R('2026-11-29', 6.4, 'long')], '2026-11-29', weeks, 11.55)!
    expect(l.steps[0]).toMatchObject({ reach: 6.4, done: 6.4 })
    expect(l.steps[2].reach).toBe(7)
  })
  it('on track when every planned long run fits; no history = follow the plan; no weeks = null', () => {
    const easy = weeks.map(w => ({ ...w, plan: Math.min(w.plan, 6.5) }))
    expect(longRunLadder(runs, '2026-11-26', easy, 11.55)!.onTrack).toBe(true)
    expect(longRunLadder([], '2026-11-26', weeks, 11.55)!.peakReach).toBe(8.5)
    expect(longRunLadder(runs, '2026-11-26', [], 11.55)).toBeNull()
  })
})
