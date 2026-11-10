import { describe, expect, it } from 'vitest'
import { ghostLead, ghostMeters, ghostText, raceGhost, trialGhost } from '../ghost'

describe('นักวิ่งเงา', () => {
  it('ทดสอบ 5K: เร็วกว่า 5K ที่ดีที่สุด 1.5% และใช้คาดการณ์เมื่อยังไม่มี', () => {
    expect(trialGhost(1500, 1400)?.seconds).toBe(1478)
    expect(trialGhost(null, 1400)?.seconds).toBe(1379)
    expect(trialGhost(null, null)).toBeNull()
  })
  it('วันแข่ง: ใช้เป้าหมายก่อนคาดการณ์ ไม่บวกเพิ่ม', () => {
    expect(raceGhost('tenK', 3000, 3200)?.seconds).toBe(3000)
    expect(raceGhost('tenK', undefined, 3200.4)?.seconds).toBe(3200)
    expect(raceGhost('tenK', undefined, null)).toBeNull()
  })
  it('นำ/ตามหลังเงาที่วิ่งเพซคงที่', () => {
    const g = { km: 5, seconds: 1500, label: '' } // 5:00/กม.
    expect(ghostLead(g, 1000, 290)).toBe(10)
    expect(ghostLead(g, 1000, 305)).toBe(-5)
    expect(ghostMeters(g, 150)).toBe(500)
    expect(ghostMeters(g, 9999)).toBe(5000)
    expect(ghostText(10)).toBe('นำเงา 10 วินาที')
    expect(ghostText(-5.4)).toBe('ตามหลังเงา 5 วินาที')
    expect(ghostText(1)).toBe('วิ่งเคียงเงา')
  })
  it('วันแข่งระยะไม่มาตรฐาน: เงาวิ่งครบระยะงาน เวลาปรับด้วย Riegel', () => {
    const g = raceGhost('tenK', 3600, undefined, 11.55)!
    expect(g.km).toBe(11.55)
    expect(g.seconds).toBe(Math.round(3600 * 1.155 ** 1.07))
    expect(g.label).toContain('11.55 กม.')
  })
})

describe('planGoal', () => {
  it('uses the goal unless it is over 10% faster than the prediction', async () => {
    const { planGoal } = await import('../racePlan')
    expect(planGoal(undefined, 5124.4)).toEqual({ sec: 5124, from: 'prediction', capped: false })
    expect(planGoal(4800, 5124)).toEqual({ sec: 4800, from: 'goal', capped: false })
    // เป้า 10K 55:00 กับคาดการณ์ ~1:25 → ใช้ 90% ของคาดการณ์
    expect(planGoal(3300, 5124)).toEqual({ sec: 4612, from: 'goal', capped: true })
    expect(planGoal(3300, null)).toEqual({ sec: 3300, from: 'goal', capped: false })
    expect(planGoal(undefined, null)).toBeNull()
  })
})
