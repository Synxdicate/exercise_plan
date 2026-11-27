import type { Run } from './log'

// ชื่อรอบวิ่งแบบอ่านง่าย: ประเภท + ช่วงเวลาที่เริ่ม (เช่น "วิ่งเบาตอนเช้า") (pure, tested)

const KIND: Record<Run['kind'], [string, string]> = {
  easy: ['วิ่งเบา', 'Easy run'],
  tempo: ['วิ่งเทมโป', 'Tempo run'],
  interval: ['วิ่งอินเทอร์วัล', 'Interval session'],
  long: ['วิ่งยาว', 'Long run'],
  race: ['วิ่งแข่ง', 'Race'],
  other: ['วิ่ง', 'Run'],
  walk: ['เดิน', 'Walk'],
}

/** ช่วงของวันจากชั่วโมง: เช้า 5–10 · กลางวัน 11–13 · บ่าย 14–16 · เย็น 17–20 · กลางคืน */
export function dayPart(hour: number): [string, string] {
  if (hour >= 5 && hour < 11) return ['ตอนเช้า', 'Morning']
  if (hour >= 11 && hour < 14) return ['ตอนกลางวัน', 'Lunch']
  if (hour >= 14 && hour < 17) return ['ตอนบ่าย', 'Afternoon']
  if (hour >= 17 && hour < 21) return ['ตอนเย็น', 'Evening']
  return ['ตอนกลางคืน', 'Night']
}

export function runTitle(run: Pick<Run, 'kind' | 'startedAt'>, en: boolean) {
  const [th, eng] = KIND[run.kind] ?? KIND.other
  if (!run.startedAt) return en ? eng : th
  const [pth, pen] = dayPart(new Date(run.startedAt).getHours())
  return en ? `${pen} ${eng[0].toLowerCase() + eng.slice(1)}` : `${th}${pth}`
}

/** เวลาเริ่ม "06:12" (เวลาท้องถิ่น) */
export const startTime = (run: Pick<Run, 'startedAt'>) =>
  run.startedAt ? new Date(run.startedAt).toTimeString().slice(0, 5) : null
