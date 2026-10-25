import type { Run, Session } from './log'
import { weekStart } from './date'
import { personalBests } from './analysis'

// เป้าหมายรายเดือน + เหรียญรางวัล — คำนวณจากข้อมูลที่บันทึกไว้ทั้งหมด (ไม่เก็บเหรียญแยก จึงไม่หลุดตามข้อมูล)

export const monthOf = (date: string) => date.slice(0, 7) // YYYY-MM

export function periodStats(runs: Run[], sessions: Session[], prefix: string) {
  const r = runs.filter(x => x.date.startsWith(prefix))
  const s = sessions.filter(x => x.date.startsWith(prefix))
  return {
    km: r.reduce((a, x) => a + x.km, 0),
    runs: r.length,
    seconds: r.reduce((a, x) => a + x.seconds, 0),
    workouts: s.length,
    longest: r.reduce((a, x) => Math.max(a, x.km), 0),
  }
}

/** สัปดาห์ติดกันมากที่สุดที่มีกิจกรรม ≥ min ครั้ง */
export function bestWeekStreak(runs: Run[], sessions: Session[], min = 3) {
  const count = new Map<string, number>()
  for (const d of [...runs, ...sessions].map(x => x.date)) count.set(weekStart(d), (count.get(weekStart(d)) ?? 0) + 1)
  const weeks = [...count].filter(([, n]) => n >= min).map(([w]) => w).sort()
  let best = 0, cur = 0, prev: number | null = null
  for (const w of weeks) {
    const t = new Date(w).getTime()
    cur = prev !== null && Math.round((t - prev) / 6048e5) === 1 ? cur + 1 : 1
    best = Math.max(best, cur)
    prev = t
  }
  return best
}

export type BadgeIcon = 'footprints' | 'medal' | 'trophy' | 'flame' | 'dumbbell' | 'target' | 'mountain' | 'zap'
export type BadgeDef = { id: string; title: string; text: string; icon: BadgeIcon }
type Ctx = { runs: Run[]; sessions: Session[]; goalKm: number }

const totalKm = (c: Ctx) => c.runs.reduce((a, r) => a + r.km, 0)
const longest = (c: Ctx) => c.runs.reduce((a, r) => Math.max(a, r.km), 0)

export const BADGES: (BadgeDef & { earned: (c: Ctx) => boolean })[] = [
  { id: 'first-run', title: 'ก้าวแรก', text: 'บันทึกการวิ่งครั้งแรก', icon: 'footprints', earned: c => c.runs.length > 0 },
  { id: 'first-workout', title: 'เริ่มยก', text: 'ฝึกเวทครั้งแรก', icon: 'dumbbell', earned: c => c.sessions.length > 0 },
  { id: 'run-5k', title: '5K', text: 'วิ่งต่อเนื่องได้ 5 กม.', icon: 'medal', earned: c => longest(c) >= 5 },
  { id: 'run-10k', title: '10K', text: 'วิ่งต่อเนื่องได้ 10 กม.', icon: 'medal', earned: c => longest(c) >= 10 },
  { id: 'run-half', title: 'ฮาล์ฟมาราธอน', text: 'วิ่งได้ 21.1 กม.', icon: 'trophy', earned: c => longest(c) >= 21.0 },
  { id: 'run-full', title: 'มาราธอน', text: 'วิ่งได้ 42.2 กม.', icon: 'trophy', earned: c => longest(c) >= 42.0 },
  { id: 'sub30-5k', title: '5K ต่ำกว่า 30 นาที', text: 'ช่วง 5 กม. ที่เร็วที่สุดต่ำกว่า 30:00', icon: 'zap', earned: c => (personalBests(c.runs).find(b => b.km === 5)?.best?.seconds ?? Infinity) < 1800 },
  { id: 'km-100', title: '100 กม.', text: 'วิ่งสะสมครบ 100 กม.', icon: 'mountain', earned: c => totalKm(c) >= 100 },
  { id: 'km-500', title: '500 กม.', text: 'วิ่งสะสมครบ 500 กม.', icon: 'mountain', earned: c => totalKm(c) >= 500 },
  { id: 'workouts-25', title: 'ยกครบ 25 ครั้ง', text: 'ฝึกเวทสะสม 25 ครั้ง', icon: 'dumbbell', earned: c => c.sessions.length >= 25 },
  { id: 'streak-4', title: 'ต่อเนื่อง 4 สัปดาห์', text: 'ออกกำลังกาย ≥3 ครั้ง/สัปดาห์ ติดกัน 4 สัปดาห์', icon: 'flame', earned: c => bestWeekStreak(c.runs, c.sessions) >= 4 },
  { id: 'streak-12', title: 'ต่อเนื่อง 12 สัปดาห์', text: 'ออกกำลังกาย ≥3 ครั้ง/สัปดาห์ ติดกัน 12 สัปดาห์', icon: 'flame', earned: c => bestWeekStreak(c.runs, c.sessions) >= 12 },
  { id: 'month-goal', title: 'ทำตามเป้าเดือน', text: 'วิ่งครบเป้าหมายรายเดือน', icon: 'target', earned: c => c.goalKm > 0 && [...new Set(c.runs.map(r => monthOf(r.date)))].some(m => periodStats(c.runs, [], m).km >= c.goalKm) },
]

export const earnedBadges = (c: Ctx) => BADGES.filter(b => b.earned(c)).map(b => b.id)

/** เป้าเริ่มต้นจากระยะต่อสัปดาห์ของโปรแกรม (~4.3 สัปดาห์/เดือน) ปัดเป็น 5 กม. */
export const defaultMonthGoal = (weekKm: number) => Math.max(10, Math.round((weekKm * 4.3) / 5) * 5)
