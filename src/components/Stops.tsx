import { useState } from 'react'
import { Droplets, MapPin, Store, Toilet, TriangleAlert } from 'lucide-react'
import type { Point } from '../lib/geo'
import type { Run } from '../lib/log'
import { fetchStops, longestWaterGap, WATER_GAP_KM, type Stop, type StopKind } from '../lib/stops'
import { STOP_COLOR, useStopsCache } from '../lib/useStops'
import { useT } from '../lib/i18n'
import { Button } from './ui'
import { niceDate, today } from '../lib/date'

const ICON = { water: Droplets, shop: Store, toilet: Toilet }
const LABEL: Record<StopKind, [string, string]> = { water: ['น้ำดื่ม', 'Water'], shop: ['ร้านสะดวกซื้อ', 'Shop'], toilet: ['ห้องน้ำ', 'Toilet'] }

/** รายละเอียดรอบวิ่ง: น้ำดื่ม ร้านสะดวกซื้อ และห้องน้ำตลอดเส้นทาง (OpenStreetMap) เรียงตามกิโล + ช่วงที่ไม่มีน้ำ */
export function RouteStopsCard({ run, onPick }: { run: Run; onPick?: (p: Point) => void }) {
  const t = useT()
  const [cache, setCache] = useStopsCache()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(false)
  if (!run.route || run.route.length < 10 || run.km < 1) return null
  const got = cache[run.id]
  const load = async () => {
    setBusy(true)
    setError(false)
    try {
      const stops = await fetchStops(run.route!, run.km)
      setCache(prev => ({ ...prev, [run.id]: { at: today(), stops } }))
    } catch {
      setError(true)
    } finally {
      setBusy(false)
    }
  }
  const gap = got ? longestWaterGap(got.stops, run.km) : null
  const counts = (k: StopKind) => got?.stops.filter(s => s.kind === k).length ?? 0
  return (
    <section className="rounded-2xl bg-card p-3.5 shadow-sm ring-1 ring-line">
      <div className="card-title flex items-center gap-2 font-bold"><MapPin size={18} /> {t('น้ำและห้องน้ำบนเส้นทางนี้', 'Water & toilets on this route')}</div>
      {!got ? (
        <>
          <p className="mt-1 text-sm text-muted">{t('หาน้ำดื่ม ร้านสะดวกซื้อ และห้องน้ำที่ห่างจากเส้นทางไม่เกิน 150 ม. เรียงตามกิโล ใช้วางแผนวิ่งยาวรอบหน้าบนเส้นนี้ ข้อมูลจาก OpenStreetMap ต้องต่อเน็ต', 'Find drinking water, convenience stores and toilets within 150 m of the route, in km order, to plan your next long run here. Data from OpenStreetMap; needs internet.')}</p>
          <Button size="sm" variant="soft" className="mt-2" disabled={busy} onClick={() => void load()}>{busy ? t('กำลังหา…', 'Searching…') : t('หาจุดแวะ', 'Find stops')}</Button>
          {error && <p className="mt-2 text-xs text-bad" role="status">{t('หาไม่สำเร็จ ลองใหม่อีกครั้ง (บริการแผนที่อาจไม่ว่างชั่วคราว)', 'Search failed; try again (the map service may be busy)')}</p>}
        </>
      ) : (
        <>
          <p className="mt-1 text-xs text-muted">
            {(['water', 'shop', 'toilet'] as const).map(k => (
              <span key={k} className="mr-3 inline-flex items-center gap-1"><span className="inline-block size-2.5 rounded-full" style={{ background: STOP_COLOR[k] }} />{t(...LABEL[k])} {counts(k)}</span>
            ))}
          </p>
          {gap && gap.km >= WATER_GAP_KM && (
            <p className="mt-2 flex items-start gap-2 rounded-xl bg-warn/15 p-2.5 text-sm text-warn">
              <TriangleAlert size={16} className="mt-0.5 shrink-0" />
              <span>{t(`ช่วง กม. ${gap.from}–${gap.to} (${gap.km} กม.) ไม่มีที่เติมน้ำ วิ่งยาวหรือวันร้อนควรพกน้ำ หรือวนกลับมาเติมก่อนเข้าช่วงนี้`, `km ${gap.from}–${gap.to} (${gap.km} km) has no water. On long or hot runs carry a bottle or loop back to refill before this stretch.`)}</span>
            </p>
          )}
          {got.stops.length ? (
            <ul className="mt-2 divide-y divide-line text-sm">
              {got.stops.slice(0, 30).map((s, i) => <StopRow key={i} s={s} onPick={onPick} />)}
            </ul>
          ) : <p className="mt-2 text-sm text-muted">{t('ไม่พบจุดแวะในข้อมูลแผนที่ (ข้อมูลในบางพื้นที่ยังไม่ครบ) ควรพกน้ำไปเอง', 'No stops in the map data (some areas are incomplete); carry your own water.')}</p>}
          <div className="mt-2 flex items-center justify-between gap-2 text-xs text-muted">
            <span>{t(`ข้อมูล OpenStreetMap เมื่อ ${niceDate(got.at)} อาจไม่ครบหรือปิดไปแล้ว`, `OpenStreetMap data from ${niceDate(got.at)}; may be incomplete or out of date`)}</span>
            <Button size="sm" variant="soft" disabled={busy} onClick={() => void load()}>{busy ? t('กำลังหา…', 'Searching…') : t('หาใหม่', 'Refresh')}</Button>
          </div>
        </>
      )}
    </section>
  )
}

function StopRow({ s, onPick }: { s: Stop; onPick?: (p: Point) => void }) {
  const t = useT()
  const Icon = ICON[s.kind]
  return (
    <li>
      <button className="flex w-full items-center gap-2 py-1.5 text-left active:scale-100" onClick={() => onPick?.(s.at)}>
        <span className="w-14 shrink-0 tabular-nums text-muted">{t('กม.', 'km')} {s.km}</span>
        <Icon size={15} className="shrink-0" style={{ color: STOP_COLOR[s.kind] }} />
        <span className="min-w-0 flex-1 truncate">{s.name || t(...LABEL[s.kind])}</span>
        <span className="shrink-0 text-xs text-muted">{s.off <= 20 ? t('ติดเส้นทาง', 'on route') : t(`ห่าง ${s.off} ม.`, `${s.off} m off`)}</span>
      </button>
    </li>
  )
}
