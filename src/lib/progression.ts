import type { Exercise } from '../data/workouts'
import type { SetEntry } from './log'
import { repsEn } from './dayText'

// Double progression: ทำได้ถึงจำนวนครั้งสูงสุดของช่วงครบทุกเซ็ต → เพิ่มน้ำหนัก แล้วกลับไปเริ่มที่ช่วงล่าง
const LOWER = /squat|deadlift|rdl|split|lunge|hip thrust|leg press/i

export type Suggestion = { kg: number | null; text: string; textEn: string; up: boolean }

export function suggest(e: Exercise, prev: SetEntry[] | undefined): Suggestion {
  const nums = e.reps.match(/\d+/g)?.map(Number) ?? []
  const min = nums[0] ?? 0
  const max = nums[1] ?? min
  const sets = parseInt(e.sets, 10) || 1

  if (!prev?.length)
    return { kg: null, up: false, text: `ครั้งแรก: เลือกน้ำหนักที่ทำได้ ${e.reps} โดยยังเหลือแรงอีก 2–3 ครั้ง แล้วจดไว้`, textEn: `First time: pick a weight you can do for ${repsEn(e.reps)} with 2–3 reps left, and note it` }

  const lastKg = Math.max(...prev.map(s => s.kg))
  const allHit = prev.length >= sets && prev.every(s => s.reps >= max)

  // ทำได้ไม่ถึงครึ่งของช่วงล่างทุกเซ็ต: หนักเกิน กล้ามได้ผลดีเมื่อทำได้ในช่วงที่ตั้งไว้ใกล้หมดแรง (Schoenfeld 2017)
  const best = Math.max(...prev.map(s => s.reps))
  // ท่าน้ำหนักตัวที่มีท่าง่ายกว่า (ไม่มี easier = อาจแค่ยังไม่ได้ใส่น้ำหนัก ไม่เดาว่ายากเกิน)
  if (min >= 4 && best < min / 2 && (lastKg > 0 || e.easier))
    return lastKg > 0
      ? { kg: Math.round(lastKg * 0.85 / 2.5) * 2.5 || null, up: false, text: `ครั้งก่อนได้สูงสุด ${best} ครั้ง น้อยกว่าช่วง ${e.reps} มาก ลดน้ำหนักลง ~15% ให้ทำได้ ${min} ครั้งขึ้นไป`, textEn: `Best set last time was ${best} reps, well under ${repsEn(e.reps)}. Drop the weight ~15% so you get at least ${min}` }
      : { kg: null, up: false, text: `ครั้งก่อนได้สูงสุด ${best} ครั้ง ยังยากเกินช่วง ${e.reps} ใช้ ${e.easier} แทนก่อน (กดสลับท่า) จนทำได้ ${min} ครั้ง`, textEn: `Best set last time was ${best} reps, too hard for ${repsEn(e.reps)}. Use ${e.easier} for now (swap) until you get ${min}` }

  if (!allHit)
    return { kg: lastKg || null, up: false, text: `ใช้ ${lastKg ? `${lastKg} กก.` : 'ท่าเดิม'} ต่อ พยายามเพิ่ม 1 ครั้งในเซ็ตที่ยังไม่ถึง ${max}`, textEn: `Stay at ${lastKg ? `${lastKg} kg` : 'this variation'}; add 1 rep to sets below ${max}` }

  if (lastKg === 0)
    return { kg: null, up: true, text: e.harder ? `ทำครบทุกเซ็ตแล้ว! ลองขยับไปท่าที่ยากขึ้น: ${e.harder}` : `ทำครบทุกเซ็ตแล้ว! ถ่วงน้ำหนักเพิ่ม (กระเป๋า/ขวดน้ำ) หรือทำจังหวะลงช้า 3 วิ`, textEn: e.harder ? `All sets done! Try a harder variation: ${e.harder}` : `All sets done! Add load (backpack/water bottles) or use a 3 s lowering` }

  const next = lastKg + (LOWER.test(e.name) ? 5 : 2.5)
  return { kg: next, up: true, text: `ครั้งก่อนทำครบ ${max} ครั้งทุกเซ็ต → เพิ่มเป็น ${next} กก. แล้วเริ่มที่ ${min} ครั้ง`, textEn: `Hit ${max} reps on every set last time → go to ${next} kg and restart at ${min} reps` }
}

// เวลาพักจากข้อความในแผน: "2–3 นาที" → 150, "90 วิ" → 90
export function restSeconds(rest: string) {
  const nums = rest.match(/\d+/g)?.map(Number)
  if (!nums?.length) return 60
  const avg = nums.reduce((s, n) => s + n, 0) / nums.length
  return Math.round(rest.includes('นาที') ? avg * 60 : avg)
}
