import type { Day } from '../data/workouts'

/** การสลับวันในแต่ละสัปดาห์ (key = วันจันทร์) — คู่ [a, b] สลับเนื้อหาวัน a กับ b ตามลำดับ */
export type DayMoves = Record<string, [number, number][]>

/**
 * สลับเนื้อหาวัน (ท่า/ระยะ/ชุดซ้อม) แต่ชื่อวันในสัปดาห์คงเดิม — ทุกอย่างที่อ่านแผน (เสียงนำ, เพดานระยะ,
 * ติ๊กทำแล้วตามบันทึก, ปฏิทิน, แจ้งเตือน) ตามไปวันใหม่เอง; `key` ไปกับเนื้อหา ให้ท่าที่เพิ่มเอง/บันทึกเวทยังตรงกัน
 */
export function applyMoves(days: Day[], pairs?: [number, number][]): Day[] {
  if (!pairs?.length) return days
  const idx = days.map((_, i) => i)
  for (const [a, b] of pairs) if (idx[a] !== undefined && idx[b] !== undefined) [idx[a], idx[b]] = [idx[b], idx[a]]
  return idx.map((from, i) => (from === i ? days[i] : { ...days[from], day: days[i].day, movedFrom: from }))
}

/** วันวิ่งที่ติดกัน (คู่ i, i+1) — หลังสลับวันควรเตือน เพราะขาไม่ได้พักระหว่างวันวิ่ง */
export const backToBackRuns = (days: Day[]) => days.flatMap((d, i) => (d.type === 'run' && days[i + 1]?.type === 'run' ? [i] : []))
