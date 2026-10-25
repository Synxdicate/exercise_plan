import type { Day, Exercise } from './workouts'
import { libEx } from './library'

export type Muscle =
  | 'chest' | 'frontDelts' | 'sideDelts' | 'rearDelts' | 'traps' | 'biceps' | 'triceps' | 'forearms'
  | 'abs' | 'obliques' | 'lats' | 'upperBack' | 'lowerBack' | 'glutes' | 'quads' | 'hamstrings' | 'calves'

export const muscleNames: Record<Muscle, string> = {
  chest: 'อก',
  frontDelts: 'ไหล่หน้า',
  sideDelts: 'ไหล่ข้าง',
  rearDelts: 'ไหล่หลัง',
  traps: 'บ่า (Traps)',
  biceps: 'หน้าแขน',
  triceps: 'หลังแขน',
  forearms: 'แขนท่อนล่าง',
  abs: 'หน้าท้อง',
  obliques: 'ท้องด้านข้าง',
  lats: 'ปีก (Lats)',
  upperBack: 'หลังบน',
  lowerBack: 'หลังล่าง',
  glutes: 'ก้น',
  quads: 'ต้นขาหน้า',
  hamstrings: 'ต้นขาหลัง',
  calves: 'น่อง',
}

type Target = { primary: Muscle[]; secondary: Muscle[] }
const t = (primary: Muscle[], secondary: Muscle[] = []): Target => ({ primary, secondary })

// แมปตามชื่อท่าใน workouts.ts (ท่าที่ชื่อซ้ำกันในยิม/สวน ใช้กล้ามชุดเดียวกัน)
const byExercise: Record<string, Target> = {
  'Bench Press': t(['chest', 'triceps'], ['frontDelts']),
  'Pull-up': t(['lats', 'biceps'], ['upperBack', 'forearms']),
  'Overhead Press': t(['frontDelts', 'sideDelts'], ['triceps', 'traps']),
  'Seated Cable Row': t(['upperBack', 'lats'], ['biceps', 'rearDelts']),
  'Lateral Raise': t(['sideDelts'], ['traps']),
  'Hanging Knee Raise': t(['abs'], ['forearms']),
  'Back Squat': t(['quads', 'glutes'], ['hamstrings', 'lowerBack']),
  'Romanian Deadlift': t(['hamstrings', 'glutes'], ['lowerBack', 'forearms']),
  'Bulgarian Split Squat': t(['quads', 'glutes'], ['hamstrings']),
  'Standing Calf Raise': t(['calves']),
  'Plank': t(['abs'], ['obliques']),
  'Dips': t(['chest', 'triceps'], ['frontDelts']),
  'Lat Pulldown': t(['lats'], ['biceps', 'upperBack']),
  'Incline DB Press': t(['chest', 'frontDelts'], ['triceps']),
  'Face Pull': t(['rearDelts', 'upperBack'], ['traps']),
  'DB Curl': t(['biceps'], ['forearms']),
  'Triceps Pushdown': t(['triceps']),
  'Push-up': t(['chest', 'triceps'], ['frontDelts', 'abs']),
  'Australian Row': t(['upperBack', 'lats'], ['biceps', 'rearDelts']),
  'Pike Push-up': t(['frontDelts', 'triceps'], ['sideDelts', 'traps']),
  'Hanging Knee/Leg Raise': t(['abs'], ['obliques', 'forearms']),
  'Jump Squat': t(['quads', 'glutes'], ['calves']),
  'Single-leg Glute Bridge': t(['glutes', 'hamstrings']),
  'Pistol Squat progression': t(['quads', 'glutes'], ['calves']),
  'Hollow Body Hold': t(['abs'], ['obliques']),
  'Chin-up': t(['lats', 'biceps'], ['upperBack']),
  'Archer / Decline Push-up': t(['chest', 'triceps'], ['frontDelts']),
  'Straight Bar Dip': t(['triceps', 'chest'], ['frontDelts']),
  'Cindy (AMRAP)': t(['lats', 'chest', 'quads'], ['biceps', 'triceps', 'glutes', 'abs']),
  'Lying Leg Curl': t(['hamstrings']),
  'Leg Extension': t(['quads']),
  'Prone Y-T-W Raise': t(['rearDelts', 'upperBack'], ['sideDelts', 'traps']),
  'Single-leg RDL': t(['hamstrings', 'glutes'], ['lowerBack']),
  'Single-leg Calf Raise': t(['calves']),
  'Side Plank': t(['obliques'], ['abs']),
  'Dead Bug': t(['abs'], ['obliques']),
  'Easy run': t([], ['quads', 'hamstrings', 'glutes', 'calves']),
  'Intervals 1:2': t([], ['quads', 'hamstrings', 'glutes', 'calves']),
}

export const musclesOf = (e: Exercise): Target => byExercise[e.name] ?? libEx(e.name)?.muscles ?? t([])

const setCount = (e: Exercise) => parseInt(e.sets, 10) || 1

// ความเข้มต่อวัน: กล้ามหลัก = 1, กล้ามรอง = 0.45
export function dayIntensity(day: Day) {
  const out: Partial<Record<Muscle, number>> = {}
  for (const e of day.exercises) {
    const { primary, secondary } = musclesOf(e)
    for (const m of secondary) out[m] = Math.max(out[m] ?? 0, 0.45)
    for (const m of primary) out[m] = 1
  }
  return out
}

// เซ็ตต่อสัปดาห์: นับเซ็ตเต็มให้กล้ามหลัก ครึ่งเซ็ตให้กล้ามรอง ไม่นับวันวิ่ง
export function weeklySets(days: Day[]) {
  const out: Partial<Record<Muscle, number>> = {}
  for (const d of days) {
    if (d.type !== 'strength') continue
    for (const e of d.exercises) {
      const n = setCount(e)
      const { primary, secondary } = musclesOf(e)
      for (const m of primary) out[m] = (out[m] ?? 0) + n
      for (const m of secondary) out[m] = (out[m] ?? 0) + n / 2
    }
  }
  return out
}
