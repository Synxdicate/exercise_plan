import { describe, expect, it } from 'vitest'
import { weekPlan } from '../../data/programs'
import { NOTE_EN } from '../../data/contentEn'
import { applyRampIn, rampCap, recentWeekKm, RAMP_NOTE, RAMP_STRIDES_NOTE } from '../rampIn'
import type { Day } from '../../data/workouts'

const km = (d: Day[]) => d.reduce((s, x) => s + (x.type === 'run' ? x.targetKm ?? 0 : 0), 0)
const wk4 = weekPlan('ten', 4, () => 'gym') // 3 + 4 (interval) + 2 + 6 = 15 กม.

describe('ramp-in after a mid-program start', () => {
  it('recentWeekKm takes the biggest of the previous 3 weeks', () => {
    const runs = [{ date: '2026-10-25', km: 3.29 }, { date: '2026-10-27', km: 4.82 }, { date: '2026-10-29', km: 3.13 }, { date: '2026-10-31', km: 2.49 },
      { date: '2026-11-02', km: 3.09 }, { date: '2026-11-06', km: 2.49 }, { date: '2026-11-08', km: 5.01 }, { date: '2026-11-09', km: 9 }]
    expect(recentWeekKm(runs, '2026-11-09')).toBe(10.6)
    expect(rampCap(10.6, 0)).toBe(12.7)
    expect(rampCap(10.6, 2)).toBe(18.3)
  })
  it('caps the week, keeps the quality km, never below 2 km per run', () => {
    const out = applyRampIn(wk4, 12.7, false)
    expect(km(out)).toBeLessThanOrEqual(12.7)
    const q = out.find(d => d.key === 'quality')!
    expect(q.targetKm).toBe(4)
    expect(q.runKind).toBe('interval')
    out.filter(d => d.type === 'run').forEach(d => expect(d.targetKm!).toBeGreaterThanOrEqual(2))
    expect(out.some(d => d.note?.includes(RAMP_NOTE))).toBe(true)
  })
  it('first week swaps the hard run for strides', () => {
    const out = applyRampIn(wk4, 12.7, true)
    const q = out.find(d => d.key === 'quality')!
    expect(q.runKind).toBe('easy')
    expect(q.title).toBe('Easy + Strides')
    expect(q.note).toBe(RAMP_STRIDES_NOTE)
    expect(q.guide?.some(s => s.pace === 'interval' || s.pace === 'tempo')).toBe(false)
  })
  it('leaves the plan alone when it already fits or there is no baseline', () => {
    expect(applyRampIn(wk4, 20, true)).toBe(wk4)
    expect(applyRampIn(wk4, 0, true)).toBe(wk4)
  })
  it('notes have English', () => {
    expect(NOTE_EN[RAMP_NOTE]).toBeTruthy()
    expect(NOTE_EN[RAMP_STRIDES_NOTE]).toBeTruthy()
  })
})

describe('ramp-in order', () => {
  it('drops the 4th run day first and keeps the long run when that is enough', () => {
    const out = applyRampIn(wk4, 12.7, true)
    expect(out.filter(d => d.type === 'run')).toHaveLength(3)
    expect(out.find(d => d.key === 'easyB')!.type).toBe('rest')
    expect(out.find(d => d.key === 'long')!.targetKm).toBe(6)
    expect(km(out)).toBeLessThanOrEqual(12.7)
  })
})
