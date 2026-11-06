import { Fragment, useState } from 'react'
import { Activity, CalendarDays, ChevronDown, Dumbbell, Pencil, Scale, Trash2, Trophy } from 'lucide-react'
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
import { LegTestCard } from './LegTests'
import { useT } from '../lib/i18n'
import { trNow } from '../lib/i18n'
import { titleEn } from '../lib/dayText'
import { useNav } from '../lib/nav'

type Entry = { date: string; weight: number; waist?: number }

export function Progress() {
  const [view, setView] = useState<'workouts' | 'stats' | 'fitness' | 'body'>('workouts')
  const t = useT()
  return (
    <>
      <Segmented value={view} onChange={setView} options={[
        { value: 'workouts', label: <><CalendarDays size={16} /> {t('ปฏิทิน', 'Calendar')}</> },
        { value: 'stats', label: <><Dumbbell size={16} /> {t('เวท', 'Lifts')}</> },
        { value: 'fitness', label: <><Activity size={16} /> {t('ฟิตเนส', 'Fitness')}</> },
        { value: 'body', label: <><Scale size={16} /> {t('น้ำหนัก', 'Weight')}</> },
      ]} />
      {view === 'workouts' ? <><TrainingCalendar /><WorkoutHistory /></> : view === 'stats' ? <StrengthStats /> : view === 'fitness' ? <><Fitness /><LegTestCard /></> : <BodyLog />}
    </>
  )
}

