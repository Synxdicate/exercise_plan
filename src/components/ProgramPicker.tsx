import { ArrowRight, Check, Sparkles } from 'lucide-react'
import { programLength, programs, type ProgramId } from '../data/programs'
import { isReady, NEEDS, nextStep, PATH, recommended } from '../lib/programFit'
import { useCapacity } from '../lib/useCapacity'
import { useProgram } from '../lib/program'
import { usePersisted } from '../lib/storage'
import { cx } from '../lib/cx'
import { Button } from './ui'

const OTHERS: ProgramId[] = ['physique', 'five', 'base', 'strength']

/** เลือกโปรแกรม: เส้นทางวิ่ง (เริ่มวิ่ง → 10K → ฮาล์ฟ → ฟูล) + โปรแกรมอื่น พร้อมป้ายว่าพร้อมหรือยัง */
export function ProgramPicker({ value, onChange }: { value: ProgramId; onChange: (id: ProgramId) => void }) {
  const c = useCapacity()
  const rec = recommended(c)

  const item = (id: ProgramId, step?: number) => {
    const on = value === id
    const ready = isReady(id, c)
    return (
      <button key={id} onClick={() => onChange(id)} aria-pressed={on}
        className={cx('relative flex w-full items-start gap-3 rounded-2xl p-3 text-left ring-2 transition-colors active:scale-[.99]',
          on ? 'bg-accent-soft/50 ring-accent' : 'bg-raised ring-transparent')}>
        <span className={cx('grid size-7 shrink-0 place-items-center rounded-full text-xs font-bold',
          on ? 'bg-accent text-white' : ready ? 'bg-good/15 text-good' : 'bg-card text-muted ring-1 ring-line')}>
          {on ? <Check size={14} strokeWidth={3} /> : step ?? (ready ? <Check size={14} strokeWidth={3} /> : '·')}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <b>{programs[id].name}</b>
            {id === rec && <span className="flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-[11px] font-bold text-white"><Sparkles size={11} /> แนะนำ</span>}
          </span>
          <span className="block text-xs text-muted">{programLength(id)} · {programs[id].summary}</span>
          {!ready && <span className="mt-1 block text-xs font-semibold text-warn">ยังไม่พร้อม: ต้อง{NEEDS[id]!.text}ได้ก่อน</span>}
        </span>
      </button>
    )
  }

  return (
    <div className="space-y-4">
      <p className="rounded-2xl bg-raised p-3 text-xs text-muted">
        {c.longestKm
          ? <>จากการวิ่ง 60 วันล่าสุด: ไกลสุด <b className="text-ink">{c.longestKm.toFixed(1)} กม.</b> · นานสุด <b className="text-ink">{Math.round(c.longestMin)} นาที</b></>
          : 'ยังไม่มีการวิ่งต่อเนื่องใน 60 วันล่าสุด (เพซเร็วกว่า 10:00/กม.) — เริ่มที่ "เริ่มวิ่ง"'}
      </p>
      <section>
        <div className="mb-2 text-sm font-semibold text-muted">เส้นทางวิ่ง — ทำตามลำดับ</div>
        <div className="space-y-2">{PATH.map((id, i) => item(id, i + 1))}</div>
      </section>
      <section>
        <div className="mb-2 text-sm font-semibold text-muted">โปรแกรมอื่น</div>
        <div className="space-y-2">{OTHERS.map(id => item(id))}</div>
      </section>
    </div>
  )
}

/** การ์ด "พร้อมไปขั้นต่อไปแล้ว" — ขึ้นเมื่อจบโปรแกรมหรือทำถึงเกณฑ์ ปิดได้ */
export function NextStepCard() {
  const p = useProgram()
  const c = useCapacity()
  const [seen, setSeen] = usePersisted('nextStepSeen', '')
  const step = nextStep(p.program, c, p.currentWeek, p.meta.weeks, !!p.ongoing)
  if (!step || seen === `${p.program}>${step.to}`) return null
  return (
    <section className="animate-fade-up rounded-2xl bg-good/10 p-3.5 ring-1 ring-good/30">
      <div className="flex items-center gap-2 font-bold text-good"><Sparkles size={18} /> พร้อมไปขั้นต่อไป: {programs[step.to].name}</div>
      <p className="mt-1 text-sm">{step.why}</p>
      <div className="mt-2 flex gap-2">
        <Button size="sm" variant="success" onClick={() => p.setProgram(step.to)}>เปลี่ยนเลย <ArrowRight size={14} /></Button>
        <Button size="sm" variant="soft" onClick={() => setSeen(`${p.program}>${step.to}`)}>ไว้ก่อน</Button>
      </div>
    </section>
  )
}
