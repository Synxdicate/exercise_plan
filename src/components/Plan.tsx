import { EaseOffCard, StrengthNudgeCard } from './Coach'
import { useMemo, useState } from 'react'
import { ArrowDown, ArrowLeftRight, House, ArrowUp, Check, ChevronDown, ChevronRight, Dumbbell, Flag, Footprints, Moon, Play, Plus, RefreshCw, Trash2, Trees } from 'lucide-react'
import { yt, type Day, type Exercise } from '../data/workouts'
import { locationInfo, weekNote } from '../data/programs'
import { dayIntensity, musclesOf, muscleNames } from '../data/muscles'
import { useRuns } from '../lib/log'
import { useDayText } from '../lib/dayText'
import { estimate, paceHint } from '../lib/pace'
import { useProgram } from '../lib/program'
import { usePersisted } from '../lib/storage'
import { useDayDone } from '../lib/dayDone'
import { addDays, shortDate, WEEKDAYS_EN, WEEKDAYS_TH } from '../lib/date'
import { applyMoves, backToBackRuns } from '../lib/moves'
import { ask } from '../lib/dialog'
import { useNav } from '../lib/nav'
import { tick } from '../lib/voice'
import { useT } from '../lib/i18n'
import { cx } from '../lib/cx'
import { BodyMap } from './BodyMap'
import { WorkoutPlayer } from './WorkoutPlayer'
import { ProgramSheet } from './ProgramSheet'
import { Alerts } from './Alerts'
import { NextStepCard } from './ProgramPicker'
import { CapNote, MissedRunCard } from './MissedRun'
import { WeekCheckCard } from './WeekCheck'
import { WeeklyMuscles } from './WeeklyMuscles'
import { RunTypeCard } from './RunTypes'
import { ReadinessSheet } from './Readiness'
import { Badge, Button, Collapse, Meter, Segmented } from './ui'
import { AddSheet, SwapSheet } from './ExercisePicker'
import { needsSpotter } from '../data/library'
import { RacePlan } from './RacePlan'
import { ExerciseDemo } from './ExerciseDemo'
import { CircuitCard } from './CircuitPlayer'

const short = ['จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส', 'อา']
const shortEn = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
const todayIdx = () => (new Date().getDay() + 6) % 7 // 0 = จันทร์

// key ใหม่เมื่อเปลี่ยนโปรแกรม/วันแข่ง → สัปดาห์ที่ดูอยู่รีเซ็ตเป็นสัปดาห์ปัจจุบัน
export function Plan() {
  const p = useProgram()
  return <PlanBody key={`${p.program}|${p.raceDate}`} />
}

const typeStyle = {
  strength: { icon: Dumbbell, tone: 'bg-accent-soft text-accent', dot: 'bg-accent-fill' },
  run: { icon: Footprints, tone: 'bg-run/15 text-run', dot: 'bg-run-fill' },
  rest: { icon: Moon, tone: 'bg-raised text-muted', dot: 'bg-line' },
}
const styleOf = (d: Day) => (d.runKind === 'race' ? { icon: Flag, tone: 'bg-accent-fill text-white', dot: 'bg-accent-fill' } : typeStyle[d.type])

