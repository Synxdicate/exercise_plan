import { useMemo, useState } from 'react'
import { ChevronRight, Footprints } from 'lucide-react'
import { formatDuration, formatPace, runKinds, runKindsEn, type Run } from '../lib/log'
import { runsOnly } from '../lib/walk'
import { projectRoute } from '../lib/geo'
import { monthLabel, niceDate } from '../lib/date'
import { cx } from '../lib/cx'
import { useT } from '../lib/i18n'
import { Badge } from './ui'

/** เส้นทางย่อแบบภาพตัวอย่าง (แทนไอคอน) การวิ่งที่ไม่มีเส้นทางใช้ไอคอนเดิม */
export function RoutePreview({ run, className }: { run: Run; className?: string }) {
  const d = useMemo(() => {
    if (!run.route || run.route.length < 2) return null
    // ลดจุดให้เหลือ ~80 พอสำหรับภาพเล็ก
    const step = Math.ceil(run.route.length / 80)
    const pts = projectRoute(run.route.filter((_, i) => i % step === 0 || i === run.route!.length - 1), { x: 6, y: 6, w: 36, h: 36 })
    return pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ')
  }, [run.route])
  return (
    <div className={cx('grid shrink-0 place-items-center bg-run/15 text-run', className ?? 'size-12 rounded-2xl')}>
      {d ? (
        <svg viewBox="0 0 48 48" className="size-full" aria-hidden>
          <path d={d} fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
        </svg>
      ) : <Footprints size={className ? 16 : 22} />}
    </div>
  )
}

/** เส้นทางขนาดใหญ่ในการ์ดประวัติ (แบบฟีด Strava) วาดเป็น SVG ไม่โหลดแผนที่ ใช้ได้แม้ออฟไลน์ */
function RouteBanner({ run }: { run: Run }) {
  const d = useMemo(() => {
    const route = run.route!
    const step = Math.ceil(route.length / 160)
    const pts = projectRoute(route.filter((_, i) => i % step === 0 || i === route.length - 1), { x: 12, y: 10, w: 296, h: 100 })
    return { path: pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' '), start: pts[0], end: pts.at(-1)! }
  }, [run.route])
  return (
    <svg viewBox="0 0 320 120" className="mt-2 block h-28 w-full rounded-xl bg-raised" aria-hidden>
      <path d={d.path} fill="none" className="stroke-card" strokeWidth={6} strokeLinejoin="round" strokeLinecap="round" />
      <path d={d.path} fill="none" className="stroke-run" strokeWidth={3} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={d.start[0]} cy={d.start[1]} r={4.5} className="fill-good-fill stroke-card" strokeWidth={2} />
      <circle cx={d.end[0]} cy={d.end[1]} r={4.5} className="fill-bad-fill stroke-card" strokeWidth={2} />
    </svg>
  )
}

const PAGE = 3 // จำนวนเดือนที่แสดงต่อครั้ง

/** ประวัติการวิ่งแบ่งตามเดือน พร้อมยอดรวมรายเดือนและตัวกรองชนิด */
export function RunHistory({ runs, onOpen }: { runs: Run[]; onOpen: (id: string) => void }) {
  const [kind, setKind] = useState<Run['kind'] | 'all'>('all')
  const tr = useT()
  const kindName = (k: Run['kind']) => tr(runKinds[k], runKindsEn[k])
  const [months, setMonths] = useState(PAGE)
  const kinds = useMemo(() => [...new Set(runs.map(r => r.kind))], [runs])
  const groups = useMemo(() => {
    const list = [...runs].filter(r => kind === 'all' || r.kind === kind).sort((a, b) => b.date.localeCompare(a.date))
    const map = new Map<string, Run[]>()
    for (const r of list) map.set(r.date.slice(0, 7), [...(map.get(r.date.slice(0, 7)) ?? []), r])
    return [...map]
  }, [runs, kind])

  if (!runs.length) return <p className="py-6 text-center text-sm text-muted">{tr('ยังไม่มีการวิ่ง กด "เริ่มวิ่ง" ที่แท็บวิ่ง', 'No runs yet — tap "Start run" in the runs tab')}</p>

  return (
    <div>
      {kinds.length > 1 && (
        <div className="-mx-1 mb-2 flex gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none]">
          {(['all', ...kinds] as const).map(k => (
            <button key={k} onClick={() => { setKind(k); setMonths(PAGE) }}
              className={cx('shrink-0 rounded-full px-3 py-1 text-xs font-semibold ring-1', kind === k ? 'bg-run-fill text-white ring-run' : 'bg-raised ring-line')}>
              {k === 'all' ? tr('ทั้งหมด', 'All') : kindName(k)}
            </button>
          ))}
        </div>
      )}
      {groups.slice(0, months).map(([ym, list]) => (
        <section key={ym} className="mb-1">
          <div className="sticky top-[calc(var(--sat)+4.25rem)] z-10 -mx-1 flex items-baseline justify-between bg-card/95 px-1 py-1.5 backdrop-blur">
            <span className="text-sm font-bold">{monthLabel(ym)}</span>
            <span className="text-xs tabular-nums text-muted">{list.length} {tr('ครั้ง', 'runs')} · {runsOnly(list).reduce((a, r) => a + r.km, 0).toFixed(1)} {tr('กม.', 'km')}</span>
          </div>
          <ul className="space-y-2">
            {list.map(r => {
              const big = (r.route?.length ?? 0) >= 10
              return (
                <li key={r.id}>
                  <button onClick={() => onOpen(r.id)} className="w-full rounded-2xl bg-card p-3 text-left ring-1 ring-line">
                    <div className="flex items-center gap-2">
                      {!big && <RoutePreview run={r} className="size-8 rounded-xl" />}
                      <span className="min-w-0 flex-1 truncate text-xs text-muted">{niceDate(r.date)}</span>
                      <Badge tone="run">{kindName(r.kind)}</Badge>
                      <ChevronRight size={16} className="text-muted" />
                    </div>
                    <div className="mt-1.5 grid grid-cols-3 gap-2">
                      {[[tr('ระยะ', 'Distance'), r.km.toFixed(2), tr('กม.', 'km')], [tr('เพซ', 'Pace'), formatPace(r.seconds, r.km), tr('/กม.', '/km')], [tr('เวลา', 'Time'), formatDuration(r.seconds), '']].map(([l, v, u]) => (
                        <div key={l}>
                          <div className="text-[11px] text-muted">{l}</div>
                          <div className="text-lg font-extrabold leading-tight tabular-nums">{v}<span className="ml-0.5 text-[11px] font-normal text-muted">{u}</span></div>
                        </div>
                      ))}
                    </div>
                    {big && <RouteBanner run={r} />}
                  </button>
                </li>
              )
            })}
          </ul>
        </section>
      ))}
      {groups.length > months && (
        <button onClick={() => setMonths(m => m + PAGE)} className="mt-1 w-full rounded-full py-2 text-sm font-semibold text-run ring-1 ring-line">
          {tr(`ดูเดือนก่อนหน้า (${groups.length - months} เดือน)`, `Show earlier months (${groups.length - months})`)}
        </button>
      )}
    </div>
  )
}
