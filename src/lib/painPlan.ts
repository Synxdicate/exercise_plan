import type { Day } from '../data/workouts'
import { addDays } from './date'
import { EASE_HOW } from './easeOff'
import type { PainArea, Readiness } from './readiness'

// ปวดขาช่วงล่าง (น่อง/เอ็นร้อยหวาย/เท้า) ที่บันทึกในแบบเช็กความพร้อม → แผน 7 วันถัดไปตัดส่วนที่กดเอ็นมากที่สุดออกเอง (pure, tested)
// แรงที่เอ็นร้อยหวายเพิ่มตามความเร็ววิ่ง (Ertman 2023) และท่ากระโดดเขย่งกดเอ็นมากที่สุดในบรรดาท่าฝึก (Baxter 2021)
// วิ่งเบายังทำต่อได้ถ้าปวดไม่เกิน ~3/10 และไม่แย่ลงวันรุ่งขึ้น (pain-monitoring, Silbernagel 2007) ไม่แตะวันแข่ง
const LOWER_LEG: PainArea[] = ['achilles', 'calf', 'foot']
export const PAIN_DAYS = 7
const JUMPS = new Set(['Pogo Jumps', 'Jump Squat', 'Jump Rope'])

export const PAIN_NOTES = {
  run: 'บันทึกว่าปวดน่อง/เอ็นร้อยหวาย/เท้าใน 7 วันล่าสุด: งดช่วงเร็ว strides และเนินไว้ก่อน วิ่งเบาแทน ปวดได้ไม่เกิน 3 จาก 10 และไม่แย่ลงวันรุ่งขึ้น',
  strength: 'บันทึกว่าปวดน่อง/เอ็นร้อยหวาย/เท้าใน 7 วันล่าสุด: งดท่ากระโดดไว้ก่อน เขย่งช้า ๆ (ขึ้น 3 วิ ลง 3 วิ) ได้ถ้าปวดไม่เกิน 3 จาก 10',
}

/** วันสุดท้ายที่แผนยังปรับตามอาการปวดขาช่วงล่าง (null = ไม่มีบันทึกปวดใน 7 วันล่าสุด) */
export function painGuardUntil(log: Record<string, Readiness>, today: string): string | null {
  const from = addDays(today, -(PAIN_DAYS - 1))
  const last = Object.keys(log).filter(d => d >= from && d <= today && log[d]?.pain && log[d].areas?.some(a => LOWER_LEG.includes(a))).sort().at(-1)
  return last ? addDays(last, PAIN_DAYS - 1) : null
}

const fast = (d: Day) => d.runKind === 'tempo' || d.runKind === 'interval' || /strides|เนินสั้น/i.test(d.title)
const join = (a: string | undefined, b: string) => (a?.includes(b) ? a : [a, b].filter(Boolean).join(' · '))

/** ตั้งแต่วันนี้ถึง until: วัน strides/เนินสั้น/tempo/interval → วิ่งเบาระยะเดิม, วันเวทตัดท่ากระโดด */
export function applyPainGuard(days: Day[], monday: string, today: string, until: string | null): Day[] {
  if (!until) return days
  return days.map((d, i) => {
    const date = addDays(monday, i)
    if (date < today || date > until || d.runKind === 'race') return d
    if (d.type === 'run' && fast(d)) {
      const how = EASE_HOW.sore
      return { ...d, title: 'Easy run', runKind: 'easy', guide: undefined, note: join(d.note, PAIN_NOTES.run),
        exercises: [{ name: 'Easy run', th: how, sets: '1', reps: d.targetKm ? `${d.targetKm} กม.` : d.duration, rest: '-', cue: how, video: 'easy run zone 2 running how to' }] }
    }
    if (d.type === 'strength' && d.exercises.some(e => JUMPS.has(e.name)))
      return { ...d, exercises: d.exercises.filter(e => !JUMPS.has(e.name)), note: join(d.note, PAIN_NOTES.strength) }
    return d
  })
}
