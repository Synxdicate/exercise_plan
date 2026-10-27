import { useMemo, useState } from 'react'
import { ArrowDown, ArrowLeftRight, ArrowUp, Check, ChevronRight, Dumbbell, Flag, Footprints, Moon, Play, Plus, RefreshCw, Trash2, Trees } from 'lucide-react'
import { yt, type Day, type Exercise } from '../data/workouts'
import { locationInfo, weekNote } from '../data/programs'
import { dayIntensity, musclesOf, muscleNames } from '../data/muscles'
import { useRuns } from '../lib/log'
import { estimate, paceHint } from '../lib/pace'
import { useProgram } from '../lib/program'
import { usePersisted } from '../lib/storage'
import { useNav } from '../lib/nav'
import { cx } from '../lib/cx'
import { BodyMap } from './BodyMap'
import { WorkoutPlayer } from './WorkoutPlayer'
import { ProgramSheet } from './ProgramSheet'
import { Alerts } from './Alerts'
import { RunTypeCard } from './RunTypes'
import { ReadinessSheet } from './Readiness'
import { Badge, Button, Collapse, Meter, Segmented } from './ui'
import { AddSheet, SwapSheet } from './ExercisePicker'
import { needsSpotter } from '../data/library'
import { RacePlan } from './RacePlan'
import { ExerciseDemo } from './ExerciseDemo'
import { CircuitCard } from './CircuitPlayer'

const short = ['จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส', 'อา']
const todayIdx = () => (new Date().getDay() + 6) % 7 // 0 = จันทร์

// key ใหม่เมื่อเปลี่ยนโปรแกรม/วันแข่ง → สัปดาห์ที่ดูอยู่รีเซ็ตเป็นสัปดาห์ปัจจุบัน
export function Plan() {
  const p = useProgram()
  return <PlanBody key={`${p.program}|${p.raceDate}`} />
}

const typeStyle = {
  strength: { icon: Dumbbell, tone: 'bg-accent-soft text-accent', dot: 'bg-accent' },
  run: { icon: Footprints, tone: 'bg-run/15 text-run', dot: 'bg-run' },
  rest: { icon: Moon, tone: 'bg-raised text-muted', dot: 'bg-line' },
}
const styleOf = (d: Day) => (d.runKind === 'race' ? { icon: Flag, tone: 'bg-accent text-white', dot: 'bg-accent' } : typeStyle[d.type])

