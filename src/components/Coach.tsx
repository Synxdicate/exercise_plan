import { useState } from 'react'
import { BatteryLow, Dumbbell, MessageSquareQuote } from 'lucide-react'
import { easeActive, type EaseReason } from '../lib/easeOff'
import { addDays, niceDate, today, weekStart, WEEKDAYS_EN, WEEKDAYS_TH } from '../lib/date'
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
import { Button, Segmented, Sheet } from './ui'

/** ทวงเวทเมื่อไม่ได้เล่นมา ≥8 วัน (บันทึกเซ็ตหรือติ๊กทำแล้ว) เวทลดการบาดเจ็บ (Lauersen 2014, Toresdahl 2020) */
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
          ? t('เวทเบา ๆ 2 ครั้ง/สัปดาห์ช่วยลดการเจ็บน่องและเข่า สำคัญกับสนามที่มีเนิน ครั้งละ 30–40 นาทีพอ', 'Two light strength sessions a week cut calf and knee injuries — key for a hilly race. 30–40 minutes is enough.')
          : t('เวทเบา ๆ 2 ครั้ง/สัปดาห์ช่วยลดการบาดเจ็บจากการวิ่ง ครั้งละ 30–40 นาทีพอ', 'Two light strength sessions a week cut running injuries. 30–40 minutes is enough.')}
        {' '}
        {g.left.length
          ? t(`สัปดาห์นี้ยังเหลือวันเวท: ${names(false)}`, `Strength days left this week: ${names(true)}`)
          : t('วันเวทสัปดาห์นี้ผ่านไปแล้ว ทำวันพักที่ไม่ติดกับวันวิ่งยาวได้ หรือเริ่มใหม่สัปดาห์หน้า', 'This week’s strength days have passed — use a rest day not next to the long run, or restart next week')}
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

const REASONS: { value: EaseReason; th: string; en: string; what: [string, string] }[] = [
  { value: 'sick', th: 'ไม่สบาย', en: 'Unwell', what: ['พักทุกวันในช่วงนี้ หายไข้แล้วค่อยเดินเบา ๆ', 'Rest every day in this spell; walk gently once the fever is gone'] },
  { value: 'sore', th: 'เจ็บเล็กน้อย', en: 'Sore', what: ['วิ่งเบาครึ่งระยะ ไม่มีวันเร็ว เวทลดครึ่งเซ็ต', 'Easy runs at half distance, no fast days, half the strength sets'] },
  { value: 'busy', th: 'ไม่มีเวลา', en: 'Busy', what: ['วิ่งเบาสั้นลง ~60% เวทย่อ ~15 นาที', 'Shorter easy runs (~60%), ~15-minute strength'] },
]

/** ช่วงนี้ไม่ไหว: ปรับแผนชั่วคราวแล้วกลับแผนเดิมเอง ป้ายเมื่อใช้งานอยู่ / ปุ่มเปิดในหน้าฝึก */
export function EaseOffCard({ trigger = false }: { trigger?: boolean }) {
  const p = useProgram()
  const t = useT()
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState<EaseReason>('sore')
  const [days, setDays] = useState<'3' | '7' | '14'>('7')
  const now = today()
  if (p.finished) return null
  const r = p.easeOff
  if (easeActive(r, now)) {
    const info = REASONS.find(x => x.value === r!.reason)!
    return (
      <section className="flex items-start gap-3 rounded-2xl bg-raised p-3.5 ring-1 ring-line">
        <BatteryLow size={18} className="mt-0.5 shrink-0 text-warn" />
        <div className="min-w-0 flex-1 text-sm">
          <div className="font-bold">{t(`แผนเบาลง (${info.th}) ถึง ${niceDate(r!.to)}`, `Eased plan (${info.en.toLowerCase()}) until ${niceDate(r!.to)}`)}</div>
          <div className="text-muted">{t(info.what[0], info.what[1])} — {t('หมดช่วงแล้วกลับแผนเดิมเอง', 'the normal plan resumes afterwards')}</div>
        </div>
        <Button size="sm" variant="soft" onClick={() => p.setEaseOff(null)}>{t('กลับแผนปกติ', 'Resume')}</Button>
      </section>
    )
  }
  if (!trigger) return null
  return (
    <>
      <button onClick={() => setOpen(true)} className="flex w-full items-center gap-2 rounded-2xl px-1 py-1 text-left text-sm text-muted">
        <BatteryLow size={16} className="shrink-0" /> <span className="underline underline-offset-2">{t('ช่วงนี้ไม่ไหว? ปรับแผนให้เบาลงชั่วคราว', 'Not feeling 100%? Ease the plan for a while')}</span>
      </button>
      {open && (
        <Sheet onClose={() => setOpen(false)} title={t('ช่วงนี้ไม่ไหว', 'Not feeling 100%')}>
          <div className="space-y-3 pb-2">
            <div>
              <div className="mb-1.5 text-sm font-medium text-muted">{t('เพราะอะไร', 'Why')}</div>
              <Segmented value={reason} onChange={setReason} options={REASONS.map(x => ({ value: x.value, label: t(x.th, x.en) }))} />
            </div>
            <div>
              <div className="mb-1.5 text-sm font-medium text-muted">{t('นานเท่าไร', 'For how long')}</div>
              <Segmented value={days} onChange={setDays} options={[{ value: '3', label: t('3 วัน', '3 days') }, { value: '7', label: t('1 สัปดาห์', '1 week') }, { value: '14', label: t('2 สัปดาห์', '2 weeks') }]} />
            </div>
            <p className="text-sm">{t(REASONS.find(x => x.value === reason)!.what[0], REASONS.find(x => x.value === reason)!.what[1])}. {t('วันแข่งไม่เปลี่ยน หมดช่วงแล้วกลับแผนเดิม ถ้าหยุดไปนาน แอปจะถอยสัปดาห์ให้เอง', 'Race day stays. The normal plan resumes afterwards; after a long break the app steps back a week by itself.')}</p>
            {reason === 'sore' && <p className="text-xs text-muted">{t('ปวดเกิน 3 จาก 10 หรือเดินกะเผลก ควรพบแพทย์/นักกายภาพ', 'Pain above 3/10 or limping — see a doctor or physio')}</p>}
            <Button className="w-full" onClick={() => { p.setEaseOff({ from: now, to: addDays(now, +days - 1), reason }); setOpen(false) }}>{t('เริ่มแผนเบา', 'Start eased plan')}</Button>
          </div>
        </Sheet>
      )}
    </>
  )
}
