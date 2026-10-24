import { useState } from 'react'
import { ArrowDown, ArrowUp, Check, ChevronDown, Dumbbell, Footprints, Moon, NotebookPen, Play, Trees } from 'lucide-react'
import { gymWeek, parkWeek, yt, type Day, type Exercise } from '../data/workouts'
import { dayIntensity, musclesOf, muscleNames } from '../data/muscles'
import { lastSetsFor, uid, useSessions, type SetEntry } from '../lib/log'
import { usePersisted } from '../lib/storage'
import { today } from '../lib/date'
import { BodyMap } from './BodyMap'
import { Badge, Button, Meter, Segmented } from './ui'
import { cx } from '../lib/cx'

type Mode = 'gym' | 'park'

export function Plan() {
  const [mode, setMode] = usePersisted<Mode>('mode', 'gym')
  const [week, setWeek] = usePersisted('week', 1)
  const [done, setDone] = usePersisted<Record<string, boolean>>('done', {})
  const days = mode === 'gym' ? gymWeek : parkWeek

  const id = (d: Day) => `${mode}-w${week}-${d.key}`
  const trainingDays = days.filter(d => d.type !== 'rest')
  const doneCount = trainingDays.filter(d => done[id(d)]).length

  return (
    <>
      <Segmented value={mode} onChange={setMode} options={[
        { value: 'gym', label: <><Dumbbell size={16} /> ยิม</> },
        { value: 'park', label: <><Trees size={16} /> สวน</> },
      ]} />

      <div className="-mx-4 flex snap-x scroll-px-4 gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
        {Array.from({ length: 12 }, (_, i) => i + 1).map(w => (
          <button key={w} onClick={() => setWeek(w)}
            className={cx('flex min-w-14 shrink-0 snap-start flex-col items-center rounded-2xl px-3 py-2 ring-1 transition',
              w === week ? 'bg-accent text-white ring-accent' : 'bg-card text-ink ring-line')}>
            <span className={cx('text-[10px]', w === week ? 'opacity-80' : 'text-muted')}>{w === 9 ? 'Deload' : 'สัปดาห์'}</span>
            <span className="text-lg font-bold leading-tight">{w}</span>
          </button>
        ))}
      </div>

      <div className="rounded-3xl bg-card p-4 shadow-sm ring-1 ring-line">
        <div className="mb-2 flex justify-between text-sm"><span className="font-semibold">ความคืบหน้าสัปดาห์ {week}</span><span className="tabular-nums text-muted">{doneCount}/{trainingDays.length} วัน</span></div>
        <Meter value={doneCount} max={trainingDays.length} tone="good" />
      </div>

      {week === 9 && <Callout>สัปดาห์ Deload: ทำทุกท่าแค่ครึ่งหนึ่งของจำนวนเซ็ต น้ำหนักเท่าเดิม วิ่งเบาอย่างเดียว</Callout>}
      {mode === 'park' && <Callout>ไปยิมกับสวนสลับกันได้ เช่น ยิมวันจันทร์/พุธ ไปสวนวันศุกร์ ขอแค่ให้ครบ 3 วันฝึกและ 2 วันวิ่ง</Callout>}

      <div className="space-y-3">
        {days.map(d => (
          <DayCard key={d.key} day={d} mode={mode} checked={!!done[id(d)]}
            setChecked={v => setDone(prev => ({ ...prev, [id(d)]: v }))} />
        ))}
      </div>
    </>
  )
}

const Callout = ({ children }: { children: React.ReactNode }) => (
  <p className="rounded-2xl border-l-4 border-accent bg-card p-3 text-sm shadow-sm">{children}</p>
)

const typeStyle = {
  strength: { icon: Dumbbell, tone: 'bg-accent-soft text-accent' },
  run: { icon: Footprints, tone: 'bg-run/15 text-run' },
  rest: { icon: Moon, tone: 'bg-raised text-muted' },
}

