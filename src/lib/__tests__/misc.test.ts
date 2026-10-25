import { describe, expect, it } from 'vitest'
import { estimate } from '../pace'
import { e1rm, prsIn } from '../strength'
import { readinessLevel } from '../readiness'
import { mergeValues } from '../merge'
import { addDays, daysBetween, weekStart } from '../date'
import type { Run, Session } from '../log'

const run = (km: number, seconds: number): Run => ({ id: String(km), date: '2026-10-01', km, seconds, kind: 'easy', source: 'manual' })

describe('pace (Riegel)', () => {
  it('ต้องมีการวิ่งอย่างน้อย 3 กม.', () => {
    expect(estimate([run(2, 600)])).toBeNull()
  })
  it('5K 25 นาที → เวลา 5K เท่าเดิม และฮาล์ฟช้ากว่าเพซ 5K', () => {
    const e = estimate([run(5, 1500)])!
    expect(e.fiveK).toBeCloseTo(1500)
    expect(e.paces.half).toBeGreaterThan(300)
    expect(e.paces.easy[0]).toBeGreaterThan(e.paces.tempo)
  })
})

describe('strength', () => {
  it('Epley', () => {
    expect(e1rm(100, 5)).toBeCloseTo(116.67, 1)
    expect(e1rm(0, 12)).toBe(12)
  })
  it('PR เทียบกับครั้งก่อนเท่านั้น', () => {
    const s = (id: string, date: string, kg: number): Session => ({ id, date, mode: 'gym', dayKey: 'x', title: 'x', entries: [{ name: 'Bench Press', sets: [{ kg, reps: 5 }] }] })
    const all = [s('a', '2026-10-01', 40), s('b', '2026-10-03', 42.5), s('c', '2026-10-05', 42.5)]
    expect(prsIn(all, all[0])).toEqual([]) // ครั้งแรกไม่นับ
    expect(prsIn(all, all[1])).toEqual(['Bench Press'])
    expect(prsIn(all, all[2])).toEqual([])
  })
})

describe('readiness', () => {
  it('เจ็บ → แดงเสมอ', () => expect(readinessLevel({ sleep: 0, sore: 0, pain: true })).toBe('red'))
  it('นอนน้อย + ล้ามาก → แดง', () => expect(readinessLevel({ sleep: 2, sore: 2, pain: false })).toBe('red'))
  it('เมื่อยนิดหน่อย + นอน 6–7 → เหลือง', () => expect(readinessLevel({ sleep: 1, sore: 1, pain: false })).toBe('yellow'))
  it('ปกติ → เขียว', () => expect(readinessLevel({ sleep: 0, sore: 1, pain: false })).toBe('green'))
})

describe('merge ตอน login ครั้งแรก', () => {
  it('รวม array ตาม id ไม่ซ้ำ', () => {
    const r = mergeValues('runs', [{ id: 'a', date: '2026-10-02' }], [{ id: 'a', date: '2026-10-02' }, { id: 'b', date: '2026-10-01' }]) as { id: string }[]
    expect(r.map(x => x.id)).toEqual(['b', 'a'])
  })
  it('log น้ำหนักรวมตามวันที่', () => {
    const r = mergeValues('log', [{ date: '2026-10-01', weight: 64 }], [{ date: '2026-10-01', weight: 65 }]) as { weight: number }[]
    expect(r).toHaveLength(1)
    expect(r[0].weight).toBe(64)
  })
  it('ค่าเดี่ยวใช้ของ server', () => expect(mergeValues('program', 'half', 'physique')).toBe('physique'))
})

describe('date', () => {
  it('สัปดาห์เริ่มวันจันทร์', () => {
    expect(weekStart('2026-10-25')).toBe('2026-10-19') // อาทิตย์
    expect(weekStart('2026-10-19')).toBe('2026-10-19')
  })
  it('บวกวันข้ามเดือน', () => expect(addDays('2026-10-30', 3)).toBe('2026-11-02'))
  it('daysBetween', () => expect(daysBetween('2026-10-25', '2027-01-17')).toBe(84))
})

describe('searchFoods', () => {
  it('matches every word ignoring spaces', async () => {
    const { searchFoods, logFoods } = await import('../../data/nutrition')
    expect(searchFoods(logFoods, 'กะเพรา').map(f => f.name)).toContain('ข้าวกะเพราไก่ + ไข่ต้ม')
    expect(searchFoods(logFoods, 'ข้าว ไก่').every(f => f.name.includes('ข้าว') && f.name.includes('ไก่'))).toBe(true)
    expect(searchFoods(logFoods, '')).toHaveLength(logFoods.length)
    expect(new Set(logFoods.map(f => f.name)).size).toBe(logFoods.length)
  })
})

