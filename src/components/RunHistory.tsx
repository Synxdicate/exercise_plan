import { useMemo, useState } from 'react'
import { ChevronRight, Footprints } from 'lucide-react'
import { formatDuration, formatPace, runKinds, type Run } from '../lib/log'
import { projectRoute } from '../lib/geo'
import { monthLabel, niceDate } from '../lib/date'
import { cx } from '../lib/cx'
import { Badge } from './ui'

/** เส้นทางย่อแบบภาพตัวอย่าง (แทนไอคอน) — การวิ่งที่ไม่มีเส้นทางใช้ไอคอนเดิม */
export function RoutePreview({ run, className }: { run: Run; className?: string }) {
  const d = useMemo(() => {
    if (!run.route || run.route.length < 2) return null
    // ลดจุดให้เหลือ ~80 พอสำหรับภาพเล็ก
    const step = Math.ceil(run.route.length / 80)
    const pts = projectRoute(run.route.filter((_, i) => i % step === 0 || i === run.route!.length - 1), { x: 6, y: 6, w: 36, h: 36 })
    return pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ')
  }, [run.route])
  return (
    <div className={cx('grid size-12 shrink-0 place-items-center rounded-2xl bg-run/15 text-run', className)}>
      {d ? (
        <svg viewBox="0 0 48 48" className="size-12" aria-hidden>
          <path d={d} fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
        </svg>
      ) : <Footprints size={22} />}
    </div>
  )
}

const PAGE = 3 // จำนวนเดือนที่แสดงต่อครั้ง

/** ประวัติการวิ่งแบ่งตามเดือน พร้อมยอดรวมรายเดือนและตัวกรองชนิด */
export function RunHistory({ runs, onOpen }: { runs: Run[]; onOpen: (id: string) => void }) {
  const [kind, setKind] = useState<Run['kind'] | 'all'>('all')
  const [months, setMonths] = useState(PAGE)
  const kinds = useMemo(() => [...new Set(runs.map(r => r.kind))], [runs])
  const groups = useMemo(() => {
    const list = [...runs].filter(r => kind === 'all' || r.kind === kind).sort((a, b) => b.date.localeCompare(a.date))
    const map = new Map<string, Run[]>()
    for (const r of list) map.set(r.date.slice(0, 7), [...(map.get(r.date.slice(0, 7)) ?? []), r])
    return [...map]
  }, [runs, kind])

  if (!runs.length) return <p className="py-6 text-center text-sm text-muted">ยังไม่มีการวิ่ง — กด "เริ่มวิ่ง" ที่แท็บวิ่ง</p>

  return (
    <div>
      {kinds.length > 1 && (
        <div className="-mx-1 mb-2 flex gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none]">
          {(['all', ...kinds] as const).map(k => (
            <button key={k} onClick={() => { setKind(k); setMonths(PAGE) }}
              className={cx('shrink-0 rounded-full px-3 py-1 text-xs font-semibold ring-1', kind === k ? 'bg-run text-white ring-run' : 'bg-raised ring-line')}>
              {k === 'all' ? 'ทั้งหมด' : runKinds[k]}
            </button>
          ))}
        </div>
      )}
      {groups.slice(0, months).map(([ym, list]) => (
        <section key={ym} className="mb-1">
          <div className="sticky top-[calc(var(--sat)+4.25rem)] z-10 -mx-1 flex items-baseline justify-between bg-card/95 px-1 py-1.5 backdrop-blur">
            <span className="text-sm font-bold">{monthLabel(ym)}</span>
            <span className="text-xs tabular-nums text-muted">{list.length} ครั้ง · {list.reduce((a, r) => a + r.km, 0).toFixed(1)} กม.</span>
          </div>
          <ul className="divide-y divide-line">
            {list.map(r => (
              <li key={r.id}>
                <button onClick={() => onOpen(r.id)} className="flex w-full items-center gap-3 py-2.5 text-left">
                  <RoutePreview run={r} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2"><b className="tabular-nums">{r.km.toFixed(2)} กม.</b><Badge tone="run">{runKinds[r.kind]}</Badge></div>
                    <div className="text-xs text-muted">{niceDate(r.date)} · {formatDuration(r.seconds)} · {formatPace(r.seconds, r.km)} /กม.</div>
                  </div>
                  <ChevronRight size={18} className="text-muted" />
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
      {groups.length > months && (
        <button onClick={() => setMonths(m => m + PAGE)} className="mt-1 w-full rounded-full py-2 text-sm font-semibold text-run ring-1 ring-line">
          ดูเดือนก่อนหน้า ({groups.length - months} เดือน)
        </button>
      )}
    </div>
  )
}
