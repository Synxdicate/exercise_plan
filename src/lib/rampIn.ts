import type { Day } from '../data/workouts'
import { guides } from './guide'
import { addDays } from './date'

// เริ่มโปรแกรมกลางทาง (เหลือเวลาถึงวันแข่งน้อยกว่าความยาวโปรแกรม): ตารางสัปดาห์นั้นอาจมากกว่าที่วิ่งอยู่จริงมาก
// มือใหม่ที่เพิ่มระยะต่อสัปดาห์เกิน 30% บาดเจ็บมากกว่า (Nielsen 2014) จึงจำกัดระยะรวมไว้ที่ระยะที่วิ่งจริง × 1.2 ต่อสัปดาห์
// จนตามตารางทัน: ตัดวันวิ่งที่ 4 ก่อน แล้วลดวิ่งเบา แล้วค่อยวิ่งยาว (ไม่แตะวันคุณภาพ) และสัปดาห์แรกยังไม่มีวิ่งหนัก ใช้ strides แทน (pure, tested)

export const RAMP = 1.2
export const RAMP_NOTE = 'เริ่มกลางโปรแกรม: ระยะสัปดาห์นี้ปรับให้ใกล้กับที่วิ่งอยู่จริง แล้วค่อยเพิ่มทีละ ~20% จนตามตารางทัน'
export const RAMP_STRIDES_NOTE = 'เริ่มกลางโปรแกรม: สัปดาห์แรกยังไม่มีวิ่งหนัก ใช้ strides แทน'
export const ACTUAL_NOTE = 'ระยะสัปดาห์นี้ปรับตามที่วิ่งได้จริง: ไม่เกินสัปดาห์ที่วิ่งมากที่สุดใน 3 สัปดาห์ก่อน + 20% วิ่งได้ตามนี้แล้วสัปดาห์ถัดไปจะเพิ่มเอง'
/** เพดานตามระยะจริงไม่ต่ำกว่านี้ (กม.) ไม่ให้แผนเหลือวิ่งวันเดียวหลังสัปดาห์ที่วิ่งน้อย */
export const ACTUAL_FLOOR = 8
const STRIDES_HOW = 'วิ่งเบา แล้วปิดท้าย Strides 6 × 20 วิ (เร่งลื่น ๆ ไม่สุดแรง เดินกลับ)'

/** ระยะวิ่งต่อสัปดาห์ที่มากที่สุดใน `weeks` สัปดาห์ก่อนวันจันทร์ `monday` (ส่งเฉพาะวิ่ง ไม่รวมเดิน) */
export function recentWeekKm(runs: { date: string; km: number }[], monday: string, weeks = 3) {
  let best = 0
  for (let k = 1; k <= weeks; k++) {
    const from = addDays(monday, -7 * k), to = addDays(from, 6)
    best = Math.max(best, runs.filter(r => r.date >= from && r.date <= to).reduce((s, r) => s + r.km, 0))
  }
  return Math.round(best * 10) / 10
}

/** ระยะวิ่งรวมต่อสัปดาห์ (วันจันทร์ → กม.) ส่งเฉพาะวิ่ง ไม่รวมเดิน */
export function weeklyKm(runs: { date: string; km: number }[], weekStartOf: (d: string) => string) {
  const out: Record<string, number> = {}
  for (const r of runs) { const m = weekStartOf(r.date); out[m] = (out[m] ?? 0) + r.km }
  return out
}

/**
 * เพดานระยะสัปดาห์ตามที่วิ่งได้จริง (ไม่ใช่แค่ตอนเริ่มกลางโปรแกรม): ตารางที่เกินที่วิ่งได้มาก ๆ ทุกสัปดาห์ทำให้ต้องเลือกระหว่างวิ่งไม่ครบกับเพิ่มระยะกระโดด
 * สัปดาห์นี้/ที่ผ่านมา = สัปดาห์ที่มากที่สุดใน 3 สัปดาห์ก่อน × 1.2 (เพิ่มเกิน ~30% สัมพันธ์กับบาดเจ็บ Nielsen 2014), สัปดาห์ข้างหน้า = เพดานสัปดาห์นี้ × 1.2 ต่อสัปดาห์
 * ไม่มีบันทึกวิ่งเลยใน 3 สัปดาห์ = ไม่รู้ว่าวิ่งได้แค่ไหน ไม่จำกัด (pure, tested)
 */
