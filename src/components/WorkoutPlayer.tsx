import { needsKg } from '../lib/lifts'
import { useEffect, useState } from 'react'
import { Check, ChevronLeft, ChevronRight, Minus, Play, Plus, SkipForward, Timer, TrendingUp, X } from 'lucide-react'
import { yt, type Day, type Exercise } from '../data/workouts'
import { lastSetsFor, formatDuration, uid, useSessions, type SetEntry } from '../lib/log'
import { useDayText } from '../lib/dayText'
import { usePersisted } from '../lib/storage'
import { today } from '../lib/date'
import { restSeconds, suggest } from '../lib/progression'
import { isBarbell, platesPerSide, warmupSets } from '../lib/plates'
import { cancelRestEnd, scheduleRestEnd } from '../lib/notify'
import { Badge, Button, Collapse, Portal } from './ui'
import { RpePicker } from './RpePicker'
import { cx } from '../lib/cx'
import { useBackClose } from '../lib/back'
import { ExerciseDemo } from './ExerciseDemo'
import { ask } from '../lib/dialog'
import { buzz, speak } from '../lib/voice'
import { useT } from '../lib/i18n'

type SetRow = { kg: string; reps: string; done: boolean }
type Active = { key: string; startedAt: number; idx: number; rows: Record<string, SetRow[]> }

const setsOf = (e: Exercise) => parseInt(e.sets, 10) || 1


const targetReps = (e: Exercise) => e.reps.match(/\d+/)?.[0] ?? ''
// ท่าค้าง (นับเป็นวินาที) ใช้ตัวจับเวลาในตัว ท่า "/ ข้าง" จับเวลาข้างละครั้ง
const holdOf = (e: Exercise) => (/วิ/.test(e.reps) ? { sec: parseInt(targetReps(e), 10) || 30, sides: /ข้าง/.test(e.reps) ? 2 : 1 } : null)

