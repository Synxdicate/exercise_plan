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
import { useT } from '../lib/i18n'

const DAY_NAMES = ['จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์', 'อาทิตย์']
const DAY_EN = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

/** วิ่งยาว/วิ่งคุณภาพที่พลาดไป: บอกว่าย้ายไปวันไหนได้ หรือข้ามไปเลย — ไม่วิ่งชดเชยซ้อนกับวันวิ่งอื่น */
export function MissedRunCard() {
  const p = useProgram()
  const [runs] = useRuns()
  const dayDone = useDayDone()
  const [seen, setSeen] = usePersisted('missedSeen', '')
  const t = useT()
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
  const m = p.finished ? null : missedKeyRun(plan, todayIdx, doneThis, last)
  if (!m) return null
  const id = m.kind === 'thisWeek' ? p.doneId(week, m.i) : `last:${monday}`
  if (seen === id) return null

  return (
    <section className="animate-fade-up rounded-2xl bg-warn/10 p-3.5 ring-1 ring-warn/30">
      <div className="flex items-center gap-2 font-bold text-warn">
        <CalendarX2 size={18} /> {m.kind === 'lastWeek' ? t('วิ่งยาวสัปดาห์ที่แล้วไม่ได้ทำ', "Last week's long run was missed") : t(`พลาด${m.day.title}วัน${DAY_NAMES[m.i]}`, `Missed ${DAY_EN[m.i]}'s run: ${m.day.title}`)}
      </div>
      <p className="mt-1 text-sm">
        {m.kind === 'lastWeek'
          ? t(`${m.day.title} ไม่ต้องวิ่งชดเชย — ทำตามแผนสัปดาห์นี้ต่อได้เลย ถ้าวิ่งยาวรอบนี้ไกลกว่ารอบที่เคยวิ่งมาก แอปจะบอกระยะที่ไม่ควรเกินในวันนั้น`,
            "No need to make it up — just follow this week's plan. If this week's long run is much longer than anything you've done recently, the app will show a distance not to exceed that day.")
          : m.to !== null
            ? t(`ย้ายไปวัน${DAY_NAMES[m.to]}ได้ (วันพักที่ไม่ติดกับวันวิ่งอื่น) — ถ้าไม่สะดวกก็ข้ามไป อย่าวิ่งเพิ่มติดกับวันวิ่งอื่นเพื่อชดเชย`,
              `Move it to ${DAY_EN[m.to]} (a rest day not next to another run) — or skip it. Don't add it next to another run day to catch up.`)
            : t('สัปดาห์นี้ไม่มีวันว่างที่ไม่ติดกับวันวิ่งอื่น — ข้ามไปได้เลย พลาดรอบเดียวไม่ทำให้ความฟิตหาย การวิ่งชดเชยติดกันเสี่ยงเจ็บกว่า',
              "No free day this week that isn't next to another run — skip it. One missed run won't cost fitness; back-to-back catch-up runs are riskier.")}
      </p>
      <Button size="sm" variant="soft" className="mt-2" onClick={() => setSeen(id)}>{t('รับทราบ', 'Got it')}</Button>
    </section>
  )
}

/** เพดานระยะวันนี้ (≤110% ของครั้งที่ยาวที่สุดใน 30 วัน — Frandsen 2025) เมื่อแผนกระโดดเกิน เช่น หลังพลาดวิ่งยาว */
export function CapNote({ day, date, className }: { day: Day; date: string; className?: string }) {
  const [runs] = useRuns()
  const t = useT()
  const c = longRunCap(runs, date, day)
  if (!c) return null
  return (
    <p className={className ?? 'flex items-start gap-2 rounded-xl bg-warn/15 p-2.5 text-sm text-warn'}>
      <ShieldAlert size={16} className="mt-0.5 shrink-0" />
      <span>{t('วันนี้วิ่งไม่เกิน', 'Run no more than')} <b>{c.cap} {t('กม.', 'km')}</b> {t(`(แผน ${day.targetKm} กม.) — ครั้งที่ยาวที่สุดใน 30 วันคือ ${c.longest.toFixed(1)} กม. วิ่งเกิน 110% ของระยะนั้นเสี่ยงเจ็บสูงขึ้น`, `today (plan ${day.targetKm} km) — your longest run in 30 days is ${c.longest.toFixed(1)} km; going past 110% of it raises injury risk`)}</span>
    </p>
  )
}
