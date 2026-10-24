import type { ReactNode } from 'react'
import { CalendarDays, ChevronDown, Minus, Plus } from 'lucide-react'
import { cx } from '../lib/cx'

// ช่องกรอกทั้งแอปใช้ชุดนี้ — กรอบเดียวกัน, เรืองแสงตอนโฟกัส, มีหน่วยกำกับ
const shell = 'flex items-center rounded-2xl bg-raised ring-1 ring-line transition focus-within:bg-card focus-within:ring-2 focus-within:ring-accent'
const bare = 'bare h-12 w-full min-w-0 flex-1 border-0 bg-transparent px-3.5 text-base text-ink outline-none placeholder:text-muted/70'

function Label({ label, hint, children, className }: { label?: string; hint?: string; children: ReactNode; className?: string }) {
  return (
    <label className={cx('flex min-w-0 flex-col gap-1.5', className)}>
      {label && <span className="text-sm font-medium text-muted">{label}</span>}
      {children}
      {hint && <span className="text-xs text-muted">{hint}</span>}
    </label>
  )
}

type Base = { label?: string; hint?: string; className?: string }

export function TextInput({ label, hint, className, value, onChange, placeholder, type = 'text', autoComplete, icon, required, minLength }: Base & {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: 'text' | 'email' | 'password'; autoComplete?: string; icon?: ReactNode
  required?: boolean; minLength?: number
}) {
  return (
    <Label label={label} hint={hint} className={className}>
      <span className={shell}>
        {icon && <span className="pl-3.5 text-muted">{icon}</span>}
        <input className={cx(bare, !!icon && 'pl-2.5')} type={type} value={value} placeholder={placeholder} autoComplete={autoComplete}
          required={required} minLength={minLength} onChange={e => onChange(e.target.value)} />
      </span>
    </Label>
  )
}

export function NumberInput({ label, hint, className, value, onChange, unit, step = 1, min = 0, stepper = false, placeholder }: Base & {
  value: string | number; onChange: (v: string) => void; unit?: string; step?: number; min?: number; stepper?: boolean; placeholder?: string
}) {
  const bump = (d: number) => {
    const n = Math.max(min, (parseFloat(String(value)) || 0) + d)
    onChange(String(Math.round(n * 100) / 100))
  }
  const btn = 'grid size-12 shrink-0 place-items-center text-muted transition hover:text-ink'
  return (
    <Label label={label} hint={hint} className={className}>
      <span className={shell}>
        {stepper && <button type="button" aria-label="ลด" className={btn} onClick={() => bump(-step)}><Minus size={16} /></button>}
        <input className={cx(bare, 'tabular-nums', stepper && 'px-0 text-center font-semibold')} type="number" inputMode="decimal" step={step} min={min}
          value={value} placeholder={placeholder} onChange={e => onChange(e.target.value)} />
        {unit && <span className={cx('shrink-0 text-sm text-muted', stepper ? 'pr-1' : 'pr-3.5')}>{unit}</span>}
        {stepper && <button type="button" aria-label="เพิ่ม" className={btn} onClick={() => bump(step)}><Plus size={16} /></button>}
      </span>
    </Label>
  )
}

export function SelectInput<T extends string | number>({ label, hint, className, value, onChange, options }: Base & {
  value: T; onChange: (v: T) => void; options: { value: T; label: string }[]
}) {
  return (
    <Label label={label} hint={hint} className={className}>
      <span className={cx(shell, 'relative')}>
        <select className={cx(bare, 'cursor-pointer appearance-none pr-10')} value={value}
          onChange={e => onChange((typeof value === 'number' ? +e.target.value : e.target.value) as T)}>
          {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <ChevronDown size={18} className="pointer-events-none absolute right-3.5 text-muted" />
      </span>
    </Label>
  )
}

export function DateInput({ label, hint, className, value, onChange }: Base & { value: string; onChange: (v: string) => void }) {
  return (
    <Label label={label} hint={hint} className={className}>
      <span className={shell}>
        <CalendarDays size={18} className="ml-3.5 shrink-0 text-muted" />
        <input className={cx(bare, 'pl-2.5')} type="date" value={value} onChange={e => onChange(e.target.value)} />
      </span>
    </Label>
  )
}
