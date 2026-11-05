import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Medal, Mountain } from 'lucide-react'
import { useProgram } from '../lib/program'
import { addDays, shortDate, today, weekStart } from '../lib/date'
import { isWalk, runsOnly } from '../lib/walk'
import { runAchievements } from '../lib/analysis'
import { elevStats, fetchElevation, sampleRoute } from '../lib/elevation'
import { formatDuration, type Run } from '../lib/log'
import { useT } from '../lib/i18n'
import { cx } from '../lib/cx'

const RANK = ['', 'PR', '2', '3']
const rankTone = ['', 'bg-warn text-white', 'bg-muted/70 text-white', 'bg-warn/40 text-ink']

/** ความสำเร็จของรอบนี้: ติด 3 อันดับเร็วสุดของระยะไหนบ้าง (Strava แสดงแค่ PR/อันดับ 2) */
export function RunAchievements({ run, runs }: { run: Run; runs: Run[] }) {
  const t = useT()
  const list = useMemo(() => runAchievements(run, runs), [run, runs])
  if (!list.length) return null
  return (
    <div className="mb-3 rounded-2xl bg-raised p-3">
      <div className="mb-1.5 flex items-center gap-2 text-sm font-bold"><Medal size={16} className="text-warn" /> {t('ความสำเร็จรอบนี้', 'Achievements')}</div>
      <ul className="space-y-1.5 text-sm">
        {list.map(a => (
          <li key={a.label} className="flex items-center gap-2.5">
            <span className={cx('grid size-7 shrink-0 place-items-center rounded-full text-[11px] font-extrabold', rankTone[a.rank])}>{RANK[a.rank]}</span>
            <span className="flex-1 font-semibold">
              {a.rank === 1 ? t(`${a.label} เร็วที่สุดของคุณ`, `${a.label} PR`) : t(`${a.label} เร็วอันดับ ${a.rank}`, `${a.rank === 2 ? '2nd' : '3rd'}-fastest ${a.label}`)}
            </span>
            <span className="tabular-nums">{formatDuration(a.seconds)}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** ความสูงของเส้นทาง: ดึงจากแผนที่ความสูงครั้งเดียวแล้วเก็บไว้ในรอบวิ่ง (ต้องออนไลน์) */
export function ElevationCard({ run, onUpdate }: { run: Run; onUpdate: (patch: Partial<Run>) => void }) {
  const t = useT()
  const [failed, setFailed] = useState(false)
  const hasRoute = (run.route?.length ?? 0) > 5
  // onUpdate เป็นฟังก์ชันใหม่ทุก render — เก็บใน ref ไม่ให้ effect เริ่มใหม่แล้วทิ้งผลที่กำลังโหลด
  const update = useRef(onUpdate)
  useEffect(() => { update.current = onUpdate })
  useEffect(() => {
    if (!hasRoute || run.elev || failed || !navigator.onLine) return
    let alive = true
    fetchElevation(sampleRoute(run.route!))
      .then(p => { if (alive) update.current({ elev: elevStats(p), elevProfile: p }) })
      .catch(() => alive && setFailed(true))
    return () => { alive = false }
  }, [hasRoute, run.elev, run.route, failed])
  if (!hasRoute || !run.elev) return null
  const e = run.elev
  const p = run.elevProfile ?? []
  const W = 300, H = 70, lo = e.min - 2, span = Math.max(10, e.max - lo + 2)
  const pts = p.map((h, i) => `${((i / Math.max(1, p.length - 1)) * W).toFixed(1)},${(H - ((h - lo) / span) * H).toFixed(1)}`).join(' ')
  return (
    <div className="mb-3 rounded-2xl bg-raised p-3">
      <div className="flex items-center gap-2 text-sm font-bold"><Mountain size={16} className="text-good" /> {t('ความสูงเส้นทาง', 'Elevation')}</div>
      <div className="mt-1 grid grid-cols-3 gap-2 text-center">
        <div><div className="text-[11px] text-muted">{t('ขึ้นสะสม', 'Gain')}</div><div className="font-bold tabular-nums">{e.gain} {t('ม.', 'm')}</div></div>
        <div><div className="text-[11px] text-muted">{t('ลงสะสม', 'Loss')}</div><div className="font-bold tabular-nums">{e.loss} {t('ม.', 'm')}</div></div>
        <div><div className="text-[11px] text-muted">{t('สูงสุด', 'Max')}</div><div className="font-bold tabular-nums">{e.max} {t('ม.', 'm')}</div></div>
      </div>
      {p.length > 2 && (
        <svg viewBox={`0 0 ${W} ${H}`} className="mt-2 block w-full" role="img" aria-label={t(`กราฟความสูง ขึ้นสะสม ${e.gain} เมตร`, `Elevation profile, ${e.gain} m gain`)} preserveAspectRatio="none">
          <polygon points={`0,${H} ${pts} ${W},${H}`} className="fill-good/20" />
          <polyline points={pts} fill="none" className="stroke-good" strokeWidth={2} vectorEffect="non-scaling-stroke" />
        </svg>
      )}
      <p className="mt-1 text-[11px] text-muted">
        {e.gain >= 10 * (run.km || 1)
          ? t('เส้นทางนี้มีเนินพอสมควร — ใช้ซ้อมสนามที่เป็นเนินซึมได้ (ขึ้นเนินคุมความเหนื่อย ไม่ใช่เพซ)', 'A fairly hilly route — good practice for rolling race courses (run hills by effort, not pace)')
          : t('จากแผนที่ความสูง (~90 ม.) เห็นเนินยาว ๆ แต่ไม่เห็นเนินสั้นอย่างสะพาน', 'From a ~90 m elevation map — shows long grades, not short ones like bridges')}
      </p>
    </div>
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
