import { useState } from 'react'
import { ChevronDown, MapPin, Thermometer, Wind } from 'lucide-react'
import { airAdvice, airLevel, bestHour, bestHourOn, heatAdvice, heatLevel, useHeat, type AirLevel, type HeatLevel } from '../lib/weather'
import { cx } from '../lib/cx'
import { Collapse, Segmented } from './ui'
import { addDays } from '../lib/date'
import { useT } from '../lib/i18n'

const tone: Record<HeatLevel, string> = {
  ok: 'bg-good/15 text-good',
  warm: 'bg-warn/15 text-warn',
  hot: 'bg-bad/15 text-bad',
  danger: 'bg-bad-fill text-white',
}
const airTone: Record<AirLevel, string> = { good: 'text-good', moderate: 'text-warn', sensitive: 'text-bad', bad: 'text-bad' }
const bar: Record<HeatLevel, string> = { ok: 'bg-good-fill', warm: 'bg-warn', hot: 'bg-bad-fill', danger: 'bg-bad-fill' }

const nowIso = () => {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:00`
}

/** ความร้อน + ฝุ่น PM2.5 ตอนนี้ และช่วงเวลาที่เหมาะกับการวิ่ง (พยากรณ์จาก Open-Meteo) */
export function HeatCard({ initialDay = 'today' }: { initialDay?: 'today' | 'tomorrow' }) {
  const { hours, place, error } = useHeat()
  const [open, setOpen] = useState(initialDay === 'tomorrow')
  const [day, setDay] = useState<'today' | 'tomorrow'>(initialDay)
  const t = useT()
  if (error) return null
  // โครงเดียวกับการ์ดจริง (สูงเท่ากัน) หน้าไม่กระโดดตอนโหลดเสร็จ
  if (!hours) return (
    <section className="flex items-center gap-3 rounded-2xl bg-card p-3.5 shadow-sm ring-1 ring-line" aria-busy>
      <span className="size-11 shrink-0 animate-pulse rounded-xl bg-raised" />
      <span className="flex-1 space-y-1.5">
        <span className="flex items-center gap-1.5 text-sm text-muted"><Thermometer size={14} /> {t('กำลังโหลดสภาพอากาศ…', 'Loading weather…')}</span>
        <span className="block h-3 w-2/3 animate-pulse rounded bg-raised" />
      </span>
    </section>
  )

  const now = nowIso()
  const cur = hours.find(h => h.time.slice(0, 13) === now.slice(0, 13)) ?? hours[0]
  const level = heatLevel(cur.wbgt)
  const best = bestHour(hours, now)
  const air = cur.pm25 === undefined ? null : airLevel(cur.pm25)
  const date = day === 'today' ? now.slice(0, 10) : addDays(now.slice(0, 10), 1)
  const strip = hours.filter(h => h.time.slice(0, 10) === date && h.hour >= 5 && h.hour <= 21)
  const dayBest = bestHourOn(hours, date, now)
  const morning = strip.find(h => h.hour === 6)

  return (
    <section className="rounded-2xl bg-card p-3.5 shadow-sm ring-1 ring-line">
      <button onClick={() => setOpen(!open)} aria-expanded={open} className="flex w-full items-center gap-3 text-left active:scale-100">
        <span className={cx('flex size-11 shrink-0 flex-col items-center justify-center gap-0.5 rounded-xl text-center leading-none', tone[level])}>
          <span className="text-base font-extrabold tabular-nums">{cur.wbgt.toFixed(0)}°</span>
          <span className="text-[9px] font-bold">WBGT</span>
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5 text-sm font-bold"><Thermometer size={14} className="text-warn" /> {t(heatAdvice[level].label, heatAdvice[level].labelEn)} · {cur.temp.toFixed(0)}°C {t('ชื้น', 'RH')} {cur.rh}%</span>
          {air && <span className={cx('flex items-center gap-1.5 text-xs font-semibold', airTone[air])}><Wind size={13} /> PM2.5 {cur.pm25} · {t(airAdvice[air].label, airAdvice[air].labelEn)}</span>}
          {best && <span className="block truncate text-xs text-muted">{t('ช่วงเหมาะสุดถัดไป', 'Best time')} {best.time.slice(0, 10) === now.slice(0, 10) ? t('วันนี้', 'today') : t('พรุ่งนี้', 'tomorrow')} {String(best.hour).padStart(2, '0')}:00 (WBGT ~{best.wbgt.toFixed(0)}°{best.pm25 !== undefined && ` · PM2.5 ${best.pm25}`})</span>}
        </span>
        <ChevronDown size={18} className={cx('shrink-0 text-muted transition-transform duration-300', open && 'rotate-180')} />
      </button>
      {place && (
        <div className="mt-2 flex items-center gap-1 text-[11px] text-muted">
          <MapPin size={12} className="shrink-0" />
          <span className="truncate">{place.name}{!place.precise && t(' (ค่าเริ่มต้น)', ' (default)')}</span>
        </div>
      )}
      <Collapse open={open}>
        <div className="pt-3">
          {day === 'today' && <p className="text-sm">{t(heatAdvice[level].text, heatAdvice[level].textEn)}</p>}
          {day === 'today' && air && air !== 'good' && <p className="mt-1.5 text-sm">{t(airAdvice[air].text, airAdvice[air].textEn)}</p>}
          <div className={day === 'today' ? 'mt-3' : ''}>
            <Segmented value={day} onChange={setDay} options={[{ value: 'today', label: t('วันนี้', 'Today') }, { value: 'tomorrow', label: t('พรุ่งนี้', 'Tomorrow') }]} />
          </div>
          {dayBest ? (
            <p className="mt-2 text-sm">
              <span className="font-semibold">{t('ช่วงเหมาะสุด', 'Best time')} {String(dayBest.hour).padStart(2, '0')}:00</span>
              {' '}· WBGT ~{dayBest.wbgt.toFixed(0)}° {t(heatAdvice[heatLevel(dayBest.wbgt)].label, heatAdvice[heatLevel(dayBest.wbgt)].labelEn)}{dayBest.pm25 !== undefined && ` · PM2.5 ${dayBest.pm25}`}
              {day === 'tomorrow' && morning && morning !== dayBest && <span className="block text-xs text-muted">06:00 · WBGT ~{morning.wbgt.toFixed(0)}° · {morning.temp.toFixed(0)}°C{morning.pm25 !== undefined && ` · PM2.5 ${morning.pm25}`}</span>}
            </p>
          ) : <p className="mt-2 text-sm text-muted">{t('วันนี้เลย 21:00 แล้ว ดูของพรุ่งนี้แทน', 'Past 21:00 — check tomorrow instead')}</p>}
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
          <p className="mt-2 text-[11px] text-muted">{t('WBGT ในที่ร่ม (ประมาณ) กลางแดดร้อนกว่านี้ ~2–3° · PM2.5 เป็นค่าพยากรณ์รายชั่วโมง (µg/m³) เทียบเกณฑ์กรมควบคุมมลพิษ', 'Shade WBGT (estimate) — ~2–3° hotter in the sun · PM2.5 is an hourly forecast (µg/m³) against Thai PCD bands')}</p>
        </div>
      </Collapse>
    </section>
  )
}
