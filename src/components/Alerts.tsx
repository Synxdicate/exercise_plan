import { useState } from 'react'
import { HeartPulse, History } from 'lucide-react'
import { clearance, clearanceText, useScreening } from '../lib/screening'
import { comeback } from '../lib/detraining'
import { useRuns, useSessions } from '../lib/log'
import { useProgram } from '../lib/program'
import { usePersisted } from '../lib/storage'
import { today } from '../lib/date'
import { cx } from '../lib/cx'
import { Button } from './ui'
import { ScreeningSheet } from './Screening'

/** การ์ดเตือนเรื่องสุขภาพ/การกลับมาฝึก — แสดงเฉพาะเมื่อมีเรื่องต้องทำ */
export function Alerts() {
  const [screening] = useScreening()
  const [sessions] = useSessions()
  const [runs] = useRuns()
  const p = useProgram()
  const [dismissed, setDismissed] = usePersisted('comebackDismissed', '')
  const [open, setOpen] = useState(false)

  const dates = [...sessions.map(s => s.date), ...runs.map(r => r.date)]
  const lastActivity = dates.reduce((a, b) => (a > b ? a : b), '')
  const cb = comeback(dates, today())
  const showComeback = cb && dismissed !== lastActivity
  const result = screening ? clearance(screening) : null

  return (
    <>
      {result && result !== 'clear' && (
        <Banner tone="bad" icon={<HeartPulse size={20} />} title={clearanceText[result].title} text={clearanceText[result].text}
          action={<Button size="sm" variant="soft" onClick={() => setOpen(true)}>ตอบใหม่</Button>} />
      )}
      {showComeback && (
        <Banner tone="warn" icon={<History size={20} />} title={`ห่างการฝึกไป ${cb.days} วัน`} text={cb.text}
          action={
            <div className="flex gap-2">
              {cb.weeksBack > 0 && !p.autoWeek && p.currentWeek > 1 && (
                <Button size="sm" onClick={() => { p.setWeek(Math.max(1, p.currentWeek - cb.weeksBack)); setDismissed(lastActivity) }}>
                  ย้อน {Math.min(cb.weeksBack, p.currentWeek - 1)} สัปดาห์
                </Button>
              )}
              <Button size="sm" variant="soft" onClick={() => setDismissed(lastActivity)}>รับทราบ</Button>
            </div>
          } />
      )}
      {open && <ScreeningSheet onClose={() => setOpen(false)} />}
    </>
  )
}

function Banner({ tone, icon, title, text, action }: { tone: 'bad' | 'warn'; icon: React.ReactNode; title: string; text: string; action: React.ReactNode }) {
  const tones = { bad: 'bg-bad/10 text-bad ring-bad/30', warn: 'bg-warn/10 text-warn ring-warn/30' }
  return (
    <section className={cx('animate-fade-up rounded-2xl px-3.5 py-3 ring-1', tones[tone])}>
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5 shrink-0">{icon}</span>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-bold">{title}</div>
          <p className="text-xs text-ink/75">{text}</p>
        </div>
        <div className="shrink-0">{action}</div>
      </div>
    </section>
  )
}
