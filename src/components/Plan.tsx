import { useState } from 'react'
import { ArrowDown, ArrowUp, Check, Dumbbell, NotebookPen, Play, Trees } from 'lucide-react'
import { gymWeek, parkWeek, yt, type Day, type Exercise } from '../data/workouts'
import { dayIntensity, musclesOf, muscleNames } from '../data/muscles'
import { lastSetsFor, uid, useSessions, type SetEntry } from '../lib/log'
import { usePersisted } from '../lib/storage'
import { today } from '../lib/date'
import { BodyMap } from './BodyMap'

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
      <section className="card toolbar">
        <div className="seg">
          <button className={mode === 'gym' ? 'on' : ''} onClick={() => setMode('gym')}><Dumbbell size={16} /> ยิม</button>
          <button className={mode === 'park' ? 'on' : ''} onClick={() => setMode('park')}><Trees size={16} /> สวน</button>
        </div>
        <label className="week">
          สัปดาห์
          <select value={week} onChange={e => setWeek(+e.target.value)}>
            {Array.from({ length: 12 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}{i + 1 === 9 ? ' (Deload)' : ''}</option>)}
          </select>
        </label>
        <div className="progress">
          <div className="bar-track"><div className="bar-fill" style={{ width: `${(doneCount / trainingDays.length) * 100}%` }} /></div>
          <span>{doneCount}/{trainingDays.length} วัน</span>
        </div>
      </section>

      {week === 9 && <p className="callout">สัปดาห์ Deload: ทำทุกท่าแค่ครึ่งหนึ่งของจำนวนเซ็ต น้ำหนักเท่าเดิม วิ่งเบาอย่างเดียว</p>}
      {mode === 'park' && <p className="callout">ไปยิมกับสวนสลับกันได้ เช่น ยิมวันจันทร์/พุธ ไปสวนวันศุกร์ ขอแค่ให้ครบ 3 วันฝึกและ 2 วันวิ่ง</p>}

      <div className="days">
        {days.map(d => (
          <DayCard key={d.key} day={d} mode={mode} checked={!!done[id(d)]}
            setChecked={v => setDone(prev => ({ ...prev, [id(d)]: v }))} />
        ))}
      </div>
    </>
  )
}

function DayCard({ day, mode, checked, setChecked }: { day: Day; mode: Mode; checked: boolean; setChecked: (v: boolean) => void }) {
  const [open, setOpen] = useState(false)
  const [logging, setLogging] = useState(false)
  const [sessions, setSessions] = useSessions()
  const [draft, setDraft] = useState<Record<string, { kg: string; reps: string }[]>>({})

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
    <article className={`card day ${day.type}${checked ? ' done' : ''}`}>
      <header onClick={() => day.exercises.length && setOpen(!open)}>
        <div className="day-title">
          <span className="badge">{day.day}</span>
          <h3>{day.title}</h3>
          <span className="muted small">{day.duration}</span>
        </div>
        {day.type !== 'rest' && (
          <label className="check" onClick={e => e.stopPropagation()}>
            <input type="checkbox" checked={checked} onChange={e => setChecked(e.target.checked)} />
            <span>{checked ? 'เสร็จ' : 'ยังไม่ทำ'}</span>
          </label>
        )}
      </header>
      {day.note && <p className="muted small">{day.note}</p>}

      {open && day.exercises.length > 0 && (
        <>
          {day.type === 'strength' && !logging && <BodyMap intensity={dayIntensity(day)} size="sm" />}
          <div className="exercises">
            {day.exercises.map(e => {
              const prev = lastSetsFor(sessions, e.name)
              const { primary } = musclesOf(e)
              return (
                <div key={e.name} className="exercise">
                  <div className="ex-head">
                    <div>
                      <b>{e.name}</b>
                      <div className="muted small">{e.th}</div>
                    </div>
                    <a className="yt" href={yt(e.video)} target="_blank" rel="noreferrer" aria-label={`วิดีโอ ${e.name}`}><Play size={16} fill="currentColor" /></a>
                  </div>
                  <div className="chips">
                    <span className="chip strong">{e.sets} × {e.reps}</span>
                    {e.rest !== '-' && <span className="chip">พัก {e.rest}</span>}
                    {primary.map(m => <span key={m} className="chip muscle-chip">{muscleNames[m]}</span>)}
                  </div>
                  <div className="cue">{e.cue}</div>
                  {(e.easier || e.harder) && (
                    <div className="alt">
                      {e.easier && <span><ArrowDown size={12} /> {e.easier}</span>}
                      {e.harder && <span><ArrowUp size={12} /> {e.harder}</span>}
                    </div>
                  )}
                  {prev && <div className="prev small">ครั้งก่อน ({prev.date}): {prev.sets.map(s => (s.kg ? `${s.kg}×${s.reps}` : `${s.reps}`)).join(' · ')}</div>}
                  {logging && day.type === 'strength' && (
                    <div className="set-grid">
                      {draft[e.name]?.map((s, i) => (
                        <div key={i} className="set-row">
                          <span className="set-no">{i + 1}</span>
                          <input inputMode="decimal" placeholder={mode === 'park' ? '+กก.' : 'กก.'} value={s.kg} onChange={ev => updateSet(e.name, i, 'kg', ev.target.value)} />
                          <span className="muted">×</span>
                          <input inputMode="numeric" placeholder="ครั้ง" value={s.reps} onChange={ev => updateSet(e.name, i, 'reps', ev.target.value)} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}

      {day.type === 'strength' && (
        <div className="day-actions">
          {!logging && <button className="primary" onClick={startLog}><NotebookPen size={16} /> บันทึกการฝึกวันนี้</button>}
          {logging && (
            <>
              <button className="primary" onClick={saveLog}><Check size={16} /> บันทึก</button>
              <button className="ghost" onClick={() => setLogging(false)}>ยกเลิก</button>
            </>
          )}
          {!logging && day.exercises.length > 0 && <button className="ghost" onClick={() => setOpen(!open)}>{open ? 'ซ่อนท่า' : 'ดูท่า'}</button>}
        </div>
      )}
      {day.type === 'run' && (
        <div className="day-actions">
          <button className="ghost" onClick={() => setOpen(!open)}>{open ? 'ซ่อน' : 'ดูรายละเอียด'}</button>
          <span className="muted small">จับระยะได้ที่แท็บ "วิ่ง"</span>
        </div>
      )}
    </article>
  )
}

const setsOf = (e: Exercise) => parseInt(e.sets, 10) || 1
