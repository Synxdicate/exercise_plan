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
  it('smooths DEM steps over ~100 m when the distance is given (flat loop with building/tree steps)', () => {
    // ลู่วน ~600 ม. 4 รอบ (2.43 กม.) โปรไฟล์จริงจาก Open-Meteo จุดทุก ~27 ม. ค่าดิบขึ้นลงเป็นขั้น 185↔203
    const p = [185,185,185,193,193,193,193,193,203,203,200,200,200,200,199,200,200,200,200,189,190,190,190,190,185,185,185,185,190,185,185,185,185,193,193,193,193,193,203,203,193,200,200,200,200,199,200,200,200,189,190,190,190,190,185,185,185,185,190,185,185,185,185,193,193,193,193,193,193,203,193,200,200,200,200,199,200,200,200,189,190,190,190,190,185,185,185,185,190,185,185]
    const raw = elevStats(p)
    const smooth = elevStats(p, 2.43)
    expect(smooth.gain).toBeLessThan(raw.gain * 0.6)
    expect(smooth).toMatchObject({ max: 203, min: 185, v: 2 })
    expect(raw.v).toBeUndefined()
  })
})
