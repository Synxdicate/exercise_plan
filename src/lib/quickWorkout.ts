import type { Day, Exercise } from '../data/workouts'

/**
 * เวทฉบับสั้น (~20 นาที) สำหรับวันที่เวลาน้อย: ท่าละ 2 เซ็ต ไม่เกิน 4 ท่า เรียงตามลำดับเดิมของวัน
 * เลือกตามลำดับความสำคัญ: ท่าขาหลัก (สควอต/เดดลิฟต์/ลันจ์) → ท่าน่อง (รับแรงตอนวิ่ง เอ็นร้อยหวาย) → ดึง → ดัน
 * ไม่มีท่ากลุ่มไหนก็เติมจากท่าที่เหลือตามลำดับเดิม
 * หลักฐาน: ถ้าเวลาน้อย ให้คงท่าขาหลัก 1 ท่า ดึง 1 ท่า ดัน 1 ท่า และอย่างน้อย 4 เซ็ต/กล้ามเนื้อ/สัปดาห์ (Iversen 2021)
 * ปริมาณน้อยรักษาแรงได้ถ้าน้ำหนักยังหนักเท่าเดิม (Spiering 2021) จึงลดเซ็ต ไม่ลดน้ำหนัก
 */
export const QUICK_MAX = 4
export const QUICK_SETS = 2

const PRIORITY: RegExp[] = [
  /Squat|Deadlift|RDL|Lunge|Leg Press|Step-up|Pistol/i,
  /Calf/i,
  /Pull-up|Chin-up|Row|Pulldown/i,
  /Press|Push-up|Dips/i,
]

export function quickExercises(list: Exercise[]): Exercise[] {
  const picked = new Set<number>()
  for (const re of PRIORITY) {
    const i = list.findIndex((e, j) => !picked.has(j) && re.test(e.name) && !(re === PRIORITY[3] && /Leg Press/i.test(e.name)))
    if (i >= 0) picked.add(i)
  }
  for (let j = 0; j < list.length && picked.size < QUICK_MAX; j++) picked.add(j)
  return list
    .filter((_, j) => picked.has(j))
    .map(e => ({ ...e, sets: String(Math.min(QUICK_SETS, parseInt(e.sets, 10) || QUICK_SETS)) }))
}

/** วันเวทนี้ย่อได้ไหม (ท่าเยอะกว่าฉบับสั้น หรือมีท่าที่เกิน 2 เซ็ต) */
export const canQuick = (day: Day) =>
  day.type === 'strength' && (day.exercises.length > QUICK_MAX || day.exercises.some(e => (parseInt(e.sets, 10) || 0) > QUICK_SETS))

export const quickDay = (day: Day): Day => ({ ...day, exercises: quickExercises(day.exercises) })
