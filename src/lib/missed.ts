import type { Day } from '../data/workouts'
import { addDays } from './date'
import type { Run } from './log'
import { runsOnly } from './walk'

/** ระยะวิ่งที่ยาวที่สุดใน 30 วันก่อน `date` (ไม่รวมวันนั้นและการเดิน) */
export function longestRecent(runs: Run[], date: string, days = 30) {
  const from = addDays(date, -days)
  return runsOnly(runs).filter(r => r.date >= from && r.date < date).reduce((m, r) => Math.max(m, r.km), 0)
}

/**
 * ระยะสูงสุดที่ควรวิ่งวันนี้: ไม่เกิน 110% ของครั้งที่ยาวที่สุดใน 30 วันก่อน (Frandsen 2025 — เกินแล้วเสี่ยงบาดเจ็บสูงขึ้น)
 * แผนคุมไว้แล้วถ้าทำครบ แต่ถ้าพลาดวิ่งยาวไป ระยะในแผนสัปดาห์ถัดไปอาจกระโดดเกิน — คืนค่าเฉพาะเมื่อแผนเกินเพดาน
 * ไม่มีประวัติเลย (เพิ่งเริ่มใช้แอป) ไม่จำกัด เพราะไม่รู้ว่าเคยวิ่งได้แค่ไหน; วันแข่งไม่จำกัด
 */
export function longRunCap(runs: Run[], date: string, day: Pick<Day, 'targetKm' | 'runKind'> | undefined) {
  if (!day?.targetKm || day.runKind === 'race') return null
  const longest = longestRecent(runs, date)
  if (!longest) return null
  const cap = Math.floor(longest * 1.1 * 10) / 10
  return day.targetKm > cap ? { cap, longest } : null
}

const isKey = (d: Day | undefined) => d?.type === 'run' && (d.runKind === 'long' || d.runKind === 'tempo' || d.runKind === 'interval')

export type Missed =
  // พลาดในสัปดาห์นี้: ย้ายไปวันพักที่ไม่ติดกับวันวิ่งอื่น (`to`) หรือข้ามไปถ้าไม่มี
  | { kind: 'thisWeek'; i: number; day: Day; to: number | null }
  // วิ่งยาวสัปดาห์ที่แล้วไม่ได้ทำ: ไม่ต้องชดเชย ทำตามแผนสัปดาห์นี้ต่อ
  | { kind: 'lastWeek'; day: Day }

/**
 * วันวิ่งสำคัญ (วิ่งยาว/คุณภาพ) ที่ผ่านไปแล้วแต่ไม่ได้ทำ — ไม่ให้วิ่งชดเชยซ้อนวันวิ่งอื่น (วิ่งติดกันสองวันหลังพลาดคือจุดเสี่ยงเจ็บ)
 * `todayIdx` 0 = จันทร์; `done(i)` ของสัปดาห์นี้, `lastDone(i)` ของสัปดาห์ที่แล้ว
 */
export function missedKeyRun(plan: Day[], todayIdx: number, done: (i: number) => boolean, last?: { plan: Day[]; done: (i: number) => boolean }): Missed | null {
  for (let i = todayIdx - 1; i >= 0; i--) {
    if (!isKey(plan[i]) || done(i)) continue
    const runOn = (j: number) => plan[j]?.type === 'run'
    let to: number | null = null
    for (let j = todayIdx; j < 7; j++) {
      if (plan[j]?.type !== 'rest' || runOn(j - 1) || runOn(j + 1)) continue
      to = j
      break
    }
    return { kind: 'thisWeek', i, day: plan[i], to }
  }
  // ต้นสัปดาห์ (ก่อนวันวิ่งแรก): บอกว่าวิ่งยาวที่พลาดไม่ต้องชดเชย
  const firstRun = plan.findIndex(d => d.type === 'run')
  if (last && (firstRun < 0 || todayIdx <= firstRun)) {
    const li = last.plan.findIndex(d => d.type === 'run' && d.runKind === 'long')
    if (li >= 0 && !last.done(li)) return { kind: 'lastWeek', day: last.plan[li] }
  }
  return null
}
