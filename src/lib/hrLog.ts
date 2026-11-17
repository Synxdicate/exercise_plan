import { hrZone } from './zone'

// สายวัดชีพจร (บลูทูธ มาตรฐาน Heart Rate Service 0x180D) — ส่วนที่ไม่ขึ้นกับอุปกรณ์ (pure, tested)

/** ค่า Heart Rate Measurement (0x2A37): bit 0 ของ flags = ชีพจรเป็น uint16 ไม่งั้น uint8 */
export function parseHeartRate(b: Uint8Array): number | null {
  if (b.length < 2) return null
  const bpm = b[0] & 1 ? (b.length >= 3 ? b[1] | (b[2] << 8) : null) : b[1]
  return bpm && bpm >= 25 && bpm <= 250 ? bpm : null
}

export type RunHr = {
  avg: number
  max: number
  /** วินาทีในโซน 1–5 (ดัชนี 0–4) ต่ำกว่าโซน 1 ไม่นับ */
  zones: number[]
  /** ชีพจรเฉลี่ยทุก 30 วินาทีของเวลาวิ่ง */
  series: number[]
  /** ชีพจรสูงสุดที่ใช้แบ่งโซนตอนวิ่ง */
  ref: number
}

export const HR_BUCKET = 30
/** ช่องว่างระหว่างค่าที่นานกว่านี้ (สายหลุด/หยุด) ไม่นับเวลา */
const MAX_GAP = 5

/** สะสมชีพจรระหว่างวิ่งตามเวลาวิ่งจริง (ไม่รวมหยุด): เฉลี่ยถ่วงเวลา สูงสุด เวลาในแต่ละโซน และค่าทุก 30 วิ */
export class HrRecorder {
  private last: { t: number; bpm: number } | null = null
  private sum = 0
  private time = 0
  private top = 0
  private zones = [0, 0, 0, 0, 0]
  private buckets: { sum: number; time: number }[] = []
  private ref: number
  constructor(ref: number) { this.ref = ref }

  /** t = เวลาวิ่ง (วินาที), bpm = ค่าล่าสุดจากสาย (null = ไม่มีสัญญาณ) */
  add(t: number, bpm: number | null) {
    if (bpm === null) { this.last = null; return }
    const prev = this.last
    this.last = { t, bpm }
    this.top = Math.max(this.top, bpm)
    if (!prev) return
    const dt = t - prev.t
    if (dt <= 0 || dt > MAX_GAP) return
    this.sum += prev.bpm * dt
    this.time += dt
    const z = hrZone(prev.bpm, this.ref)
    if (z > 0) this.zones[z - 1] += dt
    const i = Math.floor(prev.t / HR_BUCKET)
    while (this.buckets.length <= i) this.buckets.push({ sum: 0, time: 0 })
    this.buckets[i].sum += prev.bpm * dt
    this.buckets[i].time += dt
  }

  /** ผลของการวิ่ง (undefined = มีข้อมูลไม่ถึง 1 นาที) */
  result(): RunHr | undefined {
    if (this.time < 60) return undefined
    // ช่วงที่ไม่มีข้อมูลใช้ค่าก่อนหน้า กราฟจะได้ไม่ตกเป็น 0
    let fill = 0
    const series = this.buckets.map(b => (fill = b.time ? Math.round(b.sum / b.time) : fill))
    return { avg: Math.round(this.sum / this.time), max: this.top, zones: this.zones.map(Math.round), series, ref: this.ref }
  }
}
