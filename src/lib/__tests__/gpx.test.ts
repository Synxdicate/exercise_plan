// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest'
import { parseGpx } from '../gpx'

// วิ่งตรงไปทางเหนือ ~2.2 กม. จุดละ ~111 ม. ทุก 30 วิ (เพซ ~4:30/กม.)
const gpx = (withTime = true) => `<?xml version="1.0"?><gpx><trk><trkseg>${Array.from({ length: 21 }, (_, i) =>
  `<trkpt lat="${(13.7 + i * 0.001).toFixed(4)}" lon="100.5">${withTime ? `<time>2026-10-20T00:${String(Math.floor((i * 30) / 60)).padStart(2, '0')}:${String((i * 30) % 60).padStart(2, '0')}Z</time>` : ''}</trkpt>`).join('')}</trkseg></trk></gpx>`

describe('GPX import', () => {
  it('คำนวณระยะ เวลา และเพซรายกิโล', () => {
    const r = parseGpx(gpx())
    expect(r.km).toBeGreaterThan(2.1)
    expect(r.km).toBeLessThan(2.3)
    expect(r.seconds).toBe(600)
    expect(r.splits).toHaveLength(2)
    expect(r.splits[0]).toBeGreaterThan(250)
    expect(r.splits[0]).toBeLessThan(290)
  })
  it('ไม่มีเวลา: ได้แค่ระยะ', () => {
    const r = parseGpx(gpx(false))
    expect(r.seconds).toBe(0)
    expect(r.date).toBeNull()
  })
  it('ไฟล์เสีย → error ภาษาไทย', () => {
    expect(() => parseGpx('<gpx><trk></trk></gpx>')).toThrow('ไม่พบเส้นทาง')
  })
})
