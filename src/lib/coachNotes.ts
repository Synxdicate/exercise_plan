import type { Day } from '../data/workouts'
import type { Run } from './log'
import { addDays, daysBetween } from './date'
import { easyTooFast } from './recovery'

// โค้ช (pure, tested): ทวงเวทที่ขาด + สรุปหลังวิ่งพร้อมสิ่งที่ควรทำครั้งหน้า
// เวทลดการบาดเจ็บจากกีฬาได้มาก (Lauersen 2014) และลดการเจ็บของนักวิ่งมาราธอนครั้งแรก (Toresdahl 2020)

export type Tx = { th: string; en: string }
const tx = (th: string, en: string): Tx => ({ th, en })

/** ไม่ได้เล่นเวทกี่วัน และวันเวทที่ยังเหลือในสัปดาห์นี้ — null ถ้าไม่ต้องเตือน */
export function strengthGap(opts: {
  lastStrength: string | null // วันที่เล่นเวทล่าสุด (บันทึกเซ็ตหรือติ๊กทำแล้ว)
  start: string // วันเริ่มโปรแกรม (ไม่ทวงก่อนเริ่มครบ 8 วัน)
  today: string
  plan: Day[] // แผนสัปดาห์นี้ (0 = จันทร์)
  todayIdx: number
  done: (i: number) => boolean
  minDays?: number
}) {
  const { lastStrength, start, today, plan, todayIdx, done, minDays = 8 } = opts
  if (!plan.some(d => d.type === 'strength')) return null
  const since = lastStrength ? daysBetween(lastStrength, today) : daysBetween(start, today)
  if (since < minDays) return null
  const left = plan.flatMap((d, i) => (d.type === 'strength' && i >= todayIdx && !done(i) ? [i] : []))
  return { days: since, never: !lastStrength, left }
}

