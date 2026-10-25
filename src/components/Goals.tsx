import { useState } from 'react'
import { Award, Dumbbell, Flame, Footprints, Medal, Mountain, Pencil, Target, Trophy, Zap, type LucideIcon } from 'lucide-react'
import { BADGES, earnedBadges, monthOf, periodStats, type BadgeIcon } from '../lib/goals'
import { useMonthGoal } from '../lib/useGoals'
import { formatDuration, useRuns, useSessions } from '../lib/log'
import { today } from '../lib/date'
import { cx } from '../lib/cx'
import { Button, Card, Collapse, Sheet } from './ui'
import { NumberInput } from './Form'

const icons: Record<BadgeIcon, LucideIcon> = { footprints: Footprints, medal: Medal, trophy: Trophy, flame: Flame, dumbbell: Dumbbell, target: Target, mountain: Mountain, zap: Zap }
const thMonths = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม']

/** การ์ดหน้าหลัก: ระยะวิ่งเดือนนี้เทียบเป้า + ทางเข้าเหรียญ/สรุปปี */
export function MonthGoalCard() {
  const [runs] = useRuns()
  const [sessions] = useSessions()
  const [goal, setGoal, isDefault] = useMonthGoal()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(String(goal))
  const [showBadges, setShowBadges] = useState(false)
  const month = monthOf(today())
  const s = periodStats(runs, sessions, month)
  const pct = Math.min(1, s.km / goal)
  const earned = earnedBadges({ runs, sessions, goalKm: goal })

  return (
    <Card title={`เป้าเดือน${thMonths[+month.slice(5) - 1]}`}
      action={<button onClick={() => { setDraft(String(goal)); setEditing(!editing) }} aria-label="แก้เป้า" className="grid size-8 place-items-center rounded-full text-muted ring-1 ring-line"><Pencil size={14} /></button>}>
      <div className="flex items-baseline justify-between">
        <span className="text-2xl font-extrabold tabular-nums">{s.km.toFixed(1)}<span className="ml-1 text-sm font-normal text-muted">/ {goal} กม.</span></span>
        <span className={cx('text-sm font-semibold', pct >= 1 ? 'text-good' : 'text-muted')}>{pct >= 1 ? 'ถึงเป้าแล้ว' : `${Math.round(pct * 100)}%`}</span>
      </div>
      <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-body">
        <div className={cx('h-full rounded-full transition-[width] duration-700', pct >= 1 ? 'bg-good' : 'bg-run')} style={{ width: `${pct * 100}%` }} />
      </div>
      <div className="mt-2 text-xs text-muted">วิ่ง {s.runs} ครั้ง · เวท {s.workouts} ครั้ง{isDefault ? ' · เป้าตั้งจากโปรแกรม' : ''}</div>
      <Collapse open={editing}>
        <div className="mt-3 flex items-end gap-2">
          <NumberInput className="flex-1" label="เป้าวิ่งต่อเดือน" unit="กม." step={5} stepper value={draft} onChange={setDraft} />
          <Button onClick={() => { if (+draft > 0) setGoal(+draft); setEditing(false) }}>บันทึก</Button>
        </div>
      </Collapse>
      <button onClick={() => setShowBadges(true)} className="mt-3 flex w-full items-center gap-2 rounded-2xl bg-raised px-3 py-2 text-left text-sm">
        <Award size={18} className="text-accent" />
        <span className="flex-1 font-semibold">เหรียญรางวัล & สรุปปี</span>
        <span className="tabular-nums text-muted">{earned.length}/{BADGES.length}</span>
      </button>
      {showBadges && <BadgesSheet earned={earned} onClose={() => setShowBadges(false)} />}
    </Card>
  )
}

function BadgesSheet({ earned, onClose }: { earned: string[]; onClose: () => void }) {
  const [runs] = useRuns()
  const [sessions] = useSessions()
  const year = today().slice(0, 4)
  const y = periodStats(runs, sessions, year)
  const months = Array.from({ length: 12 }, (_, i) => periodStats(runs, sessions, `${year}-${String(i + 1).padStart(2, '0')}`).km)
  const max = Math.max(1, ...months)
  return (
    <Sheet onClose={onClose} title="เหรียญรางวัล">
      <ul className="grid grid-cols-3 gap-2">
        {BADGES.map(b => {
          const on = earned.includes(b.id)
          const Icon = icons[b.icon]
          return (
            <li key={b.id} className={cx('flex flex-col items-center rounded-2xl p-2.5 text-center ring-1', on ? 'bg-accent-soft/60 ring-accent/30' : 'bg-raised ring-line')}>
              <span className={cx('grid size-11 place-items-center rounded-full', on ? 'bg-accent text-white' : 'bg-body text-muted/50')}><Icon size={20} /></span>
              <span className={cx('mt-1.5 text-xs font-bold leading-tight', !on && 'text-muted')}>{b.title}</span>
              <span className="mt-0.5 text-[10px] leading-tight text-muted">{b.text}</span>
            </li>
          )
        })}
      </ul>

      <div className="mt-5 text-lg font-bold">สรุปปี {+year + 543}</div>
      <div className="mt-2 grid grid-cols-3 gap-2 text-center">
        {[['วิ่ง', `${y.km.toFixed(0)} กม.`], ['เวลาวิ่ง', formatDuration(y.seconds)], ['ฝึกเวท', `${y.workouts} ครั้ง`]].map(([l, v]) => (
          <div key={l} className="rounded-xl bg-raised px-2 py-2"><div className="text-[11px] text-muted">{l}</div><div className="font-bold tabular-nums">{v}</div></div>
        ))}
      </div>
      <div className="mt-3 flex h-24 items-end gap-1" role="img" aria-label="ระยะวิ่งรายเดือน">
        {months.map((km, i) => (
          <div key={i} className="flex flex-1 flex-col items-center gap-1">
            <div className="w-full rounded-t-md bg-run" style={{ height: `${(km / max) * 72}px`, minHeight: km ? 2 : 0 }} title={`${thMonths[i]}: ${km.toFixed(1)} กม.`} />
            <span className="text-[9px] text-muted">{i + 1}</span>
          </div>
        ))}
      </div>
    </Sheet>
  )
}
