import { useState } from 'react'
import type { LoadDay } from '../lib/analysis'
import { formatPace } from '../lib/log'
import { shortDate } from '../lib/date'
import { cx } from '../lib/cx'
import { distanceByZone, zoneInfo, zoneOf, ZONES, type ZoneId } from '../lib/zones'

const W = 320

/** เพซตามระยะทาง — แกนตั้งกลับด้าน (เร็ว = สูง) เส้นเป็นสีตามโซนเพซ พร้อมเส้นเพซเฉลี่ย */
export function PaceChart({ series, avg, fiveK }: { series: { km: number; pace: number }[]; avg: number; fiveK?: number }) {
  const [hover, setHover] = useState<number | null>(null)
  if (series.length < 3) return null
  const H = 130, padL = 34, padB = 18, padT = 8
  const maxKm = series.at(-1)!.km
  const paces = series.map(p => p.pace)
  // ตัดค่าสุดโต่ง 2% เพื่อไม่ให้ช่วงหยุดรอไฟแดงทำให้แกนกว้างเกิน
  const sorted = [...paces].sort((a, b) => a - b)
  const lo = sorted[Math.floor(sorted.length * 0.02)] - 10
  const hi = sorted[Math.ceil(sorted.length * 0.98) - 1] + 10
  const x = (km: number) => padL + (km / maxKm) * (W - padL - 4)
  const y = (p: number) => padT + ((Math.min(Math.max(p, lo), hi) - lo) / (hi - lo)) * (H - padT - padB)
  // แบ่งเส้นเป็นช่วงตามโซน (ช่วงถัดไปเริ่มจากจุดสุดท้ายของช่วงก่อน เส้นจะได้ต่อกัน)
  const segments: { zone: ZoneId | null; d: string }[] = []
  series.forEach((p, i) => {
    const zone = fiveK ? zoneOf(p.pace, fiveK) : null
    const pt = `${x(p.km).toFixed(1)} ${y(p.pace).toFixed(1)}`
    const cur = segments.at(-1)
    if (cur && cur.zone === zone) cur.d += ` L${pt}`
    else segments.push({ zone, d: i ? `M${x(series[i - 1].km).toFixed(1)} ${y(series[i - 1].pace).toFixed(1)} L${pt}` : `M${pt}` })
  })
  const h = hover !== null ? series[hover] : null
  const hz = h && fiveK ? zoneInfo(zoneOf(h.pace, fiveK)) : null

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    const km = ((e.clientX - r.left) / r.width * W - padL) / (W - padL - 4) * maxKm
    let best = 0
    for (let i = 1; i < series.length; i++) if (Math.abs(series[i].km - km) < Math.abs(series[best].km - km)) best = i
    setHover(best)
  }

  return (
    <div>
      <div className="mb-1 flex h-5 items-center justify-between text-xs">
        <span className="text-muted">เพซตลอดเส้นทาง (นาที/กม.)</span>
        <span className="tabular-nums">{h ? `กม. ${h.km.toFixed(2)} · ${formatPace(h.pace, 1)}${hz ? ` · ${hz.id} ${hz.label}` : ''}` : `เฉลี่ย ${formatPace(avg, 1)}`}</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="block w-full touch-none" role="img" aria-label="กราฟเพซตามระยะทาง"
        onPointerMove={onMove} onPointerDown={onMove} onPointerLeave={() => setHover(null)}>
        {[lo + 10, (lo + hi) / 2, hi - 10].map(v => (
          <g key={v}>
            <line x1={padL} x2={W} y1={y(v)} y2={y(v)} className="stroke-line" />
            <text x={padL - 4} y={y(v) + 3} textAnchor="end" className="fill-muted text-[9px]">{formatPace(v, 1)}</text>
          </g>
        ))}
        <line x1={padL} x2={W} y1={y(avg)} y2={y(avg)} className="stroke-muted" strokeDasharray="4 4" />
        {segments.map((s, i) => (
          <path key={i} d={s.d} fill="none" stroke={s.zone ? zoneInfo(s.zone).color : 'var(--c-run)'} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
        ))}
        {Array.from({ length: Math.floor(maxKm) + 1 }, (_, k) => k).filter(k => k > 0).map(k => (
          <text key={k} x={x(k)} y={H - 4} textAnchor="middle" className="fill-muted text-[9px]">{k}</text>
        ))}
        {h && (
          <g>
            <line x1={x(h.km)} x2={x(h.km)} y1={padT} y2={H - padB} className="stroke-ink/40" />
            <circle cx={x(h.km)} cy={y(h.pace)} r={4.5} fill={hz ? hz.color : 'var(--c-run)'} className="stroke-card" strokeWidth={2} />
          </g>
        )}
      </svg>
    </div>
  )
}

