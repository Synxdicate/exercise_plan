import { daysBetween } from './date'

// หยุดฝึกนาน → สมรรถภาพแอโรบิกลดลงชัดเจนหลัง ~2–4 สัปดาห์ (Mujika & Padilla 2000)
// แนะนำย้อนแผนกลับเพื่อให้ร่างกายปรับตัวใหม่ ไม่กระโดดกลับไปปริมาณเดิม
export type Comeback = { days: number; weeksBack: number; text: string } | null

export function comeback(activityDates: string[], today: string): Comeback {
  if (!activityDates.length) return null
  const last = activityDates.reduce((a, b) => (a > b ? a : b))
  const days = daysBetween(last, today)
  if (days < 8) return null
  if (days <= 14) return { days, weeksBack: 0, text: 'สัปดาห์นี้ทำเบาลง ~25% (ลดเซ็ต/ระยะ) แล้วค่อยกลับมาเต็มสัปดาห์หน้า' }
  if (days <= 28) return { days, weeksBack: 1, text: 'ย้อนกลับ 1 สัปดาห์ และเริ่มด้วยความหนักที่เบากว่าครั้งก่อน' }
  return { days, weeksBack: 2, text: 'ย้อนกลับ 2 สัปดาห์ (หรือเริ่มโปรแกรมใหม่) — ความฟิตลดลงแล้ว อย่ากลับไปเล่นหนักเท่าเดิมทันที' }
}
