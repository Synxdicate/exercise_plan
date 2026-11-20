import { cumulative } from './analysis'
import { haversine, type Point } from './geo'
import { sampleRoute } from './elevation'

// จุดน้ำ/ห้องน้ำ/ร้านสะดวกซื้อตลอดเส้นทางวิ่ง จาก OpenStreetMap (Overpass API ฟรี ไม่ต้องใช้ key) ภายใน 150 ม. จากเส้นทาง
// แนวคิดจาก FrontRunnr: เรียงตามกิโลที่วิ่งผ่าน และเตือนช่วงยาวที่ไม่มีที่เติมน้ำ (วิ่งยาวในอากาศร้อนแบบไทย) (pure, tested)

export type StopKind = 'water' | 'shop' | 'toilet'
export type Stop = { kind: StopKind; km: number; off: number; name: string; at: Point }
export type OsmElement = { type: string; id: number; lat?: number; lon?: number; center?: { lat: number; lon: number }; tags?: Record<string, string> }

export const STOP_RADIUS = 150
/** ช่วงที่ไม่มีที่เติมน้ำยาวกว่านี้ (กม.) เตือน */
export const WATER_GAP_KM = 3

/** คำสั่ง Overpass: ตามแนวเส้นทาง (ย่อเหลือ ≤80 จุด) หาน้ำดื่ม ห้องน้ำ และร้านสะดวกซื้อ */
export function overpassQuery(route: Point[]) {
  const line = sampleRoute(route, 80).map(([a, b]) => `${a.toFixed(5)},${b.toFixed(5)}`).join(',')
  const around = `(around:${STOP_RADIUS},${line})`
  return `[out:json][timeout:25];(nwr${around}[amenity=drinking_water];nwr${around}[amenity=toilets];nwr${around}[shop=convenience];);out center tags;`
}

const kindOf = (t: Record<string, string> = {}): StopKind | null =>
  t.amenity === 'drinking_water' ? 'water' : t.amenity === 'toilets' ? 'toilet' : t.shop === 'convenience' ? 'shop' : null

/** ผลจาก Overpass → จุดบนเส้นทาง: กิโลที่ใกล้ที่สุดบนเส้นทาง และห่างจากเส้นทางกี่เมตร (เรียงตามกิโล) */
export function stopsAlong(route: Point[], elements: OsmElement[], totalKm?: number): Stop[] {
  if (route.length < 2) return []
  const d = cumulative(route)
  const scale = totalKm ? (totalKm * 1000) / d[d.length - 1] : 1
  const out: Stop[] = []
  for (const e of elements) {
    const kind = kindOf(e.tags)
    const lat = e.lat ?? e.center?.lat
    const lon = e.lon ?? e.center?.lon
    if (!kind || lat === undefined || lon === undefined) continue
    let best = Infinity
    let at = 0
    route.forEach((p, i) => { const m = haversine(p, [lat, lon]); if (m < best) { best = m; at = i } })
    if (best > STOP_RADIUS + 30) continue
    const t = e.tags ?? {}
    out.push({ kind, km: Math.round((d[at] * scale) / 100) / 10, off: Math.round(best / 10) * 10, name: t.name ?? t.brand ?? t.operator ?? '', at: [+lat.toFixed(5), +lon.toFixed(5)] })
  }
  // จุดเดียวกันที่มาซ้ำ (ร้านเดียวกันหลายสาขาติดกันไม่รวม) ตัดที่ชนิด+กิโล+ชื่อซ้ำ
  const seen = new Set<string>()
  return out.sort((a, b) => a.km - b.km || a.off - b.off).filter(s => { const k = `${s.kind}|${s.km}|${s.name}`; if (seen.has(k)) return false; seen.add(k); return true })
}

/** ช่วงที่ไม่มีที่เติมน้ำ (น้ำดื่มหรือร้านสะดวกซื้อ) ยาวที่สุด รวมช่วงจากจุดเริ่มและถึงเส้นชัย */
export function longestWaterGap(stops: Stop[], totalKm: number): { from: number; to: number; km: number } {
  const marks = [0, ...stops.filter(s => s.kind !== 'toilet').map(s => s.km), totalKm].sort((a, b) => a - b)
  let best = { from: 0, to: totalKm, km: totalKm }
  if (marks.length > 2) best = { from: 0, to: 0, km: 0 }
  for (let i = 1; i < marks.length; i++) {
    const km = Math.round((marks[i] - marks[i - 1]) * 10) / 10
    if (km > best.km) best = { from: marks[i - 1], to: marks[i], km }
  }
  return best
}

/** จุดแวะของเส้นทางนี้ (ต้องต่อเน็ต) */
export async function fetchStops(route: Point[], totalKm?: number): Promise<Stop[]> {
  const r = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST', body: new URLSearchParams({ data: overpassQuery(route) }), signal: AbortSignal.timeout(30_000),
  })
  if (!r.ok) throw new Error(`overpass ${r.status}`)
  return stopsAlong(route, ((await r.json()) as { elements?: OsmElement[] }).elements ?? [], totalKm)
}

/** ผลที่เก็บในเครื่อง (device key `routeStops`: run id → ผล) ไม่ซิงก์ ดึงใหม่ได้เสมอ */
export type StopsCache = Record<string, { at: string; stops: Stop[] }>
