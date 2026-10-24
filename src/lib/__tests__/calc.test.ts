import { describe, expect, it } from 'vitest'
import { bmr, defaultProfile, targets, tdee } from '../calc'

describe('calc', () => {
  it('Mifflin-St Jeor สำหรับชาย 20 ปี 165 ซม. 64.5 กก.', () => {
    expect(bmr(defaultProfile)).toBeCloseTo(1581.25)
  })

  it('โปรแกรมหุ่น (recomp) กินขาดเล็กน้อย', () => {
    const t = targets(defaultProfile)
    expect(t.kcal).toBeLessThan(tdee(defaultProfile))
    expect(t.protein).toBe(129) // 2.0 ก./กก.
  })

  it('โปรแกรมวิ่งไม่กินขาด และใช้กิจกรรมอย่างน้อยระดับหนัก', () => {
    const t = targets({ ...defaultProfile, goal: 'cut' }, true)
    expect(t.kcal).toBeGreaterThanOrEqual(Math.round((bmr(defaultProfile) * 1.725) / 10) * 10)
    expect(t.raceAdjusted).toBe(true)
  })

  it('แคลอรี่รวมจาก macro ไม่เกินเป้า', () => {
    const t = targets(defaultProfile)
    expect(t.protein * 4 + t.fat * 9 + t.carbs * 4).toBeLessThanOrEqual(t.kcal + 4)
  })
})
