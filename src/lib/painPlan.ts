import type { Day, Exercise } from '../data/workouts'
import { addDays } from './date'
import { EASE_HOW } from './easeOff'
import type { PainArea, Readiness } from './readiness'

// ปวดขา (น่อง/เอ็นร้อยหวาย/เท้า/หน้าแข้ง/เข่า) ที่บันทึกในแบบเช็กความพร้อม → แผน 7 วันถัดไปตัดส่วนที่กดเนื้อเยื่อมากที่สุดออกเอง (pure, tested)
// แรงที่เอ็นร้อยหวายเพิ่มตามความเร็ววิ่ง (Ertman 2023) และท่ากระโดดเขย่งกดเอ็นมากที่สุดในบรรดาท่าฝึก (Baxter 2021)
// วิ่งเบายังทำต่อได้ถ้าปวดไม่เกิน ~3/10 และไม่แย่ลงวันรุ่งขึ้น (pain-monitoring, Silbernagel 2007) ไม่แตะวันแข่ง
// เข่า (เช่น IT band): ลดระยะวิ่งยาว เลี่ยงลงเนิน และเพิ่มท่าสะโพกด้านข้าง (Fredericson 2000: กล้ามกางสะโพกอ่อนในนักวิ่งที่เจ็บ IT band ฝึก 6 สัปดาห์แล้วหาย)
// หลังช่วงถนอมขา 7 วัน มีช่วงกลับมาซ้อมอีก 7 วัน: ช่วงเร็วเป็น strides วิ่งยาว ≤90% ยังงดกระโดด (ไม่กลับไปเต็มในวันเดียว)
const LOWER_LEG: PainArea[] = ['achilles', 'calf', 'foot', 'shin']
export const GUARD_AREAS: PainArea[] = [...LOWER_LEG, 'knee']
export const PAIN_DAYS = 7
export const RETURN_DAYS = 7
/** ดูย้อนหลังว่าเคยเจ็บเข่าไหม (ใช้เลือกแบบเข่า) */
const KNEE_WATCH = 28
const JUMPS = new Set(['Pogo Jumps', 'Jump Squat', 'Jump Rope'])
const HIP = new Set(['Side-lying Hip Abduction', 'Banded Lateral Walk', 'Banded Lateral Walk (ยางยืด)'])

export const PAIN_NOTES = {
  run: 'บันทึกว่าปวดน่อง/เอ็นร้อยหวาย/เท้าใน 7 วันล่าสุด: งดช่วงเร็ว strides และเนินไว้ก่อน วิ่งเบาแทน ปวดได้ไม่เกิน 3 จาก 10 และไม่แย่ลงวันรุ่งขึ้น',
  strength: 'บันทึกว่าปวดน่อง/เอ็นร้อยหวาย/เท้าใน 7 วันล่าสุด: งดท่ากระโดดไว้ก่อน เขย่งช้า ๆ (ขึ้น 3 วิ ลง 3 วิ) ได้ถ้าปวดไม่เกิน 3 จาก 10',
  kneeRun: 'เจ็บเข่า: วิ่งทางราบ เลี่ยงลงเนิน ถ้าเริ่มเจ็บด้านข้างเข่าระหว่างวิ่งให้หยุดแล้วเดินกลับ อย่าฝืน',
  kneeLong: 'เจ็บเข่า: วิ่งยาวลดเหลือ 80% ของแผน',
  kneeStrength: 'เจ็บเข่า: เพิ่มท่าสะโพกด้านข้าง งดสควอตลึก ลันจ์ หรือท่าที่เจ็บเกิน 3 จาก 10',
  backRun: 'ช่วงกลับมาซ้อม: ช่วงเร็วเปลี่ยนเป็นวิ่งเบา + strides สั้น ๆ เช้าวันรุ่งขึ้นเจ็บเกิน 3 จาก 10 ให้กลับไปวิ่งเบาอย่างเดียว',
  backLong: 'ช่วงกลับมาซ้อม: วิ่งยาวไม่เกิน 90% ของแผน',
  backStrength: 'ช่วงกลับมาซ้อม: ยังงดท่ากระโดดอีกสัปดาห์ เขย่งช้า ๆ ต่อได้',
}

