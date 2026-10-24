import { lazy, Suspense, useState } from 'react'
import { Check, ChevronRight, Footprints, Pause, Play, Plus, Satellite, Trash2, X } from 'lucide-react'
import { GOOD_ACCURACY_M, useRunTracker, type Point } from '../lib/gps'
import { formatDuration, formatPace, runKinds, uid, useRuns, weeklyKmTarget, type Run } from '../lib/log'
import { addDays, shortDate, today, weekStart } from '../lib/date'
import { usePersisted } from '../lib/storage'
import { Badge, Button, Card, Field, Stat } from './ui'
import { cx } from '../lib/cx'

const RunMap = lazy(() => import('./RunMap'))

function Map(props: { route: Point[]; position?: Point | null; follow?: boolean; className?: string; interactive?: boolean }) {
  return (
    <Suspense fallback={<div className={cx('w-full animate-pulse rounded-2xl bg-raised', props.className ?? 'h-64')} />}>
      <RunMap {...props} />
    </Suspense>
  )
}

export function Runs() {
  const [runs, setRuns] = useRuns()
  const [week] = usePersisted('week', 1)
  const [kind, setKind] = usePersisted<Run['kind']>('runKind', 'easy')
  const [detail, setDetail] = useState<string | null>(null)
  const [manual, setManual] = useState(false)
  const t = useRunTracker()

  const save = (r: Run) => setRuns(prev => [...prev, r].sort((a, b) => a.date.localeCompare(b.date)))

  const finish = () => {
    const r = t.finish()
    if (r.km < 0.05) return
    const run: Run = { id: uid(), date: today(), kind, source: 'gps', ...r }
    save(run)
    setDetail(run.id)
  }

  if (t.status !== 'idle') return <ActiveRun t={t} kind={kind} onFinish={finish} />

  const thisWeek = weekStart(today())
  const kmThisWeek = runs.filter(r => weekStart(r.date) === thisWeek).reduce((s, r) => s + r.km, 0)
  const target = weeklyKmTarget(week)
  const best = runs.filter(r => r.km >= 1).reduce<Run | null>((b, r) => (!b || r.seconds / r.km < b.seconds / b.km ? r : b), null)
  const longest = runs.reduce((m, r) => Math.max(m, r.km), 0)
  const open = runs.find(r => r.id === detail)

  return (
    <div className="space-y-4">
      <section className="space-y-4 rounded-3xl bg-gradient-to-br from-run to-accent p-5 text-white shadow-sm">
        <div>
          <div className="text-sm opacity-80">สัปดาห์นี้</div>
          <div className="text-5xl font-extrabold tabular-nums">{kmThisWeek.toFixed(1)}<span className="ml-1 text-xl font-semibold opacity-80">/ {target} กม.</span></div>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-white/25">
          <div className="h-full rounded-full bg-white" style={{ width: `${Math.min(100, (kmThisWeek / target) * 100)}%` }} />
        </div>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(runKinds) as Run['kind'][]).map(k => (
            <button key={k} onClick={() => setKind(k)}
              className={cx('rounded-full px-3 py-1 text-sm font-semibold', kind === k ? 'bg-white text-accent' : 'bg-white/15')}>
              {runKinds[k]}
            </button>
          ))}
        </div>
        <button onClick={t.acquire} className="flex w-full items-center justify-center gap-2 rounded-full bg-white py-4 text-lg font-bold text-accent shadow-lg active:scale-[.98]">
          <Play size={22} fill="currentColor" /> เริ่มวิ่ง
        </button>
        {t.error && <p className="rounded-xl bg-black/20 p-2 text-sm">{t.error}</p>}
      </section>

      <div className="grid grid-cols-3 gap-2">
        <Stat label="รวมทั้งหมด" value={runs.reduce((s, r) => s + r.km, 0).toFixed(1)} sub={`กม. · ${runs.length} ครั้ง`} />
        <Stat label="เพซดีสุด" value={best ? formatPace(best.seconds, best.km) : '--:--'} sub="นาที/กม." />
        <Stat label="ไกลสุด" value={longest.toFixed(1)} sub="กม." />
      </div>

      <Card title="8 สัปดาห์ล่าสุด">
        <WeeklyBars runs={runs} target={target} />
      </Card>

      <Card title="ประวัติการวิ่ง" action={<Button variant="soft" size="sm" onClick={() => setManual(!manual)}><Plus size={14} /> กรอกเอง</Button>}>
        {manual && <ManualEntry onSave={r => { save(r); setManual(false) }} />}
        {runs.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted">ยังไม่มีการวิ่ง — กด "เริ่มวิ่ง" ด้านบน</p>
        ) : (
          <ul className="divide-y divide-line">
            {[...runs].reverse().map(r => (
              <li key={r.id}>
                <button onClick={() => setDetail(r.id)} className="flex w-full items-center gap-3 py-3 text-left">
                  <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-run/15 text-run"><Footprints size={22} /></div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2"><b className="tabular-nums">{r.km.toFixed(2)} กม.</b><Badge tone="run">{runKinds[r.kind]}</Badge></div>
                    <div className="text-xs text-muted">{r.date} · {formatDuration(r.seconds)} · {formatPace(r.seconds, r.km)} /กม.</div>
                  </div>
                  <ChevronRight size={18} className="text-muted" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <p className="px-2 text-xs text-muted">
        เว็บอ่าน GPS ได้เฉพาะตอนเปิดหน้านี้ค้างไว้ (แอปกันจอดับให้แล้ว) ถ้าปิดจอหรือสลับแอป การวิ่งจะถูกพักไว้และกลับมาวิ่งต่อได้
        ถ้าต้องการบันทึกเบื้องหลังแบบ Strava/นาฬิกา ให้บันทึกที่นั่นแล้วกด "กรอกเอง"
      </p>

      {open && <RunDetail run={open} onClose={() => setDetail(null)} onDelete={() => { setRuns(prev => prev.filter(x => x.id !== open.id)); setDetail(null) }} />}
    </div>
  )
}

function ActiveRun({ t, kind, onFinish }: { t: ReturnType<typeof useRunTracker>; kind: Run['kind']; onFinish: () => void }) {
  const km = t.meters / 1000
  const weak = t.accuracy === null || t.accuracy > GOOD_ACCURACY_M
  const banner =
    t.status === 'acquiring' ? (weak ? 'กำลังหาสัญญาณ GPS… ออกไปที่โล่ง' : 'GPS พร้อมแล้ว') :
    t.status === 'autopaused' ? 'หยุดอัตโนมัติ — เริ่มวิ่งต่อแล้วจะนับเวลาเอง' :
    t.status === 'paused' ? 'พักอยู่' : null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-bg">
      <div className="mx-auto flex min-h-full max-w-lg flex-col gap-4 p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
        <div className="flex items-center justify-between">
          <Badge tone="run">{runKinds[kind]}</Badge>
          <span className={cx('inline-flex items-center gap-1 text-xs font-semibold', weak ? 'text-warn' : 'text-good')}>
            <Satellite size={14} /> GPS {t.accuracy !== null ? `±${Math.round(t.accuracy)} ม.` : '…'}
          </span>
        </div>

        <Map route={t.route} position={t.position} follow className="h-[38vh]" />

        {banner && <div className={cx('rounded-2xl px-4 py-2 text-center text-sm font-semibold', t.status === 'acquiring' && !weak ? 'bg-good/15 text-good' : 'bg-warn/15 text-warn')}>{banner}</div>}

        <div className="text-center">
          <div className="text-7xl font-extrabold leading-none tabular-nums">{km.toFixed(2)}</div>
          <div className="mt-1 text-sm text-muted">กิโลเมตร</div>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center">
          <Stat label="เวลา" value={formatDuration(t.elapsed)} />
          <Stat label="เพซเฉลี่ย" value={formatPace(t.elapsed, km)} />
          <Stat label="เพซตอนนี้" value={t.currentPace ? formatPace(t.currentPace, 1) : '--:--'} />
        </div>

        {t.splits.length > 0 && <Splits splits={t.splits} />}
        {t.error && <p className="text-center text-sm text-bad">{t.error}</p>}

        <div className="mt-auto flex items-center justify-center gap-4 pt-2">
          {t.status === 'acquiring' && (
            <>
              <Button variant="soft" size="lg" onClick={t.discard}><X size={20} /> ยกเลิก</Button>
              <Button size="lg" onClick={t.begin}><Play size={20} fill="currentColor" /> {weak ? 'เริ่มเลย' : 'เริ่มจับเวลา'}</Button>
            </>
          )}
          {(t.status === 'running' || t.status === 'autopaused') && (
            <button onClick={t.pause} aria-label="พัก" className="grid size-20 place-items-center rounded-full bg-accent text-white shadow-lg active:scale-95">
              <Pause size={32} fill="currentColor" />
            </button>
          )}
          {t.status === 'paused' && (
            <>
              <button onClick={t.resume} aria-label="วิ่งต่อ" className="grid size-20 place-items-center rounded-full bg-accent text-white shadow-lg active:scale-95">
                <Play size={32} fill="currentColor" />
              </button>
              <button onClick={onFinish} aria-label="จบและบันทึก" className="grid size-20 place-items-center rounded-full bg-good text-white shadow-lg active:scale-95">
                <Check size={32} />
              </button>
            </>
          )}
        </div>
        {t.status === 'paused' && (
          <div className="flex items-center justify-between text-sm">
            <label className="flex items-center gap-2 text-muted">
              <input type="checkbox" className="size-4 accent-accent" checked={t.autoPause} onChange={e => t.setAutoPause(e.target.checked)} /> หยุดอัตโนมัติ
            </label>
            <button className="text-bad" onClick={() => confirm('ทิ้งการวิ่งนี้?') && t.discard()}>ทิ้งการวิ่งนี้</button>
          </div>
        )}
      </div>
    </div>
  )
}

function Splits({ splits }: { splits: number[] }) {
  const fastest = Math.min(...splits)
  const slowest = Math.max(...splits)
  return (
    <div className="rounded-2xl bg-raised p-3">
      <div className="mb-2 flex justify-between text-xs text-muted"><span>เพซรายกิโล</span><span>นาที/กม.</span></div>
      <ul className="space-y-1.5">
        {splits.map((s, i) => (
          <li key={i} className="grid grid-cols-[3rem_1fr_3rem] items-center gap-2 text-sm">
            <span className="text-muted">กม. {i + 1}</span>
            <span className="h-2.5 overflow-hidden rounded-full bg-body">
              {/* แท่งยาว = เร็ว */}
              <span className={cx('block h-full rounded-full', s === fastest ? 'bg-good' : 'bg-run')}
                style={{ width: `${slowest === fastest ? 100 : 40 + 60 * ((slowest - s) / (slowest - fastest))}%` }} />
            </span>
            <span className={cx('text-right tabular-nums', s === fastest && 'font-bold text-good')}>{formatPace(s, 1)}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function RunDetail({ run, onClose, onDelete }: { run: Run; onClose: () => void; onDelete: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center" onClick={onClose}>
      <div className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-card p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] sm:rounded-3xl" onClick={e => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <div className="font-bold">{runKinds[run.kind]} · {run.date}</div>
            <div className="text-xs text-muted">{run.source === 'gps' ? 'บันทึกด้วย GPS' : 'กรอกเอง'}</div>
          </div>
          <button onClick={onClose} aria-label="ปิด" className="grid size-9 place-items-center rounded-full bg-raised"><X size={18} /></button>
        </div>
        {run.route && run.route.length > 1 && <Map route={run.route} className="mb-3 h-56" />}
        <div className="mb-3 grid grid-cols-3 gap-2 text-center">
          <Stat label="ระยะ" value={run.km.toFixed(2)} sub="กม." accent />
          <Stat label="เวลาเคลื่อนที่" value={formatDuration(run.seconds)} sub={run.elapsedSeconds ? `รวม ${formatDuration(run.elapsedSeconds)}` : undefined} />
          <Stat label="เพซเฉลี่ย" value={formatPace(run.seconds, run.km)} sub="นาที/กม." />
        </div>
        {run.splits && run.splits.length > 0 && <Splits splits={run.splits} />}
        <Button variant="danger" size="sm" className="mt-3" onClick={() => confirm('ลบการวิ่งนี้?') && onDelete()}><Trash2 size={14} /> ลบ</Button>
      </div>
    </div>
  )
}

function ManualEntry({ onSave }: { onSave: (r: Run) => void }) {
  const [date, setDate] = useState(today())
  const [km, setKm] = useState('')
  const [min, setMin] = useState('')
  const [kind, setKind] = useState<Run['kind']>('easy')

  const add = () => {
    const k = parseFloat(km)
    const m = parseFloat(min)
    if (!k || !m) return
    onSave({ id: uid(), date, km: k, seconds: Math.round(m * 60), kind, source: 'manual' })
  }

  return (
    <div className="mb-3 grid grid-cols-2 gap-2 rounded-2xl bg-raised p-3">
      <Field label="วันที่"><input type="date" value={date} onChange={e => setDate(e.target.value)} /></Field>
      <Field label="ประเภท">
        <select value={kind} onChange={e => setKind(e.target.value as Run['kind'])}>
          {Object.entries(runKinds).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </Field>
      <Field label="ระยะ (กม.)"><input type="number" inputMode="decimal" step="0.01" value={km} onChange={e => setKm(e.target.value)} /></Field>
      <Field label="เวลา (นาที)"><input type="number" inputMode="decimal" step="0.5" value={min} onChange={e => setMin(e.target.value)} /></Field>
      <Button className="col-span-2" onClick={add}>บันทึก</Button>
    </div>
  )
}

function WeeklyBars({ runs, target }: { runs: Run[]; target: number }) {
  const [hover, setHover] = useState<number | null>(null)
  const current = weekStart(today())
  const weeks = Array.from({ length: 8 }, (_, i) => addDays(current, (i - 7) * 7))
  const totals = weeks.map(w => runs.filter(r => weekStart(r.date) === w).reduce((s, r) => s + r.km, 0))
  const max = Math.max(target, ...totals) * 1.15
  const W = 320, H = 140, pad = 22, bw = (W - pad) / weeks.length
  const y = (v: number) => H - pad - (v / max) * (H - pad - 8)

  return (
    <div>
      <div className="mb-1 h-5 text-right text-sm tabular-nums">{hover !== null ? `สัปดาห์ ${shortDate(weeks[hover])}: ${totals[hover].toFixed(1)} กม.` : ''}</div>
      <svg viewBox={`0 0 ${W} ${H}`} className="block w-full" role="img" aria-label="กราฟระยะวิ่งรายสัปดาห์">
        <line x1={pad} x2={W} y1={y(target)} y2={y(target)} className="stroke-muted" strokeDasharray="4 4" />
        <text x={W - 2} y={y(target) - 4} textAnchor="end" className="fill-muted text-[9px]">เป้า {target}</text>
        <line x1={pad} x2={W} y1={H - pad} y2={H - pad} className="stroke-line" />
        {weeks.map((w, i) => {
          const x = pad + i * bw + 4
          const h = H - pad - y(totals[i])
          return (
            <g key={w} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} onClick={() => setHover(i)}>
              <rect x={pad + i * bw} y={0} width={bw} height={H - pad} fill="transparent" />
              {h > 0 && <path className={cx('fill-run', hover === i ? 'opacity-100' : 'opacity-80')} d={roundedTop(x, y(totals[i]), bw - 8, h)} />}
              <text x={x + (bw - 8) / 2} y={H - 6} textAnchor="middle" className="fill-muted text-[9px]">{shortDate(w)}</text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

const roundedTop = (x: number, y: number, w: number, h: number) => {
  const r = Math.min(4, h, w / 2)
  return `M${x} ${y + h} V${y + r} Q${x} ${y} ${x + r} ${y} H${x + w - r} Q${x + w} ${y} ${x + w} ${y + r} V${y + h} Z`
}
