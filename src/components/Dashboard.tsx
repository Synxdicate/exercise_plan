import { useMemo, useState } from 'react'
import { Check, Dumbbell, Flag, Flame, Footprints, Moon, Play } from 'lucide-react'
import type { Day } from '../data/workouts'
import { crossAsSession, useCross, useRuns, useSessions } from '../lib/log'
import { estimate, paceHint } from '../lib/pace'
import { useProgram } from '../lib/program'
import { usePersisted } from '../lib/storage'
import { useDayDone } from '../lib/dayDone'
import { useNav } from '../lib/nav'
import { addDays, today, weekStart } from '../lib/date'
import { formLabel, trainingLoad } from '../lib/analysis'
import { WorkoutPlayer } from './WorkoutPlayer'
import { Alerts } from './Alerts'
import { NextStepCard } from './ProgramPicker'
import { WeekCheckCard } from './WeekCheck'
import { HeatCard } from './Heat'
import { MonthGoalCard } from './Goals'
import { WeekSummary } from './WeekSummary'
import { ReadinessSheet } from './Readiness'
import { Button, Card } from './ui'
import { cx } from '../lib/cx'


export function Dashboard() {
  const [runs] = useRuns()
  const [sessions] = useSessions()
  const [cross] = useCross()
  const p = useProgram()
  const [done, setDone] = usePersisted<Record<string, boolean>>('done', {})
  const dayDone = useDayDone()
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
  const activeThisWeek = [...sessions, ...runs].filter(x => weekStart(x.date) === thisWeek).length
  const [todayIdx] = useState(() => (new Date().getDay() + 6) % 7) // 0 = จันทร์
  const todayPlan = plan[todayIdx]

  const TodayIcon = todayPlan?.runKind === 'race' ? Flag : todayPlan?.type === 'run' ? Footprints : todayPlan?.type === 'strength' ? Dumbbell : Moon
  const todayDone = dayDone(week, todayIdx, todayPlan)
  const tomorrow = todayIdx < 6 ? plan[todayIdx + 1] : null
  const kmToday = runs.filter(r => r.date === today()).reduce((s, r) => s + r.km, 0)
  const est = useMemo(() => estimate(runs), [runs])
  const hint = todayPlan?.type === 'run' ? paceHint(est, todayPlan.runKind, todayPlan.title) : null

  return (
    <>
      <Alerts />
      <NextStepCard />
      <WeekCheckCard />
      <section className="rounded-2xl bg-gradient-to-br from-accent to-[#7c3aed] p-4 text-white shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm opacity-80">{p.meta.short} · {p.ongoing ? `สัปดาห์ที่ ${week} ของรอบ` : `สัปดาห์ที่ ${week} จาก ${p.meta.weeks}`}</div>
            <div className="text-xl font-extrabold">{p.daysToRace !== null && p.daysToRace >= 0 ? `อีก ${p.daysToRace} วันถึงวันแข่ง` : 'สัปดาห์นี้'}</div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <div className="flex items-center gap-1 rounded-full bg-white/15 px-3 py-1 text-sm font-semibold">
              {/* streak นับสัปดาห์ที่ฝึก ≥3 ครั้ง — ยังเป็น 0 ให้บอกว่าสัปดาห์นี้ได้กี่ครั้งแล้ว แทนการขึ้น "0 สัปดาห์" */}
              <Flame size={16} /> {streak ? `ต่อเนื่อง ${streak} สัปดาห์` : `สัปดาห์นี้ ${Math.min(activeThisWeek, 3)}/3 ครั้ง`}
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
          {todayDone && (
            <div className="mt-3 flex items-center justify-between gap-2 border-t border-line pt-2.5 text-xs">
              <span className="font-semibold text-good">{todayPlan.type === 'run' && kmToday ? `วิ่งแล้ว ${kmToday.toFixed(2)} กม.` : 'ทำแล้ววันนี้'}</span>
              {tomorrow && <span className="min-w-0 truncate text-muted">พรุ่งนี้: {tomorrow.title}</span>}
            </div>
          )}
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

    </>
  )
}

function Ring({ value, max, label, text }: { value: number; max: number; label: string; text: string }) {
  const r = 30
  const c = 2 * Math.PI * r
  const pct = Math.min(1, max ? value / max : 0)
  return (
    <div className="flex items-center gap-2.5 rounded-xl bg-white/10 p-2.5">
      <svg viewBox="0 0 72 72" className="size-12 shrink-0" aria-hidden>
        <circle cx="36" cy="36" r={r} fill="none" stroke="rgb(255 255 255 / .25)" strokeWidth="8" />
        {pct > 0 && <circle cx="36" cy="36" r={r} fill="none" stroke="white" strokeWidth="8" strokeLinecap="round"
          strokeDasharray={`${c * pct} ${c}`} transform="rotate(-90 36 36)" className="animate-ring" />}
      </svg>
      <div>
        <div className="text-xl font-extrabold tabular-nums">{text}</div>
        <div className="text-xs opacity-80">{label}</div>
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
