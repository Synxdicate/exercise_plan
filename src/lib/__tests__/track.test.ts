import { describe, expect, it } from 'vitest'
import { TrackFilter, type Fix } from '../track'

// ตัวสุ่มที่ทำซ้ำได้ + noise แบบ Gaussian (Box–Muller)
function rng(seed: number) {
  let s = seed
  const u = () => ((s = (s * 1664525 + 1013904223) % 2 ** 32) / 2 ** 32)
  return () => Math.sqrt(-2 * Math.log(u() + 1e-12)) * Math.cos(2 * Math.PI * u())
}
const M_LAT = 1 / 111320
const M_LON = 1 / (111320 * Math.cos((16.4 * Math.PI) / 180))

function run(points: { x: number; y: number }[], sigma: number, acc: number, seed = 1, speed?: (i: number) => number | null) {
  const g = rng(seed)
  const f = new TrackFilter()
  let meters = 0
  points.forEach((pt, i) => {
    const fix: Fix = {
      lat: 16.4 + (pt.y + g() * sigma) * M_LAT,
      lon: 102.8 + (pt.x + g() * sigma) * M_LON,
      acc, t: i * 1000, speed: speed?.(i),
    }
    const r = f.process(fix)
    if (r.kind === 'step') meters += r.d
  })
  return meters + f.flush()
}

