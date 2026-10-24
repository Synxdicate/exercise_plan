import { useState } from 'react'
import { ChevronDown, Dumbbell, Scale, Trash2 } from 'lucide-react'
import { usePersisted } from '../lib/storage'
import { shortDate, today, weekStart } from '../lib/date'
import { useSessions } from '../lib/log'
import { Badge, Button, Card, Field, Segmented, Stat } from './ui'
import { cx } from '../lib/cx'

type Entry = { date: string; weight: number; waist?: number }

export function Progress() {
  const [view, setView] = useState<'workouts' | 'body'>('workouts')
  return (
    <>
      <Segmented value={view} onChange={setView} options={[
        { value: 'workouts', label: <><Dumbbell size={16} /> การฝึก</> },
        { value: 'body', label: <><Scale size={16} /> น้ำหนักตัว</> },
      ]} />
      {view === 'workouts' ? <WorkoutHistory /> : <BodyLog />}
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
          <Field label="วันที่" className="col-span-2"><input type="date" value={date} onChange={e => setDate(e.target.value)} /></Field>
          <Field label="น้ำหนัก (กก.)"><input type="number" inputMode="decimal" step="0.1" value={weight} onChange={e => setWeight(e.target.value)} /></Field>
          <Field label="รอบเอว (ซม.)"><input type="number" inputMode="decimal" step="0.5" value={waist} onChange={e => setWaist(e.target.value)} /></Field>
          <Button className="col-span-2" onClick={add}>บันทึก</Button>
        </div>
        <p className="mt-2 text-xs text-muted">ชั่งตอนเช้าหลังเข้าห้องน้ำ วัดรอบเอวระดับสะดือ — recomp อาจทำให้น้ำหนักนิ่งแต่เอวลด</p>
      </Card>

      {weeks.length > 1 && (
        <Card title="น้ำหนักเฉลี่ยรายสัปดาห์">
          <TrendChart points={weeks.map(w => ({ label: shortDate(w.start), value: w.avg }))} />
          <p className="mt-2 text-xs text-muted">เป้า recomp: ลด ~0.1–0.3 กก./สัปดาห์ หรือคงที่แต่รอบเอวลดและแรงเพิ่ม</p>
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

function TrendChart({ points }: { points: { label: string; value: number }[] }) {
  const [hover, setHover] = useState<number | null>(null)
  const W = 320, H = 120, padX = 12, padY = 14
  const vals = points.map(p => p.value)
  const min = Math.min(...vals) - 0.5, max = Math.max(...vals) + 0.5
  const x = (i: number) => padX + (i / (points.length - 1)) * (W - padX * 2)
  const y = (v: number) => H - padY - ((v - min) / (max - min)) * (H - padY * 2)
  const d = points.map((p, i) => `${i ? 'L' : 'M'}${x(i)} ${y(p.value)}`).join(' ')
  return (
    <div>
      <div className="mb-1 h-5 text-right text-sm tabular-nums">{hover !== null ? `${points[hover].label}: ${points[hover].value.toFixed(1)} กก.` : ''}</div>
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

  if (sessions.length === 0)
    return <Card><p className="py-6 text-center text-sm text-muted">ยังไม่มีบันทึก — ไปที่แท็บ "ฝึก" แล้วกด "บันทึกการฝึก" ในวันเวท</p></Card>

  return (
    <div className="space-y-3">
      {[...sessions].reverse().map(s => {
        const totalSets = s.entries.reduce((n, e) => n + e.sets.length, 0)
        const volume = s.entries.reduce((n, e) => n + e.sets.reduce((v, x) => v + x.kg * x.reps, 0), 0)
        const isOpen = open === s.id
        return (
          <Card key={s.id}>
            <button className="flex w-full items-center gap-3 text-left" onClick={() => setOpen(isOpen ? null : s.id)}>
              <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-accent-soft text-accent"><Dumbbell size={22} /></div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2"><b className="truncate">{s.title}</b><Badge tone="muted">{s.mode === 'gym' ? 'ยิม' : 'สวน'}</Badge></div>
                <div className="text-xs text-muted">{s.date} · {totalSets} เซ็ต{volume ? ` · ${Math.round(volume).toLocaleString()} กก.` : ''}</div>
              </div>
              <ChevronDown size={18} className={cx('shrink-0 text-muted transition', isOpen && 'rotate-180')} />
            </button>
            {isOpen && (
              <>
                <ul className="mt-3 space-y-1.5 rounded-2xl bg-raised p-3 text-sm">
                  {s.entries.map(e => (
                    <li key={e.name} className="flex justify-between gap-2">
                      <span>{e.name}</span>
                      <span className="text-right tabular-nums text-muted">{e.sets.map(x => (x.kg ? `${x.kg}×${x.reps}` : `${x.reps}`)).join(' · ')}</span>
                    </li>
                  ))}
                </ul>
                <Button variant="danger" size="sm" className="mt-2" onClick={() => confirm('ลบบันทึกนี้?') && setSessions(prev => prev.filter(x => x.id !== s.id))}>
                  <Trash2 size={14} /> ลบ
                </Button>
              </>
            )}
          </Card>
        )
      })}
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
