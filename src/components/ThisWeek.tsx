import { useMemo, useState, type PointerEvent } from 'react'
import { CalendarDays } from 'lucide-react'
import { useRuns, formatDuration } from '../lib/log'
import { useProgram } from '../lib/program'
import { niceTicks, weeklySeries } from '../lib/weekly'
import { shortDate, today, weekStart } from '../lib/date'
import { useLang, useT } from '../lib/i18n'
import { Card } from './ui'

const N = 12
const W = 320, H = 150, L = 28, R = 10, T = 10, B = 20

/** สัปดาห์นี้ (แบบหน้าโปรไฟล์ Strava): ระยะ/เวลา/ขึ้นสะสมของสัปดาห์ + กราฟเส้น 12 สัปดาห์ จุดละสัปดาห์ เส้นประ = ระยะตามแผน */
export function ThisWeekCard() {
  const t = useT()
  const [lang] = useLang()
  const [runs] = useRuns()
  const p = useProgram()
  const monday = weekStart(today())
  const weeks = useMemo(() => weeklySeries(runs, monday, N), [runs, monday])
  // ไม่มีเส้นแผนในสัปดาห์ก่อนเริ่มโปรแกรมปัจจุบัน (เช่น เพิ่งเปลี่ยนจากมินิเป็น 10K กลางทาง)
  const startMonday = p.storedStart && !p.prepWeeks.length ? weekStart(p.storedStart) : ''
  const planned = weeks.map(w => {
    if (w.monday < startMonday) return null
    const n = p.weekOf(w.monday)
    return n === null ? null : p.kmTarget(n) || null
  })
  const [sel, setSel] = useState(N - 1)
  if (!runs.length) return null

  const ticks = niceTicks(Math.max(...weeks.map(w => w.km), ...planned.map(v => v ?? 0)))
  const top = ticks.at(-1)!
  const x = (i: number) => L + (i * (W - L - R)) / (N - 1)
  const y = (v: number) => H - B - (v / top) * (H - B - T)
  const line = weeks.map((w, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(w.km).toFixed(1)}`).join(' ')
  const area = `${line} L${x(N - 1)} ${H - B} L${x(0)} ${H - B} Z`
  // เส้นแผนต่อกันเฉพาะสัปดาห์ที่มีแผนติดกัน
  const plan = planned.map((v, i) => (v === null ? '' : `${i && planned[i - 1] !== null ? 'L' : 'M'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`)).join(' ')
  const month = new Intl.DateTimeFormat(lang === 'en' ? 'en' : 'th-TH', { month: 'short' })
  const changes = weeks.map((w, i) => i > 0 && w.monday.slice(5, 7) !== weeks[i - 1].monday.slice(5, 7))
  const firstChange = changes.indexOf(true)
  const labels = weeks.flatMap((w, i) => (changes[i] || (i === 0 && (firstChange < 0 || firstChange > 2))
    ? [{ i, text: month.format(new Date(`${w.monday}T00:00:00`)) }] : []))

  // ลากแนวนอนเลื่อนดูสัปดาห์ ลากแนวตั้งยังเลื่อนหน้าได้ (touch-pan-y)
  const scrub = (e: PointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    const px = ((e.clientX - r.left) / r.width) * W
    setSel(Math.max(0, Math.min(N - 1, Math.round(((px - L) / (W - L - R)) * (N - 1)))))
  }
  const cur = weeks[N - 1]
  const s = weeks[sel]
  const hasPlan = planned.some(v => v !== null)

  return (
    <Card title={<span className="flex items-center gap-2"><CalendarDays size={18} className="text-run" /> {t('สัปดาห์นี้', 'This week')}</span>}>
      <div className="grid grid-cols-3 gap-2">
        {[[t('ระยะ', 'Distance'), `${cur.km.toFixed(1)}`, t('กม.', 'km')], [t('เวลา', 'Time'), formatDuration(cur.seconds), ''], [t('ขึ้นสะสม', 'Elevation'), cur.elevRuns ? `${cur.gain}` : '-', cur.elevRuns ? t('ม.', 'm') : '']].map(([l, v, u]) => (
          <div key={l}>
            <div className="text-[11px] text-muted">{l}</div>
            <div className="text-xl font-extrabold tabular-nums">{v}<span className="ml-0.5 text-xs font-normal text-muted">{u}</span></div>
          </div>
        ))}
      </div>

      <div className="mt-3 flex items-center justify-between gap-2 text-xs">
        <span className="tabular-nums">
          <b>{sel === N - 1 ? t('สัปดาห์นี้', 'This week') : t(`สัปดาห์ ${shortDate(s.monday)}`, `Week of ${shortDate(s.monday)}`)}</b>
          {' '}{s.km.toFixed(1)} {t('กม.', 'km')} · {t(`${s.runs} ครั้ง`, `${s.runs} runs`)}{planned[sel] !== null ? t(` · แผน ${planned[sel]} กม.`, ` · plan ${planned[sel]} km`) : ''}
        </span>
        {hasPlan && (
          <span className="flex shrink-0 items-center gap-2 text-muted">
            <span className="flex items-center gap-1"><svg width="14" height="4" aria-hidden><line x1="0" x2="14" y1="2" y2="2" className="stroke-run" strokeWidth="2" /></svg>{t('วิ่งจริง', 'Actual')}</span>
            <span className="flex items-center gap-1"><svg width="14" height="4" aria-hidden><line x1="0" x2="14" y1="2" y2="2" className="stroke-muted" strokeWidth="2" strokeDasharray="3 2" /></svg>{t('แผน', 'Plan')}</span>
          </span>
        )}
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="mt-1 block w-full touch-pan-y select-none" role="img"
        aria-label={t(`ระยะวิ่ง 12 สัปดาห์ล่าสุด สัปดาห์นี้ ${cur.km.toFixed(1)} กม.`, `Running distance, last 12 weeks; this week ${cur.km.toFixed(1)} km`)}
        onPointerDown={scrub} onPointerMove={scrub}
        onPointerLeave={e => { if (e.pointerType === 'mouse') setSel(N - 1) }}>
        {ticks.map(v => (
          <g key={v}>
            <line x1={L} x2={W - R} y1={y(v)} y2={y(v)} className="stroke-line" strokeWidth="1" />
            <text x={L - 6} y={y(v) + 3} textAnchor="end" className="fill-muted text-[9px] tabular-nums">{v}</text>
          </g>
        ))}
        {labels.map(l => <text key={l.i} x={x(l.i)} y={H - 5} textAnchor="middle" className="fill-muted text-[9px]">{l.text}</text>)}
        <line x1={x(sel)} x2={x(sel)} y1={T - 4} y2={H - B} className="stroke-muted" strokeWidth="1" strokeDasharray="2 2" />
        <path d={area} className="fill-run" opacity="0.1" />
        {plan && <path d={plan} fill="none" className="stroke-muted" strokeWidth="2" strokeDasharray="4 3" strokeLinejoin="round" />}
        <path d={line} fill="none" className="stroke-run" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {weeks.map((w, i) => (
          <circle key={w.monday} cx={x(i)} cy={y(w.km)} r={i === sel ? 5.5 : 4}
            className={i === N - 1 || i === sel ? 'fill-run stroke-card' : 'fill-card stroke-run'} strokeWidth="2" />
        ))}
      </svg>
    </Card>
  )
}
