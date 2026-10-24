import { useState } from 'react'
import { ChevronDown, MapPin, Thermometer } from 'lucide-react'
import { bestHour, heatAdvice, heatLevel, useHeat, type HeatLevel } from '../lib/weather'
import { cx } from '../lib/cx'
import { Card, Collapse } from './ui'

const tone: Record<HeatLevel, string> = {
  ok: 'bg-good/15 text-good',
  warm: 'bg-warn/15 text-warn',
  hot: 'bg-bad/15 text-bad',
  danger: 'bg-bad text-white',
}
const bar: Record<HeatLevel, string> = { ok: 'bg-good', warm: 'bg-warn', hot: 'bg-bad', danger: 'bg-bad' }

const nowIso = () => {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:00`
}

/** ความร้อนตอนนี้ + ช่วงเวลาที่เหมาะกับการวิ่ง (พยากรณ์จาก Open-Meteo) */
export function HeatCard() {
  const { hours, place, error } = useHeat()
  const [open, setOpen] = useState(false)
  if (error) return null
  if (!hours) return <Card><div className="h-20 animate-pulse rounded-2xl bg-raised" /></Card>

  const now = nowIso()
  const cur = hours.find(h => h.time.slice(0, 13) === now.slice(0, 13)) ?? hours[0]
  const level = heatLevel(cur.wbgt)
  const best = bestHour(hours, now)
  const strip = hours.filter(h => h.time.slice(0, 10) === now.slice(0, 10) && h.hour >= 5 && h.hour <= 21)

  return (
    <section className="rounded-2xl bg-card p-3.5 shadow-sm ring-1 ring-line">
      <button onClick={() => setOpen(!open)} aria-expanded={open} className="flex w-full items-center gap-3 text-left active:scale-100">
        <span className={cx('grid size-11 shrink-0 place-items-center rounded-xl text-center leading-none', tone[level])}>
          <span className="text-base font-extrabold tabular-nums">{cur.wbgt.toFixed(0)}°</span>
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5 text-sm font-bold"><Thermometer size={14} className="text-warn" /> {heatAdvice[level].label} · {cur.temp.toFixed(0)}°C ชื้น {cur.rh}%</span>
          {best && <span className="block truncate text-xs text-muted">เย็นสุดถัดไป {best.time.slice(0, 10) === now.slice(0, 10) ? 'วันนี้' : 'พรุ่งนี้'} {String(best.hour).padStart(2, '0')}:00 (WBGT ~{best.wbgt.toFixed(0)}°)</span>}
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
          {strip.length > 0 && (
            <div className="mt-3">
              <div className="flex h-10 items-end gap-0.5">
                {strip.map(h => (
                  <div key={h.time} title={`${h.hour}:00 · WBGT ~${h.wbgt}`} className={cx('flex-1 rounded-t', bar[heatLevel(h.wbgt)], h.time.slice(0, 13) === now.slice(0, 13) ? 'opacity-100' : 'opacity-50')}
                    style={{ height: `${Math.min(100, Math.max(15, ((h.wbgt - 18) / 16) * 100))}%` }} />
                ))}
              </div>
              <div className="mt-1 flex justify-between text-[10px] text-muted"><span>05:00</span><span>13:00</span><span>21:00</span></div>
            </div>
          )}
          <p className="mt-2 text-[11px] text-muted">WBGT ในที่ร่ม ประมาณจากอุณหภูมิและความชื้น (Stull 2011) — กลางแดดจริงร้อนกว่านี้ ~2–3° ระดับอิงแนวทาง ACSM แบบระมัดระวัง</p>
        </div>
      </Collapse>
    </section>
  )
}