export function actualCap(weekly: Record<string, number>, monday: string, thisMonday: string): number | null {
  const from = monday > thisMonday ? thisMonday : monday
  let best = 0
  for (let k = 1; k <= 3; k++) best = Math.max(best, weekly[addDays(from, -7 * k)] ?? 0)
  if (!best) return null
  const ahead = monday > thisMonday ? Math.round((Date.parse(monday) - Date.parse(thisMonday)) / (7 * 864e5)) : 0
  return Math.max(ACTUAL_FLOOR, Math.round(best * RAMP ** (ahead + 1) * 10) / 10)
}

/** เพดานระยะสัปดาห์ที่ n (0 = สัปดาห์ที่เริ่ม) */
export const rampCap = (baseline: number, n: number) => Math.round(baseline * RAMP ** (n + 1) * 10) / 10

const kmOf = (days: Day[]) => days.reduce((s, d) => s + (d.type === 'run' ? d.targetKm ?? 0 : 0), 0)
const withNote = (d: Day, note: string) => (d.note?.includes(note) ? d.note : [d.note, note].filter(Boolean).join(' · '))

function resize(d: Day, km: number, note: string): Day {
  const step = d.guide?.[0]
  // วิ่งเบา + strides/เนินสั้น: ช่วงวิ่งเบาตอนต้นเป็นระยะ ปรับให้ตรงระยะใหม่
  const guide = step?.kind === 'easy' && step.m ? [{ ...step, m: Math.max(1000, step.m + (km - d.targetKm!) * 1000) }, ...d.guide!.slice(1)] : d.guide
  return { ...d, targetKm: km, duration: `${km} กม.`, guide, note: withNote(d, note), exercises: d.exercises.map(e => ({ ...e, reps: `${km} กม.` })) }
}

/** longFloor: วิ่งยาวไม่ลดต่ำกว่านี้ (ครั้งที่ไกลที่สุดใน 30 วัน) ลดวันอื่นแทน เพดานเลยเกินได้เล็กน้อย ไม่ให้ระยะไกลสุดถอยหลังก่อนวันแข่ง */
export function applyRampIn(days: Day[], cap: number, first: boolean, note = RAMP_NOTE, longFloor = 0): Day[] {
  if (!(cap > 0) || kmOf(days) <= cap) return days
  let out = days.map(d => (first && d.type === 'run' && (d.runKind === 'interval' || d.runKind === 'tempo') ? {
    ...d, runKind: 'easy' as const, title: 'Easy + Strides', guide: guides.strides(d.targetKm ?? 3), note: RAMP_STRIDES_NOTE,
    exercises: d.exercises.map(e => ({ ...e, name: 'Easy + Strides', th: STRIDES_HOW, cue: STRIDES_HOW, video: 'Easy + Strides running workout how to' })),
  } : d))
  const easy = (d: Day) => d.type === 'run' && !!d.targetKm && d.runKind === 'easy' && d.title !== 'Easy + Strides'
  // 1) วันวิ่งที่ 4 (วิ่งเบาสั้น) เป็นวันพักก่อน เพิ่มจำนวนวันวิ่งก็คือเพิ่มภาระ
  const runs = out.filter(d => d.type === 'run')
  const shortest = runs.filter(easy).sort((a, b) => a.targetKm! - b.targetKm!)[0]
  if (runs.length > 3 && shortest && shortest.targetKm! <= 3) {
    out = out.map(d => (d === shortest ? { ...d, type: 'rest' as const, title: 'พัก / เดินเบา ๆ', duration: '-', targetKm: undefined, runKind: undefined, guide: undefined, note, exercises: [] } : d))
  }
  // 2) ลดวิ่งเบา (ไม่ต่ำกว่า 2 กม.) แล้ว 3) ค่อยลดวิ่งยาว วันคุณภาพไม่แตะ
  for (const pick of [easy, (d: Day) => d.type === 'run' && !!d.targetKm && d.runKind === 'long']) {
    const over = kmOf(out) - cap
    if (over <= 0) break
    const flex = kmOf(out.filter(pick))
    if (flex <= 0) continue
    const f = Math.max(0, flex - over) / flex
    out = out.map(d => {
      if (!pick(d)) return d
      const floor = d.runKind === 'long' ? Math.min(d.targetKm!, Math.max(2, Math.floor(longFloor * 2) / 2)) : 2
      const km = Math.max(floor, Math.floor(d.targetKm! * f * 2) / 2)
      return km < d.targetKm! ? resize(d, km, note) : d
    })
  }
  return out
}
