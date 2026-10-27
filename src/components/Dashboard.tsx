import { useMemo, useState } from 'react'
import { Check, Dumbbell, Flag, Flame, Footprints, Moon, Play } from 'lucide-react'
import { locationInfo } from '../data/programs'
import type { Day } from '../data/workouts'
import { muscleNames, weeklySets, type Muscle } from '../data/muscles'
import { crossAsSession, useCross, useRuns, useSessions } from '../lib/log'
import { estimate, paceHint } from '../lib/pace'
import { useProgram } from '../lib/program'
import { usePersisted } from '../lib/storage'
import { useNav } from '../lib/nav'
import { addDays, today, weekStart } from '../lib/date'
import { BodyMap } from './BodyMap'
import { heat } from '../lib/heat'
import { formLabel, trainingLoad } from '../lib/analysis'
import { WorkoutPlayer } from './WorkoutPlayer'
import { Alerts } from './Alerts'
import { HeatCard } from './Heat'
import { MonthGoalCard } from './Goals'
import { WeekSummary } from './WeekSummary'
import { ReadinessSheet } from './Readiness'
import { Button, Card } from './ui'
import { cx } from '../lib/cx'

const TARGET_SETS = 10

export function Dashboard() {
  const [runs] = useRuns()
  const [sessions] = useSessions()
  const [cross] = useCross()
  const p = useProgram()
  const [done, setDone] = usePersisted<Record<string, boolean>>('done', {})
  const [playing, setPlaying] = useState<{ day: Day; light: boolean } | null>(null)
  const [checking, setChecking] = useState(false)
  const nav = useNav()
  const { currentWeek: week } = p

  const plan = p.plan()
  const loadDays = trainingLoad(runs, [...sessions, ...cross.map(crossAsSession)], today())
  const form = loadDays.length >= 7 ? formLabel(loadDays.at(-1)!.form, loadDays.at(-1)!.fitness, loadDays.at(-1)!.day) : null
  const strengthTarget = plan.filter(d => d.type === 'strength').length
  const thisWeek = weekStart(today())
  // เซสชันที่บันทึกในสัปดาห์นี้ + วันเวทที่ติ๊กทำแล้วโดยไม่ได้บันทึกเซ็ต
  const logged = sessions.filter(s => weekStart(s.date) === thisWeek)
  const tickedOnly = plan.filter((d, i) => d.type === 'strength' && p.isDone(done, week, i) && !logged.some(s => s.date === addDays(thisWeek, i))).length
  const sessionsThisWeek = logged.length + tickedOnly
  const kmThisWeek = runs.filter(r => weekStart(r.date) === thisWeek).reduce((s, r) => s + r.km, 0)
  const kmTarget = p.kmTarget()
  const streak = weekStreak(sessions.map(s => s.date), runs.map(r => r.date))
  const [todayIdx] = useState(() => (new Date().getDay() + 6) % 7) // 0 = จันทร์
  const todayPlan = plan[todayIdx]

  const sets = weeklySets(plan)
  const intensity = Object.fromEntries(Object.entries(sets).map(([m, n]) => [m, Math.min(1, n! / TARGET_SETS)]))
  const TodayIcon = todayPlan?.runKind === 'race' ? Flag : todayPlan?.type === 'run' ? Footprints : todayPlan?.type === 'strength' ? Dumbbell : Moon
  const todayDone = p.isDone(done, week, todayIdx)
  const est = useMemo(() => estimate(runs), [runs])
  const hint = todayPlan?.type === 'run' ? paceHint(est, todayPlan.runKind, todayPlan.title) : null

  return (
    <>
      <Alerts />
      <section className="rounded-2xl bg-gradient-to-br from-accent to-[#7c3aed] p-4 text-white shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm opacity-80">{p.meta.short} · {p.ongoing ? `สัปดาห์ที่ ${week} ของรอบ` : `สัปดาห์ที่ ${week} จาก ${p.meta.weeks}`}</div>
            <div className="text-xl font-extrabold">{p.daysToRace !== null && p.daysToRace >= 0 ? `อีก ${p.daysToRace} วันถึงวันแข่ง` : 'สัปดาห์นี้'}</div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <div className="flex items-center gap-1 rounded-full bg-white/15 px-3 py-1 text-sm font-semibold">
              <Flame size={16} /> ต่อเนื่อง {streak} สัปดาห์
            </div>
            {form && <button onClick={() => nav('progress')} className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">ฟอร์ม: {form.label}</button>}
          </div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Ring value={sessionsThisWeek} max={strengthTarget} label="เวท" text={`${sessionsThisWeek}/${strengthTarget}`} />
          <Ring value={kmThisWeek} max={kmTarget} label="วิ่ง (กม.)" text={kmTarget ? `${kmThisWeek.toFixed(1)}/${kmTarget}` : kmThisWeek.toFixed(1)} />
        </div>
      </section>

      {todayPlan && (
        <Card>
          <div className="flex items-center gap-3">
            <div className={cx('grid size-12 shrink-0 place-items-center rounded-2xl',
              todayPlan.type === 'run' ? 'bg-run/15 text-run' : todayPlan.type === 'strength' ? 'bg-accent-soft text-accent' : 'bg-raised text-muted')}>
              <TodayIcon size={22} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs text-muted">วันนี้ ({todayPlan.day})</div>
              <div className="font-bold">{todayPlan.title}</div>
              <div className="text-xs text-muted">{todayPlan.duration !== '-' ? todayPlan.duration : todayPlan.note}</div>
              {hint && <div className="text-xs font-semibold text-run">{hint}</div>}
            </div>
            {todayDone && <span className="grid size-9 shrink-0 animate-pop place-items-center rounded-full bg-good text-white"><Check size={18} strokeWidth={3} /></span>}
          </div>
          {!todayDone && todayPlan.type === 'strength' && (
            <Button className="mt-3 w-full" onClick={() => setChecking(true)}><Play size={16} fill="currentColor" /> เริ่มฝึกเลย ({todayPlan.location === 'park' ? 'สวน' : 'ยิม'})</Button>
          )}
          {!todayDone && todayPlan.type === 'run' && (
            <Button variant="run" className="mt-3 w-full" onClick={() => nav('runs')}><Footprints size={16} /> เริ่มวิ่ง</Button>
          )}
        </Card>
      )}

      {checking && todayPlan && (
        <ReadinessSheet kind="strength" onClose={() => setChecking(false)}
          onProceed={light => { setPlaying({ day: todayPlan, light }); setChecking(false) }} />
      )}
      {playing && (
        <WorkoutPlayer day={playing.day} mode={playing.day.location ?? 'gym'} light={playing.light} sessionKey={p.doneId(week, todayIdx)}
          onClose={() => setPlaying(null)}
          onSaved={() => { setDone(prev => ({ ...prev, [p.doneId(week, todayIdx)]: true })); setPlaying(null) }} />
      )}

      {todayPlan?.type === 'run' && <HeatCard />}

      {/* สิ่งที่ต้องทำวันนี้อยู่บนสุด — เป้าเดือน/สรุปสัปดาห์ที่แล้วเป็นข้อมูลประกอบ */}
      <MonthGoalCard />

      <WeekSummary />

      <Card title="กิจกรรม 12 สัปดาห์">
        <ActivityCalendar dates={[...sessions.map(s => s.date), ...runs.map(r => r.date)]} />
      </Card>

      <Card title={`กล้ามเนื้อที่ฝึกต่อสัปดาห์ (${locationInfo[p.location].label.replace(/ \(.*\)/, '')})`}>
        <p className="-mt-2 mb-2 text-xs text-muted">สีเข้ม = ใกล้ {TARGET_SETS} เซ็ต/สัปดาห์ (กล้ามรองนับครึ่งเซ็ต)</p>
        <BodyMap intensity={intensity} label={m => `${muscleNames[m]}: ${fmt(sets[m] ?? 0)} เซ็ต/สัปดาห์`} />
        <MuscleList>
          {(Object.keys(muscleNames) as Muscle[])
            .sort((a, b) => (sets[b] ?? 0) - (sets[a] ?? 0))
            .map(m => (
              <li key={m} className="grid grid-cols-[6.5rem_1fr_2rem] items-center gap-2">
                <span>{muscleNames[m]}</span>
                <span className="h-2 overflow-hidden rounded-full bg-body">
                  <span className="block h-full rounded-full transition-[width] duration-700" style={{ width: `${Math.min(100, ((sets[m] ?? 0) / TARGET_SETS) * 100)}%`, background: heat((sets[m] ?? 0) / TARGET_SETS) }} />
                </span>
                <span className="text-right tabular-nums text-muted">{fmt(sets[m] ?? 0)}</span>
              </li>
            ))}
        </MuscleList>
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
    <div className="flex items-center gap-2.5 rounded-xl bg-white/10 p-2.5">
      <svg viewBox="0 0 72 72" className="size-12 shrink-0" aria-hidden>
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

// รายการกล้ามเนื้อ 17 แถวยาวเกินไป — แสดง 5 แถวที่ได้น้อยที่สุดก่อน (สิ่งที่ควรสนใจ)
function MuscleList({ children }: { children: React.ReactNode[] | React.ReactNode }) {
  const [all, setAll] = useState(false)
  const items = Array.isArray(children) ? children.flat() : [children]
  const shown = all ? items : items.slice(-5)
  return (
    <div className="mt-3">
      {!all && <div className="mb-1 text-xs text-muted">ได้น้อยที่สุด 5 ส่วน</div>}
      <ul className="space-y-1.5 text-sm">{shown}</ul>
      <button onClick={() => setAll(!all)} className="mt-2 text-sm font-semibold text-run">{all ? 'ย่อ' : `ดูทั้งหมด ${items.length} ส่วน`}</button>
    </div>
  )
}