const hipExercise: Exercise = {
  name: 'Side-lying Hip Abduction', th: 'นอนตะแคงยกขา (สะโพกด้านข้าง)', sets: '3', reps: '15–20 / ข้าง', rest: '45 วิ',
  cue: 'สะโพกด้านข้างอ่อน → สะโพกตก/เจ็บ IT band ตอนวิ่ง ขาบนตรง ยกช้า ค้าง 1 วิ', video: 'side lying hip abduction form',
}

const isGuardPain = (r: Readiness | undefined) => !!r?.pain && !!r.areas?.some(a => GUARD_AREAS.includes(a))

/** วันสุดท้ายที่แผนยังปรับตามอาการปวดขา (null = ไม่มีบันทึกปวดใน 7 วันล่าสุด)
 * `extra`: วันที่เช็กขาตอนเช้าแล้วเกิน 3/10 หรือแย่ลง (tendon.ts) นับเหมือนบันทึกปวด */
export function painGuardUntil(log: Record<string, Readiness>, today: string, extra: string[] = []): string | null {
  return lastPain(log, today, extra, PAIN_DAYS) ?? null
}

function lastPain(log: Record<string, Readiness>, today: string, extra: string[], days: number) {
  const from = addDays(today, -(days - 1))
  const last = [...Object.keys(log).filter(d => isGuardPain(log[d])), ...extra].filter(d => d >= from && d <= today).sort().at(-1)
  return last ? addDays(last, PAIN_DAYS - 1) : undefined
}

export type LegPhase = {
  /** วันสุดท้ายของแผนถนอมขา (null = ไม่อยู่ในช่วงนี้ หรือกด "หายแล้ว") */
  guard: string | null
  /** วันสุดท้ายของช่วงกลับมาซ้อม (null = ไม่อยู่ในช่วงนี้) */
  back: string | null
  /** วันสิ้นสุดช่วงถนอมขาก่อนกดปิด (ใช้กับปุ่ม "หายแล้ว") */
  raw: string | null
  /** เคยบันทึกเจ็บเข่าใน 28 วัน → ปรับแบบเข่าด้วย */
  knee: boolean
}

/** off: `${วันสิ้นสุดช่วงถนอมขา}|${วันที่กดหายแล้ว}` (ค่าเก่ามีแค่วันสิ้นสุด = ปิดโดยไม่มีช่วงกลับมาซ้อม) */
export const offValue = (raw: string, on: string) => `${raw}|${on}`

/** ช่วงของขาวันนี้: ถนอมขา 7 วันจากวันที่เจ็บล่าสุด → กลับมาซ้อม 7 วัน → แผนเต็ม
 * กด "หายแล้ว" ระหว่างถนอมขา: ช่วงกลับมาซ้อมเริ่มวันนั้นเลย */
export function legPhase(log: Record<string, Readiness>, today: string, extra: string[] = [], off = '', backOff = ''): LegPhase {
  const end = lastPain(log, today, extra, PAIN_DAYS + RETURN_DAYS)
  const kneeFrom = addDays(today, -(KNEE_WATCH - 1))
  const knee = Object.keys(log).some(d => d >= kneeFrom && d <= today && log[d]?.pain && log[d].areas?.includes('knee'))
  if (!end) return { guard: null, back: null, raw: null, knee }
  const [offEnd, offOn] = off.split('|')
  const cleared = offEnd === end
  const raw = today <= end ? end : null
  const guard = raw && !cleared ? raw : null
  // ปิดแบบเก่า (ไม่มีวันที่กด) = ไม่มีช่วงกลับมาซ้อม
  const backStart = cleared ? (offOn && offOn <= end ? offOn : null) : addDays(end, 1)
  const backEnd = backStart ? addDays(backStart, RETURN_DAYS - 1) : null
  const back = !guard && backStart && backEnd && today >= backStart && today <= backEnd && backEnd !== backOff ? backEnd : null
  return { guard, back, raw, knee }
}

