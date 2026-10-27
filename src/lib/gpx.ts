import { haversine, type Point, roundPoint } from './geo'
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
  const route = pts.filter(keep).map(x => roundPoint(x.p))
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

const esc = (s: string) => s.replace(/[<>&"]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' })[c]!)

/**
 * ไฟล์ GPX 1.1 สำหรับอัปโหลดเข้า Strava/แอปอื่น — เวลาแต่ละจุด = เวลาเริ่ม + เวลาเคลื่อนที่สะสม (ช่วงพักถูกบีบออก)
 * การวิ่งที่บันทึกก่อนมีเวลาเริ่ม ใช้ 06:00 ของวันนั้น
 */
export function toGpx(run: { date: string; kind: string; route?: Point[]; times?: number[]; startedAt?: number }, name = 'Kao run') {
  const route = run.route ?? []
  const start = run.startedAt ?? new Date(`${run.date}T06:00:00`).getTime()
  const pts = route.map(([lat, lon], i) => {
    const t = run.times?.[i]
    return `<trkpt lat="${lat}" lon="${lon}">${t != null ? `<time>${new Date(start + t * 1000).toISOString()}</time>` : ''}</trkpt>`
  })
  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Kao" xmlns="http://www.topografix.com/GPX/1/1">
<metadata><time>${new Date(start).toISOString()}</time></metadata>
<trk><name>${esc(name)}</name><type>running</type><trkseg>
${pts.join('\n')}
</trkseg></trk>
</gpx>
`
}
