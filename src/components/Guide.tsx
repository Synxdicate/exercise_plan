import { SkipForward, Volume2 } from 'lucide-react'
import { stepLabel, type GuideRunner, type Paces, type Step, type StepKind } from '../lib/guide'
import { formatDuration, formatPace } from '../lib/log'
import { cx } from '../lib/cx'

const tone: Record<StepKind, string> = { warm: 'bg-muted', easy: 'bg-muted', work: 'bg-run', recover: 'bg-good', cool: 'bg-muted' }

const amount = (s: Step) => (s.sec ? formatDuration(s.sec) : s.m! >= 1000 ? `${+(s.m! / 1000).toFixed(1)} กม.` : `${s.m} ม.`)
const left = (v: number, unit: 'sec' | 'm') => (unit === 'sec' ? formatDuration(Math.ceil(v)) : v >= 1000 ? `${(v / 1000).toFixed(2)} กม.` : `${Math.ceil(v)} ม.`)

function targetPace(s: Step, p?: Paces) {
  if (!p || s.kind !== 'work') return null
  if (s.pace === 'stride') return 'เร่งลื่น ๆ ไม่สุดแรง'
  const v = s.pace && s.pace !== 'easy' ? p[s.pace] : null
  return v ? `เป้า ${formatPace(v, 1)} /กม.` : null
}

/** การ์ดชุดซ้อมระหว่างวิ่ง: ขั้นตอนนี้ เหลืออีกเท่าไร ขั้นถัดไป */
export function GuideCard({ steps, runner, meters, paces, on, setOn, onSkip }: {
  steps: Step[]; runner: GuideRunner | null; meters: number; paces?: Paces
  on: boolean; setOn: (v: boolean) => void; onSkip: () => void
}) {
  const toggle = (
    <label className="flex items-center gap-2 text-xs text-muted">
      <input type="checkbox" className="size-4 accent-accent" checked={on} onChange={e => setOn(e.target.checked)} /> เสียงนำชุดซ้อม
    </label>
  )
  if (!on || !runner) return <div className="flex justify-center">{toggle}</div>

  const idx = runner.state.index
  const bar = (
    <div className="flex gap-0.5">
      {steps.map((s, i) => (
        <span key={i} style={{ flexGrow: s.sec ? s.sec / 60 : (s.m ?? 0) / 300 }}
          className={cx('h-1.5 min-w-1 rounded-full', tone[s.kind], i < idx || runner.state.done ? 'opacity-100' : i === idx ? 'opacity-70' : 'opacity-25')} />
      ))}
    </div>
  )

  if (!runner.state.started) {
    return (
      <div className="rounded-2xl bg-card p-3 ring-1 ring-line">
        <div className="mb-2 flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-sm font-semibold"><Volume2 size={15} className="text-run" /> ชุดซ้อมวันนี้</span>
          {toggle}
        </div>
        {bar}
        <p className="mt-2 text-xs text-muted">{compact(steps)} — เริ่มจับเวลาแล้วแอปจะบอกทุกขั้น</p>
      </div>
    )
  }

  const pr = runner.progress(meters)
  const next = steps[idx + 1]
  const tp = targetPace(pr.step, paces)
  return (
    <div className={cx('rounded-2xl p-3 ring-1', pr.step.kind === 'work' ? 'bg-run/10 ring-run/30' : 'bg-card ring-line')}>
      {runner.state.done ? (
        <div className="text-center text-sm font-semibold text-good">จบชุดซ้อมแล้ว — วิ่งเบา ๆ ต่อ หรือกดพักแล้วจบได้เลย</div>
      ) : (
        <>
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className={cx('text-sm font-bold', pr.step.kind === 'work' ? 'text-run' : '')}>
                {stepLabel(pr.step)} {pr.step.kind === 'work' && <span className="font-normal text-muted">{workNo(steps, idx)}</span>}
              </div>
              <div className="text-3xl font-extrabold tabular-nums leading-tight">{left(pr.left, pr.unit)}</div>
              {tp && <div className="text-xs font-semibold text-run">{tp}</div>}
            </div>
            <button onClick={onSkip} className="flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold text-muted ring-1 ring-line">
              <SkipForward size={14} /> ข้าม
            </button>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-body">
            <div className={cx('h-full rounded-full transition-[width] duration-700', tone[pr.step.kind])} style={{ width: `${pr.pct * 100}%` }} />
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-muted">
            <span>{next ? `ต่อไป: ${stepLabel(next)} ${amount(next)}` : 'ขั้นสุดท้าย'}</span>
            <span>{idx + 1}/{steps.length}</span>
          </div>
        </>
      )}
      <div className="mt-2">{bar}</div>
    </div>
  )
}

const workNo = (steps: Step[], idx: number) => {
  const total = steps.filter(s => s.kind === 'work').length
  const n = steps.slice(0, idx + 1).filter(s => s.kind === 'work').length
  return total > 1 ? `${n}/${total}` : ''
}

// "วอร์มอัพ 2 กม. · ช่วงเร็ว 800 ม. ×5 · คูลดาวน์ 5:00"
function compact(steps: Step[]) {
  const works = steps.filter(s => s.kind === 'work')
  const parts = steps.filter(s => s.kind !== 'work' && s.kind !== 'recover').map(s => `${stepLabel(s)} ${amount(s)}`)
  if (works.length) parts.splice(steps[0].kind === 'work' ? 0 : 1, 0, `${stepLabel(works[0])} ${amount(works[0])}${works.length > 1 ? ` ×${works.length}` : ''}`)
  return parts.join(' · ')
}
