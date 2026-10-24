import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { createPortal } from 'react-dom'

import { cx } from '../lib/cx'

export function Card({ children, className, title, action }: { children: ReactNode; className?: string; title?: ReactNode; action?: ReactNode }) {
  return (
    <section className={cx('rounded-3xl bg-card p-4 shadow-sm ring-1 ring-line', className)}>
      {(title || action) && (
        <div className="mb-3 flex items-center justify-between gap-2">
          {title && <h2 className="text-base font-bold">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  )
}

const variants = {
  primary: 'bg-accent text-white shadow-sm active:scale-[.98]',
  success: 'bg-good text-white active:scale-[.98]',
  run: 'bg-run text-white active:scale-[.98]',
  soft: 'bg-raised text-ink ring-1 ring-line',
  ghost: 'text-run',
  danger: 'text-bad',
}

export function Button({ variant = 'primary', size = 'md', className, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: keyof typeof variants; size?: 'sm' | 'md' | 'lg' }) {
  return (
    <button
      {...rest}
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-full font-semibold transition disabled:opacity-50',
        size === 'sm' && 'px-3 py-1.5 text-sm',
        size === 'md' && 'px-4 py-2.5',
        size === 'lg' && 'px-6 py-4 text-lg',
        variants[variant],
        className,
      )}
    />
  )
}

export function Stat({ label, value, sub, accent }: { label: string; value: ReactNode; sub?: ReactNode; accent?: boolean }) {
  return (
    <div className="rounded-2xl bg-raised p-3">
      <div className="text-xs text-muted">{label}</div>
      <div className={cx('text-xl font-bold tabular-nums', accent && 'text-accent')}>{value}</div>
      {sub && <div className="text-xs text-muted">{sub}</div>}
    </div>
  )
}

export function Badge({ children, tone = 'accent' }: { children: ReactNode; tone?: 'accent' | 'run' | 'good' | 'muted' }) {
  const tones = {
    accent: 'bg-accent-soft text-accent',
    run: 'bg-run/15 text-run',
    good: 'bg-good/15 text-good',
    muted: 'bg-raised text-muted ring-1 ring-line',
  }
  return <span className={cx('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold', tones[tone])}>{children}</span>
}

export function Segmented<T extends string>({ value, options, onChange }: { value: T; options: { value: T; label: ReactNode }[]; onChange: (v: T) => void }) {
  return (
    <div className="flex rounded-full bg-raised p-1 ring-1 ring-line">
      {options.map(o => (
        <button key={o.value} onClick={() => onChange(o.value)}
          className={cx('flex flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-2 text-sm font-semibold transition',
            value === o.value ? 'bg-card text-accent shadow-sm' : 'text-muted')}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Meter({ value, max, tone = 'accent' }: { value: number; max: number; tone?: 'accent' | 'good' | 'run' }) {
  const bg = { accent: 'bg-accent', good: 'bg-good', run: 'bg-run' }[tone]
  return (
    <div className="h-2 overflow-hidden rounded-full bg-body">
      <div className={cx('h-full rounded-full transition-all', bg)} style={{ width: `${Math.min(100, (value / max) * 100)}%` }} />
    </div>
  )
}

// พับ/กางแบบนุ่ม ๆ ด้วย grid-rows (ไม่ต้องรู้ความสูงล่วงหน้า)
export function Collapse({ open, children }: { open: boolean; children: ReactNode }) {
  return (
    <div className={cx('grid transition-[grid-template-rows,opacity] duration-300 ease-out', open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0')} aria-hidden={!open}>
      <div className="min-h-0 overflow-hidden">{children}</div>
    </div>
  )
}

// แผ่นเลื่อนขึ้นจากด้านล่าง (มือถือ) / กล่องกลางจอ (จอใหญ่)
// หน้าเต็มจอ/ป๊อปอัปต้องอยู่นอก <main> ที่มีแอนิเมชัน ไม่อย่างนั้นจะถูกหัวแอปกับเมนูล่างทับ
export const Portal = ({ children }: { children: ReactNode }) => createPortal(children, document.body)

export function Sheet({ onClose, children, title }: { onClose: () => void; children: ReactNode; title?: ReactNode }) {
  return (
    <Portal>
    <div className="fixed inset-0 z-50 flex animate-fade-in items-end justify-center bg-black/50 sm:items-center" onClick={onClose}>
      <div className="max-h-[92dvh] w-full max-w-lg animate-sheet-up overflow-y-auto rounded-t-3xl bg-card p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] sm:animate-fade-up sm:rounded-3xl"
        onClick={e => e.stopPropagation()}>
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-line sm:hidden" />
        {title && <div className="mb-3 text-lg font-bold">{title}</div>}
        {children}
      </div>
    </div>
    </Portal>
  )
}