export type Review = { tone: 'good' | 'warn' | 'info'; headline: Tx; points: Tx[] }

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`

/**
 * สรุปหลังวิ่ง 1 ข้อหลัก + รายละเอียด — เทียบกับแผนของวันนั้น ความเหนื่อย และโซนเบา
 * easyFloor = เพซที่เร็วที่สุดที่ยังนับเป็นวิ่งเบา (วิ/กม.) ถ้ารู้จากผลวิ่งเต็มที่
 */
export function runReview(run: Run, ctx: { planned?: Day; easyFloor?: number; prev: Run[]; splitDiffPct?: number }): Review | null {
  if (run.kind === 'walk' || run.km < 0.5) return null
  const { planned, easyFloor, prev, splitDiffPct } = ctx
  const points: Tx[] = []
  let tone: Review['tone'] = 'good'
  let headline = tx('ซ้อมเสร็จอีกรอบ เก็บสะสมต่อไป', 'Another one in the bank')
  const pace = run.seconds / run.km
  const easyDay = run.kind === 'easy' || run.kind === 'long'

  // เทียบกับแผน
  if (planned?.type === 'run' && planned.targetKm) {
    const pct = run.km / planned.targetKm
    if (pct >= 0.9) headline = tx(`ครบตามแผน ${planned.targetKm} กม.`, `Plan done: ${planned.targetKm} km`)
    else {
      tone = 'info'
      headline = tx(`ได้ ${Math.round(pct * 100)}% ของแผน (${planned.targetKm} กม.)`, `${Math.round(pct * 100)}% of the plan (${planned.targetKm} km)`)
      points.push(tx('ไม่ต้องวิ่งชดเชย — ทำตามแผนรอบถัดไปตามปกติ', 'No need to make it up — just do the next session as planned'))
    }
    if (planned.runKind && (planned.runKind === 'easy' || planned.runKind === 'long') && (run.kind === 'tempo' || run.kind === 'interval' || run.kind === 'race'))
      points.push(tx('แผนวันนี้คือวิ่งเบา แต่บันทึกเป็นวิ่งเร็ว — วันหนักควรมีไม่เกิน 1 วัน/สัปดาห์', 'Today was planned easy but logged as fast — keep hard days to one a week'))
  } else if (planned?.type === 'rest') {
    tone = 'info'
    points.push(tx('วันนี้ในแผนเป็นวันพัก — ถ้าวิ่งเพิ่ม ให้เบาและสั้น แล้วพักวันถัดไปแทน', 'Today was a rest day — keep extra runs short and easy, and rest tomorrow instead'))
  }

  // วันเบาเร็วเกินโซน (ทดสอบการพูด — Foster 2008)
  const over = easyTooFast(run, easyFloor)
  const tooFast = over !== null
  if (over !== null && easyFloor) {
    tone = 'warn'
    headline = tx('วันเบาเร็วไป', 'Easy run too fast')
    points.push(tx(`เพซ ${fmt(pace)} เร็วกว่าโซนเบา (${fmt(easyFloor)} หรือช้ากว่า) ~${over} วิ/กม. — ครั้งหน้าช้าลงจนพูดเป็นประโยคได้สบาย`,
      `Pace ${fmt(pace)} is ~${over} s/km faster than easy (${fmt(easyFloor)} or slower) — next time slow down until you can talk in full sentences`))
  }

  // ความเหนื่อย (session-RPE)
  if (run.rpe === undefined) points.push(tx('ยังไม่ได้ให้คะแนนความเหนื่อย — ให้ด้านล่าง แอปจะใช้ปรับคำแนะนำ', 'No effort rating yet — add it below so advice can adapt'))
  else if (easyDay && run.rpe >= 7) {
    tone = 'warn'
    const lastEasy = prev.filter(r => r.date < run.date && (r.kind === 'easy' || r.kind === 'long') && r.rpe !== undefined).slice(-1)[0]
    const twice = lastEasy && lastEasy.rpe! >= 7 && daysBetween(lastEasy.date, run.date) <= 10
    if (!tooFast) headline = twice ? tx('วันเบาเหนื่อยมาก 2 ครั้งติด', 'Two hard-feeling easy runs in a row') : tx('วันเบาแต่เหนื่อยมาก', 'Easy run felt hard')
    points.push(twice
      ? tx(`ความเหนื่อย ${run.rpe}/10 ติดกัน 2 รอบ — ร่างกายอาจยังไม่ฟื้น ลองทำสัปดาห์นี้ซ้ำ หรือเพิ่มช่วงเดินในรอบถัดไป`, `Effort ${run.rpe}/10 twice in a row — you may not be recovering; consider repeating this week or adding more walk breaks`)
      : tx(`ความเหนื่อย ${run.rpe}/10 สูงสำหรับวันเบา (ควรราว 3–4) — ช้าลง เพิ่มช่วงเดิน และดูการนอน/อากาศร้อน`, `Effort ${run.rpe}/10 is high for an easy day (aim ~3–4) — slow down, add walk breaks, check sleep and heat`))
  } else if (easyDay && run.rpe <= 4 && tone === 'good') points.push(tx(`ความเหนื่อย ${run.rpe}/10 — เบาจริงตามแผน ดีมาก`, `Effort ${run.rpe}/10 — properly easy, nice`))

  // ออกตัวเร็วเกิน (ครึ่งหลังช้าลง >5%)
  if (splitDiffPct !== undefined && splitDiffPct > 5 && run.km >= 3) {
    if (tone === 'good') tone = 'info'
    points.push(tx(`ครึ่งหลังช้าลง ${splitDiffPct.toFixed(0)}% — ออกตัวช้าลงอีกนิด จะจบได้แรงกว่า`, `Second half ${splitDiffPct.toFixed(0)}% slower — start a little easier to finish stronger`))
  }

  return { tone, headline, points }
}

/** ซ้อมครั้งถัดไปในแผนหลังวันที่ date (สัปดาห์นี้) */
export function nextSession(plan: Day[], monday: string, date: string) {
  for (let i = 0; i < 7; i++) {
    const d = addDays(monday, i)
    if (d > date && plan[i] && plan[i].type !== 'rest') return { i, date: d, day: plan[i] }
  }
  return null
}
