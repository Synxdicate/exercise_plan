import { Dumbbell, MessageSquareQuote } from 'lucide-react'
import { addDays, today, weekStart, WEEKDAYS_EN, WEEKDAYS_TH } from '../lib/date'
import { useDayDone } from '../lib/dayDone'
import { useSessions, type Run } from '../lib/log'
import { nextSession, runReview, strengthGap } from '../lib/coachNotes'
import { useProgram } from '../lib/program'
import { usePersisted } from '../lib/storage'
import { isStrength } from '../lib/sessionKind'
import { useTodayIdx } from '../lib/useToday'
import { useLang, useT } from '../lib/i18n'
import { useDayText } from '../lib/dayText'
import { useNav } from '../lib/nav'
import { cx } from '../lib/cx'
import { Button } from './ui'

/** ทวงเวทเมื่อไม่ได้เล่นมา ≥8 วัน (บันทึกเซ็ตหรือติ๊กทำแล้ว) — เวทลดการบาดเจ็บ (Lauersen 2014, Toresdahl 2020) */
export function StrengthNudgeCard({ onPlan = false }: { onPlan?: boolean }) {
  const p = useProgram()
  const [sessions] = useSessions()
  const dayDone = useDayDone()
  const todayIdx = useTodayIdx()
  const [seen, setSeen] = usePersisted('strengthNudgeSeen', '')
  const t = useT()
  const nav = useNav()
  const monday = weekStart(today())
  if (p.finished || seen === monday) return null
  const week = p.currentWeek
  const plan = p.plan(week)
  // วันเวทที่ติ๊กทำแล้ว (สัปดาห์นี้และสัปดาห์ก่อน) นับเป็นการเล่นเวทด้วย
  const ticked = [week - 1, week].flatMap(w => {
    if (w < 1 && !p.prepWeeks.includes(w)) return []
    const pl = p.plan(w)
    return pl.flatMap((d, i) => (d.type === 'strength' && dayDone(w, i, d) ? [addDays(p.mondayOf(w), i)] : []))
  })
  const dates = [...sessions.filter(isStrength).map(s => s.date), ...ticked].filter(d => d <= today()).sort()
  const g = strengthGap({
    lastStrength: dates.at(-1) ?? null, start: p.storedStart || addDays(monday, -7 * (week - 1)),
    today: today(), plan, todayIdx, done: i => dayDone(week, i, plan[i]),
  })
  if (!g) return null
  const names = (en: boolean) => g.left.map(i => (i === todayIdx ? (en ? 'today' : 'วันนี้') : (en ? WEEKDAYS_EN : WEEKDAYS_TH)[i])).join(', ')
  return (
    <section className="animate-fade-up rounded-2xl bg-accent-soft p-3.5 ring-1 ring-accent/30">
      <div className="flex items-center gap-2 font-bold text-accent">
        <Dumbbell size={18} /> {g.never ? t('ยังไม่ได้เริ่มเวทเลย', 'No strength sessions yet') : t(`ไม่ได้เล่นเวทมา ${g.days} วัน`, `${g.days} days without strength work`)}
      </div>
      <p className="mt-1 text-sm">
        {p.raceHills
          ? t('เวทเบา ๆ 2 ครั้ง/สัปดาห์ช่วยลดการเจ็บน่องและเข่า — สำคัญกับสนามที่มีเนิน ครั้งละ 30–40 นาทีพอ', 'Two light strength sessions a week cut calf and knee injuries — key for a hilly race. 30–40 minutes is enough.')
          : t('เวทเบา ๆ 2 ครั้ง/สัปดาห์ช่วยลดการบาดเจ็บจากการวิ่ง ครั้งละ 30–40 นาทีพอ', 'Two light strength sessions a week cut running injuries. 30–40 minutes is enough.')}
        {' '}
        {g.left.length
          ? t(`สัปดาห์นี้ยังเหลือวันเวท: ${names(false)}`, `Strength days left this week: ${names(true)}`)
          : t('วันเวทสัปดาห์นี้ผ่านไปแล้ว — ทำวันพักที่ไม่ติดกับวันวิ่งยาวได้ หรือเริ่มใหม่สัปดาห์หน้า', 'This week’s strength days have passed — use a rest day not next to the long run, or restart next week')}
      </p>
      <div className="mt-2 flex gap-2">
        {!onPlan && <Button size="sm" onClick={() => nav('plan')}>{t('ไปที่ตารางฝึก', 'Open the plan')}</Button>}
        <Button size="sm" variant="soft" onClick={() => setSeen(monday)}>{t('ไว้ทีหลัง', 'Later')}</Button>
      </div>
    </section>
  )
}

/** โค้ชสรุปหลังวิ่ง: ข้อหลัก 1 ข้อ + รายละเอียด + ซ้อมครั้งถัดไป */
export function CoachReview({ run, runs, fiveK, splitDiffPct }: { run: Run; runs: Run[]; fiveK?: number; splitDiffPct?: number }) {
  const p = useProgram()
  const en = useLang()[0] === 'en'
  const t = useT()
  const dt = useDayText()
  const monday = weekStart(run.date)
  const week = p.weekOf(monday)
  const plan = week !== null ? p.plan(week) : null
  const idx = (new Date(`${run.date}T00:00:00`).getDay() + 6) % 7
  const r = runReview(run, { planned: plan?.[idx], easyFloor: fiveK ? fiveK * 1.2 : undefined, prev: runs, splitDiffPct })
  if (!r) return null
  const next = plan && run.date >= weekStart(today()) ? nextSession(plan, monday, run.date) : null
  const tone = { good: 'bg-good/10 ring-good/30', warn: 'bg-warn/10 ring-warn/30', info: 'bg-raised ring-line' }[r.tone]
  const head = { good: 'text-good', warn: 'text-warn', info: 'text-ink' }[r.tone]
  return (
    <section className={cx('mb-3 rounded-2xl p-3 ring-1', tone)}>
      <div className={cx('flex items-center gap-2 text-sm font-bold', head)}>
        <MessageSquareQuote size={16} className="shrink-0" /> {t('โค้ช', 'Coach')}: {en ? r.headline.en : r.headline.th}
      </div>
      {r.points.length > 0 && (
        <ul className="mt-1.5 space-y-1 text-sm">
          {r.points.map(x => <li key={x.en} className="flex gap-1.5"><span aria-hidden className="text-muted">•</span><span>{en ? x.en : x.th}</span></li>)}
        </ul>
      )}
      {next && (
        <p className="mt-2 text-xs text-muted">
          {t('ถัดไป', 'Next')}: {next.date === today() ? t('วันนี้', 'today') : en ? WEEKDAYS_EN[next.i] : `วัน${WEEKDAYS_TH[next.i]}`} — {dt.title(next.day)}{next.day.targetKm ? ` ${next.day.targetKm} ${t('กม.', 'km')}` : ''}
        </p>
      )}
    </section>
  )
}
