import { describe, expect, it } from 'vitest'
import { elevStats, sampleRoute } from '../elevation'
import type { Point } from '../geo'

describe('elevation', () => {
  it('samples evenly by distance and keeps both ends', () => {
    // จุดถี่ช่วงแรก ห่างช่วงหลัง เลือกตามระยะ ไม่ใช่ตามลำดับ
    const route: Point[] = [...Array.from({ length: 300 }, (_, i) => [13 + i * 0.00001, 100] as Point), ...Array.from({ length: 50 }, (_, i) => [13.003 + i * 0.001, 100] as Point)]
    const s = sampleRoute(route, 100)
    expect(s).toHaveLength(100)
    expect(s[0]).toEqual(route[0])
    expect(s[99]).toEqual(route.at(-1))
    expect(s.filter(p => p[0] < 13.003).length).toBeLessThan(10)
  })
  it('sums climbs and ignores sub-metre noise', () => {
    expect(elevStats([150, 150.4, 150, 155, 160, 158, 165])).toEqual({ gain: 17, loss: 2, max: 165, min: 150 })
    expect(elevStats([150, 150.5, 150, 150.5, 150])).toMatchObject({ gain: 0, loss: 0 })
  })
})
