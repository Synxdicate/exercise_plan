import { cumulative } from './analysis'
import type { Point } from './geo'

// ความสูงของเส้นทาง: GPS มือถือวัดความสูงคลาดเคลื่อนมาก จึงดึงจากแผนที่ความสูง (DEM ~90 ม.) ของ Open-Meteo แทน
// ใช้ตอบคำถาม "เส้นทางนี้มีเนินซึมเท่าไร" — ค่าคร่าว ๆ ระดับเนินยาว ไม่เห็นเนินสั้น ๆ อย่างสะพาน

export const ELEV_SAMPLES = 100 // Open-Meteo รับได้สูงสุด 100 พิกัดต่อครั้ง
const BATCHES = 3

/** จำนวนจุดสุ่ม: ทุก ~25 ม. (ละเอียดกว่าแผนที่ความสูงเล็กน้อย ให้ปรับเรียบได้) สูงสุด 300 จุด (3 ครั้งเรียก) */
export const samplesFor = (km: number) => Math.max(20, Math.min(ELEV_SAMPLES * BATCHES, Math.round((km * 1000) / 25) + 1))

/** เลือกจุดเท่า ๆ กันตามระยะทาง (ไม่ใช่ตามลำดับจุด GPS ที่ถี่ไม่เท่ากัน) */
export function sampleRoute(route: Point[], n = ELEV_SAMPLES): Point[] {
  if (route.length <= n) return route
  const d = cumulative(route)
  const total = d[d.length - 1]
  const out: Point[] = []
  let j = 0
  for (let i = 0; i < n; i++) {
    const target = (total * i) / (n - 1)
    while (j < d.length - 1 && d[j] < target) j++
    out.push(route[j])
  }
  return out
}

/** ขึ้นสะสม/ลงสะสม — ไม่นับการแกว่งไม่ถึง `step` เมตร (กันสัญญาณรบกวนของแผนที่ความสูง) */
export function elevStats(profile: number[], step = 1) {
  let gain = 0, loss = 0
  let ref = profile[0] ?? 0
  for (const h of profile) {
    if (h - ref >= step) { gain += h - ref; ref = h }
    else if (ref - h >= step) { loss += ref - h; ref = h }
  }
  return { gain: Math.round(gain), loss: Math.round(loss), max: Math.round(Math.max(...profile)), min: Math.round(Math.min(...profile)) }
}

async function fetchBatch(points: Point[]): Promise<number[]> {
  const lat = points.map(p => p[0].toFixed(5)).join(',')
  const lon = points.map(p => p[1].toFixed(5)).join(',')
  const res = await fetch(`https://api.open-meteo.com/v1/elevation?latitude=${lat}&longitude=${lon}`, { signal: AbortSignal.timeout(10_000) })
  if (!res.ok) throw new Error(`elevation ${res.status}`)
  const data = (await res.json()) as { elevation?: number[] }
  if (!data.elevation || data.elevation.length !== points.length) throw new Error('elevation: bad response')
  return data.elevation.map(h => Math.round(h * 10) / 10)
}

/** ความสูงของทุกจุด (แบ่งส่งครั้งละ ≤100 จุด) */
export async function fetchElevation(points: Point[]): Promise<number[]> {
  const out: number[] = []
  for (let i = 0; i < points.length; i += ELEV_SAMPLES) out.push(...await fetchBatch(points.slice(i, i + ELEV_SAMPLES)))
  return out
}
