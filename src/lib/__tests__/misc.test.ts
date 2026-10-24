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