describe('GPS distance filter (simulated noise)', () => {
  it('วิ่งตรง 1 กม. ที่ 3 ม./วิ, GPS คลาด σ=4 ม. → ระยะคลาดไม่เกิน ±3%', () => {
    for (const seed of [1, 2, 3, 4, 5]) {
      const pts = Array.from({ length: 334 }, (_, i) => ({ x: 0, y: i * 3 }))
      const m = run(pts, 4, 8, seed)
      expect(Math.abs(m - 999) / 999).toBeLessThan(0.03)
    }
  })

  it('วิ่งรอบลู่ (รัศมี 36.5 ม.) 3 รอบ → ไม่ตัดโค้งจนระยะขาดเกิน 5%', () => {
    const r = 36.5
    const circ = 2 * Math.PI * r
    const n = Math.round((circ * 3) / 3.2)
    const pts = Array.from({ length: n }, (_, i) => {
      const a = (i * 3.2) / r
      return { x: r * Math.cos(a), y: r * Math.sin(a) }
    })
    const expected = (n - 1) * 3.2
    const m = run(pts, 3, 6, 7)
    expect(Math.abs(m - expected) / expected).toBeLessThan(0.05)
  })

  it('ยืนรอไฟแดง 2 นาที GPS สั่น σ=5 ม. → ระยะงอกไม่เกิน 25 ม.', () => {
    const pts = Array.from({ length: 120 }, () => ({ x: 0, y: 0 }))
    expect(run(pts, 5, 10, 3)).toBeLessThan(25)
  })

  it('มีความเร็วจาก GPS (Doppler) บอกว่าหยุด → แทบไม่นับระยะ', () => {
    const pts = Array.from({ length: 120 }, () => ({ x: 0, y: 0 }))
    expect(run(pts, 5, 10, 3, () => 0.1)).toBeLessThan(5)
  })

  it('จุดเวลาซ้ำไม่ถูกนับ', () => {
    const f = new TrackFilter()
    const base = { lon: 102.8, acc: 5, speed: null }
    f.process({ ...base, lat: 16.4, t: 0 })
    f.process({ ...base, lat: 16.4 + 3 * M_LAT, t: 1000 })
    expect(f.process({ ...base, lat: 16.4 + 30 * M_LAT, t: 1000 }).kind).toBe('ignored')
  })

  it('วิ่ง 300 ม. → หยุด 1 นาที → วิ่งต่อ 300 ม. ระยะคลาดไม่เกิน 3%', () => {
    const pts = [...Array.from({ length: 100 }, (_, i) => ({ x: 0, y: i * 3 })), ...Array.from({ length: 60 }, () => ({ x: 0, y: 297 })), ...Array.from({ length: 100 }, (_, i) => ({ x: 0, y: 297 + i * 3 }))]
    expect(Math.abs(run(pts, 4, 8, 9) - 594) / 594).toBeLessThan(0.03)
  })

  it('Interval: สลับเร็ว 4.5 ม./วิ กับจ็อก 2.5 ม./วิ → ระยะคลาดไม่เกิน 4%', () => {
    let y = 0
    const pts = Array.from({ length: 600 }, (_, i) => ({ x: 0, y: (y += Math.floor(i / 60) % 2 ? 2.5 : 4.5) }))
    const total = pts.at(-1)!.y - pts[0].y
    expect(Math.abs(run(pts, 4, 8, 11) - total) / total).toBeLessThan(0.04)
  })

  it('จุดกระโดด (เร็วเกิน 36 กม./ชม.) ถูกทิ้ง', () => {
    const f = new TrackFilter()
    f.process({ lat: 16.4, lon: 102.8, acc: 5, t: 0 })
    expect(f.process({ lat: 16.4 + 200 * M_LAT, lon: 102.8, acc: 5, t: 1000 }).kind).toBe('ignored')
  })

  it('จุดแรกที่ไม่แม่น (>20 ม.) ยังไม่เริ่มนับ', () => {
    const f = new TrackFilter()
    expect(f.process({ lat: 16.4, lon: 102.8, acc: 25, t: 0 }).kind).toBe('ignored')
    expect(f.process({ lat: 16.4, lon: 102.8, acc: 8, t: 1000 }).kind).toBe('start')
  })

  it('เดิน 1.2 ม./วิ (ไม่มี Doppler) 10 นาที → ระยะคลาดไม่เกิน 5% (เดิมนับได้แค่ ~40%)', () => {
    for (const seed of [1, 2, 3]) {
      const pts = Array.from({ length: 600 }, (_, i) => ({ x: 0, y: i * 1.2 }))
      expect(Math.abs(run(pts, 4, 8, seed) - 599 * 1.2) / (599 * 1.2)).toBeLessThan(0.05)
    }
  })

  it('วิ่งสลับเดิน (จ็อก 2.2 ม./วิ 1 นาที / เดิน 1.3 ม./วิ 2 นาที × 6) → ระยะคลาดไม่เกิน 5%', () => {
    let y = 0
    const pts = Array.from({ length: 1080 }, (_, i) => ({ x: 0, y: (y += i % 180 < 60 ? 2.2 : 1.3) }))
    const total = pts.at(-1)!.y - pts[0].y
    for (const seed of [4, 5]) expect(Math.abs(run(pts, 4, 8, seed) - total) / total).toBeLessThan(0.05)
  })

  it('สัญญาณขาด 60 วิระหว่างวิ่ง → นับระยะเส้นตรงข้ามช่วงที่ขาด (เดิมหายทั้งช่วง ~150 ม.)', () => {
    const f = new TrackFilter()
    const g = rng(21)
    let m = 0
    for (let i = 0; i < 600; i++) {
      if (i >= 200 && i < 260) continue // ไม่มีจุด GPS 60 วิ
      const r = f.process({ lat: 16.4 + (i * 2.5 + g() * 4) * M_LAT, lon: 102.8 + g() * 4 * M_LON, acc: 8, t: i * 1000 })
      if (r.kind === 'step') m += r.d
    }
    m += f.flush()
    expect(Math.abs(m - 599 * 2.5) / (599 * 2.5)).toBeLessThan(0.04)
  })

  it('ยืนนิ่งแล้วสัญญาณขาด → ไม่เพิ่มระยะ', () => {
    const f = new TrackFilter()
    let m = 0
    for (const t of [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 100, 101, 102]) {
      const r = f.process({ lat: 16.4, lon: 102.8, acc: 6, t: t * 1000, speed: 0 })
      if (r.kind === 'step') m += r.d
    }
    expect(m).toBeLessThan(5)
  })
})

describe('addSplits', () => {
  it('interpolates the 1 km crossing between anchors', async () => {
    const { addSplits } = await import('../track')
    // จาก 990 ม. (เวลา 300 วิ) ไป 1016 ม. (310 วิ): ผ่าน 1000 ม. ที่ ~303.8 วิ
    expect(addSplits([], 990, 300, 1016, 310)).toEqual([304])
    // ข้ามสองหลัก (ช่วงสัญญาณขาด)
    expect(addSplits([300], 1900, 580, 3100, 940)).toEqual([300, 310, 300])
  })
})

