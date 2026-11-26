import { addDays } from './date'
import { longestRecent } from './missed'
import type { Run } from './log'

// ทางไปวันแข่ง: วิ่งยาวแต่ละสัปดาห์จากตอนนี้ถึงวันแข่ง ภายในเพดาน 110% ของครั้งที่ยาวที่สุด (Frandsen 2025)
// บอกว่าวิ่งยาวที่ไกลที่สุดก่อนแข่งจะไปถึงระยะในแผนไหม ถ้าไม่ทัน งานแข่งส่วนที่ยาวกว่าที่เคยวิ่งวางแผนสลับเดินได้ (Hottenrott 2016) (pure, tested)

export type LadderStep = { monday: string; plan: number; reach: number; done: number | null; capped: boolean }
export type Ladder = { steps: LadderStep[]; longest: number; peakPlan: number; peakReach: number; onTrack: boolean; raceKm: number }

/** ขั้นละ 110% (เหมือน longRunCap) ปัดลงทีละ 0.1 กม. */
const up = (km: number) => Math.floor(km * 1.1 * 10) / 10

/**
 * weeks: สัปดาห์ที่เหลือ (รวมสัปดาห์นี้ ไม่รวมสัปดาห์แข่ง) วันจันทร์ + ระยะวิ่งยาวในแผน (0 = ไม่มีวิ่งยาว)
 * สัปดาห์ที่วิ่งยาวไปแล้ว (บันทึกเป็นวิ่งยาว ≥ 80% ของแผน) ใช้ระยะจริง วิ่งเบากลางสัปดาห์ไม่นับแม้ยาวถึงแผน
 */
export function longRunLadder(runs: Run[], today: string, weeks: { monday: string; plan: number }[], raceKm: number): Ladder | null {
  if (!weeks.length || !raceKm) return null
  let longest = longestRecent(runs, addDays(today, 1))
  const start = longest
  const steps: LadderStep[] = []
  for (const w of weeks) {
    const sunday = addDays(w.monday, 6)
    const inWeek = runs.filter(r => r.kind !== 'walk' && r.date >= w.monday && r.date <= sunday && r.date <= today)
    const hit = inWeek.filter(r => r.kind === 'long' && r.km >= w.plan * 0.8)
    const done = w.plan && hit.length ? Math.max(...hit.map(r => r.km)) : null
    if (!w.plan) { steps.push({ monday: w.monday, plan: 0, reach: 0, done: null, capped: false }); continue }
    // ไม่มีประวัติเลย: ไม่รู้เพดาน ใช้ตามแผน
    const cap = start ? up(longest) : w.plan
    const reach = done ?? Math.min(w.plan, cap)
    steps.push({ monday: w.monday, plan: w.plan, reach: +reach.toFixed(1), done, capped: !done && w.plan > cap })
    longest = Math.max(longest, reach)
  }
  const peakPlan = Math.max(0, ...steps.map(s => s.plan))
  const peakReach = Math.max(0, ...steps.map(s => s.reach))
  return { steps, longest: start, peakPlan, peakReach, onTrack: peakReach >= peakPlan - 0.05, raceKm }
}