function BodyLog() {
  const tr = useT()
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
          <Stat label={tr('ล่าสุด', 'Latest')} value={latest.weight} sub={tr('กก.', 'kg')} accent />
          <Stat label={tr('เปลี่ยนแปลง', 'Change')} value={`${latest.weight - first.weight > 0 ? '+' : ''}${(latest.weight - first.weight).toFixed(1)}`} sub={tr('กก. จากครั้งแรก', 'kg since first')} />
          <Stat label={tr('รอบเอว', 'Waist')} value={latest.waist ?? '-'} sub={tr('ซม.', 'cm')} />
        </div>
      )}

      <Card title={tr('บันทึกน้ำหนัก', 'Log weight')}>
        <div className="grid grid-cols-2 gap-2">
          <DateInput label={tr('วันที่', 'Date')} className="col-span-2" value={date} onChange={setDate} />
          <NumberInput label={tr('น้ำหนัก', 'Weight')} unit={tr('กก.', 'kg')} step={0.1} stepper value={weight} placeholder={String(log.at(-1)?.weight ?? '')} onChange={setWeight} />
          <NumberInput label={tr('รอบเอว (ไม่บังคับ)', 'Waist (optional)')} unit={tr('ซม.', 'cm')} step={0.5} stepper value={waist} placeholder={String(log.at(-1)?.waist ?? '')} onChange={setWaist} />
          <Button className="col-span-2" onClick={add}>{tr('บันทึก', 'Save')}</Button>
        </div>
        <p className="mt-2 text-xs text-muted">{tr('ชั่งตอนเช้าหลังเข้าห้องน้ำ วัดเอวระดับสะดือ — น้ำหนักนิ่งแต่เอวลดก็คือไปถูกทาง', 'Weigh in the morning after the toilet, measure waist at the navel — steady weight with a shrinking waist means it’s working')}</p>
      </Card>

      <Card title={tr('รูปความคืบหน้า', 'Progress photos')}><ProgressPhotos /></Card>

      {weeks.length > 1 && (
        <Card title={tr('น้ำหนักเฉลี่ยรายสัปดาห์', 'Weekly average weight')}>
          <TrendChart unit={tr('กก.', 'kg')} points={weeks.map(w => ({ label: shortDate(w.start), value: w.avg }))} />
        </Card>
      )}

      {log.length > 0 && (
        <Card title={tr('ทั้งหมด', 'All entries')}>
          <ul className="divide-y divide-line">
            {[...log].reverse().map(e => (
              <li key={e.date} className="flex items-center justify-between gap-2 py-2.5 text-sm">
                <span className="text-muted">{e.date}</span>
                <span className="font-semibold tabular-nums">{e.weight} {tr('กก.', 'kg')}{e.waist ? ` · ${tr('เอว', 'waist')} ${e.waist}` : ''}</span>
                <button aria-label={tr('ลบ', 'Delete')} className="text-muted" onClick={() => setLog(prev => prev.filter(x => x.date !== e.date))}><Trash2 size={16} /></button>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </>
  )
}

function TrendChart({ points, unit }: { points: { label: string; value: number }[]; unit: string }) {
  const tr = useT()
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
      <svg viewBox={`0 0 ${W} ${H}`} className="block w-full" role="img" aria-label={tr('กราฟน้ำหนักรายสัปดาห์', 'Weekly weight chart')}>
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
  const tr = useT()
  const [sessions, setSessions] = useSessions()
  const [open, setOpen] = useState<string | null>(null)
  const [editing, setEditing] = useState<string | null>(null)
  const removePhotos = useRemovePhotosFor()
  const [months, setMonths] = useState(3)
  const nav = useNav()

  if (sessions.length === 0)
    return (
      <Card>
        <div className="flex flex-col items-center gap-3 py-5 text-center">
          <Dumbbell size={28} className="text-muted" />
          <p className="text-sm text-muted">{tr('ยังไม่มีบันทึกเวท — กด "เริ่มฝึก" ในวันเวทของตาราง', 'No workouts logged yet — tap "Start workout" on a strength day in your plan')}</p>
          <Button variant="soft" onClick={() => nav('plan')}>{tr('ไปที่ตารางฝึก', 'Open the plan')}</Button>
        </div>
      </Card>
    )

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
            <span className="text-xs text-muted">{sorted.filter(x => x.date.startsWith(ym)).length} {tr('ครั้ง', 'sessions')}</span>
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
                <div className="flex items-center gap-2"><b className="truncate">{tr(s.title, titleEn(s.title))}</b><Badge tone="muted">{s.mode === 'gym' ? tr('ยิม', 'Gym') : s.mode === 'home' ? tr('บ้าน', 'Home') : tr('สวน', 'Park')}</Badge>{prs.length > 0 && <Badge tone="good"><Trophy size={11} /> PR {prs.length}</Badge>}</div>
                <div className="text-xs text-muted">{niceDate(s.date)} · {totalSets} {tr('เซ็ต', 'sets')}{volume ? ` · ${Math.round(volume).toLocaleString()} ${tr('กก.', 'kg')}` : ''}</div>
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
                <div className="mt-3"><PhotoStrip kind="workout" refId={s.id} date={s.date} label={trNow('รูปการฝึก', 'Workout photos')} /></div>
                <div className="mt-2 flex gap-2">
                  <Button variant="soft" size="sm" onClick={() => setEditing(s.id)}><Pencil size={14} /> {tr('แก้ไข', 'Edit')}</Button>
                  <Button variant="danger" size="sm" onClick={async () => (await ask(tr('ลบบันทึกการฝึกนี้?', 'Delete this workout?'), { ok: tr('ลบ', 'Delete'), danger: true })) && (setSessions(prev => prev.filter(x => x.id !== s.id)), removePhotos(s.id))}>
                    <Trash2 size={14} /> {tr('ลบ', 'Delete')}
                  </Button>
                </div>
              </>
            )}
          </Card>
          </Fragment>
        )
      })}
      {allMonths.length > months && (
        <button onClick={() => setMonths(m => m + 3)} className="w-full rounded-full py-2 text-sm font-semibold text-run ring-1 ring-line">{tr(`ดูเดือนก่อนหน้า (${allMonths.length - months} เดือน)`, `Show earlier months (${allMonths.length - months})`)}</button>
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
  const tr = useT()
  const [sessions] = useSessions()
  const names = allExercises(sessions)
  const [picked, setPicked] = useState<string | null>(null)
  const name = picked ?? names[0]

  if (!names.length)
    return <Card><p className="py-6 text-center text-sm text-muted">{tr('บันทึกการฝึกสัก 2–3 ครั้ง แล้วกราฟความแข็งแรงจะขึ้นที่นี่', 'Log 2–3 workouts and your strength chart appears here')}</p></Card>

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
            className={cx('shrink-0 rounded-full px-3 py-1.5 text-sm font-semibold ring-1', n === name ? 'bg-accent-fill text-white ring-accent' : 'bg-card text-muted ring-line')}>
            {n}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-2">
        <Stat label={bodyweight ? tr('ครั้งสูงสุด', 'Max reps') : tr('ประมาณ 1RM', 'Est. 1RM')} value={bodyweight ? best.value : best.value.toFixed(1)} sub={bodyweight ? tr('ครั้ง/เซ็ต', 'reps/set') : tr('กก.', 'kg')} accent />
        <Stat label={tr('เซ็ตที่ดีที่สุด', 'Best set')} value={best.kg ? `${best.kg}×${best.reps}` : `${best.reps}`} sub={best.date} />
        <Stat label={tr('ดีขึ้น', 'Change')} value={`${change > 0 ? '+' : ''}${change}%`} sub={tr(`จาก ${hist.length} ครั้ง`, `over ${hist.length} sessions`)} />
      </div>
      <Card title={<span className="flex items-center gap-2"><Trophy size={18} className="text-warn" /> {name}</span>}>
        {hist.length > 1
          ? <TrendChart unit={bodyweight ? tr('ครั้ง', 'reps') : tr('กก. (1RM โดยประมาณ)', 'kg (est. 1RM)')} points={hist.map(p => ({ label: shortDate(p.date), value: p.value }))} />
          : <p className="py-4 text-center text-sm text-muted">{tr('ต้องมีอย่างน้อย 2 ครั้งถึงจะเห็นเส้นกราฟ', 'Needs at least 2 sessions to draw a line')}</p>}
        <p className="mt-2 text-xs text-muted">{bodyweight ? tr('ท่าบอดี้เวทใช้จำนวนครั้งสูงสุดต่อเซ็ต', 'Bodyweight moves use max reps per set') : tr('1RM ประมาณจากเซ็ตที่ดีที่สุดของวัน (สูตร Epley) ไว้ดูแนวโน้ม ไม่ต้องลองยกจริง', '1RM estimated from the day’s best set (Epley) for trends — no need to test a real max')}</p>
      </Card>
    </>
  )
}

