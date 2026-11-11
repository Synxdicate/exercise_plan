import type { Day } from '../data/workouts'
import { addDays } from './date'

// "ช่วงนี้ไม่ไหว" (แบบ Not Feeling 100% ของ Runna): ปรับแผนช่วงสั้น ๆ แล้วกลับแผนเดิมเอง (pure, tested)
// ป่วย = พัก, เจ็บเล็กน้อย = วิ่งเบาครึ่งระยะ ไม่มีวันเร็ว (ปวดไม่เกิน 3/10 แนวคิด pain-monitoring, Silbernagel 2007),
// ไม่มีเวลา = วิ่งเบาสั้นลง เวทย่อ การวิ่งน้อยลงยังดีกว่าหยุด (Pedisic 2020) ไม่แตะวันแข่ง

export type EaseReason = 'sick' | 'sore' | 'busy'
export type EaseOff = { from: string; to: string; reason: EaseReason }

export const EASE_NOTES: Record<EaseReason, { run: string; strength: string }> = {
  sick: {
    run: 'พักฟื้นจากป่วย หายไข้แล้วค่อยเริ่มเดินเบา ๆ ไม่ต้องรีบชดเชย',
    strength: 'พักฟื้นจากป่วย งดเวทจนหายดี',
  },
  sore: {
    run: 'ช่วงเจ็บ: วิ่งเบาครึ่งระยะ ไม่มีช่วงเร็ว ปวดได้ไม่เกิน 3 จาก 10 และไม่แย่ลงวันรุ่งขึ้น ถ้าเกินให้หยุด แล้วใช้ปั่นจักรยาน/ว่ายน้ำแทน',
    strength: 'ช่วงเจ็บ: ลดเซ็ตลงครึ่งหนึ่ง ข้ามท่าที่ทำให้ส่วนที่เจ็บปวด',
  },
  busy: {
    run: 'ช่วงไม่มีเวลา: วิ่งเบาสั้นลง วิ่งน้อยดีกว่าไม่วิ่ง',
    strength: 'ช่วงไม่มีเวลา: ทำ 2–3 ท่าแรก ท่าละ 2 เซ็ต (~15 นาที)',
  },
}
export const EASE_TITLES: Record<EaseReason, { run: string; strength: string }> = {
  sick: { run: 'พักฟื้น (ไม่สบาย)', strength: 'พักฟื้น (ไม่สบาย)' },
  sore: { run: 'วิ่งเบา (ช่วงเจ็บ)', strength: 'เวทเบา (ช่วงเจ็บ)' },
  busy: { run: 'วิ่งเบาสั้น (ไม่มีเวลา)', strength: 'เวทย่อ (ไม่มีเวลา)' },
}

// คำอธิบายวันวิ่งช่วงปรับแผน: ต้องแทนของเดิม (เช่น "ปิดท้าย Strides", interval) ไม่งั้นการ์ดวันนี้ยังสั่งช่วงเร็วอยู่
export const EASE_HOW: Record<Exclude<EaseReason, 'sick'>, string> = {
  sore: 'วิ่งเบาต่อเนื่อง ไม่มีช่วงเร็ว ไม่มี strides',
  busy: 'วิ่งเบาสั้น ๆ ระดับพูดคุยได้',
}

const half = (km: number, f: number) => Math.max(1, Math.round(km * f * 2) / 2)

export function applyEaseOff(days: Day[], monday: string, ease: EaseOff | null | undefined): Day[] {
  if (!ease) return days
  return days.map((d, i) => {
    const date = addDays(monday, i)
    if (date < ease.from || date > ease.to || d.type === 'rest' || d.runKind === 'race') return d
    const note = EASE_NOTES[ease.reason][d.type === 'run' ? 'run' : 'strength']
    const title = EASE_TITLES[ease.reason][d.type === 'run' ? 'run' : 'strength']
    if (ease.reason === 'sick') return { ...d, type: 'rest', title, note, exercises: [], targetKm: undefined, runKind: undefined, guide: undefined, duration: '—' }
    if (d.type === 'run') {
      const km = d.targetKm ? half(d.targetKm, ease.reason === 'sore' ? 0.5 : 0.6) : undefined
      // วันวิ่งที่กำหนดเป็นเวลา (โปรแกรมเริ่มวิ่ง) ลดเวลาในสัดส่วนเดียวกัน
      const min = Number(d.duration.match(/(\d+) นาที/)?.[1])
      const duration = km ? `~${Math.round(km * 8)} นาที` : min ? `~${Math.max(10, Math.round(min * (ease.reason === 'sore' ? 0.5 : 0.6)))} นาที` : d.duration
      const how = EASE_HOW[ease.reason]
      const reps = km ? `${km} กม.` : duration
      return { ...d, title, note, runKind: 'easy', targetKm: km, guide: undefined, duration,
        exercises: [{ name: 'Easy run', th: how, sets: '1', reps, rest: '-', cue: how, video: 'easy run zone 2 running how to' }] }
    }
    return { ...d, title, note }
  })
}

/** ช่วงที่ยังมีผล (วันนี้อยู่ในช่วง) */
export const easeActive = (ease: EaseOff | null | undefined, today: string) => !!ease && today >= ease.from && today <= ease.to
