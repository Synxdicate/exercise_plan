import { describe, expect, it } from 'vitest'
import { distanceByZone, zoneOf } from '../zones'

describe('pace zones (เทียบเพซ 5K = 5:00/กม.)', () => {
  it.each([[390, 'E'], [345, 'M'], [320, 'T'], [300, 'I'], [280, 'R']] as const)('%i วิ/กม. → %s', (p, z) => {
    expect(zoneOf(p, 300)).toBe(z)
  })
  it('สัดส่วนระยะตามโซนรวมได้ 100%', () => {
    const s = [{ km: 0, pace: 390 }, { km: 1, pace: 390 }, { km: 2, pace: 320 }, { km: 3, pace: 300 }]
    const z = distanceByZone(s, 300)
    expect(z.reduce((a, b) => a + b.pct, 0)).toBeCloseTo(1)
    expect(z.find(x => x.id === 'E')!.km).toBeCloseTo(1)
  })
})
