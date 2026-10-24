import { haversine, type Point } from './geo'
import { toDateStr } from './date'

// อ่านไฟล์ GPX จาก Strava / Garmin / นาฬิกา → ระยะ เวลาเคลื่อนที่ เพซรายกิโล และเส้นทาง
export function parseGpx(xml: string) {
  const doc = new DOMParser().parseFromString(xml, 'application/xml')
  if (doc.querySelector('parsererror')) throw new Error('ไฟล์ GPX ไม่ถูกต้อง')
  const pts = [...doc.getElementsByTagName('trkpt'), ...doc.getElementsByTagName('rtept')]
    .map(el => ({
      p: [parseFloat(el.getAttribute('lat') ?? ''), parseFloat(el.getAttribute('lon') ?? '')] as Point,
      t: Date.parse(el.getElementsByTagName('time')[0]?.textContent ?? ''),
    }))
    .filter(x => Number.isFinite(x.p[0]) && Number.isFinite(x.p[1]))
  if (pts.length < 2) throw new Error('ไม่พบเส้นทางในไฟล์')
  const timed = pts.every(x => Number.isFinite(x.t))

  let meters = 0
  let moving = 0
  const cum = [0] // เวลาเคลื่อนที่สะสมของแต่ละจุด
  const splits: number[] = []
  let splitStart = 0
  for (let i = 1; i < pts.length; i++) {
    const d = haversine(pts[i - 1].p, pts[i].p)
    meters += d
    if (timed) {
      const dt = (pts[i].t - pts[i - 1].t) / 1000
      // นับเฉพาะช่วงที่ขยับจริง (ตัดช่วงหยุดรอไฟแดง/พัก)
      if (dt > 0 && dt < 60 && d / dt > 0.5) moving += dt
      cum.push(Math.round(moving))
      while (meters >= (splits.length + 1) * 1000) {
        splits.push(Math.round(moving - splitStart))
        splitStart = moving
      }
    }
  }

  // ลดจุดให้ไม่เกิน ~1,500 จุด พอสำหรับวาดแผนที่ และไม่หนักตอนซิงก์
  const step = Math.ceil(pts.length / 1500)
  const keep = (_: unknown, i: number) => i % step === 0 || i === pts.length - 1
  const route = pts.filter(keep).map(x => x.p.map(v => +v.toFixed(6)) as Point)
  const times = timed ? cum.filter(keep) : undefined

  return {
    date: timed ? toDateStr(new Date(pts[0].t)) : null,
    km: +(meters / 1000).toFixed(2),
    seconds: timed ? Math.round(moving) : 0,
    elapsedSeconds: timed ? Math.round((pts.at(-1)!.t - pts[0].t) / 1000) : 0,
    splits: timed ? splits : [],
    route,
    times,
  }
}