function DayCard({ day, mode, checked, setChecked }: { day: Day; mode: Mode; checked: boolean; setChecked: (v: boolean) => void }) {
  const [open, setOpen] = useState(false)
  const [logging, setLogging] = useState(false)
  const [sessions, setSessions] = useSessions()
  const [draft, setDraft] = useState<Record<string, { kg: string; reps: string }[]>>({})
  const { icon: Icon, tone } = typeStyle[day.type]

  const startLog = () => {
    const init: typeof draft = {}
    for (const e of day.exercises) {
      const prev = lastSetsFor(sessions, e.name)?.sets
      init[e.name] = Array.from({ length: setsOf(e) }, (_, i) => ({ kg: prev?.[i] ? String(prev[i].kg) : '', reps: '' }))
    }
    setDraft(init)
    setOpen(true)
    setLogging(true)
  }

  const saveLog = () => {
    const entries = day.exercises.map(e => ({
      name: e.name,
      sets: (draft[e.name] ?? [])
        .filter(s => s.reps !== '')
        .map<SetEntry>(s => ({ kg: parseFloat(s.kg) || 0, reps: parseInt(s.reps, 10) || 0 })),
    })).filter(e => e.sets.length)
    if (!entries.length) return alert('ยังไม่ได้กรอกจำนวนครั้งเลย')
    setSessions(prev => [...prev, { id: uid(), date: today(), mode, dayKey: day.key, title: day.title, entries }])
    setChecked(true)
    setLogging(false)
  }

  const updateSet = (name: string, i: number, field: 'kg' | 'reps', v: string) =>
    setDraft(d => ({ ...d, [name]: d[name].map((s, j) => (j === i ? { ...s, [field]: v } : s)) }))

  return (
    <article className={cx('rounded-3xl bg-card p-4 shadow-sm ring-1 transition', checked ? 'ring-good/50' : 'ring-line', day.type === 'rest' && 'opacity-80')}>
      <div className="flex items-center gap-3">
        <button className="flex min-w-0 flex-1 items-center gap-3 text-left" onClick={() => day.exercises.length && setOpen(!open)}>
          <div className={cx('grid size-12 shrink-0 place-items-center rounded-2xl', tone)}><Icon size={22} /></div>
          <div className="min-w-0">
            <div className="text-xs font-semibold text-muted">{day.day}{day.duration !== '-' && ` · ${day.duration}`}</div>
            <div className="font-bold leading-snug">{day.title}</div>
          </div>
          {day.exercises.length > 0 && <ChevronDown size={18} className={cx('ml-auto shrink-0 text-muted transition', open && 'rotate-180')} />}
        </button>
        {day.type !== 'rest' && (
          <button onClick={() => setChecked(!checked)} aria-label={checked ? 'ทำแล้ว' : 'ยังไม่ทำ'} aria-pressed={checked}
            className={cx('grid size-9 shrink-0 place-items-center rounded-full ring-2 transition',
              checked ? 'bg-good text-white ring-good' : 'text-transparent ring-line')}>
            <Check size={18} strokeWidth={3} />
          </button>
        )}
      </div>
      {day.note && <p className="mt-2 text-sm text-muted">{day.note}</p>}

      {open && day.exercises.length > 0 && (
        <div className="mt-3 space-y-3">
          {day.type === 'strength' && !logging && <BodyMap intensity={dayIntensity(day)} size="sm" />}
          {day.exercises.map(e => {
            const prev = lastSetsFor(sessions, e.name)
            const { primary } = musclesOf(e)
            return (
              <div key={e.name} className="rounded-2xl bg-raised p-3">
                <div className="flex justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-bold">{e.name}</div>
                    <div className="text-sm text-muted">{e.th}</div>
                  </div>
                  <a href={yt(e.video)} target="_blank" rel="noreferrer" aria-label={`วิดีโอ ${e.name}`}
                    className="grid size-10 shrink-0 place-items-center rounded-full bg-accent text-white! shadow-sm">
                    <Play size={16} fill="currentColor" />
                  </a>
                </div>
                <div className="my-2 flex flex-wrap gap-1.5">
                  <Badge tone="muted"><b className="text-ink">{e.sets} × {e.reps}</b></Badge>
                  {e.rest !== '-' && <Badge tone="muted">พัก {e.rest}</Badge>}
                  {primary.map(m => <Badge key={m}>{muscleNames[m]}</Badge>)}
                </div>
                <p className="text-sm text-muted">{e.cue}</p>
                {(e.easier || e.harder) && (
                  <div className="mt-1 flex flex-wrap gap-3 text-xs text-run">
                    {e.easier && <span className="inline-flex items-center gap-1"><ArrowDown size={12} /> {e.easier}</span>}
                    {e.harder && <span className="inline-flex items-center gap-1"><ArrowUp size={12} /> {e.harder}</span>}
                  </div>
                )}
                {prev && <div className="mt-2 text-xs font-semibold text-good">ครั้งก่อน ({prev.date}): {prev.sets.map(s => (s.kg ? `${s.kg}×${s.reps}` : `${s.reps}`)).join(' · ')}</div>}
                {logging && day.type === 'strength' && (
                  <div className="mt-3 space-y-2">
                    {draft[e.name]?.map((s, i) => (
                      <div key={i} className="grid grid-cols-[1.75rem_1fr_auto_1fr] items-center gap-2">
                        <span className="grid size-7 place-items-center rounded-full bg-card text-xs font-bold text-muted">{i + 1}</span>
                        <input className="text-center" inputMode="decimal" placeholder={mode === 'park' ? '+กก.' : 'กก.'} value={s.kg} onChange={ev => updateSet(e.name, i, 'kg', ev.target.value)} />
                        <span className="text-muted">×</span>
                        <input className="text-center" inputMode="numeric" placeholder="ครั้ง" value={s.reps} onChange={ev => updateSet(e.name, i, 'reps', ev.target.value)} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {day.type === 'strength' && (
        <div className="mt-3 flex gap-2">
          {!logging && <Button className="flex-1" onClick={startLog}><NotebookPen size={16} /> บันทึกการฝึก</Button>}
          {logging && (
            <>
              <Button className="flex-1" variant="success" onClick={saveLog}><Check size={16} /> บันทึก</Button>
              <Button variant="soft" onClick={() => setLogging(false)}>ยกเลิก</Button>
            </>
          )}
        </div>
      )}
      {day.type === 'run' && <p className="mt-2 text-xs text-muted">จับระยะด้วย GPS ได้ที่แท็บ "วิ่ง"</p>}
    </article>
  )
}

const setsOf = (e: Exercise) => parseInt(e.sets, 10) || 1
