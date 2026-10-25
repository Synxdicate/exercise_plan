import { useState } from 'react'
import { Check, Flag, Lock, Map as MapIcon, Swords } from 'lucide-react'
import { journey, raceLabel } from '../lib/goals'
import { formatDuration, type Run } from '../lib/log'
import type { Estimate } from '../lib/pace'
import { useRaceGoals } from '../lib/useGoals'
import { useProgram } from '../lib/program'
import { programs } from '../data/programs'
import { niceDate } from '../lib/date'
import { cx } from '../lib/cx'
import { Button, Card } from './ui'
import { ProgramSheet } from './ProgramSheet'

/** เส้นทางสู่มาราธอน: ทีละด่าน (แรงบันดาลใจจาก "ใครๆก็วิ่งมาราธอนได้" — มองเป็นบอสในเกม) */
export function JourneyCard({ runs, est }: { runs: Run[]; est: Estimate | null }) {
  const { levels, current } = journey(runs)
  const [goals] = useRaceGoals()
  const p = useProgram()
  const [picking, setPicking] = useState(false)
  const next = levels[current]
  const pred = next && est ? est[next.race] : null
  const goal = next ? goals[next.race] : undefined
  const inProgram = next && p.program === next.program

  return (
    <Card title={<span className="flex items-center gap-2"><MapIcon size={18} className="text-run" /> เส้นทางสู่มาราธอน</span>}>
      <ol className="flex items-start">
        {levels.map((l, i) => {
          const done = !!l.clearedOn
          const now = i === current
          return (
            <li key={l.id} className="relative flex flex-1 flex-col items-center text-center">
              {i > 0 && <span className={cx('absolute right-1/2 top-5 h-1 w-full -translate-y-1/2', done || now ? 'bg-run' : 'bg-line')} />}
              <span className={cx('relative z-10 grid size-10 place-items-center rounded-full ring-4 ring-card',
                done ? 'bg-run text-white' : now ? 'animate-pop bg-accent text-white' : 'bg-raised text-muted')}>
                {done ? <Check size={18} strokeWidth={3} /> : now ? <Swords size={18} /> : i === levels.length - 1 ? <Flag size={16} /> : <Lock size={15} />}
              </span>
              <span className={cx('mt-1.5 text-[11px] font-bold leading-tight', !done && !now && 'text-muted')}>{l.title}</span>
              <span className="text-[10px] leading-tight text-muted">{done ? niceDate(l.clearedOn!) : now ? 'ด่านปัจจุบัน' : ''}</span>
            </li>
          )
        })}
      </ol>

      {next ? (
        <div className="mt-3 rounded-xl bg-raised p-3 text-sm">
          <div className="font-bold">ด่านต่อไป: {next.title} — {next.text}</div>
          {pred && (
            <div className="mt-0.5 text-xs text-muted">
              ตอนนี้คาดว่าวิ่ง {raceLabel[next.race]} ได้ <b className="tabular-nums text-ink">{formatDuration(pred)}</b>
              {goal && (pred <= goal ? ' · ถึงเป้าแล้ว' : ` · ขาดอีก ${formatDuration(pred - goal)} ถึงเป้า ${formatDuration(goal)}`)}
            </div>
          )}
          {inProgram ? (
            <div className="mt-1 text-xs font-semibold text-run">กำลังฝึกด้วยโปรแกรม {programs[next.program].short} · สัปดาห์ {p.currentWeek}/{p.meta.weeks}</div>
          ) : (
            <Button size="sm" variant="soft" className="mt-2" onClick={() => setPicking(true)}>เลือกโปรแกรม{programs[next.program].short}เพื่อผ่านด่านนี้</Button>
          )}
        </div>
      ) : (
        <p className="mt-3 rounded-xl bg-good/10 p-3 text-sm font-semibold text-good">ผ่านครบทุกด่านแล้ว — นักวิ่งมาราธอนเต็มตัว ตั้งเป้าเวลาใหม่ได้ในแท็บสถิติ</p>
      )}
      {picking && <ProgramSheet onClose={() => setPicking(false)} />}
    </Card>
  )
}