const fast = (d: Day) => d.runKind === 'tempo' || d.runKind === 'interval' || /strides|เนินสั้น/i.test(d.title)
const quality = (d: Day) => d.runKind === 'tempo' || d.runKind === 'interval'
const join = (a: string | undefined, b: string) => (a?.includes(b) ? a : [a, b].filter(Boolean).join(' · '))
const roundHalf = (km: number) => Math.max(2, Math.floor(km * 2) / 2)

/** ลดระยะวันวิ่งยาว (วันที่มีเสียงนำไม่แตะ เพราะจำนวนรอบคิดจากระยะ) */
function shorten(d: Day, f: number, note: string): Day {
  if (d.runKind !== 'long' || !d.targetKm || d.guide) return d
  const km = Math.min(d.targetKm, roundHalf(d.targetKm * f))
  if (km === d.targetKm) return d
  const was = `${d.targetKm} กม.`
  return { ...d, targetKm: km, duration: d.duration === was ? `${km} กม.` : d.duration, note: join(d.note, note),
    exercises: d.exercises.map(e => (e.reps === was ? { ...e, reps: `${km} กม.` } : e)) }
}

const toEasy = (d: Day, note: string, how: string, title = 'Easy run'): Day => ({
  ...d, title, runKind: 'easy', guide: undefined, note: join(d.note, note),
  exercises: [{ name: title, th: how, sets: '1', reps: d.targetKm ? `${d.targetKm} กม.` : d.duration, rest: '-', cue: how, video: 'easy run zone 2 running how to' }],
})

/** ตั้งแต่วันนี้ถึง until: วัน strides/เนินสั้น/tempo/interval → วิ่งเบาระยะเดิม, วันเวทตัดท่ากระโดด
 *  knee: วิ่งยาวเหลือ 80% ทุกวันวิ่งเลี่ยงลงเนิน และวันเวทมีท่าสะโพกด้านข้าง */
export function applyPainGuard(days: Day[], monday: string, today: string, until: string | null, knee = false): Day[] {
  if (!until) return days
  return days.map((d, i) => {
    const date = addDays(monday, i)
    if (date < today || date > until || d.runKind === 'race') return d
    if (d.type === 'run') {
      let out = fast(d) ? toEasy(d, PAIN_NOTES.run, EASE_HOW.sore) : d
      if (!knee) return out
      const s = shorten(out, 0.8, PAIN_NOTES.kneeLong)
      return { ...s, note: join(s.note, PAIN_NOTES.kneeRun) }
    }
    if (d.type === 'strength') {
      const jumps = d.exercises.some(e => JUMPS.has(e.name))
      if (!jumps && !knee) return d
      let exercises = d.exercises.filter(e => !JUMPS.has(e.name))
      let note = jumps ? join(d.note, PAIN_NOTES.strength) : d.note
      if (knee) {
        if (!exercises.some(e => HIP.has(e.name))) exercises = [...exercises, hipExercise]
        note = join(note, PAIN_NOTES.kneeStrength)
      }
      return { ...d, exercises, note }
    }
    return d
  })
}

/** ช่วงกลับมาซ้อม (ตั้งแต่วันนี้ถึง until): tempo/interval → วิ่งเบา + strides, วิ่งยาว ≤90%, ยังงดกระโดด */
export function applyReturn(days: Day[], monday: string, today: string, until: string | null): Day[] {
  if (!until) return days
  return days.map((d, i) => {
    const date = addDays(monday, i)
    if (date < today || date > until || d.runKind === 'race') return d
    if (d.type === 'run') {
      if (quality(d)) return toEasy(d, PAIN_NOTES.backRun, 'วิ่งเบา แล้ว Strides 4 × 20 วิ', 'Easy run + Strides')
      return shorten(d, 0.9, PAIN_NOTES.backLong)
    }
    if (d.type === 'strength' && d.exercises.some(e => JUMPS.has(e.name)))
      return { ...d, exercises: d.exercises.filter(e => !JUMPS.has(e.name)), note: join(d.note, PAIN_NOTES.backStrength) }
    return d
  })
}