function Fitness() {
  const tr = useT()
  const [sessions] = useSessions()
  const [cross] = useCross()
  const [runs] = useRuns()
  const days = trainingLoad(runs, [...sessions, ...cross.map(crossAsSession)], today())
  if (days.length < 7)
    return <Card><p className="py-6 text-center text-sm text-muted">{tr('บันทึกการฝึกครบ 1 สัปดาห์ กราฟจะขึ้นที่นี่', 'Log a full week and the chart appears here')}</p></Card>
  const cur = days.at(-1)!
  const f = formLabel(cur.form, cur.fitness, cur.day)
  const tones = { good: 'bg-good/15 text-good', run: 'bg-run/15 text-run', warn: 'bg-warn/15 text-warn', bad: 'bg-bad/15 text-bad', muted: 'bg-raised text-muted' }
  const week = days.slice(-7).reduce((s, d) => s + d.load, 0)
  const prev = days.slice(-14, -7).reduce((s, d) => s + d.load, 0)
  return (
    <>
      <div className={cx('rounded-2xl px-3.5 py-3', tones[f.tone])}>
        <div className="text-sm font-bold">{tr('ฟอร์มตอนนี้:', 'Form now:')} {tr(f.label, f.labelEn)}</div>
        <div className="text-xs opacity-90">{tr(f.text, f.textEn)}</div>
      </div>
      <Card title={tr('ความฟิต · ความล้า · ฟอร์ม (12 สัปดาห์)', 'Fitness · fatigue · form (12 weeks)')}>
        <FitnessChart days={days} />
      </Card>
      <div className="grid grid-cols-2 gap-2">
        <Stat label={tr('ภาระ 7 วันล่าสุด', 'Load, last 7 days')} value={Math.round(week)} sub={tr('หน่วย (RPE × นาที)', 'units (RPE × min)')} />
        <Stat label={tr('เทียบสัปดาห์ก่อน', 'vs last week')} value={prev ? `${week >= prev ? '+' : ''}${Math.round((week / prev - 1) * 100)}%` : '-'} sub={tr('ภาระรวม', 'total load')} />
      </div>
      <Card title={tr('อ่านกราฟยังไง', 'How to read it')}>
        <ul className="list-disc space-y-1 pl-5 text-xs text-muted">
          <li><b className="text-ink">{tr('ภาระ', 'Load')}</b> {tr('ของแต่ละครั้ง = ความเหนื่อยที่ให้คะแนนหลังจบ (1–10) × นาที (session-RPE, Foster 2001) ถ้าไม่ได้ให้คะแนน แอปจะประมาณจากชนิดการฝึก', 'per session = effort rated afterwards (1–10) × minutes (session-RPE, Foster 2001); without a rating the app estimates from the session type')}</li>
          <li><b className="text-ink">{tr('ฟิต', 'Fitness')}</b> {tr('= ภาระเฉลี่ยระยะยาว (~6 สัปดาห์) ค่อย ๆ ขึ้นเมื่อฝึกสม่ำเสมอ', '= long-term average load (~6 weeks), rises slowly with consistent training')} · <b className="text-ink">{tr('ล้า', 'Fatigue')}</b> {tr('= ภาระเฉลี่ย ~1 สัปดาห์ ขึ้นลงเร็ว', '= ~1-week average load, moves quickly')}</li>
          <li><b className="text-ink">{tr('ฟอร์ม', 'Form')}</b> {tr('= ฟิต − ล้า: ติดลบตอนกำลังเพิ่มการฝึกเป็นเรื่องปกติ ก่อนแข่งควรกลับมาเป็นบวกจากการ taper', '= fitness − fatigue: negative while building is normal; the taper should make it positive before a race')}</li>
          <li>{tr('เป็นโมเดลดูแนวโน้ม (แนวคิดของ Banister) ไม่ใช่ตัวทำนายการบาดเจ็บ — งานวิจัยยังไม่สนับสนุนการใช้อัตราส่วนภาระเพื่อทำนายการบาดเจ็บ', 'A trend model (Banister’s idea), not an injury predictor — research doesn’t support load ratios for predicting injury')}</li>
        </ul>
      </Card>
    </>
  )
}

