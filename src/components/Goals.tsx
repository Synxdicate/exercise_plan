import { useState } from 'react'
import { Award, Dumbbell, Flame, Footprints, Medal, Mountain, Pencil, Target, Trophy, Zap, type LucideIcon } from 'lucide-react'
import { BADGES, BADGES_EN, earnedBadges, monthOf, periodStats, type BadgeIcon } from '../lib/goals'
import { useT } from '../lib/i18n'
import { useMonthGoal } from '../lib/useGoals'
import { formatDuration, useRuns, useSessions } from '../lib/log'
import { monthLabel, today } from '../lib/date'
import { cx } from '../lib/cx'
import { Button, Card, Collapse, Sheet } from './ui'
import { NumberInput } from './Form'

const icons: Record<BadgeIcon, LucideIcon> = { footprints: Footprints, medal: Medal, trophy: Trophy, flame: Flame, dumbbell: Dumbbell, target: Target, mountain: Mountain, zap: Zap }
const enMonths = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const thMonths = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม']

/** การ์ดหน้าหลัก: ระยะวิ่งเดือนนี้เทียบเป้า + ทางเข้าเหรียญ/สรุปปี */
export function MonthGoalCard() {
  const [runs] = useRuns()
  const [sessions] = useSessions()
  const [goal, setGoal, isDefault] = useMonthGoal()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(String(goal))
  const [showBadges, setShowBadges] = useState(false)
  const t = useT()
  const month = monthOf(today())
  const s = periodStats(runs, sessions, month)
  const pct = Math.min(1, s.km / goal)
  const earned = earnedBadges({ runs, sessions, goalKm: goal })

  return (
    <Card title={t(`เป้าเดือน${thMonths[+month.slice(5) - 1]}`, `${enMonths[+month.slice(5) - 1]} goal`)}
      action={<button onClick={() => { setDraft(String(goal)); setEditing(!editing) }} aria-label={t('แก้เป้า', 'Edit goal')} className="grid size-8 place-items-center rounded-full text-muted ring-1 ring-line"><Pencil size={14} /></button>}>
      <div className="flex items-baseline justify-between">
        <span className="text-2xl font-extrabold tabular-nums">{s.km.toFixed(1)}<span className="ml-1 text-sm font-normal text-muted">/ {goal} {t('กม.', 'km')}</span></span>
        <span className={cx('text-sm font-semibold', pct >= 1 ? 'text-good' : 'text-muted')}>{pct >= 1 ? t('ถึงเป้าแล้ว', 'Goal reached') : `${Math.round(pct * 100)}%`}</span>
      </div>
      <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-body">
        <div className={cx('h-full rounded-full transition-[width] duration-700', pct >= 1 ? 'bg-good-fill' : 'bg-run-fill')} style={{ width: `${pct * 100}%` }} />
      </div>
      <div className="mt-2 text-xs text-muted">{t(`วิ่ง ${s.runs} ครั้ง · เวท ${s.workouts} ครั้ง`, `${s.runs} runs · ${s.workouts} workouts`)}{isDefault ? t(' · เป้าตั้งจากโปรแกรม', ' · goal from program') : ''}</div>
      <Collapse open={editing}>
        <div className="mt-3 flex items-end gap-2">
          <NumberInput className="flex-1" label={t('เป้าวิ่งต่อเดือน', 'Monthly run goal')} unit={t('กม.', 'km')} step={5} stepper value={draft} onChange={setDraft} />
          <Button onClick={() => { if (+draft > 0) setGoal(+draft); setEditing(false) }}>{t('บันทึก', 'Save')}</Button>
        </div>
      </Collapse>
      <button onClick={() => setShowBadges(true)} className="mt-3 flex w-full items-center gap-2 rounded-2xl bg-raised px-3 py-2 text-left text-sm">
        <Award size={18} className="text-accent" />
        <span className="flex-1 font-semibold">{t('เหรียญรางวัล & สรุปปี', 'Badges & year summary')}</span>
        <span className="tabular-nums text-muted">{earned.length}/{BADGES.length}</span>
      </button>
      {showBadges && <BadgesSheet earned={earned} onClose={() => setShowBadges(false)} />}
    </Card>
  )
}

function BadgesSheet({ earned, onClose }: { earned: string[]; onClose: () => void }) {
  const t = useT()
  const [runs] = useRuns()
  const [sessions] = useSessions()
  const year = today().slice(0, 4)
  const y = periodStats(runs, sessions, year)
  const months = Array.from({ length: 12 }, (_, i) => periodStats(runs, sessions, `${year}-${String(i + 1).padStart(2, '0')}`).km)
  const max = Math.max(1, ...months)
  return (
    <Sheet onClose={onClose} title={t('เหรียญรางวัล', 'Badges')}>
      <ul className="grid grid-cols-3 gap-2">
        {BADGES.map(b => {
          const on = earned.includes(b.id)
          const Icon = icons[b.icon]
          return (
            <li key={b.id} className={cx('flex flex-col items-center rounded-2xl p-2.5 text-center ring-1', on ? 'bg-accent-soft/60 ring-accent/30' : 'bg-raised ring-line')}>
              <span className={cx('grid size-11 place-items-center rounded-full', on ? 'bg-accent-fill text-white' : 'bg-body text-muted/50')}><Icon size={20} /></span>
              <span className={cx('mt-1.5 text-xs font-bold leading-tight', !on && 'text-muted')}>{t(b.title, BADGES_EN[b.id]?.[0] ?? b.title)}</span>
              <span className="mt-0.5 text-[10px] leading-tight text-muted">{t(b.text, BADGES_EN[b.id]?.[1] ?? b.text)}</span>
            </li>
          )
        })}
      </ul>

      <div className="mt-5 text-lg font-bold">{t(`สรุปปี ${+year + 543}`, `${year} summary`)}</div>
      <div className="mt-2 grid grid-cols-3 gap-2 text-center">
        {[[t('วิ่ง', 'Run'), `${y.km.toFixed(0)} ${t('กม.', 'km')}`], [t('เวลาวิ่ง', 'Run time'), formatDuration(y.seconds)], [t('ฝึกเวท', 'Strength'), `${y.workouts} ${t('ครั้ง', 'sessions')}`]].map(([l, v]) => (
          <div key={l} className="rounded-xl bg-raised px-2 py-2"><div className="text-[11px] text-muted">{l}</div><div className="font-bold tabular-nums">{v}</div></div>
        ))}
      </div>
      <div className="mt-3 flex h-24 items-end gap-1" role="img" aria-label={t('ระยะวิ่งรายเดือน', 'Monthly running distance')}>
        {months.map((km, i) => (
          <div key={i} className="flex flex-1 flex-col items-center gap-1">
            <div className="w-full rounded-t-md bg-run-fill" style={{ height: `${(km / max) * 72}px`, minHeight: km ? 2 : 0 }} title={t(`${thMonths[i]}: ${km.toFixed(1)} กม.`, `${monthLabel(`${year}-${String(i + 1).padStart(2, '0')}`).split(' ')[0]}: ${km.toFixed(1)} km`)} />
            <span className="text-[9px] text-muted">{i + 1}</span>
          </div>
        ))}
      </div>
    </Sheet>
  )
}
