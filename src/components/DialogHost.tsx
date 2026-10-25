import { useSyncExternalStore } from 'react'
import { CircleCheck, CircleAlert, Info } from 'lucide-react'
import { answer, getAsk, getToasts, subscribeDialogs } from '../lib/dialog'
import { cx } from '../lib/cx'
import { Button, Portal } from './ui'

/** แสดงกล่องยืนยันและ toast ของทั้งแอป — วางไว้ครั้งเดียวที่ราก */
export function DialogHost() {
  const pending = useSyncExternalStore(subscribeDialogs, getAsk)
  const toasts = useSyncExternalStore(subscribeDialogs, getToasts)
  return (
    <Portal>
      {pending && (
        <div className="fixed inset-0 z-[80] flex animate-fade-in items-center justify-center bg-black/50 p-6" onClick={() => answer(false)}>
          <div role="alertdialog" aria-modal className="w-full max-w-sm animate-pop rounded-3xl bg-card p-5 shadow-xl" onClick={e => e.stopPropagation()}>
            {pending.opts.title && <div className="mb-1 text-lg font-bold">{pending.opts.title}</div>}
            <p className="text-sm text-ink/80">{pending.message}</p>
            <div className="mt-5 flex gap-2">
              <Button variant="soft" className="flex-1" onClick={() => answer(false)}>{pending.opts.cancel ?? 'ยกเลิก'}</Button>
              <Button variant={pending.opts.danger ? 'primary' : 'run'} className={cx('flex-1', pending.opts.danger && 'bg-bad')} onClick={() => answer(true)}>
                {pending.opts.ok ?? 'ตกลง'}
              </Button>
            </div>
          </div>
        </div>
      )}
      <div className="pointer-events-none fixed inset-x-0 top-[calc(var(--sat)+0.75rem)] z-[90] mx-auto flex max-w-lg flex-col items-center gap-2 px-4">
        {toasts.map(t => {
          const Icon = t.tone === 'good' ? CircleCheck : t.tone === 'bad' ? CircleAlert : Info
          return (
            <div key={t.id} role="status" className={cx('flex animate-fade-up items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold shadow-lg ring-1',
              t.tone === 'good' ? 'bg-card text-good ring-good/30' : t.tone === 'bad' ? 'bg-card text-bad ring-bad/30' : 'bg-card text-ink ring-line')}>
              <Icon size={18} className="shrink-0" /> {t.message}
            </div>
          )
        })}
      </div>
    </Portal>
  )
}
