import { describe, expect, it } from 'vitest'
import { weekPlan } from '../../data/programs'
import { longRunCap, missedKeyRun } from '../missed'
import { looksLikeWalk, runsOnly } from '../walk'
import type { Run } from '../log'

const run = (date: string, km: number, kind: Run['kind'] = 'easy', min = 6.5): Run => ({ id: date + km, date, km, seconds: km * min * 60, kind, source: 'gps' })
// มินิ: จ เวท, อ วิ่ง, พ พัก, พฤ วิ่ง, ศ เวท, ส พัก, อา วิ่งยาว
const mini = (w: number) => weekPlan('mini', w, () => 'gym')

describe('walk', () => {
  it('pace slower than 12:00/km looks like a walk; walks are not run km', () => {
    expect(looksLikeWalk(run('2026-10-31', 2.49, 'easy', 14.2))).toBe(true)
    expect(looksLikeWalk(run('2026-10-29', 3.13, 'easy', 8.4))).toBe(false)
    expect(looksLikeWalk(run('2026-10-31', 2.49, 'walk', 14.2))).toBe(false)
    expect(runsOnly([run('a', 1), run('b', 2, 'walk')])).toHaveLength(1)
  })
})

describe('longRunCap (Frandsen 2025)', () => {
  const runs = [run('2026-10-27', 4.82), run('2026-10-29', 3.13), run('2026-10-31', 6, 'walk', 14)]
  it('caps a long run that jumps past 110% of the longest run in 30 days (walks ignored)', () => {
    expect(longRunCap(runs, '2026-11-08', { targetKm: 5.5, runKind: 'long' })).toEqual({ cap: 5.3, longest: 4.82 })
  })
  it('no cap when the plan is within 110%, on race day, or without history', () => {
    expect(longRunCap(runs, '2026-11-08', { targetKm: 5.3, runKind: 'long' })).toBeNull()
    expect(longRunCap(runs, '2026-11-08', { targetKm: 10.5, runKind: 'race' })).toBeNull()
    expect(longRunCap([], '2026-11-08', { targetKm: 5.5, runKind: 'long' })).toBeNull()
    expect(longRunCap([run('2026-09-01', 5)], '2026-11-08', { targetKm: 5.5, runKind: 'long' })).toBeNull()
  })
})

describe('missedKeyRun', () => {
  it('last week long run missed → told not to make it up, before this week first run', () => {
    const last = { plan: mini(1), done: (i: number) => i !== 6 }
    expect(missedKeyRun(mini(2), 0, () => false, last)).toMatchObject({ kind: 'lastWeek', day: { runKind: 'long' } })
    // หลังวันวิ่งแรกของสัปดาห์ใหม่ ไม่ต้องเตือนแล้ว
    expect(missedKeyRun(mini(2), 2, i => i < 2, last)).toBeNull()
  })
  it('a missed key run this week moves to a rest day not next to another run, else skip', () => {
    const plan = mini(2).map((d, i) => (i === 3 ? { ...d, runKind: 'tempo' as const } : d)) // พฤ = tempo
    // ศุกร์: พลาด tempo วันพฤ — เสาร์เป็นวันพักแต่ติดวิ่งยาววันอาทิตย์ → ไม่มีวันย้าย ให้ข้าม
    expect(missedKeyRun(plan, 4, i => i !== 3)).toMatchObject({ kind: 'thisWeek', i: 3, to: null })
    // ไม่มีวันวิ่งสำคัญที่พลาด
    expect(missedKeyRun(mini(2), 4, () => true)).toBeNull()
  })
})

describe('day moves', () => {
  it('swaps content but keeps weekday labels; warns on back-to-back runs', async () => {
    const { applyMoves, backToBackRuns } = await import('../moves')
    const w = mini(1) // จ เวท, อ วิ่ง, พ พัก, พฤ วิ่ง, ศ เวท, ส พัก, อา วิ่งยาว
    const moved = applyMoves(w, [[1, 0]]) // ทำวิ่งวันอังคารวันจันทร์
    expect(moved[0]).toMatchObject({ type: 'run', day: w[0].day, key: w[1].key, movedFrom: 1 })
    expect(moved[1]).toMatchObject({ type: 'strength', day: w[1].day, movedFrom: 0 })
    expect(backToBackRuns(moved)).toEqual([])
    // วิ่งยาววันอาทิตย์มาวันจันทร์ → จันทร์–อังคารวิ่งติดกัน
    expect(backToBackRuns(applyMoves(w, [[6, 0]]))).toEqual([0])
    // สลับซ้อนกันได้ และสลับกลับ = เหมือนเดิม
    expect(applyMoves(w, [[1, 0], [1, 0]]).map(d => d.key)).toEqual(w.map(d => d.key))
  })
})
