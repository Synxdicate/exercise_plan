import type { Exercise } from '../data/workouts'
import type { SetEntry } from './log'

// Double progression: ทำได้ถึงจำนวนครั้งสูงสุดของช่วงครบทุกเซ็ต → เพิ่มน้ำหนัก แล้วกลับไปเริ่มที่ช่วงล่าง
const LOWER = /squat|deadlift|rdl|split|lunge|hip thrust|leg press/i

export type Suggestion = { kg: number | null; text: string; up: boolean }

export function suggest(e: Exercise, prev: SetEntry[] | undefined): Suggestion {
  const nums = e.reps.match(/\d+/g)?.map(Number) ?? []
  const min = nums[0] ?? 0
  const max = nums[1] ?? min
  const sets = parseInt(e.sets, 10) || 1

  if (!prev?.length)
    return { kg: null, up: false, text: `ครั้งแรก: เลือกน้ำหนักที่ทำได้ ${e.reps} โดยยังเหลือแรงอีก 2–3 ครั้ง แล้วจดไว้` }

  const lastKg = Math.max(...prev.map(s => s.kg))
  const allHit = prev.length >= sets && prev.every(s => s.reps >= max)

  if (!allHit)
    return { kg: lastKg || null, up: false, text: `ใช้ ${lastKg ? `${lastKg} กก.` : 'ท่าเดิม'} ต่อ พยายามเพิ่ม 1 ครั้งในเซ็ตที่ยังไม่ถึง ${max}` }

  if (lastKg === 0)
    return { kg: null, up: true, text: e.harder ? `ทำครบทุกเซ็ตแล้ว! ลองขยับไปท่าที่ยากขึ้น: ${e.harder}` : `ทำครบทุกเซ็ตแล้ว! ถ่วงน้ำหนักเพิ่ม (กระเป๋า/ขวดน้ำ) หรือทำจังหวะลงช้า 3 วิ` }

  const next = lastKg + (LOWER.test(e.name) ? 5 : 2.5)
  return { kg: next, up: true, text: `ครั้งก่อนทำครบ ${max} ครั้งทุกเซ็ต → เพิ่มเป็น ${next} กก. แล้วเริ่มที่ ${min} ครั้ง` }
}

// เวลาพักจากข้อความในแผน: "2–3 นาที" → 150, "90 วิ" → 90
export function restSeconds(rest: string) {
  const nums = rest.match(/\d+/g)?.map(Number)
  if (!nums?.length) return 60
  const avg = nums.reduce((s, n) => s + n, 0) / nums.length
  return Math.round(rest.includes('นาที') ? avg * 60 : avg)
}
