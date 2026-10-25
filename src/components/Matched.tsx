import { useMemo } from 'react'
import { Repeat, Trophy } from 'lucide-react'
import { matchedRuns } from '../lib/matched'
import { formatDuration, formatPace, type Run } from '../lib/log'
import { niceDate } from '../lib/date'
import { cx } from '../lib/cx'

/** เทียบกับครั้งอื่นบนเส้นทางเดียวกัน (Matched runs) */
export function MatchedRuns({ run, runs }: { run: Run; runs: Run[] }) {
  const list = useMemo(() => matchedRuns(run, runs), [run, runs])
  if (list.length < 2) return null
  const best = list.reduce((b, r) => (r.seconds / r.km < b.seconds / b.km ? r : b))
  const idx = list.findIndex(r => r.id === run.id)
  const prev = idx > 0 ? list[idx - 1] : null
  const pace = (r: Run) => r.seconds / r.km
  const diff = prev ? pace(run) - pace(prev) : 0
  const recent = [...list].reverse().slice(0, 6)
  const slowest = Math.max(...recent.map(pace)), fastest = Math.min(...recent.map(pace))

  return (
    <div className="mt-3 rounded-2xl bg-raised p-3">
      <div className="flex items-center gap-2 text-sm font-bold"><Repeat size={16} className="text-run" /> เส้นทางนี้วิ่งมาแล้ว {list.length} ครั้ง</div>
      {prev && Math.abs(diff) >= 1 && (
        <p className={cx('mt-0.5 text-xs font-semibold', diff < 0 ? 'text-good' : 'text-warn')}>
          ครั้งนี้{diff < 0 ? 'เร็วกว่า' : 'ช้ากว่า'}ครั้งก่อน {formatDuration(Math.abs(diff))} /กม.
          {run.id === best.id && ' — ดีที่สุดของเส้นทางนี้'}
        </p>
      )}
      <ul className="mt-2 space-y-1.5">
        {recent.map(r => (
          <li key={r.id} className={cx('flex items-center gap-2 text-xs', r.id === run.id && 'font-bold')}>
            <span className="w-20 shrink-0 truncate text-muted">{niceDate(r.date)}</span>
            <span className="h-2 flex-1 overflow-hidden rounded-full bg-body">
              {/* ยาว = เร็ว */}
              <span className={cx('block h-full rounded-full', r.id === run.id ? 'bg-run' : 'bg-run/40')}
                style={{ width: `${slowest === fastest ? 100 : 40 + (60 * (slowest - pace(r))) / (slowest - fastest)}%` }} />
            </span>
            <span className="w-24 shrink-0 text-right tabular-nums">{formatDuration(r.seconds)} · {formatPace(r.seconds, r.km)}</span>
            {r.id === best.id ? <Trophy size={12} className="shrink-0 text-warn" /> : <span className="w-3 shrink-0" />}
          </li>
        ))}
      </ul>
    </div>
  )
}
