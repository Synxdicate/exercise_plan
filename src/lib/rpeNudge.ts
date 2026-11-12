import type { Run } from './log'

// การวิ่งที่ยังไม่ได้ให้คะแนนความเหนื่อย: ภาระการฝึก (session-RPE × นาที, Foster 2001) ใช้ค่าเดาตามชนิดแทน
// ฟอร์ม/ความล้าและคำแนะนำของโค้ชจึงคลาดเคลื่อน ให้คะแนนย้อนหลังได้เฉพาะช่วงที่ยังจำได้ (≤7 วัน) (pure, tested)
export const RPE_RECALL_DAYS = 7

export function runsMissingRpe(runs: Run[], today: string, days = RPE_RECALL_DAYS): Run[] {
  const from = new Date(`${today}T00:00:00`)
  from.setDate(from.getDate() - (days - 1))
  const min = `${from.getFullYear()}-${String(from.getMonth() + 1).padStart(2, '0')}-${String(from.getDate()).padStart(2, '0')}`
  return runs.filter(r => !r.rpe && r.date >= min && r.date <= today).sort((a, b) => b.date.localeCompare(a.date) || (b.startedAt ?? 0) - (a.startedAt ?? 0))
}