function PlanBody() {
  const t = useT()
  const dt = useDayText()
  const p = useProgram()
  const [, setDone] = usePersisted<Record<string, boolean>>('done', {})
  const [viewWeek, setViewWeek] = useState(p.currentWeek)
  const [selected, setSelected] = useState(todayIdx)
  const [picking, setPicking] = useState(false)
  const [playing, setPlaying] = useState<{ i: number; light: boolean } | null>(null)
  const [checking, setChecking] = useState<number | null>(null)
  const [runs] = useRuns()
  const est = useMemo(() => estimate(runs), [runs])

  // กดสัปดาห์ = ดูเฉย ๆ ไม่เปลี่ยนสัปดาห์ปัจจุบัน (เปลี่ยนด้วยปุ่ม "ใช้เป็นสัปดาห์นี้")
  const [shownFor, setShownFor] = useState(p.currentWeek)
  if (shownFor !== p.currentWeek) { setShownFor(p.currentWeek); setViewWeek(p.currentWeek) }
  const week = viewWeek
  const isThisWeek = week === p.currentWeek && !p.finished
  const selectWeek = setViewWeek
  const days = p.plan(week)
  const dayDone = useDayDone()
  const isDone = (i: number) => dayDone(week, i, days[i])
  const setDayDone = (i: number, v: boolean) => setDone(prev => ({ ...prev, [p.doneId(week, i)]: v }))
  const trainingIdx = days.flatMap((d, i) => (d.type !== 'rest' ? [i] : []))
  const doneCount = trainingIdx.filter(isDone).length
  const note = weekNote(p.program, week)
  const day = days[selected]
  // ทำแผนของวันอื่นวันนี้ (สลับกับวันนี้) — เฉพาะสัปดาห์นี้ ทั้งสองวันยังไม่ได้ทำ และไม่ใช่วันแข่ง
  const tIdx = todayIdx()
  const canDoToday = isThisWeek && selected !== tIdx && day.type !== 'rest' && day.runKind !== 'race' && days[tIdx]?.runKind !== 'race'
    && !isDone(selected) && !isDone(tIdx)
  const doToday = async () => {
    const b2b = backToBackRuns(applyMoves(days, [[selected, tIdx]]))
    if (b2b.length && !(await ask(t(
      `หลังสลับแล้วจะวิ่งติดกัน: ${b2b.map(i => `${WEEKDAYS_TH[i]}–${WEEKDAYS_TH[i + 1]}`).join(', ')} — ขาไม่ได้พักระหว่างวันวิ่ง เสี่ยงเจ็บ ลองสลับวันวิ่งอีกวันไปวันพักแทน`,
      `After the swap you'd run on back-to-back days: ${b2b.map(i => `${WEEKDAYS_EN[i]}–${WEEKDAYS_EN[i + 1]}`).join(', ')}. No rest between runs raises injury risk — consider moving the other run to a rest day.`,
    ), { title: t('วิ่งติดกันสองวัน', 'Back-to-back runs'), ok: t('สลับต่อ', 'Swap anyway') }))) return
    p.moveDay(week, selected, tIdx)
    setSelected(tIdx)
  }

  return (
    <>
      <Alerts />
      <NextStepCard />
      <MissedRunCard />
      <StrengthNudgeCard onPlan />
      <EaseOffCard trigger />
      <WeekCheckCard />
      <button onClick={() => setPicking(true)} className="flex w-full items-center gap-3 rounded-3xl bg-card p-4 text-left shadow-sm ring-1 ring-line active:scale-[.99]">
        <div className="min-w-0 flex-1">
          <div className="text-xs font-semibold text-accent">{t('โปรแกรมของฉัน', 'My program')} · {(dt.en ? locationInfo[p.location].labelEn : locationInfo[p.location].label).replace(/ \(.*\)/, '')}</div>
          <div className="truncate text-lg font-bold leading-tight">{dt.program(p.program).name}</div>
          {p.isRace && (
            <div className="mt-0.5 text-xs text-muted">
              {!p.raceDate ? t('ยังไม่ได้ใส่วันแข่ง — แตะเพื่อตั้ง', 'No race date yet — tap to set')
                : p.weeksUntilStart > 0 ? t(`เริ่มโปรแกรมในอีก ${p.weeksUntilStart} สัปดาห์ — ระหว่างนี้วิ่งเบาสร้างฐาน`, `Program starts in ${p.weeksUntilStart} weeks — build a base with easy runs`)
                : p.daysToRace !== null && p.daysToRace >= 0 ? t(`อีก ${p.daysToRace} วันถึงวันแข่ง (${p.raceDate})`, `${p.daysToRace} days to race day (${p.raceDate})`)
                : t('ผ่านวันแข่งแล้ว — พัก 1–2 สัปดาห์ แล้วเลือกเป้าหมายถัดไป', 'Race done — rest 1–2 weeks, then pick your next goal')}
            </div>
          )}
        </div>
        <span className="flex shrink-0 items-center gap-1 rounded-full bg-raised px-3 py-1.5 text-sm font-semibold ring-1 ring-line"><RefreshCw size={14} /> {t('ตั้งค่า', 'Settings')}</span>
      </button>

      {/* สัปดาห์ */}
      <div className="-mx-4 flex snap-x scroll-px-4 gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
        {p.prepWeeks.map(w => (
          <button key={w} onClick={() => selectWeek(w)}
            className={cx('flex min-w-14 shrink-0 snap-start flex-col items-center rounded-2xl px-3 py-1.5 ring-1', w === week ? 'bg-ink text-bg ring-ink' : 'bg-card text-muted ring-line')}>
            <span className="text-[10px]">{t('เตรียมตัว', 'Prep')}</span>
            <span className="text-base font-bold leading-tight">{shortDate(p.mondayOf(w))}</span>
          </button>
        ))}
        {Array.from({ length: p.meta.weeks }, (_, i) => i + 1).map(w => {
          const light = weekNote(p.program, w)?.startsWith('สัปดาห์ลด') || (p.program === 'physique' && w === 9)
          return (
            <button key={w} onClick={() => selectWeek(w)}
              className={cx('relative flex min-w-14 shrink-0 snap-start flex-col items-center rounded-2xl px-3 py-1.5 ring-1',
                w === week ? 'bg-ink text-bg ring-ink' : 'bg-card text-ink ring-line')}>
              <span className={cx('text-[10px]', w === week ? 'opacity-70' : w === p.currentWeek ? 'font-bold text-accent' : 'text-muted')}>
                {w === p.currentWeek ? t('สัปดาห์นี้', 'Now') : w === p.meta.weeks && p.isRace ? t('แข่ง', 'Race') : light ? t('เบา', 'Easy') : p.ongoing ? t('รอบที่', 'Cycle') : t('สัปดาห์', 'Week')}
              </span>
              <span className="text-base font-bold leading-tight">{w}</span>
              {w === p.currentWeek && <span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-accent-fill" />}
            </button>
          )
        })}
      </div>

      {/* แถบวัน */}
      <div className="rounded-3xl bg-card p-3 shadow-sm ring-1 ring-line">
        <div className="mb-2 flex items-center justify-between px-1 text-xs">
          <span className="font-semibold">{week < 1 ? t(`ช่วงเตรียมตัว ${shortDate(p.mondayOf(week))} (แผนสัปดาห์ 1)`, `Prep week of ${shortDate(p.mondayOf(week))} (week 1 plan)`) : <>{t('สัปดาห์', 'Week')} {week} · {isThisWeek ? (p.weeksUntilStart > 0 ? t('ช่วงเตรียมตัว (ใช้แผนสัปดาห์ 1)', 'Prep (using week 1)') : t('สัปดาห์นี้', 'this week')) : week < p.currentWeek ? t(`${p.currentWeek - week} สัปดาห์ก่อน`, `${p.currentWeek - week} wk ago`) : t(`อีก ${week - p.currentWeek + p.weeksUntilStart} สัปดาห์`, `in ${week - p.currentWeek + p.weeksUntilStart} wk`)}</>}</span>
          <span className="tabular-nums text-muted">{doneCount}/{trainingIdx.length} {t('วัน', 'days')}{p.kmTarget(week) ? t(` · วิ่ง ${p.kmTarget(week)} กม.`, ` · run ${p.kmTarget(week)} km`) : ''}</span>
        </div>
        <div className="grid grid-cols-7 gap-1">
          {days.map((d, i) => {
            const st = styleOf(d)
            const on = i === selected
            const isToday = isThisWeek && i === todayIdx()
            return (
              <button key={i} onClick={() => setSelected(i)} aria-pressed={on}
                className={cx('flex flex-col items-center gap-1 rounded-2xl py-2 transition-colors', on ? 'bg-accent-soft' : '')}>
                <span className={cx('text-[11px] font-semibold', on ? 'text-accent' : isToday ? 'text-ink' : 'text-muted')}>{isToday ? t('วันนี้', 'Today') : t(short[i], shortEn[i])}</span>
                {/* ชื่อเต็มสำหรับโปรแกรมอ่านหน้าจอ — ต้องขึ้นต้นด้วยข้อความที่เห็น (WCAG 2.5.3) */}
                <span className="sr-only">{dt.weekday(d)}: {dt.title(d)}</span>
                <span className={cx('grid size-9 place-items-center rounded-full transition-all',
                  isDone(i) ? 'bg-good-fill text-white' : st.tone, on && 'ring-2 ring-accent ring-offset-2 ring-offset-card')}>
                  {isDone(i) ? <Check size={16} strokeWidth={3} /> : <st.icon size={16} />}
                </span>
              </button>
            )
          })}
        </div>
        <div className="mt-2 px-1"><Meter value={doneCount} max={trainingIdx.length} tone="good" /></div>
        {p.hasMoves(week) && (
          <div className="mt-2 flex items-center justify-between gap-2 px-1 text-xs text-muted">
            <span className="flex items-center gap-1"><ArrowLeftRight size={13} /> {t('สัปดาห์นี้สลับวันไว้', 'Days swapped this week')}</span>
            <button onClick={() => p.clearMoves(week)} className="font-semibold text-run">{t('คืนลำดับเดิม', 'Reset order')}</button>
          </div>
        )}
        {note && <p className="mt-2 px-1 text-xs text-muted">{dt.note(note)}</p>}
        {!isThisWeek && (
          <div className="mt-2 flex flex-wrap gap-2 px-1">
            <Button size="sm" variant="soft" onClick={() => setViewWeek(p.currentWeek)}>{t('กลับไปสัปดาห์นี้', 'Back to this week')} ({p.currentWeek})</Button>
            {!p.autoWeek && week >= 1 && <Button size="sm" variant="soft" onClick={() => p.setWeek(week)}>{week < p.currentWeek ? t(`ทำสัปดาห์ ${week} ซ้ำ`, `Repeat week ${week}`) : t(`ข้ามไปสัปดาห์ ${week}`, `Jump to week ${week}`)}</Button>}
          </div>
        )}
      </div>

      {/* วันที่เลือก */}
      <DayDetail key={`${week}-${selected}-${day.location ?? ''}`} day={day} isToday={isThisWeek && selected === todayIdx()}
        done={isDone(selected)} hint={paceHint(est, day.runKind, day.title)} weekNoteText={note}
        setDone={v => setDayDone(selected, v)}
        onStart={() => setChecking(selected)}
        onLocation={m => p.setDayLocation(week, day.movedFrom ?? selected, m)} slotId={p.doneId(week, selected)}
        onDoToday={canDoToday ? () => void doToday() : undefined}
        date={addDays(p.mondayOf(week), selected)} />

      {/* ทั้งสัปดาห์แบบย่อ */}
      <section className="rounded-3xl bg-card p-2 shadow-sm ring-1 ring-line">
        <div className="px-2 pb-1 pt-2 text-sm font-bold">{t('ทั้งสัปดาห์', 'Whole week')}</div>
        <ul>
          {days.map((d, i) => {
            const st = styleOf(d)
            return (
              <li key={i}>
                <button onClick={() => { setSelected(i); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
                  className={cx('flex w-full items-center gap-3 rounded-2xl px-2 py-2.5 text-left', i === selected && 'bg-raised')}>
                  <span className={cx('size-2 shrink-0 rounded-full', isDone(i) ? 'bg-good-fill' : st.dot)} />
                  <span className="w-14 shrink-0 text-xs text-muted">{dt.weekday(d)}</span>
                  <span className={cx('min-w-0 flex-1 truncate text-sm', d.type === 'rest' ? 'text-muted' : 'font-semibold', isDone(i) && 'text-muted line-through')}>{dt.title(d)}</span>
                  {d.location && <Badge tone="muted">{d.location === 'gym' ? t('ยิม', 'Gym') : d.location === 'home' ? t('บ้าน', 'Home') : t('สวน', 'Park')}</Badge>}
                  {d.targetKm && <span className="text-xs tabular-nums text-muted">{d.targetKm} {t('กม.', 'km')}</span>}
                  <ChevronRight size={16} className="shrink-0 text-muted" />
                </button>
              </li>
            )
          })}
        </ul>
      </section>

      <CircuitCard />
      <WeeklyMuscles plan={days} />

      {picking && <ProgramSheet onClose={() => setPicking(false)} />}
      {checking !== null && (
        <ReadinessSheet kind="strength" onClose={() => setChecking(null)}
          onProceed={light => { setPlaying({ i: checking, light }); setChecking(null) }} />
      )}
      {playing && (
        <WorkoutPlayer day={days[playing.i]} mode={days[playing.i].location ?? 'gym'} light={playing.light} sessionKey={p.doneId(week, playing.i)}
          onClose={() => setPlaying(null)}
          onSaved={() => { setDayDone(playing.i, true); setPlaying(null) }} />
      )}
    </>
  )
}

/** กล้ามเนื้อที่ฝึกวันนี้: ชิปสรุปแบบย่อ แตะเพื่อดูแผนภาพ (เดิมแผนภาพเต็มทำให้การ์ดยาวเกินจนต้องเลื่อนหาท่า) */
function DayMuscles({ day }: { day: Day }) {
  const t = useT()
  const dt = useDayText()
  const [open, setOpen] = usePersisted('dayMapOpen', false)
  const intensity = dayIntensity(day)
  // เรียงตามจำนวนท่าที่ใช้กล้ามนั้นเป็นกล้ามหลัก
  const count = new Map<keyof typeof muscleNames, number>()
  for (const e of day.exercises) for (const m of musclesOf(e).primary) count.set(m, (count.get(m) ?? 0) + 1)
  const ranked = [...count].sort((a, b) => b[1] - a[1])
  const top = ranked.slice(0, 5)
  return (
    <div className="mt-3">
      <button onClick={() => setOpen(!open)} aria-expanded={open}
        className="flex w-full items-center gap-2 rounded-xl bg-raised px-3 py-2 text-left active:scale-100">
        <span className="flex min-w-0 flex-1 flex-wrap gap-1">
          {top.map(([m]) => <span key={m} className="rounded-full bg-accent-soft px-2 py-0.5 text-xs font-semibold text-accent">{dt.muscle(m)}</span>)}
          {ranked.length > top.length && <span className="px-1 py-0.5 text-xs text-muted">+{ranked.length - top.length}</span>}
        </span>
        <span className="shrink-0 text-xs text-muted">{open ? t('ซ่อน', 'Hide') : t('แผนภาพ', 'Body map')}</span>
        <ChevronDown size={16} className={cx('shrink-0 text-muted transition-transform duration-300', open && 'rotate-180')} />
      </button>
      <Collapse open={open}>
        <div className="pt-2"><BodyMap intensity={intensity} size="sm" /></div>
      </Collapse>
    </div>
  )
}

function DayDetail({ day, isToday, done, hint, setDone, onStart, onLocation, slotId, weekNoteText, date, onDoToday }: {
  day: Day; isToday: boolean; done: boolean; hint: string | null; weekNoteText?: string; date: string; onDoToday?: () => void
  setDone: (v: boolean) => void; onStart: () => void; onLocation: (m: 'gym' | 'park' | 'home') => void; slotId: string
}) {
  const t = useT()
  const dt = useDayText()
  const nav = useNav()
  const p = useProgram()
  const st = styleOf(day)
  const [swapping, setSwapping] = useState<Exercise | null>(null)
  const [adding, setAdding] = useState(false)
  const where = day.location ?? 'gym'

  return (
    <article className="animate-fade-up rounded-3xl bg-card p-4 shadow-sm ring-1 ring-line">
      <div className="flex items-center gap-3">
        <div className={cx('grid size-14 shrink-0 place-items-center rounded-2xl', st.tone)}><st.icon size={26} /></div>
        <div className="min-w-0 flex-1">
          <div className="text-xs font-semibold text-muted">{isToday ? `${t('วันนี้', 'Today')} · ${dt.weekday(day)}` : dt.weekday(day)}{day.duration !== '-' && ` · ${dt.duration(day)}`}</div>
          <h2 className="text-xl font-extrabold leading-tight">{dt.title(day)}</h2>
        </div>
        {day.type !== 'rest' && (
          <button onClick={() => { if (!done) tick(); setDone(!done) }} aria-label={done ? t('ทำแล้ว', 'Done') : t('ยังไม่ทำ', 'Not done')} aria-pressed={done}
            className={cx('grid size-10 shrink-0 place-items-center rounded-full ring-2 transition-all duration-300',
              done ? 'bg-good-fill text-white ring-good' : 'text-transparent ring-line')}>
            <Check size={20} strokeWidth={3} className={done ? 'animate-pop' : ''} />
          </button>
        )}
      </div>

      {day.type === 'strength' && day.location && (
        <div className="mt-3">
          <Segmented value={day.location} onChange={onLocation} options={[
            { value: 'gym', label: <><Dumbbell size={15} /> {t('ยิม', 'Gym')}</> },
            { value: 'park', label: <><Trees size={15} /> {t('สวน', 'Park')}</> },
            { value: 'home', label: <><House size={15} /> {t('ที่บ้าน', 'Home')}</> },
          ]} />
          {day.location === 'gym' && (
            <label className="mt-2 flex items-center gap-2 rounded-xl bg-raised px-3 py-2 text-sm">
              <input type="checkbox" className="size-4 accent-accent" checked={p.solo} onChange={e => p.setSolo(e.target.checked)} />
              <span className="flex-1">{t('ไปคนเดียว (ไม่มีคนช่วยจับบาร์)', 'Training solo (no spotter)')}</span>
              {p.solo && <span className="text-xs text-run">{t('สลับท่าที่ต้องมีคนช่วยให้แล้ว', 'Spotter lifts swapped')}</span>}
            </label>
          )}
        </div>
      )}

      {day.movedFrom !== undefined && (
        <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-run"><ArrowLeftRight size={13} /> {t(`สลับมาจากวัน${WEEKDAYS_TH[day.movedFrom]}`, `Moved from ${WEEKDAYS_EN[day.movedFrom]}`)}</p>
      )}
      {onDoToday && (
        <Button size="sm" variant="soft" className="mt-3 w-full" onClick={onDoToday}>
          <ArrowLeftRight size={15} /> {t('ทำวันนี้แทน (สลับกับแผนวันนี้)', "Do it today (swap with today's plan)")}
        </Button>
      )}
      {day.note && day.note !== weekNoteText && <p className="mt-3 text-sm text-muted">{dt.note(day.note)}</p>}

      {day.type === 'strength' && (
        <>
          <DayMuscles day={day} />
          <ul className="mt-2 divide-y divide-line">
            {day.exercises.map((e, i) => (
              <ExerciseRow key={e.name} e={e} n={i + 1} onSwap={() => setSwapping(e)} onRemove={() => p.removeExercise(day, e.name)} />
            ))}
          </ul>
          <button onClick={() => setAdding(true)} className="mt-1 flex items-center gap-1.5 py-1.5 text-sm font-semibold text-run">
            <Plus size={15} /> {t('เพิ่มท่า', 'Add exercise')}
          </button>
          {swapping && (
            <SwapSheet e={swapping} where={where} exclude={day.exercises.map(e => e.name)} onClose={() => setSwapping(null)}
              onPick={to => { p.swap(swapping.swappedFrom ?? swapping.name, to); setSwapping(null) }} />
          )}
          {adding && (
            <AddSheet where={where} existing={day.exercises.map(e => e.name)} onClose={() => setAdding(false)}
              onPick={x => { p.addExercise(day, { name: x.name, th: x.th, sets: '3', reps: x.reps, rest: '90 วิ', cue: x.cue, video: x.video }); setAdding(false) }} />
          )}
          <Button size="lg" className="mt-3 w-full" onClick={onStart}>
            <Play size={18} fill="currentColor" /> {done ? t('ฝึกอีกครั้ง', 'Train again') : t('เริ่มฝึก', 'Start workout')}
          </Button>
        </>
      )}

      {day.type === 'run' && (
        <div className="mt-3 space-y-2">
          <div className="rounded-2xl bg-raised p-3 text-sm">
            <p>{dt.cue(day.exercises[0]?.cue ?? '')}</p>
            {hint && <p className="mt-1 font-semibold text-run">{hint}</p>}
          </div>
          {!done && <CapNote day={day} date={date} />}
          {day.runKind === 'race' && <RacePlan day={day} date={slotId} />}
          {day.runKind && <RunTypeCard kind={day.runKind} />}
          {day.runKind !== 'race' && (
            <Button size="lg" variant={done ? 'soft' : 'run'} className="w-full" onClick={() => nav('runs')}><Footprints size={18} /> {done ? t('ดูการวิ่ง', 'View run') : t('ไปเริ่มวิ่ง', 'Go run')}</Button>
          )}
        </div>
      )}

      {day.type === 'rest' && (
        <p className="mt-3 rounded-2xl bg-raised p-3 text-sm text-muted">{t('เดินเบา ๆ ยืดเหยียด และนอนให้พอ', 'Easy walk, stretch, and get enough sleep')}</p>
      )}
    </article>
  )
}

function ExerciseRow({ e, n, onSwap, onRemove }: { e: Exercise; n: number; onSwap: () => void; onRemove: () => void }) {
  const t = useT()
  const dt = useDayText()
  const [open, setOpen] = useState(false)
  return (
    <li>
      <button onClick={() => setOpen(!open)} className="flex w-full items-center gap-3 py-2.5 text-left active:scale-100">
        <span className="grid size-7 shrink-0 place-items-center rounded-full bg-raised text-xs font-bold text-muted">{n}</span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-semibold">{e.name}{(e.swappedFrom || e.added) && <span className="ml-1.5 text-[10px] font-normal text-run">{e.added ? t('เพิ่มเอง', 'added') : e.solo ? t('ฝึกคนเดียว', 'solo') : t('สลับแล้ว', 'swapped')}</span>}{!e.swappedFrom && needsSpotter[e.name] && <span className="ml-1.5 text-[10px] font-normal text-warn">{t('ควรมีคนช่วย', 'needs spotter')}</span>}</span>
          {!dt.en && <span className="block truncate text-xs text-muted">{e.th}</span>}
        </span>
        <span className="shrink-0 text-sm font-semibold tabular-nums">{e.sets}×{dt.reps(e.reps)}</span>
        <ChevronRight size={16} className={cx('shrink-0 text-muted transition-transform duration-300', open && 'rotate-90')} />
      </button>
      <Collapse open={open}>
        <div className="mb-3 ml-10 space-y-2 rounded-2xl bg-raised p-3 text-sm">
          <div className="flex flex-wrap gap-1.5">
            {e.rest !== '-' && <Badge tone="muted">{t('พัก', 'rest')} {e.rest}</Badge>}
            {musclesOf(e).primary.map(m => <Badge key={m}>{dt.muscle(m)}</Badge>)}
          </div>
          <ExerciseDemo name={e.name} />
          {e.solo && e.swappedFrom && needsSpotter[e.swappedFrom] && <p className="text-xs text-run">{t(`ไปคนเดียว: ใช้ท่านี้แทน ${e.swappedFrom} — ${needsSpotter[e.swappedFrom].note}`, `Training solo: this replaces ${e.swappedFrom} — ${needsSpotter[e.swappedFrom].noteEn}`)}</p>}
          {!e.swappedFrom && needsSpotter[e.name] && <p className="text-xs text-warn">{t(`ท่านี้ควรมีคนช่วยจับบาร์ (${needsSpotter[e.name].note}) — ไปคนเดียวติ๊ก "ไปคนเดียว" ด้านบนได้`, `This lift needs a spotter (${needsSpotter[e.name].noteEn}) — training alone? tick "Solo" above`)}</p>}
          <p className="text-muted">{dt.cue(e.cue)}</p>
          {(e.easier || e.harder) && (
            <div className="flex flex-wrap gap-3 text-xs text-run">
              {e.easier && <span className="inline-flex items-center gap-1"><ArrowDown size={12} /> {e.easier}</span>}
              {e.harder && <span className="inline-flex items-center gap-1"><ArrowUp size={12} /> {e.harder}</span>}
            </div>
          )}
          <a href={yt(e.video)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 font-semibold text-accent!">
            <Play size={14} fill="currentColor" /> {t('ดูวิธีทำบน YouTube', 'How-to on YouTube')}
          </a>
          <div className="flex gap-4 border-t border-line pt-2 text-xs font-semibold">
            {e.added
              ? <button onClick={onRemove} className="inline-flex items-center gap-1 text-bad"><Trash2 size={13} /> {t('ลบท่านี้', 'Remove')}</button>
              : <button onClick={onSwap} className="inline-flex items-center gap-1 text-run"><ArrowLeftRight size={13} /> {e.swappedFrom ? t(`สลับแล้ว (เดิม ${e.swappedFrom})`, `Swapped (was ${e.swappedFrom})`) : t('สลับท่า', 'Swap')}</button>}
          </div>
        </div>
      </Collapse>
    </li>
  )
}
