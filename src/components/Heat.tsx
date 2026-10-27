import { useState } from 'react'
import { ChevronDown, MapPin, Thermometer, Wind } from 'lucide-react'
import { airAdvice, airLevel, bestHour, heatAdvice, heatLevel, useHeat, type AirLevel, type HeatLevel } from '../lib/weather'
import { cx } from '../lib/cx'
import { Card, Collapse } from './ui'

const tone: Record<HeatLevel, string> = {
  ok: 'bg-good/15 text-good',
  warm: 'bg-warn/15 text-warn',
  hot: 'bg-bad/15 text-bad',
  danger: 'bg-bad text-white',
}
const airTone: Record<AirLevel, string> = { good: 'text-good', moderate: 'text-warn', sensitive: 'text-bad', bad: 'text-bad' }
const bar: Record<HeatLevel, string> = { ok: 'bg-good', warm: 'bg-warn', hot: 'bg-bad', danger: 'bg-bad' }

const nowIso = () => {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:00`
}

/** ความร้อน + ฝุ่น PM2.5 ตอนนี้ และช่วงเวลาที่เหมาะกับการวิ่ง (พยากรณ์จาก Open-Meteo) */
export function HeatCard() {
  const { hours, place, error } = useHeat()
  const [open, setOpen] = useState(false)
  if (error) return null
  if (!hours) return <Card><div className="h-20 animate-pulse rounded-2xl bg-raised" /></Card>

  const now = nowIso()
  const cur = hours.find(h => h.time.slice(0, 13) === now.slice(0, 13)) ?? hours[0]
  const level = heatLevel(cur.wbgt)
  const best = bestHour(hours, now)
  const air = cur.pm25 === undefined ? null : airLevel(cur.pm25)
  const strip = hours.filter(h => h.time.slice(0, 10) === now.slice(0, 10) && h.hour >= 5 && h.hour <= 21)

  return (
    <section className="rounded-2xl bg-card p-3.5 shadow-sm ring-1 ring-line">
      <button onClick={() => setOpen(!open)} aria-expanded={open} className="flex w-full items-center gap-3 text-left active:scale-100">
        <span className={cx('grid size-11 shrink-0 place-items-center rounded-xl text-center leading-none', tone[level])}>
          <span className="text-base font-extrabold tabular-nums">{cur.wbgt.toFixed(0)}°</span>
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5 text-sm font-bold"><Thermometer size={14} className="text-warn" /> {heatAdvice[level].label} · {cur.temp.toFixed(0)}°C ชื้น {cur.rh}%</span>
          {air && <span className={cx('flex items-center gap-1.5 text-xs font-semibold', airTone[air])}><Wind size={13} /> PM2.5 {cur.pm25} · {airAdvice[air].label}</span>}
          {best && <span className="block truncate text-xs text-muted">ช่วงเหมาะสุดถัดไป {best.time.slice(0, 10) === now.slice(0, 10) ? 'วันนี้' : 'พรุ่งนี้'} {String(best.hour).padStart(2, '0')}:00 (WBGT ~{best.wbgt.toFixed(0)}°{best.pm25 !== undefined && ` · PM2.5 ${best.pm25}`})</span>}
        </span>
        <ChevronDown size={18} className={cx('shrink-0 text-muted transition-transform duration-300', open && 'rotate-180')} />
      </button>
      {place && (
        <div className="mt-2 flex items-center gap-1 text-[11px] text-muted">
          <MapPin size={12} className="shrink-0" />
          <span className="truncate">{place.name}{!place.precise && ' (ค่าเริ่มต้น — อนุญาตตำแหน่งเพื่อดูอากาศตรงที่คุณอยู่)'}</span>
        </div>
      )}
      <Collapse open={open}>
        <div className="pt-3">
          <p className="text-sm">{heatAdvice[level].text}</p>
          {air && air !== 'good' && <p className="mt-1.5 text-sm">{airAdvice[air].text}</p>}
          {strip.length > 0 && (
            <div className="mt-3">
              <div className="flex h-10 items-end gap-0.5">
                {strip.map(h => (
                  <div key={h.time} title={`${h.hour}:00 · WBGT ~${h.wbgt}${h.pm25 !== undefined ? ` · PM2.5 ${h.pm25}` : ''}`} className={cx('flex-1 rounded-t', bar[heatLevel(h.wbgt)], h.time.slice(0, 13) === now.slice(0, 13) ? 'opacity-100' : 'opacity-50')}
                    style={{ height: `${Math.min(100, Math.max(15, ((h.wbgt - 18) / 16) * 100))}%` }} />
                ))}
              </div>
              <div className="mt-1 flex justify-between text-[10px] text-muted"><span>05:00</span><span>13:00</span><span>21:00</span></div>
            </div>
          )}
          <p className="mt-2 text-[11px] text-muted">WBGT ในที่ร่ม (ประมาณ) กลางแดดร้อนกว่านี้ ~2–3° · PM2.5 เป็นค่าพยากรณ์รายชั่วโมง (µg/m³) เทียบเกณฑ์กรมควบคุมมลพิษ</p>
        </div>
      </Collapse>
    </section>
  )
}
