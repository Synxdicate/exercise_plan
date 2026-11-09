import { useEffect, useMemo, useRef, useState } from 'react'
import { CalendarCheck, ChevronLeft, ChevronRight, ChevronsRight, Medal, Mountain, Route } from 'lucide-react'
import { useProgram } from '../lib/program'
import { addDays, shortDate, today, weekStart } from '../lib/date'
import { isWalk, runsOnly } from '../lib/walk'
import { cumulative, paceSeries, runHighlights } from '../lib/analysis'
import { elevStats, fetchElevation, sampleRoute, samplesFor } from '../lib/elevation'
import { atKm, findClimbs, gapPace, grades } from '../lib/grade'
import type { Point } from '../lib/geo'
import { formatDuration, formatPace, type Run } from '../lib/log'
import { useT } from '../lib/i18n'
import { cx } from '../lib/cx'

const RANK = ['', 'PR', '2', '3']
const rankTone = ['', 'bg-warn text-white', 'bg-muted/70 text-white', 'bg-warn/40 text-ink']

/** ความสำเร็จของรอบนี้: ติด 3 อันดับเร็วสุดของระยะไหนบ้าง (Strava แสดงแค่ PR/อันดับ 2) */
export function RunAchievements({ run, runs, className = 'mb-3' }: { run: Run; runs: Run[]; className?: string }) {
  const t = useT()
  const list = useMemo(() => runHighlights(run, runs), [run, runs])
  if (!list.length) return null
  return (
    <div className={cx('rounded-2xl bg-raised p-3', className)}>
      <div className="mb-1.5 flex items-center gap-2 text-sm font-bold"><Medal size={16} className="text-warn" /> {t('ความสำเร็จรอบนี้', 'Achievements')}</div>
      <ul className="space-y-1.5 text-sm">
        {list.map(a => (
          <li key={a.kind + ('label' in a ? a.label : '')} className="flex items-center gap-2.5">
            {a.kind === 'pr' ? <span className={cx('grid size-7 shrink-0 place-items-center rounded-full text-[11px] font-extrabold', rankTone[a.rank])}>{RANK[a.rank]}</span>
              : <span className="grid size-7 shrink-0 place-items-center rounded-full bg-run/15 text-run">{a.kind === 'year' ? <CalendarCheck size={14} /> : a.kind === 'longest' ? <Route size={14} /> : <ChevronsRight size={14} />}</span>}
            <span className="flex-1 font-semibold">
              {a.kind === 'pr' ? (a.rank === 1 ? t(`${a.label} เร็วที่สุดของคุณ`, `${a.label} PR`) : t(`${a.label} เร็วอันดับ ${a.rank}`, `${a.rank === 2 ? '2nd' : '3rd'}-fastest ${a.label}`))
                : a.kind === 'year' ? t(`${a.label} เร็วที่สุดของปี ${+a.year + 543}`, `Fastest ${a.label} of ${a.year}`)
                : a.kind === 'longest' ? t('วิ่งไกลที่สุดที่เคยวิ่ง', 'Your longest run yet')
                : t('ครึ่งหลังเร็วกว่าครึ่งแรก', 'Negative split')}
            </span>
            <span className="tabular-nums">{a.kind === 'pr' || a.kind === 'year' ? formatDuration(a.seconds) : a.kind === 'longest' ? `${a.km.toFixed(2)} ${t('กม.', 'km')}` : `${a.diffPct.toFixed(1)}%`}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** ความสูงของเส้นทาง: ดึงจากแผนที่ความสูงครั้งเดียวแล้วเก็บไว้ในรอบวิ่ง (ต้องออนไลน์)
 *  กราฟแบบ Strava: แกนระยะ/ความสูง สเกลแกนตั้งขั้นต่ำ 30 ม. (ทางราบไม่ดูเป็นภูเขา) สีตามความชัน แตะ/ลากดูทีละจุด + จุดบนแผนที่ */
export function ElevationCard({ run, onUpdate, onScrub }: { run: Run; onUpdate: (patch: Partial<Run>) => void; onScrub?: (p: Point | null) => void }) {
  const t = useT()
  const [failed, setFailed] = useState(false)
  const hasRoute = (run.route?.length ?? 0) > 5
  const want = hasRoute ? Math.min(samplesFor(run.km), run.route!.length) : 0
  // รอบเก่าเก็บไว้ 100 จุด ดึงใหม่ให้ละเอียดขึ้นครั้งเดียว
  const stale = !!run.elev && (run.elevProfile?.length ?? 0) === 100 && want > 110
  const update = useRef(onUpdate)
  useEffect(() => { update.current = onUpdate })
  useEffect(() => {
    if (!hasRoute || (run.elev && !stale) || failed || !navigator.onLine) return
    let alive = true
    fetchElevation(sampleRoute(run.route!, want))
      .then(p => { if (alive) update.current({ elev: elevStats(p), elevProfile: p }) })
      .catch(() => alive && setFailed(true))
    return () => { alive = false }
  }, [hasRoute, run.elev, run.route, failed, stale, want])
  const p = useMemo(() => run.elevProfile ?? [], [run.elevProfile])
  const g = useMemo(() => grades(p, run.km), [p, run.km])
  const climbs = useMemo(() => findClimbs(p, run.km), [p, run.km])
  const series = useMemo(() => (run.route && run.times ? paceSeries(run.route, run.times) : []), [run.route, run.times])
  const cum = useMemo(() => (run.route ? cumulative(run.route) : []), [run.route])
  if (!hasRoute || !run.elev) return null
  const e = run.elev
  const gap = p.length > 2 ? gapPace(run.seconds, p, run.km) : null
  const steepest = g.length ? Math.max(...g) : 0
  const scrub = (km: number | null) => {
    if (!onScrub) return
    if (km === null || !run.route || !cum.length) return onScrub(null)
    const target = km * 1000 * (cum.at(-1)! / (run.km * 1000 || 1))
    let j = 0
    while (j < cum.length - 1 && cum[j] < target) j++
    onScrub(run.route[j])
  }
  return (
    <div className="mb-3 rounded-2xl bg-raised p-3">
      <div className="flex items-center gap-2 text-sm font-bold"><Mountain size={16} className="text-good" /> {t('ความสูงเส้นทาง', 'Elevation')}</div>
      <div className="mt-1 grid grid-cols-4 gap-1 text-center">
        <div><div className="text-[11px] text-muted">{t('ขึ้นสะสม', 'Gain')}</div><div className="font-bold tabular-nums">{e.gain} {t('ม.', 'm')}</div></div>
        <div><div className="text-[11px] text-muted">{t('ลงสะสม', 'Loss')}</div><div className="font-bold tabular-nums">{e.loss} {t('ม.', 'm')}</div></div>
        <div><div className="text-[11px] text-muted">{t('ชันสุด', 'Steepest')}</div><div className="font-bold tabular-nums">{(steepest * 100).toFixed(1)}%</div></div>
        <div><div className="text-[11px] text-muted">GAP</div><div className="font-bold tabular-nums">{gap ? formatPace(gap, 1) : '-'}</div></div>
      </div>
      {p.length > 2 && <ProfileChart profile={p} km={run.km} series={series} onScrub={scrub} />}
      {climbs.length > 0 && (
        <ul className="mt-2 space-y-1 text-sm">
          {climbs.slice(0, 4).map((c, i) => (
            <li key={i} className="flex items-center gap-2">
              <span className={cx('grid size-6 shrink-0 place-items-center rounded-full text-[11px] font-bold', c.avg >= 5 ? 'bg-bad/20 text-bad' : 'bg-warn/20 text-warn')}>{i + 1}</span>
              <span className="flex-1">{t(`เนิน กม. ${c.fromKm.toFixed(1)}–${c.toKm.toFixed(1)}`, `Climb km ${c.fromKm.toFixed(1)}–${c.toKm.toFixed(1)}`)}</span>
              <span className="tabular-nums text-muted">+{c.gain} {t('ม.', 'm')} · {c.avg}%</span>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-2 text-[11px] text-muted">
        {e.gain >= 10 * (run.km || 1)
          ? t('เส้นทางนี้มีเนินพอสมควร ใช้ซ้อมสนามที่เป็นเนินซึมได้ (ขึ้นเนินคุมความเหนื่อย ไม่ใช่เพซ)', 'A fairly hilly route — good practice for rolling race courses (run hills by effort, not pace)')
          : t('จากแผนที่ความสูง (~90 ม.) เห็นเนินยาว ๆ แต่ไม่เห็นเนินสั้นอย่างสะพาน', 'From a ~90 m elevation map — shows long grades, not short ones like bridges')}
        {' '}{t('GAP = เพซเทียบทางราบ (ประมาณจาก Minetti 2002)', 'GAP = flat-equivalent pace (estimate, Minetti 2002)')}
      </p>
    </div>
  )
}

/** กราฟความสูงแบบ Strava (ใช้กับรอบวิ่งและเส้นทางสนาม): แกน กม./ม. สเกลขั้นต่ำ 30 ม. สีตามความชัน แตะ/ลากดูทีละจุด */
export function ProfileChart({ profile: p, km, series = [], onScrub }: { profile: number[]; km: number; series?: { km: number; pace: number }[]; onScrub?: (km: number | null) => void }) {
  const t = useT()
  const [cursor, setCursor] = useState<number | null>(null)
  const g = useMemo(() => grades(p, km), [p, km])
  const min = Math.min(...p), max = Math.max(...p)
  const W = 320, H = 130, L = 30, B = 16, top = 6
  const lo = Math.floor((min - 3) / 5) * 5
  const span = Math.max(30, Math.ceil((max - lo + 3) / 5) * 5)
  const x = (d: number) => L + (d / km) * (W - L - 4)
  const y = (h: number) => top + (H - B - top) * (1 - (h - lo) / span)
  const kmAt = (i: number) => (i / Math.max(1, p.length - 1)) * km
  const tone = (gr: number) => (gr >= 0.05 ? 'fill-bad/45' : gr >= 0.02 ? 'fill-warn/45' : gr <= -0.02 ? 'fill-run/20' : 'fill-good/25')
  const kmStep = km <= 8 ? 1 : km <= 20 ? 2 : 5
  const yTicks = [lo, lo + span / 2, lo + span]
  const pick = (ev: React.PointerEvent<SVGSVGElement>) => {
    const r = ev.currentTarget.getBoundingClientRect()
    const vx = ((ev.clientX - r.left) / r.width) * W
    const d = Math.max(0, Math.min(km, ((vx - L) / (W - L - 4)) * km))
    setCursor(d)
    onScrub?.(d)
  }
  const at = cursor !== null ? atKm(p, km, cursor) : null
  const paceAt = cursor !== null && series.length ? series.reduce((b, s) => (Math.abs(s.km - cursor) < Math.abs(b.km - cursor) ? s : b)).pace : null
  return (
    <>
      <div className="mt-2 h-5 text-center text-xs tabular-nums text-muted" aria-live="polite">
        {at && cursor !== null
          ? <>{t('กม.', 'km')} {cursor.toFixed(2)} · {Math.round(at.elev)} {t('ม.', 'm')} · {t('ชัน', 'grade')} {(at.grade * 100).toFixed(1)}%{paceAt ? ` · ${formatPace(paceAt, 1)} ${t('/กม.', '/km')}` : ''}</>
          : t('แตะหรือลากบนกราฟเพื่อดูแต่ละจุด', 'Tap or drag on the chart to inspect')}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="block w-full touch-none select-none" role="img"
        aria-label={t(`กราฟความสูง ${Math.round(min)}–${Math.round(max)} เมตร`, `Elevation profile, ${Math.round(min)}–${Math.round(max)} m`)}
        onPointerDown={ev => { ev.currentTarget.setPointerCapture(ev.pointerId); pick(ev) }} onPointerMove={ev => (ev.buttons || ev.pointerType === 'mouse') && pick(ev)}
        onPointerLeave={ev => { if (ev.pointerType === 'mouse') { setCursor(null); onScrub?.(null) } }}>
        {yTicks.map(h => (
          <g key={h}>
            <line x1={L} x2={W - 4} y1={y(h)} y2={y(h)} className="stroke-line" strokeWidth={0.6} />
            <text x={L - 4} y={y(h) + 3} textAnchor="end" className="fill-muted text-[8px]">{Math.round(h)}</text>
          </g>
        ))}
        {p.slice(1).map((h, i) => (
          <polygon key={i} className={tone(g[i] ?? 0)}
            points={`${x(kmAt(i))},${y(lo)} ${x(kmAt(i))},${y(p[i])} ${x(kmAt(i + 1))},${y(h)} ${x(kmAt(i + 1))},${y(lo)}`} />
        ))}
        <polyline points={p.map((h, i) => `${x(kmAt(i)).toFixed(1)},${y(h).toFixed(1)}`).join(' ')} fill="none" className="stroke-ink" strokeWidth={1.4} strokeLinejoin="round" />
        {Array.from({ length: Math.floor(km / kmStep) + 1 }, (_, k) => k * kmStep).map(d => (
          <text key={d} x={x(d)} y={H - 4} textAnchor="middle" className="fill-muted text-[8px]">{d}</text>
        ))}
        {at && cursor !== null && (
          <>
            <line x1={x(cursor)} x2={x(cursor)} y1={top} y2={H - B} className="stroke-ink" strokeWidth={0.8} />
            <circle cx={x(cursor)} cy={y(at.elev)} r={3.5} className="fill-run stroke-card" strokeWidth={1.5} />
          </>
        )}
      </svg>
      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-muted">
        <span className="flex items-center gap-1"><span className="size-2 rounded-sm bg-warn/60" /> {t('ชัน 2–5%', '2–5%')}</span>
        <span className="flex items-center gap-1"><span className="size-2 rounded-sm bg-bad/60" /> {t('ชัน ≥5%', '≥5%')}</span>
        <span className="flex items-center gap-1"><span className="size-2 rounded-sm bg-run/40" /> {t('ลงเนิน', 'downhill')}</span>
        <span>{t('แกนนอน = กม.', 'x = km')}</span>
      </div>
    </>
  )
}

/** Training log รายสัปดาห์: วงกลมตามระยะที่วิ่งจริง + วงเส้นประตามแผน (Strava ไม่มีแผนให้เทียบ) */
export function TrainingLog({ runs }: { runs: Run[] }) {
  const t = useT()
  const p = useProgram()
  const [monday, setMonday] = useState(() => weekStart(today()))
  const thisMonday = weekStart(today())
  const w = p.weekOf(monday)
  const plan = w !== null ? p.plan(w) : []
  const days = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(monday, i)
    const ran = runsOnly(runs).filter(r => r.date === date).reduce((s, r) => s + r.km, 0)
    const walked = runs.some(r => r.date === date && isWalk(r))
    const planned = plan[i]?.type === 'run' ? plan[i].targetKm ?? 0 : 0
    return { date, ran, walked, planned }
  })
  const total = days.reduce((s, d) => s + d.ran, 0)
  const planTotal = days.reduce((s, d) => s + d.planned, 0)
  const max = Math.max(6, ...days.map(d => Math.max(d.ran, d.planned)))
  const size = (km: number) => 18 + (km / max) * 30
  const labels = t('th', 'en') === 'en' ? ['M', 'T', 'W', 'T', 'F', 'S', 'S'] : ['จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส', 'อา']
  return (
    <div>
      <div className="flex items-center gap-2">
        <button onClick={() => setMonday(addDays(monday, -7))} aria-label={t('สัปดาห์ก่อน', 'Previous week')} className="grid size-8 place-items-center rounded-full ring-1 ring-line"><ChevronLeft size={16} /></button>
        <div className="flex-1 text-center">
          <div className="text-sm font-bold">{shortDate(monday)} – {shortDate(addDays(monday, 6))}</div>
          <div className="text-xs tabular-nums text-muted">{total.toFixed(1)}{planTotal ? ` / ${planTotal.toFixed(1)}` : ''} {t('กม.', 'km')}{planTotal ? t(' ตามแผน', ' planned') : ''}</div>
        </div>
        <button onClick={() => setMonday(addDays(monday, 7))} disabled={monday >= thisMonday} aria-label={t('สัปดาห์ถัดไป', 'Next week')} className="grid size-8 place-items-center rounded-full ring-1 ring-line disabled:opacity-30"><ChevronRight size={16} /></button>
      </div>
      <div className="mt-3 grid grid-cols-7 gap-1 text-center">
        {days.map((d, i) => (
          <div key={d.date} className="flex flex-col items-center gap-1">
            <span className={cx('text-[11px]', d.date === today() ? 'font-bold text-ink' : 'text-muted')}>{labels[i]}</span>
            <span className="relative grid size-12 place-items-center">
              {d.planned > 0 && <span className="absolute rounded-full border-2 border-dashed border-run/40" style={{ width: size(d.planned), height: size(d.planned) }} />}
              {d.ran > 0 ? (
                <span className="grid place-items-center rounded-full bg-run-fill text-[10px] font-bold text-white" style={{ width: size(d.ran), height: size(d.ran) }}>{d.ran >= 1 ? d.ran.toFixed(1) : ''}</span>
              ) : d.walked ? <span className="size-2.5 rounded-full bg-muted/60" /> : null}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-center gap-4 text-[11px] text-muted">
        <span className="flex items-center gap-1"><span className="size-2.5 rounded-full bg-run-fill" /> {t('วิ่งจริง (กม.)', 'Ran (km)')}</span>
        <span className="flex items-center gap-1"><span className="size-2.5 rounded-full border border-dashed border-run/60" /> {t('แผน', 'Plan')}</span>
        <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-muted/60" /> {t('เดิน', 'Walk')}</span>
      </div>
    </div>
  )
}
