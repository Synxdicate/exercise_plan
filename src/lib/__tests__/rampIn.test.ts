import { describe, expect, it } from 'vitest'
import { weekPlan } from '../../data/programs'
import { NOTE_EN } from '../../data/contentEn'
import { ACTUAL_FLOOR, ACTUAL_NOTE, actualCap, applyRampIn, rampCap, recentWeekKm, RAMP_NOTE, RAMP_STRIDES_NOTE, weeklyKm } from '../rampIn'
import { weekStart } from '../date'
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

describe('paceHint from an easy-run estimate', () => {
  it('uses effort instead of misleading paces, and speaks English when asked', async () => {
    const { estimate, paceHint } = await import('../pace')
    const run = { id: 'l', date: '2026-11-08', km: 5.01, seconds: 2462, kind: 'long' as const, source: 'manual' as const }
    const e = estimate([run], '2026-11-10')!
    expect(e.from.easy).toBe(true)
    expect(paceHint(e, 'tempo', 'Tempo 15 นาที')).toMatch(/~7\/10/)
    expect(paceHint(e, 'interval', 'Interval 5 × 800 ม.')).toMatch(/~8\/10/)
    expect(paceHint(e, 'easy', 'Easy run')).toContain('8:11')
    expect(paceHint(e, 'easy', 'Easy run', true)).toMatch(/^Easy: conversational/)
    const hard = estimate([{ ...run, kind: 'race' as const }], '2026-11-10')!
    expect(paceHint(hard, 'tempo', 'Tempo 15 นาที')).toMatch(/^Tempo ~8:5\d \/กม\.$/)
    expect(paceHint(hard, 'easy', 'Easy run', true)).toMatch(/^Easy \d+:\d\d–\d+:\d\d \/km$/)
  })
  it('"usual easy pace" is the median easy pace, not the fastest run the estimate came from', async () => {
    const { estimate, paceHint } = await import('../pace')
    const r = (date: string, km: number, seconds: number) => ({ id: date, date, km, seconds, kind: 'easy' as const, source: 'manual' as const })
    // รอบเร็ว 8:11 เป็นแหล่งคำนวณ แต่ปกติวิ่งเบา ~8:45
    const e = estimate([r('2026-11-08', 5.01, 2462), r('2026-11-15', 6.03, 3168), r('2026-11-22', 4.85, 2613), r('2026-11-25', 5.03, 2586)], '2026-11-26')!
    expect(e.from.pace).toBeCloseTo(491, 0)
    expect(paceHint(e, 'easy', 'Easy run')).toContain('8:40')
    expect(paceHint(e, 'easy', 'Easy run')).not.toContain('8:11')
  })
})

describe('weekly km follows what was actually run', () => {
  // ประวัติจริงแบบย่อ: 7.95 / 10.59 / 8.55 / 8.87 กม. ต่อสัปดาห์
  const runs = [{ date: '2026-10-27', km: 4.82 }, { date: '2026-10-29', km: 3.13 }, { date: '2026-11-02', km: 3.09 }, { date: '2026-11-06', km: 2.49 }, { date: '2026-11-08', km: 5.01 },
    { date: '2026-11-13', km: 2.52 }, { date: '2026-11-15', km: 6.03 }, { date: '2026-11-19', km: 4.02 }, { date: '2026-11-22', km: 4.85 }, { date: '2026-11-25', km: 5.03 }]
  const weekly = weeklyKm(runs, weekStart)
  it('caps this and past weeks at the best of the 3 weeks before × 1.2, future weeks grow 20% a week from this week', () => {
    expect(weekly['2026-11-02']).toBeCloseTo(10.59)
    expect(actualCap(weekly, '2026-11-23', '2026-11-23')).toBe(12.7)
    expect(actualCap(weekly, '2026-11-30', '2026-11-23')).toBe(15.2)
    expect(actualCap(weekly, '2026-12-07', '2026-11-23')).toBe(18.3)
    // สัปดาห์ที่ผ่านมาใช้ข้อมูลก่อนสัปดาห์นั้น (ไม่เปลี่ยนตามสิ่งที่เกิดทีหลัง)
    expect(actualCap(weekly, '2026-11-02', '2026-11-23')).toBe(9.5)
  })
  it('no runs in the 3 weeks before = no cap; a tiny week never drops below the floor', () => {
    expect(actualCap(weekly, '2026-10-19', '2026-11-23')).toBeNull()
    expect(actualCap({ '2026-11-16': 3 }, '2026-11-23', '2026-11-23')).toBe(ACTUAL_FLOOR)
  })
  it('the 10K week 6 table (19 km) is cut to 12.7 km, long and quality runs kept first', () => {
    const w6 = weekPlan('ten', 6, () => 'gym')
    expect(km(w6)).toBe(19)
    const out = applyRampIn(w6, 12.7, false, ACTUAL_NOTE)
    expect(km(out)).toBeLessThanOrEqual(12.7)
    expect(out.find(d => d.key === 'quality')!.targetKm).toBe(5)
    expect(out.some(d => d.note?.includes(ACTUAL_NOTE))).toBe(true)
    expect(out.some(d => d.note?.includes(RAMP_NOTE))).toBe(false)
    expect(NOTE_EN[ACTUAL_NOTE]).toBeTruthy()
  })
  it('never cuts the long run below the longest run of the last 30 days (other days give way)', () => {
    const w6 = weekPlan('ten', 6, () => 'gym')
    const out = applyRampIn(w6, 12.7, false, ACTUAL_NOTE, 6.03)
    expect(out.find(d => d.key === 'long')!.targetKm).toBe(6)
    expect(applyRampIn(w6, 12.7, false, ACTUAL_NOTE).find(d => d.key === 'long')!.targetKm).toBeLessThan(6)
    // แผนสั้นกว่าครั้งที่ไกลสุดอยู่แล้ว: ไม่ยืดออก
    const w3 = weekPlan('ten', 3, () => 'gym')
    expect(applyRampIn(w3, 8, false, ACTUAL_NOTE, 9).find(d => d.key === 'long')!.targetKm).toBe(5)
  })
})