function PlanBody() {
  const p = useProgram()
  const [done, setDone] = usePersisted<Record<string, boolean>>('done', {})
  const [viewWeek, setViewWeek] = useState(p.currentWeek)
  const [selected, setSelected] = useState(todayIdx)
  const [picking, setPicking] = useState(false)
  const [playing, setPlaying] = useState<{ i: number; light: boolean } | null>(null)
  const [checking, setChecking] = useState<number | null>(null)
  const [runs] = useRuns()
  const est = useMemo(() => estimate(runs), [runs])

  const week = p.autoWeek ? viewWeek : p.currentWeek
  const isThisWeek = week === p.currentWeek
  const selectWeek = (w: number) => (p.autoWeek ? setViewWeek(w) : p.setWeek(w))
  const days = p.plan(week)
  const isDone = (i: number) => p.isDone(done, week, i)
  const setDayDone = (i: number, v: boolean) => setDone(prev => ({ ...prev, [p.doneId(week, i)]: v }))
  const trainingIdx = days.flatMap((d, i) => (d.type !== 'rest' ? [i] : []))
  const doneCount = trainingIdx.filter(isDone).length
  const note = weekNote(p.program, week)
  const day = days[selected]

  return (
    <>
      <Alerts />
      <button onClick={() => setPicking(true)} className="flex w-full items-center gap-3 rounded-3xl bg-card p-4 text-left shadow-sm ring-1 ring-line active:scale-[.99]">
        <div className="min-w-0 flex-1">
          <div className="text-xs font-semibold text-accent">โปรแกรมของฉัน · {locationInfo[p.location].label.replace(/ \(.*\)/, '')}</div>
          <div className="truncate text-lg font-bold leading-tight">{p.meta.name}</div>
          {p.isRace && (
            <div className="mt-0.5 text-xs text-muted">
              {!p.raceDate ? 'ยังไม่ได้ใส่วันแข่ง — แตะเพื่อตั้ง'
                : p.weeksUntilStart > 0 ? `เริ่มโปรแกรมในอีก ${p.weeksUntilStart} สัปดาห์ — ระหว่างนี้วิ่งเบาสร้างฐาน`
                : p.daysToRace !== null && p.daysToRace >= 0 ? `อีก ${p.daysToRace} วันถึงวันแข่ง (${p.raceDate})`
                : 'ผ่านวันแข่งแล้ว — พัก 1–2 สัปดาห์ แล้วเลือกเป้าหมายถัดไป'}
            </div>
          )}
        </div>
        <span className="flex shrink-0 items-center gap-1 rounded-full bg-raised px-3 py-1.5 text-sm font-semibold ring-1 ring-line"><RefreshCw size={14} /> ตั้งค่า</span>
      </button>

      {/* สัปดาห์ */}
      <div className="-mx-4 flex snap-x scroll-px-4 gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
        {Array.from({ length: p.meta.weeks }, (_, i) => i + 1).map(w => {
          const light = weekNote(p.program, w)?.startsWith('สัปดาห์ลด') || (p.program === 'physique' && w === 9)
          return (
            <button key={w} onClick={() => selectWeek(w)}
              className={cx('relative flex min-w-14 shrink-0 snap-start flex-col items-center rounded-2xl px-3 py-1.5 ring-1',
                w === week ? 'bg-ink text-bg ring-ink' : 'bg-card text-ink ring-line')}>
              <span className={cx('text-[10px]', w === week ? 'opacity-70' : 'text-muted')}>
                {w === p.meta.weeks && p.isRace ? 'แข่ง' : light ? 'เบา' : p.ongoing ? 'รอบที่' : 'สัปดาห์'}
              </span>
              <span className="text-base font-bold leading-tight">{w}</span>
              {w === p.currentWeek && <span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-accent" />}
            </button>
          )
        })}
      </div>

      {/* แถบวัน */}
      <div className="rounded-3xl bg-card p-3 shadow-sm ring-1 ring-line">
        <div className="mb-2 flex items-center justify-between px-1 text-xs">
          <span className="font-semibold">สัปดาห์ {week}{isThisWeek && ' · สัปดาห์นี้'}</span>
          <span className="tabular-nums text-muted">{doneCount}/{trainingIdx.length} วัน{p.kmTarget(week) ? ` · วิ่ง ${p.kmTarget(week)} กม.` : ''}</span>
        </div>
        <div className="grid grid-cols-7 gap-1">
          {days.map((d, i) => {
            const st = styleOf(d)
            const on = i === selected
            const isToday = isThisWeek && i === todayIdx()
            return (
              <button key={i} onClick={() => setSelected(i)} aria-label={`${d.day}: ${d.title}`}
                className={cx('flex flex-col items-center gap-1 rounded-2xl py-2 transition-colors', on ? 'bg-accent-soft' : '')}>
                <span className={cx('text-[11px] font-semibold', on ? 'text-accent' : isToday ? 'text-ink' : 'text-muted')}>{isToday ? 'วันนี้' : short[i]}</span>
                <span className={cx('grid size-9 place-items-center rounded-full transition-all',
                  isDone(i) ? 'bg-good text-white' : st.tone, on && 'ring-2 ring-accent ring-offset-2 ring-offset-card')}>
                  {isDone(i) ? <Check size={16} strokeWidth={3} /> : <st.icon size={16} />}
                </span>
              </button>
            )
          })}
        </div>
        <div className="mt-2 px-1"><Meter value={doneCount} max={trainingIdx.length} tone="good" /></div>
        {note && <p className="mt-2 px-1 text-xs text-muted">{note}</p>}
      </div>

      {/* วันที่เลือก */}
      <DayDetail key={`${week}-${selected}-${day.location ?? ''}`} day={day} isToday={isThisWeek && selected === todayIdx()}
        done={isDone(selected)} hint={paceHint(est, day.runKind, day.title)}
        setDone={v => setDayDone(selected, v)}
        onStart={() => setChecking(selected)}
        onLocation={m => p.setDayLocation(week, selected, m)} slotId={p.doneId(week, selected)} />

      {/* ทั้งสัปดาห์แบบย่อ */}
      <section className="rounded-3xl bg-card p-2 shadow-sm ring-1 ring-line">
        <div className="px-2 pb-1 pt-2 text-sm font-bold">ทั้งสัปดาห์</div>
        <ul>
          {days.map((d, i) => {
            const st = styleOf(d)
            return (
              <li key={i}>
                <button onClick={() => { setSelected(i); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
                  className={cx('flex w-full items-center gap-3 rounded-2xl px-2 py-2.5 text-left', i === selected && 'bg-raised')}>
                  <span className={cx('size-2 shrink-0 rounded-full', isDone(i) ? 'bg-good' : st.dot)} />
                  <span className="w-14 shrink-0 text-xs text-muted">{d.day}</span>
                  <span className={cx('min-w-0 flex-1 truncate text-sm', d.type === 'rest' ? 'text-muted' : 'font-semibold', isDone(i) && 'text-muted line-through')}>{d.title}</span>
                  {d.location && <Badge tone="muted">{d.location === 'gym' ? 'ยิม' : 'สวน'}</Badge>}
                  {d.targetKm && <span className="text-xs tabular-nums text-muted">{d.targetKm} กม.</span>}
                  <ChevronRight size={16} className="shrink-0 text-muted" />
                </button>
              </li>
            )
          })}
        </ul>
      </section>

      <CircuitCard />

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

function DayDetail({ day, isToday, done, hint, setDone, onStart, onLocation, slotId }: {
  day: Day; isToday: boolean; done: boolean; hint: string | null
  setDone: (v: boolean) => void; onStart: () => void; onLocation: (m: 'gym' | 'park') => void; slotId: string
}) {
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
          <div className="text-xs font-semibold text-muted">{isToday ? `วันนี้ · ${day.day}` : day.day}{day.duration !== '-' && ` · ${day.duration}`}</div>
          <h2 className="text-xl font-extrabold leading-tight">{day.title}</h2>
        </div>
        {day.type !== 'rest' && (
          <button onClick={() => setDone(!done)} aria-label={done ? 'ทำแล้ว' : 'ยังไม่ทำ'} aria-pressed={done}
            className={cx('grid size-10 shrink-0 place-items-center rounded-full ring-2 transition-all duration-300',
              done ? 'bg-good text-white ring-good' : 'text-transparent ring-line')}>
            <Check size={20} strokeWidth={3} className={done ? 'animate-pop' : ''} />
          </button>
        )}
      </div>

      {day.type === 'strength' && day.location && (
        <div className="mt-3">
          <Segmented value={day.location} onChange={onLocation} options={[
            { value: 'gym', label: <><Dumbbell size={15} /> ยิม</> },
            { value: 'park', label: <><Trees size={15} /> สวน</> },
          ]} />
          {day.location === 'gym' && (
            <label className="mt-2 flex items-center gap-2 rounded-xl bg-raised px-3 py-2 text-sm">
              <input type="checkbox" className="size-4 accent-accent" checked={p.solo} onChange={e => p.setSolo(e.target.checked)} />
              <span className="flex-1">ไปคนเดียว (ไม่มีคนช่วยจับบาร์)</span>
              {p.solo && <span className="text-xs text-run">สลับท่าที่ต้องมีคนช่วยให้แล้ว</span>}
            </label>
          )}
        </div>
      )}

      {day.note && <p className="mt-3 text-sm text-muted">{day.note}</p>}

      {day.type === 'strength' && (
        <>
          <div className="mt-3"><BodyMap intensity={dayIntensity(day)} size="sm" /></div>
          <ul className="mt-2 divide-y divide-line">
            {day.exercises.map((e, i) => (
              <ExerciseRow key={e.name} e={e} n={i + 1} onSwap={() => setSwapping(e)} onRemove={() => p.removeExercise(day, e.name)} />
            ))}
          </ul>
          <button onClick={() => setAdding(true)} className="mt-1 flex items-center gap-1.5 py-1.5 text-sm font-semibold text-run">
            <Plus size={15} /> เพิ่มท่า
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
            <Play size={18} fill="currentColor" /> {done ? 'ฝึกอีกครั้ง' : 'เริ่มฝึก'}
          </Button>
        </>
      )}

      {day.type === 'run' && (
        <div className="mt-3 space-y-2">
          <div className="rounded-2xl bg-raised p-3 text-sm">
            <p>{day.exercises[0]?.cue}</p>
            {hint && <p className="mt-1 font-semibold text-run">{hint}</p>}
          </div>
          {day.runKind === 'race' && <RacePlan day={day} date={slotId} />}
          {day.runKind && <RunTypeCard kind={day.runKind} />}
          {day.runKind !== 'race' && (
            <Button size="lg" variant="run" className="w-full" onClick={() => nav('runs')}><Footprints size={18} /> ไปเริ่มวิ่ง</Button>
          )}
        </div>
      )}

      {day.type === 'rest' && (
        <p className="mt-3 rounded-2xl bg-raised p-3 text-sm text-muted">เดินเบา ๆ ยืดเหยียด และนอนให้พอ</p>
      )}
    </article>
  )
}

function ExerciseRow({ e, n, onSwap, onRemove }: { e: Exercise; n: number; onSwap: () => void; onRemove: () => void }) {
  const [open, setOpen] = useState(false)
  return (
    <li>
      <button onClick={() => setOpen(!open)} className="flex w-full items-center gap-3 py-2.5 text-left active:scale-100">
        <span className="grid size-7 shrink-0 place-items-center rounded-full bg-raised text-xs font-bold text-muted">{n}</span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-semibold">{e.name}{(e.swappedFrom || e.added) && <span className="ml-1.5 text-[10px] font-normal text-run">{e.added ? 'เพิ่มเอง' : e.solo ? 'ฝึกคนเดียว' : 'สลับแล้ว'}</span>}{!e.swappedFrom && needsSpotter[e.name] && <span className="ml-1.5 text-[10px] font-normal text-warn">ควรมีคนช่วย</span>}</span>
          <span className="block truncate text-xs text-muted">{e.th}</span>
        </span>
        <span className="shrink-0 text-sm font-semibold tabular-nums">{e.sets}×{e.reps}</span>
        <ChevronRight size={16} className={cx('shrink-0 text-muted transition-transform duration-300', open && 'rotate-90')} />
      </button>
      <Collapse open={open}>
        <div className="mb-3 ml-10 space-y-2 rounded-2xl bg-raised p-3 text-sm">
          <div className="flex flex-wrap gap-1.5">
            {e.rest !== '-' && <Badge tone="muted">พัก {e.rest}</Badge>}
            {musclesOf(e).primary.map(m => <Badge key={m}>{muscleNames[m]}</Badge>)}
          </div>
          <ExerciseDemo name={e.name} />
          {e.solo && e.swappedFrom && needsSpotter[e.swappedFrom] && <p className="text-xs text-run">ไปคนเดียว: ใช้ท่านี้แทน {e.swappedFrom} — {needsSpotter[e.swappedFrom].note}</p>}
          {!e.swappedFrom && needsSpotter[e.name] && <p className="text-xs text-warn">ท่านี้ควรมีคนช่วยจับบาร์ ({needsSpotter[e.name].note}) — ไปคนเดียวติ๊ก "ไปคนเดียว" ด้านบนได้</p>}
          <p className="text-muted">{e.cue}</p>
          {(e.easier || e.harder) && (
            <div className="flex flex-wrap gap-3 text-xs text-run">
              {e.easier && <span className="inline-flex items-center gap-1"><ArrowDown size={12} /> {e.easier}</span>}
              {e.harder && <span className="inline-flex items-center gap-1"><ArrowUp size={12} /> {e.harder}</span>}
            </div>
          )}
          <a href={yt(e.video)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 font-semibold text-accent!">
            <Play size={14} fill="currentColor" /> ดูวิธีทำบน YouTube
          </a>
          <div className="flex gap-4 border-t border-line pt-2 text-xs font-semibold">
            {e.added
              ? <button onClick={onRemove} className="inline-flex items-center gap-1 text-bad"><Trash2 size={13} /> ลบท่านี้</button>
              : <button onClick={onSwap} className="inline-flex items-center gap-1 text-run"><ArrowLeftRight size={13} /> {e.swappedFrom ? `สลับแล้ว (เดิม ${e.swappedFrom})` : 'สลับท่า'}</button>}
          </div>
        </div>
      </Collapse>
    </li>
  )
}
