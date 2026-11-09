import { describe, expect, it } from 'vitest'
import { atKm, findClimbs, gapSplits, gradeFactor, runCost } from '../grade'

// 3 กม. 121 จุด (ทุก 25 ม.): ราบ 1 กม. → ขึ้น 20 ม. ใน 0.5 กม. (4%) → ราบ
const n = 121, km = 3
const hill = Array.from({ length: n }, (_, i) => { const d = (i / (n - 1)) * km; return 100 + (d <= 1 ? 0 : d >= 1.5 ? 20 : (d - 1) * 40) })

describe('grade / GAP (Minetti 2002)', () => {
  it('flat costs 3.6 J/kg/m, uphill more, gentle downhill less', () => {
    expect(runCost(0)).toBeCloseTo(3.6)
    expect(gradeFactor(0.1)).toBeGreaterThan(1.5)
    expect(gradeFactor(-0.05)).toBeLessThan(1)
    expect(gradeFactor(-0.3)).toBeGreaterThan(gradeFactor(-0.1)) // ลงชันมากต้องเบรก กลับเหนื่อยขึ้น
  })
  it('finds the climb with its gain and average grade', () => {
    const c = findClimbs(hill, km)
    expect(c).toHaveLength(1)
    expect(c[0].gain).toBeGreaterThanOrEqual(18)
    expect(c[0].avg).toBeGreaterThanOrEqual(2.5)
    expect(c[0].avg).toBeLessThan(5)
    expect(c[0].fromKm).toBeGreaterThan(0.8)
  })
  it('ignores a flat route with DEM noise', () => {
    const noisy = Array.from({ length: n }, (_, i) => 100 + (i % 2 ? 1 : -1))
    expect(findClimbs(noisy, km)).toEqual([])
  })
  it('GAP makes the uphill km faster than its raw split and leaves flat kms alone', () => {
    const gap = gapSplits([420, 480, 420], hill, km)
    expect(Math.abs(gap[0]! - 420)).toBeLessThan(5)
    expect(gap[1]!).toBeLessThan(450)
    expect(gap[2]!).toBeCloseTo(420, -1)
  })
  it('reads elevation and grade at a distance', () => {
    const p = atKm(hill, km, 1.25)
    expect(p.elev).toBeCloseTo(110, 0)
    expect(p.grade).toBeGreaterThan(0.03)
  })
})

describe('coursePacePlan', () => {
  it('adds up to the goal, slows on the climb and the first 2 km', async () => {
    const { coursePacePlan } = await import('../grade')
    const plan = coursePacePlan(1350, km, hill) // 3 กม. 22:30
    expect(plan).toHaveLength(3)
    expect(plan.at(-1)!.at).toBeCloseTo(1350, 0)
    expect(plan[1].pace).toBeGreaterThan(plan[0].pace) // กม. 2 มีเนิน
    expect(plan[1].up).toBeGreaterThan(10)
    expect(plan[2].pace).toBeLessThan(plan[0].pace) // กม. 3 ราบ ไม่ใช่ช่วงออกตัว
  })
  it('handles a partial last km (11.55 km)', async () => {
    const { coursePacePlan } = await import('../grade')
    const flat = Array.from({ length: 200 }, () => 160)
    const plan = coursePacePlan(11.55 * 600, 11.55, flat)
    expect(plan).toHaveLength(12)
    expect(plan.at(-1)!.km).toBeCloseTo(11.55)
    expect(plan.at(-1)!.at).toBeCloseTo(6930, 0)
  })
})
