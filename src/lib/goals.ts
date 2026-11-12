import type { Run, Session } from './log'
import { runsOnly } from './walk'
import { strengthOnly } from './sessionKind'
import { weekStart } from './date'
import { personalBests, splitAnalysis } from './analysis'
import { sameRoute } from './matched'

// เป้าหมายรายเดือน + เหรียญรางวัล คำนวณจากข้อมูลที่บันทึกไว้ทั้งหมด (ไม่เก็บเหรียญแยก จึงไม่หลุดตามข้อมูล)

export const monthOf = (date: string) => date.slice(0, 7) // YYYY-MM

export function periodStats(runs: Run[], sessions: Session[], prefix: string) {
  const r = runsOnly(runs).filter(x => x.date.startsWith(prefix))
  const s = strengthOnly(sessions).filter(x => x.date.startsWith(prefix))
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

export type BadgeIcon = 'footprints' | 'medal' | 'trophy' | 'flame' | 'dumbbell' | 'target' | 'mountain' | 'zap' | 'climb' | 'split' | 'calendar' | 'flag' | 'route'
export type BadgeDef = { id: string; title: string; text: string; icon: BadgeIcon }
/** planWeeks = สัปดาห์ติดกันมากที่สุดที่ทำตามแผน ≥80%, raceDate = วันแข่งของโปรแกรม (ไม่ส่ง = ไม่นับ) */
export type Ctx = { runs: Run[]; sessions: Session[]; goalKm: number; planWeeks?: number; raceDate?: string; kept?: string[] }
/** เหรียญที่ขึ้นกับโปรแกรม/วันแข่งปัจจุบัน เคยได้แล้ว (อยู่ใน badgesSeen) ถือว่าได้ตลอด */
export const STICKY = ['plan-4', 'race-finish']

/** วิ่งเส้นทางเดิมกี่ครั้งมากที่สุด (เส้นทางเดียวกันตาม sameRoute) */
// ผลต่อ array ของการวิ่ง (useRuns คืน array เดียวกันทุกการ์ด) และเทียบแต่ละคู่ครั้งเดียว (i < j)
const repeatCache = new WeakMap<Run[], number>()
export function mostRepeatedRoute(runs: Run[]) {
  const hit = repeatCache.get(runs)
  if (hit !== undefined) return hit
  const list = runsOnly(runs).filter(r => (r.route?.length ?? 0) >= 5)
  const count = list.map(() => 1)
  for (let i = 0; i < list.length; i++)
    for (let j = i + 1; j < list.length; j++)
      if (sameRoute(list[i], list[j])) { count[i]++; count[j]++ }
  const best = list.length ? Math.max(...count) : 0
  repeatCache.set(runs, best)
  return best
}

/** สัปดาห์ติดกันมากที่สุดที่ทำตามแผน ≥ min (สัดส่วน done/planned ต่อสัปดาห์ ตามลำดับเวลา) */
export function planStreak(weeks: { planned: number; done: number }[], min = 0.8) {
  let best = 0, cur = 0
  for (const w of weeks) {
    cur = w.planned > 0 && w.done / w.planned >= min ? cur + 1 : 0
    best = Math.max(best, cur)
  }
  return best
}

const pbCache = new WeakMap<Run[], ReturnType<typeof personalBests>>()
const bests = (runs: Run[]) => {
  let v = pbCache.get(runs)
  if (!v) pbCache.set(runs, (v = personalBests(runs)))
  return v
}
const totalKm = (c: Ctx) => runsOnly(c.runs).reduce((a, r) => a + r.km, 0)
const longest = (c: Ctx) => runsOnly(c.runs).reduce((a, r) => Math.max(a, r.km), 0)

export const BADGES: (BadgeDef & { earned: (c: Ctx) => boolean })[] = [
  { id: 'first-run', title: 'ก้าวแรก', text: 'บันทึกการวิ่งครั้งแรก', icon: 'footprints', earned: c => runsOnly(c.runs).length > 0 },
  { id: 'first-workout', title: 'เริ่มยก', text: 'ฝึกเวทครั้งแรก', icon: 'dumbbell', earned: c => strengthOnly(c.sessions).length > 0 },
  { id: 'run-5k', title: '5K', text: 'วิ่งต่อเนื่องได้ 5 กม.', icon: 'medal', earned: c => longest(c) >= 5 },
  { id: 'run-10k', title: '10K', text: 'วิ่งต่อเนื่องได้ 10 กม.', icon: 'medal', earned: c => longest(c) >= 10 },
  { id: 'run-half', title: 'ฮาล์ฟมาราธอน', text: 'วิ่งได้ 21.1 กม.', icon: 'trophy', earned: c => longest(c) >= 21.0 },
  { id: 'run-full', title: 'มาราธอน', text: 'วิ่งได้ 42.2 กม.', icon: 'trophy', earned: c => longest(c) >= 42.0 },
  { id: 'sub30-5k', title: '5K ต่ำกว่า 30 นาที', text: 'ช่วง 5 กม. ที่เร็วที่สุดต่ำกว่า 30:00', icon: 'zap', earned: c => (bests(c.runs).find(b => b.km === 5)?.best?.seconds ?? Infinity) < 1800 },
  { id: 'km-50', title: '50 กม.', text: 'วิ่งสะสมครบ 50 กม.', icon: 'mountain', earned: c => totalKm(c) >= 50 },
  { id: 'km-100', title: '100 กม.', text: 'วิ่งสะสมครบ 100 กม.', icon: 'mountain', earned: c => totalKm(c) >= 100 },
  { id: 'km-250', title: '250 กม.', text: 'วิ่งสะสมครบ 250 กม.', icon: 'mountain', earned: c => totalKm(c) >= 250 },
  { id: 'km-500', title: '500 กม.', text: 'วิ่งสะสมครบ 500 กม.', icon: 'mountain', earned: c => totalKm(c) >= 500 },
  { id: 'km-1000', title: '1,000 กม.', text: 'วิ่งสะสมครบ 1,000 กม.', icon: 'mountain', earned: c => totalKm(c) >= 1000 },
  { id: 'hill-50', title: 'นักไต่เนิน', text: 'ขึ้นสะสม ≥50 ม. ในการวิ่งครั้งเดียว', icon: 'climb', earned: c => runsOnly(c.runs).some(r => (r.elev?.gain ?? 0) >= 50) },
  { id: 'climb-1000', title: 'ไต่ครบ 1,000 ม.', text: 'ขึ้นสะสมรวมทุกการวิ่ง 1,000 ม.', icon: 'climb', earned: c => runsOnly(c.runs).reduce((a, r) => a + (r.elev?.gain ?? 0), 0) >= 1000 },
  { id: 'negative-split', title: 'ครึ่งหลังเร็วกว่า', text: 'วิ่ง ≥3 กม. ครึ่งหลังเร็วกว่าครึ่งแรก (negative split)', icon: 'split', earned: c => runsOnly(c.runs).some(r => r.km >= 3 && splitAnalysis(r.splits)?.kind === 'negative') },
  { id: 'route-10', title: 'เจ้าถิ่นเส้นทาง', text: 'วิ่งเส้นทางเดิมครบ 10 ครั้ง', icon: 'route', earned: c => mostRepeatedRoute(c.runs) >= 10 },
  { id: 'workouts-25', title: 'ยกครบ 25 ครั้ง', text: 'ฝึกเวทสะสม 25 ครั้ง', icon: 'dumbbell', earned: c => strengthOnly(c.sessions).length >= 25 },
  { id: 'streak-4', title: 'ต่อเนื่อง 4 สัปดาห์', text: 'ออกกำลังกาย ≥3 ครั้ง/สัปดาห์ ติดกัน 4 สัปดาห์', icon: 'flame', earned: c => bestWeekStreak(c.runs, c.sessions) >= 4 },
  { id: 'streak-12', title: 'ต่อเนื่อง 12 สัปดาห์', text: 'ออกกำลังกาย ≥3 ครั้ง/สัปดาห์ ติดกัน 12 สัปดาห์', icon: 'flame', earned: c => bestWeekStreak(c.runs, c.sessions) >= 12 },
  { id: 'plan-4', title: 'ตามแผน 4 สัปดาห์', text: 'ทำตามแผน ≥80% ติดกัน 4 สัปดาห์', icon: 'calendar', earned: c => (c.planWeeks ?? 0) >= 4 },
  { id: 'race-finish', title: 'จบงานแข่ง', text: 'วิ่งจบงานแข่งตามวันแข่งในโปรแกรม', icon: 'flag', earned: c => !!c.raceDate && runsOnly(c.runs).some(r => r.date === c.raceDate && r.km >= 3) },
  { id: 'month-goal', title: 'ทำตามเป้าเดือน', text: 'วิ่งครบเป้าหมายรายเดือน', icon: 'target', earned: c => c.goalKm > 0 && [...new Set(runsOnly(c.runs).map(r => monthOf(r.date)))].some(m => periodStats(c.runs, [], m).km >= c.goalKm) },
]

export const BADGES_EN: Record<string, [string, string]> = {
  'first-run': ['First step', 'Logged your first run'], 'first-workout': ['First lift', 'First strength workout'],
  'run-5k': ['5K', 'Ran 5 km continuously'], 'run-10k': ['10K', 'Ran 10 km continuously'],
  'run-half': ['Half marathon', 'Ran 21.1 km'], 'run-full': ['Marathon', 'Ran 42.2 km'],
  'sub30-5k': ['Sub-30 5K', 'Fastest 5 km segment under 30:00'], 'km-100': ['100 km', '100 km total'], 'km-500': ['500 km', '500 km total'],
  'workouts-25': ['25 workouts', '25 strength workouts'], 'streak-4': ['4-week streak', '≥3 sessions/week for 4 weeks in a row'],
  'streak-12': ['12-week streak', '≥3 sessions/week for 12 weeks in a row'], 'month-goal': ['Monthly goal', 'Hit your monthly distance goal'],
  'km-50': ['50 km', '50 km total'], 'km-250': ['250 km', '250 km total'], 'km-1000': ['1,000 km', '1,000 km total'],
  'hill-50': ['Hill climber', '≥50 m of climbing in one run'], 'climb-1000': ['1,000 m climbed', '1,000 m of climbing across all runs'],
  'negative-split': ['Negative split', 'A ≥3 km run with a faster second half'], 'route-10': ['Route regular', 'Ran the same route 10 times'],
  'plan-4': ['On plan 4 weeks', '≥80% of the plan done 4 weeks in a row'], 'race-finish': ['Race finisher', 'Finished the race on your program’s race day'],
}
export const earnedBadges = (c: Ctx) => BADGES.filter(b => b.earned(c) || (STICKY.includes(b.id) && !!c.kept?.includes(b.id))).map(b => b.id)

/** เป้าเริ่มต้นจากระยะต่อสัปดาห์ของโปรแกรม (~4.3 สัปดาห์/เดือน) ปัดเป็น 5 กม. */
export const defaultMonthGoal = (weekKm: number) => Math.max(10, Math.round((weekKm * 4.3) / 5) * 5)

// ---- เวลาเป้าหมายแข่ง (เทียบกับเวลาคาดการณ์) ----
export type RaceKey = 'fiveK' | 'tenK' | 'half' | 'full'
export const raceKm: Record<RaceKey, number> = { fiveK: 5, tenK: 10, half: 21.0975, full: 42.195 }
export const raceLabel: Record<RaceKey, string> = { fiveK: '5K', tenK: '10K', half: 'ฮาล์ฟ', full: 'ฟูล' }
export const raceLabelEn: Record<RaceKey, string> = { fiveK: '5K', tenK: '10K', half: 'Half', full: 'Marathon' }

/** "1:59:59", "55:00", "55" (นาที) → วินาที; อ่านไม่ได้ → null */
export function parseDuration(text: string): number | null {
  const parts = text.trim().split(/[:.]/).map(Number)
  if (!parts.length || parts.some(n => !Number.isFinite(n) || n < 0)) return null
  const [a, b = 0, c] = parts
  const sec = parts.length === 1 ? a * 60 : parts.length === 2 ? a * 60 + b : a * 3600 + b * 60 + (c ?? 0)
  return sec > 0 ? sec : null
}

// ---- เส้นทางสู่มาราธอน: ด่านแบบเกม (ฐาน 5 กม. → บอส 10K → ฮาล์ฟ → ฟูล) ----
export const LEVELS = [
  { id: 'base', title: 'ฐาน 5 กม.', km: 5, race: 'fiveK' as RaceKey, program: 'base' as const, text: 'วิ่งต่อเนื่อง 5 กม. ได้สบาย ๆ' },
  { id: 'ten', title: 'บอส 10K', km: 10, race: 'tenK' as RaceKey, program: 'ten' as const, text: 'วิ่งจบ 10 กม.' },
  { id: 'half', title: 'บอสฮาล์ฟ', km: 21.0, race: 'half' as RaceKey, program: 'half' as const, text: 'วิ่งจบ 21.1 กม.' },
  { id: 'full', title: 'บอสฟูล', km: 42.0, race: 'full' as RaceKey, program: 'full' as const, text: 'วิ่งจบ 42.2 กม.' },
]

/** ด่านที่ผ่านแล้ว = เคยวิ่งต่อเนื่องถึงระยะนั้น (ครั้งแรกที่ทำได้) */
export function journey(runs: Run[]) {
  const sorted = runsOnly(runs).sort((a, b) => a.date.localeCompare(b.date))
  const levels = LEVELS.map(l => {
    const first = sorted.find(r => r.km >= l.km)
    return { ...l, clearedOn: first?.date ?? null, clearedRun: first ?? null }
  })
  const current = levels.findIndex(l => !l.clearedOn)
  return { levels, current: current === -1 ? levels.length : current }
}
