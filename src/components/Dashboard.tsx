import { useState } from 'react'
import { Dumbbell, Flame, Footprints, Moon } from 'lucide-react'
import { gymWeek, parkWeek } from '../data/workouts'
import { muscleNames, weeklySets, type Muscle } from '../data/muscles'
import { useRuns, useSessions, weeklyKmTarget } from '../lib/log'
import { usePersisted } from '../lib/storage'
import { addDays, today, weekStart } from '../lib/date'
import { BodyMap } from './BodyMap'
import { Card } from './ui'
import { cx } from '../lib/cx'

const TARGET_SETS = 10
const thaiDays = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์']

export function Dashboard() {
  const [runs] = useRuns()
  const [sessions] = useSessions()
  const [mode] = usePersisted<'gym' | 'park'>('mode', 'gym')
  const [week] = usePersisted('week', 1)

  const plan = mode === 'gym' ? gymWeek : parkWeek
  const thisWeek = weekStart(today())
  const sessionsThisWeek = sessions.filter(s => weekStart(s.date) === thisWeek).length
  const kmThisWeek = runs.filter(r => weekStart(r.date) === thisWeek).reduce((s, r) => s + r.km, 0)
  const kmTarget = weeklyKmTarget(week)
  const streak = weekStreak(sessions.map(s => s.date), runs.map(r => r.date))
  const [weekday] = useState(() => new Date().getDay())
  const todayPlan = plan.find(d => d.day === thaiDays[weekday])

  const sets = weeklySets(plan)
  const intensity = Object.fromEntries(Object.entries(sets).map(([m, n]) => [m, Math.min(1, n! / TARGET_SETS)]))
  const TodayIcon = todayPlan?.type === 'run' ? Footprints : todayPlan?.type === 'strength' ? Dumbbell : Moon

  return (
    <>
      <section className="rounded-3xl bg-gradient-to-br from-accent to-[#7c3aed] p-5 text-white shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm opacity-80">สัปดาห์ที่ {week} จาก 12</div>
            <div className="text-2xl font-extrabold">สัปดาห์นี้</div>
          </div>
          <div className="flex items-center gap-1 rounded-full bg-white/15 px-3 py-1 text-sm font-semibold">
            <Flame size={16} /> {streak} สัปดาห์ติด
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <Ring value={sessionsThisWeek} max={3} label="เวท" text={`${sessionsThisWeek}/3`} />
          <Ring value={kmThisWeek} max={kmTarget} label="วิ่ง (กม.)" text={`${kmThisWeek.toFixed(1)}/${kmTarget}`} />
        </div>
      </section>

      {todayPlan && (
        <Card>
          <div className="flex items-center gap-3">
            <div className={cx('grid size-12 shrink-0 place-items-center rounded-2xl',
              todayPlan.type === 'run' ? 'bg-run/15 text-run' : todayPlan.type === 'strength' ? 'bg-accent-soft text-accent' : 'bg-raised text-muted')}>
              <TodayIcon size={22} />
            </div>
            <div className="min-w-0">
              <div className="text-xs text-muted">วันนี้ ({todayPlan.day})</div>
              <div className="font-bold">{todayPlan.title}</div>
              <div className="text-xs text-muted">{todayPlan.duration !== '-' ? todayPlan.duration : todayPlan.note}</div>
            </div>
          </div>
        </Card>
      )}

      <Card title="กิจกรรม 12 สัปดาห์">
        <ActivityCalendar dates={[...sessions.map(s => s.date), ...runs.map(r => r.date)]} />
      </Card>

      <Card title={`กล้ามเนื้อที่ฝึกต่อสัปดาห์ (${mode === 'gym' ? 'ยิม' : 'สวน'})`}>
        <p className="-mt-2 mb-2 text-xs text-muted">สีเข้ม = ใกล้ {TARGET_SETS} เซ็ต/สัปดาห์ (กล้ามรองนับครึ่งเซ็ต)</p>
        <BodyMap intensity={intensity} label={m => `${muscleNames[m]}: ${fmt(sets[m] ?? 0)} เซ็ต/สัปดาห์`} />
        <ul className="mt-3 space-y-1.5 text-sm">
          {(Object.keys(muscleNames) as Muscle[])
            .sort((a, b) => (sets[b] ?? 0) - (sets[a] ?? 0))
            .map(m => (
              <li key={m} className="grid grid-cols-[6.5rem_1fr_2rem] items-center gap-2">
                <span>{muscleNames[m]}</span>
                <span className="h-2 overflow-hidden rounded-full bg-body">
                  <span className="block h-full rounded-full bg-accent" style={{ width: `${Math.min(100, ((sets[m] ?? 0) / TARGET_SETS) * 100)}%` }} />
                </span>
                <span className="text-right tabular-nums text-muted">{fmt(sets[m] ?? 0)}</span>
              </li>
            ))}
        </ul>
      </Card>
    </>
  )
}