// แก้น้ำหนัก/จำนวนครั้งที่กรอกผิด หรือวันที่
function EditSession({ session, onSave, onCancel }: { session: Session; onSave: (patch: Partial<Session>) => void; onCancel: () => void }) {
  const tr = useT()
  const [date, setDate] = useState(session.date)
  const [entries, setEntries] = useState(session.entries.map(e => ({ ...e, sets: e.sets.map(x => ({ kg: String(x.kg), reps: String(x.reps) })) })))
  const setField = (ei: number, si: number, k: 'kg' | 'reps', v: string) =>
    setEntries(prev => prev.map((e, i) => (i !== ei ? e : { ...e, sets: e.sets.map((x, j) => (j === si ? { ...x, [k]: v } : x)) })))
  return (
    <div className="mt-3 space-y-3 rounded-2xl bg-raised p-3">
      <DateInput label={tr('วันที่', 'Date')} value={date} onChange={setDate} />
      {entries.map((e, ei) => (
        <div key={e.name}>
          <div className="mb-1 text-sm font-semibold">{e.name}</div>
          <div className="space-y-1.5">
            {e.sets.map((x, si) => (
              <div key={si} className="grid grid-cols-[1.5rem_1fr_1fr] items-center gap-2">
                <span className="text-center text-xs text-muted">{si + 1}</span>
                <NumberInput unit={tr('กก.', 'kg')} step={2.5} value={x.kg} onChange={v => setField(ei, si, 'kg', v)} />
                <NumberInput unit={tr('ครั้ง', 'reps')} value={x.reps} onChange={v => setField(ei, si, 'reps', v)} />
              </div>
            ))}
          </div>
        </div>
      ))}
      <div className="flex gap-2">
        <Button className="flex-1" onClick={() => onSave({ date, entries: entries.map(e => ({ name: e.name, sets: e.sets.map(x => ({ kg: parseFloat(x.kg) || 0, reps: parseInt(x.reps, 10) || 0 })) })) })}>{tr('บันทึกการแก้ไข', 'Save changes')}</Button>
        <Button variant="soft" onClick={onCancel}>{tr('ยกเลิก', 'Cancel')}</Button>
      </div>
    </div>
  )
}
