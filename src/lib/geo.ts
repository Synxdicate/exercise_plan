// ฟังก์ชันพิกัดล้วน ๆ (ไม่พึ่ง browser/Capacitor) — ใช้ได้ทั้งในแอปและในชุดทดสอบ
export type Point = [lat: number, lon: number]

// เก็บพิกัด 5 ตำแหน่ง (~1 ม.) — ละเอียดพอสำหรับ GPS มือถือ (±3–10 ม.) และเล็กกว่าเลขทศนิยมเต็มราวครึ่งหนึ่ง
// สำคัญเพราะเส้นทางทุกการวิ่งอยู่ใน key 'runs' เดียว และ localStorage จุได้ ~5 MB
const round5 = (v: number) => Math.round(v * 1e5) / 1e5
export const roundPoint = ([lat, lon]: Point): Point => [round5(lat), round5(lon)]
export const isCompact = (route: Point[]) => route.every(([lat, lon]) => lat === round5(lat) && lon === round5(lon))

const R = 6371e3
export function haversine([lat1, lon1]: Point, [lat2, lon2]: Point) {
  const rad = Math.PI / 180
  const dLat = (lat2 - lat1) * rad
  const dLon = (lon2 - lon1) * rad
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}

/** ฉายเส้นทาง lat/lon ลงกรอบ โดยคงสัดส่วนจริง (ปรับแกน lon ด้วย cos(lat)) */
export function projectRoute(route: [number, number][], box: { x: number; y: number; w: number; h: number }) {
  const lat0 = route.reduce((s, p) => s + p[0], 0) / route.length
  const k = Math.cos((lat0 * Math.PI) / 180)
  const xs = route.map(p => p[1] * k)
  const ys = route.map(p => -p[0])
  const [minX, maxX, minY, maxY] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)]
  const s = Math.min(box.w / (maxX - minX || 1e-9), box.h / (maxY - minY || 1e-9))
  const ox = box.x + (box.w - (maxX - minX) * s) / 2
  const oy = box.y + (box.h - (maxY - minY) * s) / 2
  return route.map((_, i) => [ox + (xs[i] - minX) * s, oy + (ys[i] - minY) * s] as const)
}
