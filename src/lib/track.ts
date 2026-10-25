import type { Point } from './geo'

// ตัวกรองจุด GPS สำหรับวัดระยะวิ่ง — โมดูลล้วน ไม่พึ่ง browser จึงทดสอบด้วยการจำลองได้ (track.test.ts)
//
// วิธี (ปรับค่าด้วยการจำลอง noise ดู track.test.ts):
// 1) Kalman แบบความเร็วคงที่ (ตำแหน่ง+ความเร็ว ต่อแกน) ในหน่วยเมตร — ลด noise โดยไม่ตามหลังตอนวิ่ง
// 2) นับระยะเฉพาะตอนเคลื่อนที่จริง (ความเร็วจาก Doppler ถ้ามี ไม่งั้นใช้ความเร็วจากตัวกรอง)
// 3) นับระยะจาก "จุดยึด" ทุก ~15 ม. แทนการรวมทีละวินาที — กันการส่ายของ noise สะสมเป็นระยะเกินจริง
//    (บนโค้งลู่วิ่ง คอร์ด 15 ม. ต่างจากความยาวโค้งไม่ถึง 1%)

export const MAX_ACCURACY_M = 30 // ทิ้งจุดที่ GPS ไม่แม่น
export const FIRST_FIX_ACCURACY_M = 20 // จุดแรกต้องแม่นพอ ไม่งั้นระยะช่วงแรกกระโดด
const ANCHOR_M = 18
const MOVING_SPEED_MS = 1.0
const MAX_SPEED_MS = 10 // ~36 กม./ชม. เกินนี้ถือว่าจุดกระโดด
const ACCEL_NOISE = 1.0 // m/s² — ความเร่งที่ยอมให้ (เปลี่ยนเพซ/เลี้ยว)
const MAX_GAP_S = 30 // ขาดสัญญาณนานกว่านี้ เริ่มตัวกรองใหม่จากจุดถัดไป

const M_PER_DEG = 111320

class Axis {
  x = 0
  v = 0
  private p11 = 0
  private p12 = 0
  private p22 = 0
  init(z: number, r: number) {
    this.x = z; this.v = 0; this.p11 = r; this.p12 = 0; this.p22 = 9
  }
  step(z: number, r: number, dt: number) {
    const q = ACCEL_NOISE * ACCEL_NOISE
    this.x += this.v * dt
    const p11 = this.p11 + dt * (2 * this.p12 + dt * this.p22) + (q * dt ** 4) / 4
    const p12 = this.p12 + dt * this.p22 + (q * dt ** 3) / 2
    const p22 = this.p22 + q * dt * dt
    const s = p11 + r
    const k1 = p11 / s
    const k2 = p12 / s
    const y = z - this.x
    this.x += k1 * y
    this.v += k2 * y
    this.p11 = (1 - k1) * p11
    this.p12 = (1 - k1) * p12
    this.p22 = p22 - k2 * p12
  }
}

export type Fix = { lat: number; lon: number; acc: number; t: number; speed?: number | null }
export type FixResult =
  | { kind: 'ignored'; p: Point | null } // ไม่แม่น/ซ้ำ/กระโดด
  | { kind: 'start'; p: Point } // จุดแรกของช่วงวิ่ง
  | { kind: 'hold'; p: Point; moving: boolean } // ยังไม่ถึงจุดยึดถัดไป (ไม่เพิ่มระยะ)
  | { kind: 'step'; p: Point; d: number; moving: true } // ถึงจุดยึดใหม่: เพิ่มระยะ d เมตร

export class TrackFilter {
  private ax = new Axis()
  private ay = new Axis()
  private origin: { lat: number; lon: number; kx: number } | null = null
  private lastT = 0
  private anchor: { x: number; y: number } | null = null
  private wasMoving = false

  reset() {
    this.origin = null
    this.anchor = null
    this.wasMoving = false
  }

  /** เศษระยะที่ยังไม่ถึงจุดยึดถัดไป — เรียกตอนจบการวิ่ง/กดพัก ไม่ให้ระยะท้ายหาย */
  flush(): number {
    if (!this.anchor || !this.wasMoving) return 0
    const d = Math.hypot(this.ax.x - this.anchor.x, this.ay.x - this.anchor.y)
    this.anchor = { x: this.ax.x, y: this.ay.x }
    return d
  }

  private toLatLon(x: number, y: number): Point {
    const o = this.origin!
    return [o.lat + y / M_PER_DEG, o.lon + x / o.kx]
  }

  process(f: Fix): FixResult {
    if (!(f.acc <= MAX_ACCURACY_M)) return { kind: 'ignored', p: null }
    if (this.origin && (f.t - this.lastT) / 1000 > MAX_GAP_S) this.reset()
    if (!this.origin) {
      if (f.acc > FIRST_FIX_ACCURACY_M) return { kind: 'ignored', p: [f.lat, f.lon] }
      this.origin = { lat: f.lat, lon: f.lon, kx: M_PER_DEG * Math.cos((f.lat * Math.PI) / 180) }
      const r = (f.acc * f.acc) / 2
      this.ax.init(0, r)
      this.ay.init(0, r)
      this.lastT = f.t
      this.anchor = { x: 0, y: 0 }
      return { kind: 'start', p: [f.lat, f.lon] }
    }
    const dt = (f.t - this.lastT) / 1000
    if (dt <= 0) return { kind: 'ignored', p: this.toLatLon(this.ax.x, this.ay.x) } // จุดซ้ำ/เวลาย้อน

    const zx = (f.lon - this.origin.lon) * this.origin.kx
    const zy = (f.lat - this.origin.lat) * M_PER_DEG
    // จุดกระโดดไกลเกินความเร็ววิ่งที่เป็นไปได้ (เทียบกับตำแหน่งที่ตัวกรองคาดไว้)
    const jump = Math.hypot(zx - (this.ax.x + this.ax.v * dt), zy - (this.ay.x + this.ay.v * dt))
    if (jump > MAX_SPEED_MS * dt + 3 * f.acc) return { kind: 'ignored', p: this.toLatLon(this.ax.x, this.ay.x) }

    const r = (f.acc * f.acc) / 2
    this.ax.step(zx, r, dt)
    this.ay.step(zy, r, dt)
    this.lastT = f.t
    const p = this.toLatLon(this.ax.x, this.ay.x)

    const speed = f.speed != null && f.speed >= 0 ? f.speed : Math.hypot(this.ax.v, this.ay.v)
    const moving = speed >= MOVING_SPEED_MS
    if (!moving) {
      // หยุดอยู่ → ย้ายจุดยึดตาม (การสั่นตอนยืนไม่ถูกนับเป็นระยะ)
      // ไม่เก็บเศษระยะตรงนี้: ความเร็วตอนยืนแกว่งข้ามเกณฑ์ไปมา จะนับเศษซ้ำ (ทดสอบแล้วระยะงอก)
      this.wasMoving = false
      this.anchor = { x: this.ax.x, y: this.ay.x }
      return { kind: 'hold', p, moving }
    }
    this.wasMoving = true
    const d = Math.hypot(this.ax.x - this.anchor!.x, this.ay.x - this.anchor!.y)
    if (d < ANCHOR_M) return { kind: 'hold', p, moving }
    this.anchor = { x: this.ax.x, y: this.ay.x }
    return { kind: 'step', p, d, moving: true }
  }
}
