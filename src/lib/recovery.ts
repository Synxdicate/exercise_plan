// ฟื้นตัวหลังแข่ง/วิ่งทดสอบ: ช่วงที่ควรวิ่งเบาหรือพัก ไม่วิ่งหนัก (แนวทางโค้ช — ครูดิน, บ้านพ่อพอดแคสต์ EP.13:
// 10K 2–3 วัน, ฮาล์ฟ 7–10 วัน, มาราธอน ≥14 วัน) · ไม่มีงานวิจัยที่ให้ตัวเลขแน่นอน ใช้เป็นแนวทาง
import type { Run } from './log'
import { addDays, daysBetween } from './date'

export function recoveryDays(km: number) {
  if (km >= 40) return 14
  if (km >= 20) return 8
  if (km >= 9) return 3
  return 2
}

/** การแข่ง (ชนิด "แข่ง") ล่าสุดที่ยังอยู่ในช่วงฟื้นตัว ณ วันที่ asOf */
export function activeRecovery(runs: Run[], asOf: string) {
  const race = runs.filter(r => r.kind === 'race' && r.date <= asOf && r.km >= 3).at(-1)
  if (!race) return null
  const days = recoveryDays(race.km)
  const left = days - daysBetween(race.date, asOf)
  return left > 0 ? { race, days, left, until: addDays(race.date, days) } : null
}

/** วิ่งเบา/วิ่งยาวเร็วกว่าโซนเบากี่วินาที/กม. (null = ไม่เร็วเกิน หรือไม่มีข้อมูลอ้างอิงที่เชื่อถือได้) */
export function easyTooFast(run: Run, easyFloor: number | undefined) {
  if (!easyFloor || (run.kind !== 'easy' && run.kind !== 'long') || run.guide || run.km < 2) return null
  const pace = run.seconds / run.km
  const over = easyFloor - pace
  return over > 10 ? Math.round(over) : null
}
