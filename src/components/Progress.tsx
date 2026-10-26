import { Fragment, useState } from 'react'
import { Activity, CalendarDays, ChevronDown, Dumbbell, Pencil, Scale, Trash2, Trophy, TrendingUp } from 'lucide-react'
import { usePersisted } from '../lib/storage'
import { monthLabel, niceDate, shortDate, today, weekStart } from '../lib/date'
import { crossAsSession, useCross, useRuns, useSessions, type Session } from '../lib/log'
import { formLabel, trainingLoad } from '../lib/analysis'
import { FitnessChart } from './Charts'
import { allExercises, exerciseHistory, prsIn } from '../lib/strength'
import { Badge, Button, Card, Segmented, Stat } from './ui'
import { DateInput, NumberInput } from './Form'
import { cx } from '../lib/cx'
import { PhotoStrip, ProgressPhotos } from './Photos'
import { TrainingCalendar } from './TrainingCalendar'
import { useRemovePhotosFor } from '../lib/photos'
import { ask } from '../lib/dialog'

type Entry = { date: string; weight: number; waist?: number }

export function Progress() {
  const [view, setView] = useState<'workouts' | 'stats' | 'fitness' | 'body'>('workouts')
  return (
    <>
      <Segmented value={view} onChange={setView} options={[
        { value: 'workouts', label: <><CalendarDays size={16} /> ประวัติ</> },
        { value: 'stats', label: <><TrendingUp size={16} /> สถิติ</> },
        { value: 'fitness', label: <><Activity size={16} /> ฟิตเนส</> },
        { value: 'body', label: <><Scale size={16} /> น้ำหนัก</> },
      ]} />
      {view === 'workouts' ? <><TrainingCalendar /><WorkoutHistory /></> : view === 'stats' ? <StrengthStats /> : view === 'fitness' ? <Fitness /> : <BodyLog />}
    </>
  )
}

