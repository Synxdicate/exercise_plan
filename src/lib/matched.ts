import { haversine, type Point } from './geo'
import type { Run } from './log'

// "เส้นทางเดิม": การวิ่งที่ไปตามทางเดียวกัน (เช่น รอบสวนประจำ) — เทียบเวลาแต่ละครั้งเห็นพัฒนาการชัดกว่ายอดรวม
// วิธี: ระยะต่างกันไม่เกิน 10% และจุด 12 จุดที่กระจายเท่า ๆ กันตามระยะทาง อยู่ห่างจุดคู่กันไม่เกิน 150 ม.
const SAMPLES = 12
const MAX_GAP_M = 150
const MAX_DIST_DIFF = 0.1

/** จุดที่ระยะ 0, 1/11, …, 1 ของเส้นทาง */
export function sampleRoute(route: Point[], n = SAMPLES): Point[] {
  const cum = [0]
  for (let i = 1; i < route.length; i++) cum.push(cum[i - 1] + haversine(route[i - 1], route[i]))
  const total = cum.at(-1)!
  const out: Point[] = []
  let j = 0
  for (let k = 0; k < n; k++) {
    const d = (total * k) / (n - 1)
    while (j < cum.length - 2 && cum[j + 1] < d) j++
    const seg = cum[j + 1] - cum[j] || 1
    const t = Math.min(1, Math.max(0, (d - cum[j]) / seg))
    const [a, b] = [route[j], route[Math.min(j + 1, route.length - 1)]]
    out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t])
  }
  return out
}

export function sameRoute(a: Run, b: Run) {
  if (!a.route || !b.route || a.route.length < 5 || b.route.length < 5) return false
  if (Math.abs(a.km - b.km) / Math.max(a.km, b.km) > MAX_DIST_DIFF) return false
  const sa = sampleRoute(a.route), sb = sampleRoute(b.route)
  return sa.every((p, i) => haversine(p, sb[i]) <= MAX_GAP_M)
}

/** การวิ่งทั้งหมดบนเส้นทางเดียวกับ run (รวมตัวเอง) เรียงตามวันที่ */
export function matchedRuns(run: Run, runs: Run[]) {
  return runs.filter(r => r.id === run.id || sameRoute(run, r)).sort((x, y) => x.date.localeCompare(y.date))
}

/** เส้นทางสำหรับ heatmap: เฉพาะที่อยู่ใกล้การวิ่งล่าสุด (≤30 กม.) — ไปวิ่งต่างจังหวัดครั้งเดียวไม่ทำให้แผนที่ซูมออกจนดูอะไรไม่ออก */
export function heatmapRoutes(runs: Run[], radiusKm = 30) {
  const withRoute = runs.filter(r => r.route && r.route.length > 1).sort((a, b) => a.date.localeCompare(b.date))
  const last = withRoute.at(-1)
  if (!last) return { routes: [] as Point[][], hidden: 0 }
  const near = withRoute.filter(r => haversine(r.route![0], last.route![0]) <= radiusKm * 1000)
  return { routes: near.map(r => r.route!), hidden: withRoute.length - near.length }
}