/** Fitness (ฟ้า) / Fatigue (ชมพู) เป็นเส้น, Form เป็นแท่ง (เขียว = สด, ส้ม = ล้า) */
export function FitnessChart({ days }: { days: LoadDay[] }) {
  const [hover, setHover] = useState<number | null>(null)
  if (days.length < 2) return null
  const H = 170, padL = 26, padB = 18, padT = 8, formH = 36
  const top = H - padB - formH - 8 // ส่วนล่างสำหรับแท่ง form
  const max = Math.max(10, ...days.flatMap(d => [d.fitness, d.fatigue])) * 1.1
  const fMax = Math.max(5, ...days.map(d => Math.abs(d.form)))
  const bw = (W - padL) / days.length
  const x = (i: number) => padL + i * bw + bw / 2
  const y = (v: number) => padT + (1 - v / max) * (top - padT)
  const fy0 = H - padB - formH / 2
  const line = (k: 'fitness' | 'fatigue') => days.map((d, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(d[k]).toFixed(1)}`).join(' ')
  const h = hover !== null ? days[hover] : days.at(-1)!

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    const i = Math.round(((e.clientX - r.left) / r.width * W - padL - bw / 2) / bw)
    setHover(Math.min(days.length - 1, Math.max(0, i)))
  }

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
        <span className="font-semibold">{hover !== null ? shortDate(h.date) : 'วันนี้'}</span>
        <Legend swatch="bg-run" label="ฟิต" value={h.fitness} />
        <Legend swatch="bg-accent" label="ล้า" value={h.fatigue} />
        <Legend swatch={h.form >= 0 ? 'bg-good' : 'bg-warn'} label="ฟอร์ม" value={h.form} signed />
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="block w-full touch-none" role="img" aria-label="กราฟความฟิต ความล้า และฟอร์ม"
        onPointerMove={onMove} onPointerDown={onMove} onPointerLeave={() => setHover(null)}>
        <line x1={padL} x2={W} y1={top} y2={top} className="stroke-line" />
        <text x={padL - 4} y={y(max / 1.1) + 3} textAnchor="end" className="fill-muted text-[9px]">{Math.round(max / 1.1)}</text>
        <line x1={padL} x2={W} y1={fy0} y2={fy0} className="stroke-line" />
        {days.map((d, i) => {
          const hgt = (Math.abs(d.form) / fMax) * (formH / 2)
          return <rect key={d.date} x={x(i) - Math.max(1, bw * 0.35)} width={Math.max(2, bw * 0.7)} y={d.form >= 0 ? fy0 - hgt : fy0} height={Math.max(0.5, hgt)}
            className={cx(d.form >= 0 ? 'fill-good' : 'fill-warn', hover === i ? 'opacity-100' : 'opacity-60')} />
        })}
        <path d={line('fatigue')} fill="none" className="stroke-accent" strokeWidth={2} strokeLinejoin="round" />
        <path d={line('fitness')} fill="none" className="stroke-run" strokeWidth={2.5} strokeLinejoin="round" />
        {[0, Math.floor(days.length / 2), days.length - 1].map(i => (
          <text key={i} x={x(i)} y={H - 4} textAnchor={i === 0 ? 'start' : i === days.length - 1 ? 'end' : 'middle'} className="fill-muted text-[9px]">{shortDate(days[i].date)}</text>
        ))}
        {hover !== null && <line x1={x(hover)} x2={x(hover)} y1={padT} y2={H - padB} className="stroke-ink/40" />}
      </svg>
    </div>
  )
}

function Legend({ swatch, label, value, signed }: { swatch: string; label: string; value: number; signed?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1 text-muted">
      <span className={cx('size-2.5 rounded-full', swatch)} />
      {label} <b className="tabular-nums text-ink">{signed && value > 0 ? '+' : ''}{Math.round(value)}</b>
    </span>
  )
}

/** แถบสัดส่วนระยะทางในแต่ละโซน + คำอธิบายสี (ระบุด้วยตัวอักษร ไม่พึ่งสีอย่างเดียว) */
export function ZoneBar({ series, fiveK }: { series: { km: number; pace: number }[]; fiveK: number }) {
  const zones = distanceByZone(series, fiveK)
  return (
    <div>
      <div className="mb-1.5 text-xs text-muted">ระยะในแต่ละโซนเพซ</div>
      <div className="flex h-3 gap-0.5 overflow-hidden rounded-full">
        {zones.filter(z => z.pct > 0.005).map(z => (
          <span key={z.id} title={`${z.id} ${z.label}: ${Math.round(z.pct * 100)}%`} style={{ width: `${z.pct * 100}%`, background: z.color }} />
        ))}
      </div>
      <ul className="mt-2 grid grid-cols-5 gap-1 text-center text-[10px] leading-tight">
        {zones.map(z => (
          <li key={z.id} className={cx(z.pct < 0.005 && 'opacity-40')}>
            <span className="mx-auto mb-0.5 grid size-5 place-items-center rounded-md text-[10px] font-bold text-white" style={{ background: z.color }}>{z.id}</span>
            <span className="block font-semibold">{z.label}</span>
            <span className="block tabular-nums text-muted">{Math.round(z.pct * 100)}%</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function ZoneLegend({ fiveK }: { fiveK: number }) {
  const fmt = (s: number) => formatPace(s, 1)
  const bounds = [fiveK * 1.2, fiveK * 1.1, fiveK * 1.04, fiveK * 0.97]
  return (
    <ul className="space-y-1 text-xs">
      {ZONES.map((z, i) => (
        <li key={z.id} className="flex items-center gap-2">
          <span className="grid size-5 shrink-0 place-items-center rounded-md text-[10px] font-bold text-white" style={{ background: z.color }}>{z.id}</span>
          <span className="w-16 font-semibold">{z.label}</span>
          <span className="flex-1 text-muted">{z.desc}</span>
          <span className="tabular-nums">{i === 0 ? `ช้ากว่า ${fmt(bounds[0])}` : i === 4 ? `เร็วกว่า ${fmt(bounds[3])}` : `${fmt(bounds[i])}–${fmt(bounds[i - 1])}`}</span>
        </li>
      ))}
    </ul>
  )
}
