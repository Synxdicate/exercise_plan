import type { Run, Session } from './log'
import type { Shoe } from './shoes'
import type { LegTest } from './legTests'
import { runsOnly } from './walk'
import { strengthOnly } from './sessionKind'
import { addDays } from './date'
import { needsKg } from './lifts'

// ข้อมูลที่ยังไม่ได้กรอกแต่แผน/การคำนวณใช้อยู่ (pure, tested) เรียงตามผลต่อแผน
export type GapId = 'race' | 'kg' | 'legTest' | 'shoes' | 'sweat' | 'course'
export type Gap = { id: GapId; names?: string[] }

export type GapInput = {
  today: string
  race: { active: boolean; kmSet: boolean; cutoffSet: boolean; course: boolean } // active = โปรแกรมแข่งมีวันแข่ง ยังไม่ถึง
  runs: Pick<Run, 'date' | 'kind'>[]
  sessions: Pick<Session, 'date' | 'mode' | 'dayKey' | 'entries'>[]
  shoes: Pick<Shoe, 'retired'>[]
  sweatTests: number
  legTests: Pick<LegTest, 'date'>[]
}

/** ท่าเวทในยิม 28 วันล่าสุดที่ควรมีน้ำหนักแต่บันทึกเป็น 0 ทุกเซ็ต (ล่าสุดของท่านั้นยังเป็น 0) */
export function zeroKgLifts(sessions: GapInput['sessions'], today: string) {
  const from = addDays(today, -28)
  const last = new Map<string, boolean>()
  for (const s of strengthOnly(sessions).filter(s => s.mode === 'gym' && s.date >= from).sort((a, b) => a.date.localeCompare(b.date)))
    for (const e of s.entries) if (needsKg(e.name) && e.sets.length) last.set(e.name, e.sets.every(x => !x.kg))
  return [...last].filter(([, zero]) => zero).map(([n]) => n)
}

export function setupGaps(i: GapInput): Gap[] {
  const gaps: Gap[] = []
  const runs = runsOnly(i.runs)
  const recentRuns = runs.filter(r => r.date >= addDays(i.today, -28)).length
  if (i.race.active && (!i.race.kmSet || !i.race.cutoffSet)) gaps.push({ id: 'race' })
  const zero = zeroKgLifts(i.sessions, i.today)
  if (zero.length) gaps.push({ id: 'kg', names: zero })
  // ทดสอบขา: คนที่วิ่งสม่ำเสมอ (≥4 ครั้งใน 28 วัน) ไม่เคยทดสอบหรือเกิน 8 สัปดาห์
  if (recentRuns >= 4 && !i.legTests.some(t => t.date >= addDays(i.today, -56))) gaps.push({ id: 'legTest' })
  if (runs.length >= 5 && !i.shoes.some(s => !s.retired)) gaps.push({ id: 'shoes' })
  if (i.race.active && !i.sweatTests) gaps.push({ id: 'sweat' })
  if (i.race.active && !i.race.course) gaps.push({ id: 'course' })
  return gaps
}