/** หน้าพาฝึกทีละท่า: กรอกน้ำหนัก×ครั้ง ติ๊กเซ็ต แล้วนับเวลาพักให้อัตโนมัติ */
export function WorkoutPlayer({ day, sessionKey, mode, light = false, onClose, onSaved }: {
  day: Day; sessionKey: string; mode: 'gym' | 'park' | 'home'; light?: boolean; onClose: () => void; onSaved: () => void
}) {
  const dt = useDayText()
  const tr = useT()
  const [sessions, setSessions] = useSessions()
  const [active, setActive] = usePersisted<Active | null>('activeWorkout', null)
  const [rest, setRest] = useState<{ end: number; total: number } | null>(null)
  const [now, setNow] = useState(() => Date.now())
  // ตัวจับเวลาท่าค้าง: ข้างที่เท่าไร + เวลาสิ้นสุด (เริ่มนับหลังนับถอยหลัง 3 วิ)
  const [hold, setHold] = useState<{ side: number; end: number } | null>(null)
  const [voice] = usePersisted('voiceCues', true)
  // วันสวน/ที่บ้านส่วนใหญ่ไม่มีน้ำหนักเพิ่ม ซ่อนช่องกก. ไว้ก่อน (เปิดเองได้)
  const [showKg, setShowKg] = usePersisted('bwWeights', false)
  const kgCol = mode === 'gym' || showKg

  // เริ่มใหม่ หรือกลับมาทำต่อจากที่ค้างไว้ (เช่น เผลอปิดหน้า)
  const state: Active = active?.key === sessionKey ? active : {
    key: sessionKey,
    startedAt: now,
    idx: 0,
    rows: Object.fromEntries(day.exercises.map(e => {
      const prev = lastSetsFor(sessions, e.name)?.sets
      const kg = suggest(e, prev).kg
      return [e.name, Array.from({ length: light ? Math.max(1, setsOf(e) - 1) : setsOf(e) }, (_, i) => ({ kg: kg ? String(kg) : prev?.[i]?.kg ? String(prev[i].kg) : '', reps: '', done: false }))]
    })),
  }
  const update = (fn: (s: Active) => Active) => setActive(fn(state))

  useEffect(() => {
    const id = setInterval(() => {
      const t = Date.now()
      setNow(t)
      // หมดเวลาพัก: สั่น แล้วปิดหน้าพัก
      setRest(r => {
        if (r && t >= r.end) {
          navigator.vibrate?.([200, 100, 200])
          return null
        }
        return r
      })
    }, 250)
    return () => {
      clearInterval(id)
      void cancelRestEnd()
    }
  }, [])

  const restLeft = rest ? Math.max(0, Math.ceil((rest.end - now) / 1000)) : 0
  const holdLeft = hold ? Math.ceil((hold.end - now) / 1000) : 0

  const ex = day.exercises[state.idx]
  const rows = state.rows[ex.name]
  const prev = lastSetsFor(sessions, ex.name)
  const total = Object.values(state.rows).flat().length
  const doneCount = Object.values(state.rows).flat().filter(r => r.done).length
  const currentSet = rows.findIndex(r => !r.done)
  const h = holdOf(ex)

  const setRow = (i: number, patch: Partial<SetRow>) =>
    update(s => ({ ...s, rows: { ...s.rows, [ex.name]: s.rows[ex.name].map((r, j) => (j === i ? { ...r, ...patch } : r)) } }))

  const completeSet = (i: number) => {
    const r = rows[i]
    if (r.done) return setRow(i, { done: false })
    const lastOfExercise = rows.every((x, j) => j === i || x.done)
    const advance = lastOfExercise && state.idx < day.exercises.length - 1
    update(s => ({
      ...s,
      idx: advance ? s.idx + 1 : s.idx,
      rows: { ...s.rows, [ex.name]: s.rows[ex.name].map((x, j) => (j === i ? { ...x, done: true, reps: x.reps || targetReps(ex) } : x)) },
    }))
    // เซ็ตสุดท้ายของทั้งวันไม่ต้องพัก
    if (doneCount + 1 < total) {
      const sec = restSeconds(ex.rest)
      const end = Date.now() + sec * 1000
      setRest({ end, total: sec })
      // ถ้าจอดับระหว่างพัก แจ้งเตือนของเครื่องจะเด้งตอนหมดเวลา
      const nextName = advance ? day.exercises[state.idx + 1].name : `${ex.name} เซ็ต ${Math.min(i + 2, rows.length)}`
      void scheduleRestEnd(new Date(end), nextName)
      if (voice) void speak(`พัก ${sec} วินาที ต่อไป ${nextName}`)
    } else if (voice) void speak('ครบทุกเซ็ตแล้ว เยี่ยมมาก')
  }

  // จับเวลาท่าค้าง: ครบเวลา → สั่น + เสียง → ข้างถัดไป หรือบันทึกเซ็ตนี้เสร็จ
  useEffect(() => {
    if (!hold || !h || now < hold.end) return
    buzz('easy')
    if (hold.side < h.sides) {
      if (voice) void speak('สลับข้าง')
      setHold({ side: hold.side + 1, end: Date.now() + (h.sec + 3) * 1000 })
    } else {
      setHold(null)
      if (currentSet >= 0) completeSet(currentSet)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [now, hold])
  const startHold = () => {
    if (!h) return
    if (voice) void speak(`${ex.name} ${h.sec} วินาที เริ่มใน 3 วินาที`)
    setHold({ side: 1, end: Date.now() + (h.sec + 3) * 1000 })
  }

  // ปุ่มหลักปุ่มเดียว: บอกสิ่งที่ต้องทำต่อ (แบบแอปพาออกกำลังกาย)
  const allDone = doneCount === total
  const exDone = currentSet < 0
  const cta = allDone ? { label: tr('จบและบันทึก', 'Finish & save'), icon: Check, run: () => void finish() }
    : exDone ? { label: tr('ท่าถัดไป', 'Next exercise'), icon: ChevronRight, run: () => update(s => ({ ...s, idx: day.exercises.findIndex(e => state.rows[e.name].some(r => !r.done)) })) }
    : h ? { label: tr(`จับเวลา ${h.sec} วิ${h.sides > 1 ? ' / ข้าง' : ''} · เซ็ต ${currentSet + 1}/${rows.length}`, `Hold ${h.sec} s${h.sides > 1 ? ' / side' : ''} · set ${currentSet + 1}/${rows.length}`), icon: Timer, run: startHold }
    : { label: tr(`เสร็จเซ็ต ${currentSet + 1}/${rows.length}${targetReps(ex) ? ` (${rows[currentSet].reps || targetReps(ex)} ครั้ง)` : ''}`, `Done set ${currentSet + 1}/${rows.length}${targetReps(ex) ? ` (${rows[currentSet].reps || targetReps(ex)} reps)` : ''}`), icon: Check, run: () => completeSet(currentSet) }

  const [rating, setRating] = useState(false)

  const doneEntries = () => day.exercises
      .map(e => ({ name: e.name, sets: state.rows[e.name].filter(r => r.done).map<SetEntry>(r => ({ kg: parseFloat(r.kg) || 0, reps: parseInt(r.reps, 10) || 0 })) }))
      .filter(e => e.sets.length)

  const finish = async () => {
    if (!doneEntries().length) {
      if (await ask(tr('ยังไม่ได้ทำเซ็ตไหนเลย', 'No sets done yet'), { title: tr('ออกโดยไม่บันทึก?', 'Leave without saving?'), ok: tr('ออก', 'Leave'), danger: true })) { setActive(null); onClose() }
      return
    }
    setRating(true)
  }

  // บันทึกพร้อมความเหนื่อยทั้งรอบ (session-RPE) และเวลาที่ใช้ ใช้คำนวณภาระการฝึก
  const save = (rpe?: number) => {
    const minutes = Math.max(1, Math.round((Date.now() - state.startedAt) / 60000))
    setSessions(p => [...p, { id: uid(), date: today(), mode, dayKey: day.key, title: day.title, entries: doneEntries(), rpe, minutes }])
    setActive(null)
    onSaved()
  }

  const quit = async () => {
    if (doneCount === 0 || (await ask(tr('ความคืบหน้าจะถูกเก็บไว้ กลับมาทำต่อได้', 'Your progress is kept — you can come back to it'), { title: tr('ออกจากการฝึก?', 'Leave the workout?'), ok: tr('ออก', 'Leave') }))) onClose()
  }
  useBackClose(() => void quit())

  return (
    <Portal>
    <div className="fixed inset-0 z-50 animate-sheet-up overflow-y-auto bg-bg">
      <div className="mx-auto flex min-h-full max-w-lg flex-col gap-4 p-4 pb-[calc(var(--sab)+1rem)] pt-[calc(var(--sat)+1rem)]">
        <div className="flex items-center gap-3">
          <button onClick={quit} aria-label={tr('ปิด', 'Close')} className="grid size-10 place-items-center rounded-full bg-card ring-1 ring-line"><X size={18} /></button>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-bold">{dt.title(day)}</div>
            <div className="text-xs text-muted tabular-nums">{formatDuration((now - state.startedAt) / 1000)} · {doneCount}/{total} {tr('เซ็ต', 'sets')}{light && tr(' · โหมดเบา', ' · light mode')}</div>
          </div>
          <Button size="sm" variant="success" onClick={finish}><Check size={16} /> {tr('จบ', 'Finish')}</Button>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-body">
          <div className="h-full rounded-full bg-good-fill transition-all duration-500" style={{ width: `${(doneCount / total) * 100}%` }} />
        </div>

        {/* แถบท่า */}
        <div className="-mx-4 flex gap-2 overflow-x-auto scroll-px-4 px-4 [scrollbar-width:none]">
          {day.exercises.map((e, i) => {
            const all = state.rows[e.name].every(r => r.done)
            return (
              <button key={e.name} onClick={() => update(s => ({ ...s, idx: i }))}
                className={cx('shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ring-1',
                  i === state.idx ? 'bg-accent-fill text-white ring-accent' : all ? 'bg-good/15 text-good ring-good/30' : 'bg-card text-muted ring-line')}>
                {all && <Check size={12} className="-mt-0.5 mr-1 inline" />}{i + 1}. {e.name}
              </button>
            )
          })}
        </div>

        <section key={ex.name} className="animate-fade-up rounded-3xl bg-card p-4 shadow-sm ring-1 ring-line">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-xs font-semibold text-muted">{tr(`ท่าที่ ${state.idx + 1} จาก ${day.exercises.length}`, `Exercise ${state.idx + 1} of ${day.exercises.length}`)}</div>
              <h2 className="text-2xl font-extrabold leading-tight">{ex.name}</h2>
              <div className="text-sm text-muted">{ex.th}</div>
            </div>
            <a href={yt(ex.video)} target="_blank" rel="noreferrer" aria-label={tr('ดูวิดีโอ', 'Watch video')} className="grid size-11 shrink-0 place-items-center rounded-full bg-accent-fill text-white! shadow-sm"><Play size={18} fill="currentColor" /></a>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Badge tone="muted"><b className="text-ink">{ex.sets} × {ex.reps}</b></Badge>
            <Badge tone="muted">{tr('พัก', 'Rest')} {dt.reps(ex.rest)}</Badge>
          </div>
          <ExerciseDemo key={ex.name} name={ex.name} className="mt-3" />
          <p className="mt-2 text-sm text-muted">{dt.cue(ex.cue)}</p>
          {prev && <p className="mt-1 text-xs text-muted">{tr('ครั้งก่อน', 'Last time')} ({prev.date}): {prev.sets.map(s => (s.kg ? `${s.kg}×${s.reps}` : `${s.reps}`)).join(' · ')}</p>}
          {(() => {
            const sg = suggest(ex, prev?.sets)
            // ไม่มีน้ำหนัก (บอดี้เวท): คำแนะนำเรื่องเลือกน้ำหนักไม่ตรง เพิ่มความยากด้วยจังหวะ/ท่าแทน
            if (!kgCol && !sg.up && /น้ำหนัก/.test(sg.text)) { sg.text = `ทำ ${ex.reps} ให้ท่าถูก เหลือแรงอีก 2–3 ครั้ง ทำครบช่วงบนได้ทุกเซ็ตแล้วค่อยเพิ่มความยาก (ลงช้าลง หรือท่ายากขึ้น)`; sg.textEn = `Do ${dt.reps(ex.reps)} with good form and 2–3 reps left — once every set hits the top of the range, make it harder (slower lowering or a harder variation)` }
            return (
              <p className={cx('mt-2 flex gap-2 rounded-xl p-2 text-sm', sg.up ? 'bg-good/15 text-good' : 'bg-raised text-ink')}>
                <TrendingUp size={16} className="mt-0.5 shrink-0" /><span>{tr(sg.text, sg.textEn)}</span>
              </p>
            )
          })()}

          {mode === 'gym' && isBarbell(ex.name) && <WarmupPlates workKg={parseFloat(rows[0]?.kg) || 0} />}
          {/* ท่ายกน้ำหนักในยิมที่ยังไม่เคยใส่น้ำหนัก: ไม่มีตัวเลข แอปแนะนำเพิ่มน้ำหนักครั้งถัดไปไม่ได้ (เคยบันทึกเป็น 0 กก. ทุกเซ็ต) */}
          {mode === 'gym' && needsKg(ex.name) && !prev?.sets.some(x => x.kg > 0) && rows.every(r => !parseFloat(r.kg)) && (
            <p className="mt-3 rounded-xl bg-run/10 p-3 text-xs text-run">
              {isBarbell(ex.name)
                ? tr('ใส่น้ำหนักที่ยกด้วย (บาร์เปล่า = 20 กก.) ครั้งแรกเริ่มเบาที่ทำได้ครบเซ็ตและยังเหลือแรง 2–3 ครั้ง ครั้งต่อไปแอปจะบอกว่าควรเพิ่มเท่าไร', 'Enter the weight you lift (empty bar = 20 kg). Start light enough to finish every set with 2–3 reps left; next time the app will tell you how much to add.')
                : tr('ใส่น้ำหนักที่ยกด้วย ครั้งแรกเริ่มเบาที่ทำได้ครบเซ็ตและยังเหลือแรง 2–3 ครั้ง ครั้งต่อไปแอปจะบอกว่าควรเพิ่มเท่าไร', 'Enter the weight you lift. Start light enough to finish every set with 2–3 reps left; next time the app will tell you how much to add.')}
            </p>
          )}

          <div className="mt-4 space-y-2">
            <div className={cx('grid gap-2 px-1 text-xs text-muted', kgCol ? 'grid-cols-[2rem_1fr_1fr_3rem]' : 'grid-cols-[2rem_1fr_3rem]')}>
              <span>{tr('เซ็ต', 'Set')}</span>{kgCol && <span className="text-center">{mode !== 'gym' ? tr('+กก.', '+kg') : tr('กก.', 'kg')}</span>}<span className="text-center">{h ? tr('วินาที', 'sec') : tr('ครั้ง', 'reps')}</span><span />
            </div>
            {rows.map((r, i) => (
              <div key={i} className={cx('grid items-center gap-2 rounded-2xl p-1 transition-colors', kgCol ? 'grid-cols-[2rem_1fr_1fr_3rem]' : 'grid-cols-[2rem_1fr_3rem]',
                r.done ? 'bg-good/10' : i === currentSet ? 'bg-accent-soft/60' : '')}>
                <span className="text-center font-bold text-muted">{i + 1}</span>
                {kgCol && <Stepper value={r.kg} placeholder={prev?.sets[i]?.kg ? String(prev.sets[i].kg) : mode === 'gym' ? '–' : '0'} step={mode !== 'gym' ? 1 : 2.5} onChange={v => setRow(i, { kg: v })} />}
                <Stepper value={r.reps} placeholder={targetReps(ex) || '-'} step={1} onChange={v => setRow(i, { reps: v })} />
                <button onClick={() => completeSet(i)} aria-label={r.done ? tr('ยกเลิกเซ็ตนี้', 'Undo this set') : tr('ทำเซ็ตนี้เสร็จ', 'Complete this set')}
                  className={cx('grid size-11 place-items-center justify-self-end rounded-full transition', r.done ? 'animate-pop bg-good-fill text-white' : 'bg-raised text-muted ring-1 ring-line')}>
                  <Check size={20} strokeWidth={3} />
                </button>
              </div>
            ))}
            {mode !== 'gym' && <button onClick={() => setShowKg(!showKg)} className="px-1 text-xs font-semibold text-run">{showKg ? tr('ซ่อนช่องน้ำหนัก', 'Hide weight column') : tr('+ ใส่น้ำหนักเพิ่ม (เช่น เป้/ขวดน้ำ)', '+ Add load (e.g. backpack/bottles)')}</button>}
          </div>
        </section>

        <div className="flex gap-2">
          <Button variant="soft" className="flex-1" disabled={state.idx === 0} onClick={() => update(s => ({ ...s, idx: s.idx - 1 }))}><ChevronLeft size={18} /> {tr('ท่าก่อน', 'Previous')}</Button>
          <Button variant="soft" className="flex-1" disabled={state.idx === day.exercises.length - 1} onClick={() => update(s => ({ ...s, idx: s.idx + 1 }))}>{tr('ท่าถัดไป', 'Next')} <ChevronRight size={18} /></Button>
        </div>
        {/* ปุ่มหลักติดขอบล่าง กดได้ด้วยนิ้วโป้งข้างเดียว */}
        <div className="sticky bottom-0 -mx-4 mt-auto bg-gradient-to-t from-bg via-bg to-bg/0 px-4 pb-[calc(var(--sab)+0.5rem)] pt-4">
          <Button size="lg" className="w-full" onClick={cta.run}><cta.icon size={20} /> {cta.label}</Button>
        </div>
      </div>

      {rating && (
        <div className="fixed inset-0 z-[60] flex animate-fade-in items-end justify-center bg-black/50 sm:items-center">
          <div className="w-full max-w-lg animate-sheet-up space-y-4 rounded-t-3xl bg-card p-5 pb-[calc(var(--sab)+1.25rem)] sm:rounded-3xl">
            <div className="text-lg font-bold">{tr('เยี่ยมมาก! จบการฝึกแล้ว', 'Great work! Workout done')}</div>
            <RpePicker onPick={save} />
            <button className="w-full py-2 text-sm text-muted" onClick={() => save()}>{tr('ข้าม', 'Skip')}</button>
          </div>
        </div>
      )}
      {hold && (
        <div className="fixed inset-0 z-[60] flex animate-fade-in flex-col items-center justify-center gap-5 bg-bg/95 p-6 backdrop-blur">
          <div className="text-sm font-semibold uppercase tracking-wider text-muted">{ex.name}{h && h.sides > 1 ? tr(` · ข้างที่ ${hold.side}/${h.sides}`, ` · side ${hold.side}/${h.sides}`) : ''}</div>
          <div className="text-8xl font-extrabold tabular-nums">{holdLeft > (h?.sec ?? 0) ? holdLeft - (h?.sec ?? 0) : Math.max(0, holdLeft)}</div>
          <div className="text-sm text-muted">{holdLeft > (h?.sec ?? 0) ? tr('เตรียมตัว…', 'Get ready…') : tr('ค้างไว้', 'Hold')}</div>
          <ExerciseDemo key={ex.name} name={ex.name} className="w-full max-w-60" />
          <Button variant="soft" size="lg" onClick={() => setHold(null)}><X size={18} /> {tr('หยุด', 'Stop')}</Button>
        </div>
      )}
      {rest && restLeft > 0 && (
        <RestOverlay left={restLeft} total={rest.total} next={currentSet >= 0 ? `${ex.name} ${tr('เซ็ต', 'set')} ${currentSet + 1}` : undefined} nextName={currentSet >= 0 ? ex.name : undefined}
          onAdd={() => setRest(r => {
            if (!r) return r
            void scheduleRestEnd(new Date(r.end + 15000))
            return { end: r.end + 15000, total: r.total + 15 }
          })}
          onSkip={() => { setRest(null); void cancelRestEnd() }} />
      )}
    </div>
    </Portal>
  )
}

function Stepper({ value, placeholder, step, onChange }: { value: string; placeholder: string; step: number; onChange: (v: string) => void }) {
  const tr = useT()
  const bump = (d: number) => {
    const n = Math.max(0, (parseFloat(value || placeholder) || 0) + d)
    onChange(String(Math.round(n * 10) / 10))
  }
  return (
    <div className="flex items-center rounded-xl bg-raised ring-1 ring-line">
      <button onClick={() => bump(-step)} aria-label={tr('ลด', 'Decrease')} className="grid h-11 w-8 place-items-center text-muted"><Minus size={14} /></button>
      <input value={value} placeholder={placeholder} inputMode="decimal" onChange={e => onChange(e.target.value)}
        className="bare h-11 w-full min-w-0 border-0 bg-transparent p-0 text-center text-lg font-bold tabular-nums ring-0 focus:border-0" />
      <button onClick={() => bump(step)} aria-label={tr('เพิ่ม', 'Increase')} className="grid h-11 w-8 place-items-center text-muted"><Plus size={14} /></button>
    </div>
  )
}

function RestOverlay({ left, total, next, nextName, onAdd, onSkip }: { left: number; total: number; next?: string; nextName?: string; onAdd: () => void; onSkip: () => void }) {
  const tr = useT()
  const r = 88
  const c = 2 * Math.PI * r
  const pct = Math.min(1, left / Math.max(total, left))
  return (
    <div className="fixed inset-0 z-[60] flex animate-fade-in flex-col items-center justify-center gap-6 bg-bg/95 p-6 backdrop-blur">
      <div className="text-sm font-semibold uppercase tracking-wider text-muted">{tr('พัก', 'Rest')}</div>
      <div className="relative size-56">
        <svg viewBox="0 0 200 200" className="size-full -rotate-90">
          <circle cx="100" cy="100" r={r} fill="none" strokeWidth="12" className="stroke-body" />
          <circle cx="100" cy="100" r={r} fill="none" strokeWidth="12" strokeLinecap="round" className="stroke-accent transition-[stroke-dasharray] duration-300"
            strokeDasharray={`${c * pct} ${c}`} />
        </svg>
        <div className="absolute inset-0 grid place-items-center text-6xl font-extrabold tabular-nums">{formatDuration(left)}</div>
      </div>
      {next && <div className="text-center text-sm text-muted">{tr('ถัดไป:', 'Next:')} <b className="text-ink">{next}</b></div>}
      {nextName && <ExerciseDemo key={nextName} name={nextName} className="w-full max-w-60" />}
      <div className="flex gap-3">
        <Button variant="soft" size="lg" onClick={onAdd}><Plus size={18} /> {tr('15 วิ', '15 s')}</Button>
        <Button size="lg" onClick={onSkip}><SkipForward size={18} /> {tr('ข้ามการพัก', 'Skip rest')}</Button>
      </div>
    </div>
  )
}

const plateText = (kg: number, en: boolean) => {
  const { plates } = platesPerSide(kg)
  return plates.length ? `${plates.join(' + ')} ${en ? 'per side' : 'ต่อข้าง'}` : en ? 'Empty bar' : 'บาร์เปล่า'
}

/** เซ็ตวอร์มอัพไล่น้ำหนัก + แผ่นที่ต้องใส่ต่อข้าง (บาร์ 20 กก.) */
function WarmupPlates({ workKg }: { workKg: number }) {
  const tr = useT()
  const [open, setOpen] = useState(false)
  if (workKg <= 0) return null
  const warm = warmupSets(workKg)
  return (
    <div className="mt-3 rounded-2xl bg-raised p-3 text-sm">
      <button onClick={() => setOpen(!open)} className="flex w-full items-center justify-between text-left active:scale-100">
        <span><b>{tr(`เซ็ตจริง ${workKg} กก.`, `Work sets ${workKg} kg`)}</b> <span className="text-muted">· {plateText(workKg, tr('', 'en') === 'en')}</span></span>
        <span className="text-xs font-semibold text-run">{open ? 'ซ่อน' : `วอร์มอัพ ${warm.length} เซ็ต`}</span>
      </button>
      <Collapse open={open}>
        <ul className="mt-2 space-y-1">
          {warm.map((w, i) => (
            <li key={i} className="flex justify-between gap-2 text-xs">
              <span className="tabular-nums"><b>{w.kg} {tr('กก.', 'kg')} × {w.reps}</b></span>
              <span className="text-muted">{plateText(w.kg, tr('', 'en') === 'en')}</span>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-[11px] text-muted">{tr('พักสั้น ๆ ระหว่างเซ็ตวอร์มอัพ ไม่ต้องบันทึก', 'Short rests between warm-up sets; no need to log them')}</p>
      </Collapse>
    </div>
  )
}