function BodyLog() {
  const [log, setLog] = usePersisted<Entry[]>('log', [])
  const [date, setDate] = useState(today())
  const [weight, setWeight] = useState('')
  const [waist, setWaist] = useState('')

  const add = () => {
    const w = parseFloat(weight)
    if (!w) return
    const entry: Entry = { date, weight: w, waist: parseFloat(waist) || undefined }
    setLog(prev => [...prev.filter(e => e.date !== date), entry].sort((a, b) => a.date.localeCompare(b.date)))
    setWeight('')
    setWaist('')
  }

  const weeks = weeklyAverages(log)
  const latest = log.at(-1)
  const first = log[0]

  return (
    <>
      {latest && (
        <div className="grid grid-cols-3 gap-2">
          <Stat label="ล่าสุด" value={latest.weight} sub="กก." accent />
          <Stat label="เปลี่ยนแปลง" value={`${latest.weight - first.weight > 0 ? '+' : ''}${(latest.weight - first.weight).toFixed(1)}`} sub="กก. จากครั้งแรก" />
          <Stat label="รอบเอว" value={latest.waist ?? '-'} sub="ซม." />
        </div>
      )}

      <Card title="บันทึกน้ำหนัก">
        <div className="grid grid-cols-2 gap-2">
          <DateInput label="วันที่" className="col-span-2" value={date} onChange={setDate} />
          <NumberInput label="น้ำหนัก" unit="กก." step={0.1} stepper value={weight} placeholder={String(log.at(-1)?.weight ?? '')} onChange={setWeight} />
          <NumberInput label="รอบเอว (ไม่บังคับ)" unit="ซม." step={0.5} stepper value={waist} placeholder={String(log.at(-1)?.waist ?? '')} onChange={setWaist} />
          <Button className="col-span-2" onClick={add}>บันทึก</Button>
        </div>
        <p className="mt-2 text-xs text-muted">ชั่งตอนเช้าหลังเข้าห้องน้ำ วัดเอวระดับสะดือ — น้ำหนักนิ่งแต่เอวลดก็คือไปถูกทาง</p>
      </Card>

      <Card title="รูปความคืบหน้า"><ProgressPhotos /></Card>

      {weeks.length > 1 && (
        <Card title="น้ำหนักเฉลี่ยรายสัปดาห์">
          <TrendChart unit="กก." points={weeks.map(w => ({ label: shortDate(w.start), value: w.avg }))} />
        </Card>
      )}

      {log.length > 0 && (
        <Card title="ทั้งหมด">
          <ul className="divide-y divide-line">
            {[...log].reverse().map(e => (
              <li key={e.date} className="flex items-center justify-between gap-2 py-2.5 text-sm">
                <span className="text-muted">{e.date}</span>
                <span className="font-semibold tabular-nums">{e.weight} กก.{e.waist ? ` · เอว ${e.waist}` : ''}</span>
                <button aria-label="ลบ" className="text-muted" onClick={() => setLog(prev => prev.filter(x => x.date !== e.date))}><Trash2 size={16} /></button>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </>
  )
}

function TrendChart({ points, unit }: { points: { label: string; value: number }[]; unit: string }) {
  const [hover, setHover] = useState<number | null>(null)
  const W = 320, H = 120, padX = 12, padY = 14
  const vals = points.map(p => p.value)
  const min = Math.min(...vals) - 0.5, max = Math.max(...vals) + 0.5
  const x = (i: number) => padX + (i / (points.length - 1)) * (W - padX * 2)
  const y = (v: number) => H - padY - ((v - min) / (max - min)) * (H - padY * 2)
  const d = points.map((p, i) => `${i ? 'L' : 'M'}${x(i)} ${y(p.value)}`).join(' ')
  return (
    <div>
      <div className="mb-1 h-5 text-right text-sm tabular-nums">{hover !== null ? `${points[hover].label}: ${points[hover].value.toFixed(1)} ${unit}` : ''}</div>
      <svg viewBox={`0 0 ${W} ${H}`} className="block w-full" role="img" aria-label="กราฟน้ำหนักรายสัปดาห์">
        <path d={d} fill="none" className="stroke-accent" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {points.map((p, i) => (
          <g key={i} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} onClick={() => setHover(i)}>
            <rect x={x(i) - 12} y={0} width={24} height={H} fill="transparent" />
            <circle cx={x(i)} cy={y(p.value)} r={hover === i ? 5 : 4} className="fill-accent stroke-card" strokeWidth={2} />
          </g>
        ))}
      </svg>
    </div>
  )
}

function WorkoutHistory() {
  const [sessions, setSessions] = useSessions()
  const [open, setOpen] = useState<string | null>(null)
  const [editing, setEditing] = useState<string | null>(null)
  const removePhotos = useRemovePhotosFor()
  const [months, setMonths] = useState(3)

  if (sessions.length === 0)
    return <Card><p className="py-6 text-center text-sm text-muted">ยังไม่มีบันทึก — ไปที่แท็บ "ฝึก" แล้วกด "เริ่มฝึก" ในวันเวท</p></Card>

  // แสดงทีละ 3 เดือน มีหัวเดือนพร้อมจำนวนครั้ง
  const sorted = [...sessions].sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id))
  const allMonths = [...new Set(sorted.map(s => s.date.slice(0, 7)))]
  const shown = sorted.filter(s => allMonths.indexOf(s.date.slice(0, 7)) < months)

  return (
    <div className="space-y-3">
      {shown.map((s, i) => {
        const ym = s.date.slice(0, 7)
        const header = i === 0 || shown[i - 1].date.slice(0, 7) !== ym
        const header_ = header && (
          <div className="flex items-baseline justify-between px-1 pt-1">
            <span className="text-sm font-bold">{monthLabel(ym)}</span>
            <span className="text-xs text-muted">{sorted.filter(x => x.date.startsWith(ym)).length} ครั้ง</span>
          </div>
        )
        const totalSets = s.entries.reduce((n, e) => n + e.sets.length, 0)
        const volume = s.entries.reduce((n, e) => n + e.sets.reduce((v, x) => v + x.kg * x.reps, 0), 0)
        const isOpen = open === s.id
        const prs = prsIn(sessions, s)
        return (
          <Fragment key={s.id}>
          {header_}
          <Card>
            <button className="flex w-full items-center gap-3 text-left" onClick={() => setOpen(isOpen ? null : s.id)}>
              <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-accent-soft text-accent"><Dumbbell size={22} /></div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2"><b className="truncate">{s.title}</b><Badge tone="muted">{s.mode === 'gym' ? 'ยิม' : 'สวน'}</Badge>{prs.length > 0 && <Badge tone="good"><Trophy size={11} /> PR {prs.length}</Badge>}</div>
                <div className="text-xs text-muted">{niceDate(s.date)} · {totalSets} เซ็ต{volume ? ` · ${Math.round(volume).toLocaleString()} กก.` : ''}</div>
              </div>
              <ChevronDown size={18} className={cx('shrink-0 text-muted transition', isOpen && 'rotate-180')} />
            </button>
            {isOpen && editing === s.id && (
              <EditSession session={s} onCancel={() => setEditing(null)}
                onSave={patch => { setSessions(prev => prev.map(x => (x.id === s.id ? { ...x, ...patch } : x)).sort((a, b) => a.date.localeCompare(b.date))); setEditing(null) }} />
            )}
            {isOpen && editing !== s.id && (
              <>
                <ul className="mt-3 space-y-1.5 rounded-2xl bg-raised p-3 text-sm">
                  {s.entries.map(e => (
                    <li key={e.name} className="flex justify-between gap-2">
                      <span>{e.name}</span>
                      <span className="text-right tabular-nums text-muted">{e.sets.map(x => (x.kg ? `${x.kg}×${x.reps}` : `${x.reps}`)).join(' · ')}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-3"><PhotoStrip kind="workout" refId={s.id} date={s.date} label="รูปการฝึก" /></div>
                <div className="mt-2 flex gap-2">
                  <Button variant="soft" size="sm" onClick={() => setEditing(s.id)}><Pencil size={14} /> แก้ไข</Button>
                  <Button variant="danger" size="sm" onClick={async () => (await ask('ลบบันทึกการฝึกนี้?', { ok: 'ลบ', danger: true })) && (setSessions(prev => prev.filter(x => x.id !== s.id)), removePhotos(s.id))}>
                    <Trash2 size={14} /> ลบ
                  </Button>
                </div>
              </>
            )}
          </Card>
          </Fragment>
        )
      })}
      {allMonths.length > months && (
        <button onClick={() => setMonths(m => m + 3)} className="w-full rounded-full py-2 text-sm font-semibold text-run ring-1 ring-line">ดูเดือนก่อนหน้า ({allMonths.length - months} เดือน)</button>
      )}
    </div>
  )
}

function weeklyAverages(log: Entry[]) {
  const groups = new Map<string, Entry[]>()
  for (const e of log) groups.set(weekStart(e.date), [...(groups.get(weekStart(e.date)) ?? []), e])
  return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([start, es]) => ({
    start,
    avg: es.reduce((s, e) => s + e.weight, 0) / es.length,
  }))
}

function StrengthStats() {
  const [sessions] = useSessions()
  const names = allExercises(sessions)
  const [picked, setPicked] = useState<string | null>(null)
  const name = picked ?? names[0]

  if (!names.length)
    return <Card><p className="py-6 text-center text-sm text-muted">บันทึกการฝึกสัก 2–3 ครั้ง แล้วกราฟความแข็งแรงจะขึ้นที่นี่</p></Card>

  const hist = exerciseHistory(sessions, name)
  const bodyweight = hist.every(p => p.kg === 0)
  const best = hist.reduce((b, p) => (p.value > b.value ? p : b), hist[0])
  const first = hist[0]
  const change = first.value ? Math.round((best.value / first.value - 1) * 100) : 0

  return (
    <>
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
        {names.map(n => (
          <button key={n} onClick={() => setPicked(n)}
            className={cx('shrink-0 rounded-full px-3 py-1.5 text-sm font-semibold ring-1', n === name ? 'bg-accent text-white ring-accent' : 'bg-card text-muted ring-line')}>
            {n}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-2">
        <Stat label={bodyweight ? 'ครั้งสูงสุด' : 'ประมาณ 1RM'} value={bodyweight ? best.value : best.value.toFixed(1)} sub={bodyweight ? 'ครั้ง/เซ็ต' : 'กก.'} accent />
        <Stat label="เซ็ตที่ดีที่สุด" value={best.kg ? `${best.kg}×${best.reps}` : `${best.reps}`} sub={best.date} />
        <Stat label="ดีขึ้น" value={`${change > 0 ? '+' : ''}${change}%`} sub={`จาก ${hist.length} ครั้ง`} />
      </div>
      <Card title={<span className="flex items-center gap-2"><Trophy size={18} className="text-warn" /> {name}</span>}>
        {hist.length > 1
          ? <TrendChart unit={bodyweight ? 'ครั้ง' : 'กก. (1RM โดยประมาณ)'} points={hist.map(p => ({ label: shortDate(p.date), value: p.value }))} />
          : <p className="py-4 text-center text-sm text-muted">ต้องมีอย่างน้อย 2 ครั้งถึงจะเห็นเส้นกราฟ</p>}
        <p className="mt-2 text-xs text-muted">{bodyweight ? 'ท่าบอดี้เวทใช้จำนวนครั้งสูงสุดต่อเซ็ต' : '1RM ประมาณจากเซ็ตที่ดีที่สุดของวัน (สูตร Epley) ไว้ดูแนวโน้ม ไม่ต้องลองยกจริง'}</p>
      </Card>
    </>
  )
}

function Fitness() {
  const [sessions] = useSessions()
  const [cross] = useCross()
  const [runs] = useRuns()
  const days = trainingLoad(runs, [...sessions, ...cross.map(crossAsSession)], today())
  if (days.length < 7)
    return <Card><p className="py-6 text-center text-sm text-muted">บันทึกการฝึก/วิ่งอย่างน้อย 1 สัปดาห์ แล้วกราฟความฟิตจะขึ้นที่นี่</p></Card>
  const cur = days.at(-1)!
  const f = formLabel(cur.form, cur.fitness, cur.day)
  const tones = { good: 'bg-good/15 text-good', run: 'bg-run/15 text-run', warn: 'bg-warn/15 text-warn', bad: 'bg-bad/15 text-bad', muted: 'bg-raised text-muted' }
  const week = days.slice(-7).reduce((s, d) => s + d.load, 0)
  const prev = days.slice(-14, -7).reduce((s, d) => s + d.load, 0)
  return (
    <>
      <div className={cx('rounded-2xl px-3.5 py-3', tones[f.tone])}>
        <div className="text-sm font-bold">ฟอร์มตอนนี้: {f.label}</div>
        <div className="text-xs opacity-90">{f.text}</div>
      </div>
      <Card title="ความฟิต · ความล้า · ฟอร์ม (12 สัปดาห์)">
        <FitnessChart days={days} />
      </Card>
      <div className="grid grid-cols-2 gap-2">
        <Stat label="ภาระ 7 วันล่าสุด" value={Math.round(week)} sub="หน่วย (RPE × นาที)" />
        <Stat label="เทียบสัปดาห์ก่อน" value={prev ? `${week >= prev ? '+' : ''}${Math.round((week / prev - 1) * 100)}%` : '-'} sub="ภาระรวม" />
      </div>
      <Card title="อ่านกราฟยังไง">
        <ul className="list-disc space-y-1 pl-5 text-xs text-muted">
          <li><b className="text-ink">ภาระ</b> ของแต่ละครั้ง = ความเหนื่อยที่ให้คะแนนหลังจบ (1–10) × นาที (session-RPE, Foster 2001) ถ้าไม่ได้ให้คะแนน แอปจะประมาณจากชนิดการฝึก</li>
          <li><b className="text-ink">ฟิต</b> = ภาระเฉลี่ยระยะยาว (~6 สัปดาห์) ค่อย ๆ ขึ้นเมื่อฝึกสม่ำเสมอ · <b className="text-ink">ล้า</b> = ภาระเฉลี่ย ~1 สัปดาห์ ขึ้นลงเร็ว</li>
          <li><b className="text-ink">ฟอร์ม</b> = ฟิต − ล้า: ติดลบตอนกำลังเพิ่มการฝึกเป็นเรื่องปกติ ก่อนแข่งควรกลับมาเป็นบวกจากการ taper</li>
          <li>เป็นโมเดลดูแนวโน้ม (แนวคิดของ Banister) ไม่ใช่ตัวทำนายการบาดเจ็บ — งานวิจัยยังไม่สนับสนุนการใช้อัตราส่วนภาระเพื่อทำนายการบาดเจ็บ</li>
        </ul>
      </Card>
    </>
  )
}

// แก้น้ำหนัก/จำนวนครั้งที่กรอกผิด หรือวันที่
function EditSession({ session, onSave, onCancel }: { session: Session; onSave: (patch: Partial<Session>) => void; onCancel: () => void }) {
  const [date, setDate] = useState(session.date)
  const [entries, setEntries] = useState(session.entries.map(e => ({ ...e, sets: e.sets.map(x => ({ kg: String(x.kg), reps: String(x.reps) })) })))
  const setField = (ei: number, si: number, k: 'kg' | 'reps', v: string) =>
    setEntries(prev => prev.map((e, i) => (i !== ei ? e : { ...e, sets: e.sets.map((x, j) => (j === si ? { ...x, [k]: v } : x)) })))
  return (
    <div className="mt-3 space-y-3 rounded-2xl bg-raised p-3">
      <DateInput label="วันที่" value={date} onChange={setDate} />
      {entries.map((e, ei) => (
        <div key={e.name}>
          <div className="mb-1 text-sm font-semibold">{e.name}</div>
          <div className="space-y-1.5">
            {e.sets.map((x, si) => (
              <div key={si} className="grid grid-cols-[1.5rem_1fr_1fr] items-center gap-2">
                <span className="text-center text-xs text-muted">{si + 1}</span>
                <NumberInput unit="กก." step={2.5} value={x.kg} onChange={v => setField(ei, si, 'kg', v)} />
                <NumberInput unit="ครั้ง" value={x.reps} onChange={v => setField(ei, si, 'reps', v)} />
              </div>
            ))}
          </div>
        </div>
      ))}
      <div className="flex gap-2">
        <Button className="flex-1" onClick={() => onSave({ date, entries: entries.map(e => ({ name: e.name, sets: e.sets.map(x => ({ kg: parseFloat(x.kg) || 0, reps: parseInt(x.reps, 10) || 0 })) })) })}>บันทึกการแก้ไข</Button>
        <Button variant="soft" onClick={onCancel}>ยกเลิก</Button>
      </div>
    </div>
  )
}