describe('exercise library + swaps', () => {
  it('every program exercise with a pattern has muscles; library names are unique', async () => {
    const { allLibrary, patternOf } = await import('../../data/library')
    const { musclesOf } = await import('../../data/muscles')
    const { weekPlan } = await import('../../data/programs')
    expect(new Set(allLibrary.map(e => e.name)).size).toBe(allLibrary.length)
    for (const e of allLibrary) expect(musclesOf({ ...e, sets: '3', rest: '-' }).primary.length, e.name).toBeGreaterThan(0)
    // ทุกท่าเวทในโปรแกรม (ยกเว้น Cindy) อยู่ในคลัง → สลับได้
    for (const p of ['physique', 'ten'] as const) for (const m of ['gym', 'park'] as const)
      for (const d of weekPlan(p, 1, () => m)) if (d.type === 'strength')
        for (const e of d.exercises) if (!/Cindy/.test(e.name)) expect(patternOf(e.name), e.name).toBeTruthy()
  })
  it('applyCustom swaps everywhere and appends extras', async () => {
    const { applyCustom, extrasKey } = await import('../program')
    const { weekPlan } = await import('../../data/programs')
    const days = weekPlan('physique', 1, () => 'gym')
    const d0 = days.find(d => d.type === 'strength')!
    const out = applyCustom(days, 'physique', { 'Bench Press': 'DB Bench Press', Plank: 'Ab Wheel Rollout' },
      { [extrasKey('physique', d0)]: [{ name: 'Hammer Curl', th: '', sets: '3', reps: '10–12', rest: '90 วิ', cue: '', video: '' }] })
    const names = out.flatMap(d => d.exercises.map(e => e.name))
    expect(names).not.toContain('Bench Press')
    const sw = out.flatMap(d => d.exercises).find(e => e.name === 'DB Bench Press')!
    expect(sw.swappedFrom).toBe('Bench Press')
    const orig = days.flatMap(d => d.exercises).find(e => e.name === 'Bench Press')!
    expect(sw.sets).toBe(orig.sets)
    expect(out.find(d => d.key === d0.key)!.exercises.at(-1)).toMatchObject({ name: 'Hammer Curl', added: true })
  })
})

describe('projectRoute', () => {
  it('fits the route inside the box keeping aspect ratio', async () => {
    const { projectRoute } = await import('../geo')
    const box = { x: 100, y: 200, w: 800, h: 400 }
    const pts = projectRoute([[16.43, 102.82], [16.44, 102.82], [16.44, 102.83]], box)
    for (const [x, y] of pts) {
      expect(x).toBeGreaterThanOrEqual(box.x - 1e-6); expect(x).toBeLessThanOrEqual(box.x + box.w + 1e-6)
      expect(y).toBeGreaterThanOrEqual(box.y - 1e-6); expect(y).toBeLessThanOrEqual(box.y + box.h + 1e-6)
    }
    // ไปทางเหนือ = ขึ้นบนจอ
    expect(pts[1][1]).toBeLessThan(pts[0][1])
  })
})

describe('goals + badges', () => {
  const run = (date: string, km: number, seconds = km * 360) => ({ id: date + km, date, km, seconds, kind: 'easy' as const, source: 'manual' as const })
  const ses = (date: string) => ({ id: date, date, mode: 'gym' as const, dayKey: 'a', title: 'A', entries: [] })
  it('period stats, streak and badges', async () => {
    const { periodStats, bestWeekStreak, earnedBadges, defaultMonthGoal } = await import('../goals')
    const runs = [run('2026-10-01', 5), run('2026-10-03', 10.2, 3000), run('2026-09-30', 3)]
    expect(periodStats(runs, [], '2026-10').km).toBeCloseTo(15.2)
    // 4 สัปดาห์ติดกัน สัปดาห์ละ 3 ครั้ง (จ/พ/ศ)
    const weeks = ['2026-09-07', '2026-09-14', '2026-09-21', '2026-09-28'].flatMap(m => [0, 2, 4].map(d => { const t = new Date(m); t.setDate(t.getDate() + d); return t.toISOString().slice(0, 10) }))
    expect(bestWeekStreak([], weeks.map(ses))).toBe(4)
    const ids = earnedBadges({ runs, sessions: weeks.map(ses), goalKm: 15 })
    expect(ids).toEqual(expect.arrayContaining(['first-run', 'run-5k', 'run-10k', 'streak-4', 'month-goal', 'first-workout']))
    expect(ids).not.toContain('run-half')
    expect(earnedBadges({ runs, sessions: [], goalKm: 20 })).not.toContain('month-goal')
    expect(defaultMonthGoal(13)).toBe(55)
  })
})
