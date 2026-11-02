import { CalendarX2, ShieldAlert } from 'lucide-react'
import type { Day } from '../data/workouts'
import { addDays, daysBetween, today, weekStart } from '../lib/date'
import { useDayDone } from '../lib/dayDone'
import { useRuns } from '../lib/log'
import { longRunCap, missedKeyRun } from '../lib/missed'
import { useProgram } from '../lib/program'
import { usePersisted } from '../lib/storage'
import { runsOnly } from '../lib/walk'
import { Button } from './ui'

const DAY_NAMES = ['จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์', 'อาทิตย์']

/** วิ่งยาว/วิ่งคุณภาพที่พลาดไป: บอกว่าย้ายไปวันไหนได้ หรือข้ามไปเลย — ไม่วิ่งชดเชยซ้อนกับวันวิ่งอื่น */
export function MissedRunCard() {
  const p = useProgram()
  const [runs] = useRuns()
  const dayDone = useDayDone()
  const [seen, setSeen] = usePersisted('missedSeen', '')
  const monday = weekStart(today())
  const todayIdx = daysBetween(monday, today())
  const week = p.currentWeek
  const plan = p.plan(week)
  // วิ่งชดเชยไปแล้ววันอื่น (ระยะ ≥80% ของแผน หลังวันที่พลาด) ก็ไม่ต้องเตือน
  const madeUp = (date: string, km = 0) => runsOnly(runs).some(r => r.date > date && r.date <= today() && r.km >= km * 0.8)
  const doneThis = (i: number) => dayDone(week, i, plan[i]) || madeUp(addDays(monday, i), plan[i]?.targetKm)
  const lastWeek = week > 1 && !p.ongoing ? week - 1 : null
  const lastPlan = lastWeek ? p.plan(lastWeek) : null
  const last = lastWeek && lastPlan
    ? { plan: lastPlan, done: (i: number) => dayDone(lastWeek, i, lastPlan[i]) || madeUp(addDays(monday, i - 7), lastPlan[i]?.targetKm) }
    : undefined
  const m = missedKeyRun(plan, todayIdx, doneThis, last)
  if (!m) return null
  const id = m.kind === 'thisWeek' ? p.doneId(week, m.i) : `last:${monday}`
  if (seen === id) return null

  return (
    <section className="animate-fade-up rounded-2xl bg-warn/10 p-3.5 ring-1 ring-warn/30">
      <div className="flex items-center gap-2 font-bold text-warn">
        <CalendarX2 size={18} /> {m.kind === 'lastWeek' ? 'วิ่งยาวสัปดาห์ที่แล้วไม่ได้ทำ' : `พลาด${m.day.title}วัน${DAY_NAMES[m.i]}`}
      </div>
      <p className="mt-1 text-sm">
        {m.kind === 'lastWeek'
          ? `${m.day.title} ไม่ต้องวิ่งชดเชย — ทำตามแผนสัปดาห์นี้ต่อได้เลย ถ้าวิ่งยาวรอบนี้ไกลกว่ารอบที่เคยวิ่งมาก แอปจะบอกระยะที่ไม่ควรเกินในวันนั้น`
          : m.to !== null
            ? `ย้ายไปวัน${DAY_NAMES[m.to]}ได้ (วันพักที่ไม่ติดกับวันวิ่งอื่น) — ถ้าไม่สะดวกก็ข้ามไป อย่าวิ่งเพิ่มติดกับวันวิ่งอื่นเพื่อชดเชย`
            : 'สัปดาห์นี้ไม่มีวันว่างที่ไม่ติดกับวันวิ่งอื่น — ข้ามไปได้เลย พลาดรอบเดียวไม่ทำให้ความฟิตหาย การวิ่งชดเชยติดกันเสี่ยงเจ็บกว่า'}
      </p>
      <Button size="sm" variant="soft" className="mt-2" onClick={() => setSeen(id)}>รับทราบ</Button>
    </section>
  )
}

/** เพดานระยะวันนี้ (≤110% ของครั้งที่ยาวที่สุดใน 30 วัน — Frandsen 2025) เมื่อแผนกระโดดเกิน เช่น หลังพลาดวิ่งยาว */
export function CapNote({ day, date, className }: { day: Day; date: string; className?: string }) {
  const [runs] = useRuns()
  const c = longRunCap(runs, date, day)
  if (!c) return null
  return (
    <p className={className ?? 'flex items-start gap-2 rounded-xl bg-warn/15 p-2.5 text-sm text-warn'}>
      <ShieldAlert size={16} className="mt-0.5 shrink-0" />
      <span>วันนี้วิ่งไม่เกิน <b>{c.cap} กม.</b> (แผน {day.targetKm} กม.) — ครั้งที่ยาวที่สุดใน 30 วันคือ {c.longest.toFixed(1)} กม. วิ่งเกิน 110% ของระยะนั้นเสี่ยงเจ็บสูงขึ้น</span>
    </p>
  )
}
