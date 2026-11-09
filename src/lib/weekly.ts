import type { Run } from './log'
import { runsOnly } from './walk'
import { addDays, weekStart } from './date'

/** elevRuns = จำนวนรอบที่มีข้อมูลความสูงแล้ว (ดึงตอนเปิดรายละเอียดการวิ่ง) */
export type WeekPoint = { monday: string; km: number; runs: number; seconds: number; gain: number; elevRuns: number }

/** ระยะวิ่งรายสัปดาห์ย้อนหลัง n สัปดาห์ (รวมสัปดาห์นี้ เก่า → ใหม่) ไม่นับเดิน (pure, tested) */
export function weeklySeries(runs: Run[], thisMonday: string, n = 12): WeekPoint[] {
  const weeks = Array.from({ length: n }, (_, i) => addDays(thisMonday, (i - n + 1) * 7))
  const by = new Map(weeks.map(w => [w, { monday: w, km: 0, runs: 0, seconds: 0, gain: 0, elevRuns: 0 }]))
  for (const r of runsOnly(runs)) {
    const p = by.get(weekStart(r.date))
    if (!p) continue
    p.km += r.km
    p.runs++
    p.seconds += r.seconds
    p.gain += r.elev?.gain ?? 0
    if (r.elev) p.elevRuns++
  }
  return weeks.map(w => {
    const p = by.get(w)!
    return { ...p, km: Math.round(p.km * 10) / 10, gain: Math.round(p.gain) }
  })
}

/** ขีดแกนตั้งแบบตัวเลขกลม ๆ (0, 5, 10 … หรือ 0, 10, 20 …) ให้ครอบค่าสูงสุด */
export function niceTicks(max: number, count = 3) {
  const raw = Math.max(1, max) / count
  const mag = 10 ** Math.floor(Math.log10(raw))
  const step = [1, 2, 2.5, 5, 10].map(m => m * mag).find(s => s >= raw) ?? 10 * mag
  return Array.from({ length: Math.ceil(Math.max(1, max) / step) + 1 }, (_, i) => +(i * step).toFixed(2))
}
