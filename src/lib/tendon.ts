import { addDays } from './date'
import type { Readiness } from './readiness'

/**
 * เช็กขาตอนเช้าหลังวันวิ่ง (pain-monitoring model, Silbernagel 2007): ปวดเอ็นร้อยหวาย/น่อง/ฝ่าเท้า/หน้าแข้ง/เข่าตอนก้าวแรกหลังตื่นนอนหรือลงบันได 0–10
 * ตัวชี้วัดหลักคืออาการเช้าวันรุ่งขึ้น ไม่ใช่ตอนวิ่ง: ≤3 และไม่แย่กว่าครั้งก่อน = ซ้อมต่อได้ (งานวิจัยใช้ ≤5 แอปใช้ค่าที่เข้มกว่า)
 * แบบเช็กความพร้อมถามก่อนวิ่ง เจ็บหลังวิ่งจึงไม่เข้าแผน (เกิดจริง: ตอบไม่เจ็บตอนเช้า แต่เจ็บหลังวิ่งยาว)
 * synced key `tendonLog`: วันที่ → คะแนน
 */
export type TendonLog = Record<string, number>
export const TENDON_LIMIT = 3
/** เฝ้าดูต่อกี่วันหลังบันทึกว่าปวดขาช่วงล่างครั้งล่าสุด */
export const WATCH_DAYS = 28
/** ปวดต่อเนื่องนานเท่านี้ (วัน) ควรพบนักกายภาพ */
export const PHYSIO_DAYS = 14
// เข่า/หน้าแข้งด้วย: อาการเช้าวันรุ่งขึ้นใช้ได้กับเนื้อเยื่อที่รับแรงซ้ำทุกแบบ (เดิมเฉพาะเอ็นร้อยหวาย/น่อง/เท้า)
const LOWER_LEG = ['achilles', 'calf', 'foot', 'shin', 'knee']

type RunLike = { date: string; kind: string }

/** ควรถามเช้านี้ไหม: เมื่อวานวิ่ง (ไม่ใช่เดิน) ยังไม่ได้ตอบวันนี้ และเคยปวดขาช่วงล่างใน 28 วัน (จากแบบเช็กความพร้อมหรือการเช็กเช้าที่ไม่ใช่ 0) */
export function tendonCheckDue(runs: RunLike[], readiness: Record<string, Readiness>, log: TendonLog, today: string) {
  if (log[today] !== undefined) return false
  const from = addDays(today, -WATCH_DAYS)
  const watching = Object.entries(readiness).some(([d, r]) => d >= from && d <= today && r.pain && r.areas?.some(a => LOWER_LEG.includes(a)))
    || Object.entries(log).some(([d, s]) => d >= from && d < today && s > 0)
  if (!watching) return false
  const y = addDays(today, -1)
  return runs.some(r => r.date === y && r.kind !== 'walk')
}

export type TendonLevel = 'none' | 'ok' | 'worse' | 'high'
export type TendonStatus = { score: number; prev: number | null; level: TendonLevel; painDays: number; physio: boolean }

/** ผลของวันนี้: เทียบกับครั้งก่อน (ภายใน 7 วัน) และนับว่าปวดต่อเนื่องมากี่วัน */
export function tendonStatus(log: TendonLog, date: string): TendonStatus | null {
  const score = log[date]
  if (score === undefined) return null
  const before = Object.keys(log).filter(d => d < date && d >= addDays(date, -7)).sort()
  const prev = before.length ? log[before.at(-1)!] : null
  const level: TendonLevel = score > TENDON_LIMIT ? 'high' : prev !== null && score > prev ? 'worse' : score === 0 ? 'none' : 'ok'
  // ปวดต่อเนื่อง: ย้อนจากวันนี้ ทุกบันทึกต้องไม่ใช่ 0 (วันที่ไม่ได้ตอบไม่ตัดช่วง)
  let first = date
  if (score > 0) for (const d of Object.keys(log).filter(d => d < date).sort().reverse()) {
    if (log[d] === 0) break
    first = d
  }
  const painDays = score > 0 ? Math.round((Date.parse(date) - Date.parse(first)) / 864e5) + 1 : 0
  return { score, prev, level, painDays, physio: painDays >= PHYSIO_DAYS }
}

/** วันที่ที่ควรให้แผนถนอมขา (เหมือนบันทึกปวดเอ็นร้อยหวาย): เกิน 3/10 หรือแย่กว่าครั้งก่อน */
export function tendonAlarmDates(log: TendonLog): string[] {
  return Object.keys(log).filter(d => { const s = tendonStatus(log, d); return s?.level === 'high' || s?.level === 'worse' })
}

export const TENDON_TEXT: Record<TendonLevel, [string, string]> = {
  none: ['ไม่ปวดเลย ซ้อมตามแผนได้', 'No pain: train as planned'],
  ok: ['ไม่เกิน 3 จาก 10 และไม่แย่กว่าครั้งก่อน ซ้อมตามแผนได้ วิ่งวันนี้ให้ปวดไม่เกิน 3 จาก 10 ระหว่างวิ่ง', 'At most 3/10 and not worse than last time: train as planned, keeping pain ≤3/10 while running'],
  worse: ['ปวดมากกว่าครั้งก่อน แปลว่าวิ่งเมื่อวานหนักเกินสำหรับเอ็นตอนนี้ วันนี้วิ่งให้สั้นและช้าลง หรือพัก แผนจะงดช่วงเร็ว เนิน และท่ากระโดด 7 วัน', 'Worse than last time, so yesterday was too much for the tendon right now: run shorter and slower today, or rest. The plan drops fast work, hills and jumps for 7 days'],
  high: ['เกิน 3 จาก 10 วันนี้งดวิ่ง ใช้ปั่นจักรยานหรือว่ายน้ำแทนได้ เขย่งช้า ๆ ได้ถ้าไม่เกิน 3 จาก 10 แผนจะงดช่วงเร็ว เนิน และท่ากระโดด 7 วัน', 'Above 3/10: skip running today; cycling or swimming is fine, and slow calf raises if they stay ≤3/10. The plan drops fast work, hills and jumps for 7 days'],
}
