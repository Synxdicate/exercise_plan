import { describe, expect, it } from 'vitest'
import { programs, variants, weekKm, weekPlan } from '../../data/programs'

const race = ['half', 'full'] as const

describe('โปรแกรมวิ่ง', () => {
  for (const p of race) {
    const n = programs[p].weeks

    it(`${p}: ระยะต่อสัปดาห์ไม่เพิ่มเกิน 20% จากสัปดาห์ที่มากที่สุดก่อนหน้า (งานวิจัยพบความเสี่ยงที่ >30%)`, () => {
      let peak = 0
      for (let w = 1; w <= n; w++) {
        const km = weekKm(p, w)
        if (peak) expect(km / peak).toBeLessThanOrEqual(1.2)
        peak = Math.max(peak, km)
      }
    })

    it(`${p}: สัปดาห์สุดท้ายคือวันแข่งระยะเต็ม และมี taper ก่อนแข่ง`, () => {
      const race = variants(p, n).gym.at(-1)!
      expect(race.runKind).toBe('race')
      expect(race.targetKm).toBe(programs[p].raceKm)
      const peak = Math.max(...Array.from({ length: n }, (_, i) => weekKm(p, i + 1)))
      // สัปดาห์ก่อนแข่งลดปริมาณ ≥20% และสัปดาห์แข่ง (ไม่รวมวันแข่ง) เหลือไม่เกินครึ่งของพีค
      expect(weekKm(p, n - 1)).toBeLessThanOrEqual(peak * 0.8)
      expect(weekKm(p, n) - race.targetKm!).toBeLessThanOrEqual(peak * 0.5)
    })

    it(`${p}: ทุกสัปดาห์มี 7 วัน มีวันพักอย่างน้อย 1 วัน และเวทไม่เกิน 2 วัน`, () => {
      for (let w = 1; w <= n; w++) {
        const days = weekPlan(p, w, () => 'gym')
        expect(days).toHaveLength(7)
        expect(days.some(d => d.type === 'rest')).toBe(true)
        expect(days.filter(d => d.type === 'strength').length).toBeLessThanOrEqual(2)
      }
    })
  }

  it('ยิมกับสวนต่างกันแค่วันเวท', () => {
    for (const p of ['physique', ...race] as const) {
      const v = variants(p, 3)
      v.gym.forEach((g, i) => {
        if (g.type !== 'strength') expect(v.park[i]).toEqual(g)
        else expect(v.park[i].type).toBe('strength')
      })
    }
  })

  it('weekPlan ใส่ location ตามที่เลือกทีละวัน', () => {
    const days = weekPlan('physique', 1, i => (i === 4 ? 'park' : 'gym'))
    expect(days[0].location).toBe('gym')
    expect(days[4].location).toBe('park')
    expect(days[1].location).toBeUndefined()
  })
})
