// ฟังก์ชันพิกัดล้วน ๆ (ไม่พึ่ง browser/Capacitor) — ใช้ได้ทั้งในแอปและในชุดทดสอบ
export type Point = [lat: number, lon: number]

const R = 6371e3
export function haversine([lat1, lon1]: Point, [lat2, lon2]: Point) {
  const rad = Math.PI / 180
  const dLat = (lat2 - lat1) * rad
  const dLon = (lon2 - lon1) * rad
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}