const fmt = (n: number) => n.toFixed(1).replace('.0', '')

function Ring({ value, max, label, text }: { value: number; max: number; label: string; text: string }) {
  const r = 30
  const c = 2 * Math.PI * r
  const pct = Math.min(1, max ? value / max : 0)
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-white/10 p-3">
      <svg viewBox="0 0 72 72" className="size-16 shrink-0" aria-hidden>
        <circle cx="36" cy="36" r={r} fill="none" stroke="rgb(255 255 255 / .25)" strokeWidth="8" />
        {pct > 0 && <circle cx="36" cy="36" r={r} fill="none" stroke="white" strokeWidth="8" strokeLinecap="round"
          strokeDasharray={`${c * pct} ${c}`} transform="rotate(-90 36 36)" />}
      </svg>
      <div>
        <div className="text-xl font-extrabold tabular-nums">{text}</div>
        <div className="text-xs opacity-80">{label}</div>
      </div>
    </div>
  )
}

function ActivityCalendar({ dates }: { dates: string[] }) {
  const [hover, setHover] = useState<string | null>(null)
  const counts = new Map<string, number>()
  for (const d of dates) counts.set(d, (counts.get(d) ?? 0) + 1)
  const start = addDays(weekStart(today()), -7 * 11)
  const t = today()
  const days = ['จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส', 'อา']

  return (
    <div>
      <div className="mb-2 h-5 text-right text-sm">{hover ? `${hover}: ${counts.get(hover) ?? 0} กิจกรรม` : ''}</div>
      <div className="grid grid-cols-[1.5rem_repeat(12,minmax(0,1fr))] gap-1">
        {days.map((d, i) => <span key={d} className="self-center text-[10px] leading-none text-muted" style={{ gridColumn: 1, gridRow: i + 1 }}>{d}</span>)}
        {Array.from({ length: 12 }, (_, w) =>
          Array.from({ length: 7 }, (_, d) => {
            const date = addDays(start, w * 7 + d)
            const n = counts.get(date) ?? 0
            return (
              <span key={date} style={{ gridColumn: w + 2, gridRow: d + 1 }}
                onMouseEnter={() => setHover(date)} onMouseLeave={() => setHover(null)} onClick={() => setHover(date)}
                className={cx('aspect-square rounded-[4px]',
                  n === 0 ? 'bg-body' : n === 1 ? 'bg-good/60' : 'bg-good',
                  date === t && 'ring-2 ring-accent', date > t && 'opacity-35')} />
            )
          }),
        )}
      </div>
    </div>
  )
}

function weekStreak(...lists: string[][]) {
  const perWeek = new Map<string, number>()
  for (const d of lists.flat()) perWeek.set(weekStart(d), (perWeek.get(weekStart(d)) ?? 0) + 1)
  let w = weekStart(today())
  // สัปดาห์ปัจจุบันยังไม่จบ — ไม่ตัด streak ถ้ายังไม่ครบ
  if ((perWeek.get(w) ?? 0) < 3) w = addDays(w, -7)
  let n = 0
  while ((perWeek.get(w) ?? 0) >= 3) {
    n++
    w = addDays(w, -7)
  }
  return n
}
