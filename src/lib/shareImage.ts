import { Directory, Filesystem } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'
import { Media } from '@capacitor-community/media'
import { formatDuration, formatPace, runKinds, runKindsEn, type Run } from './log'
import { trNow } from './i18n'
import { isNative } from './native'
import { projectRoute } from './geo'
import { paceSeries } from './analysis'

// การ์ดรูปการวิ่งสำหรับแชร์ (1080×1350 = สัดส่วน 4:5 ของ IG) — สีคงที่ ไม่ตามธีม เพราะเป็นรูปที่ส่งออก
const W = 1080
const H = 1350
const FONT = "'Noto Sans Thai', ui-sans-serif, system-ui, sans-serif"
const thMonths = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']
const thaiDate = (s: string) => {
  const [y, m, d] = s.split('-').map(Number)
  return trNow(`${d} ${thMonths[m - 1]} ${y + 543}`, `${d} ${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][m - 1]} ${y}`)
}

export type CardStyle = 'card' | 'white' | 'black'
/** แบบของสติกเกอร์ (พื้นโปร่ง): stats = ตัวเลขเรียงลง + เส้นทาง, row = เส้นทางใหญ่ + ตัวเลขแถวเดียว,
 *  route = เส้นทางอย่างเดียว, splits = เพซรายกิโล, ticket = ตั๋ววันวิ่ง, big = ระยะตัวใหญ่, circle = ป้ายวงกลม,
 *  pace = กราฟเพซตลอดเส้นทาง, bottom = แถบตัวเลขชิดขอบล่าง (เหลือที่ให้รูปตัวเอง) */
export type ShareLayout = 'stats' | 'row' | 'route' | 'splits' | 'ticket' | 'big' | 'circle' | 'pace' | 'bottom'
export const SHARE_LAYOUTS: ShareLayout[] = ['stats', 'row', 'route', 'splits', 'ticket', 'big', 'circle', 'pace', 'bottom']

/** แบบที่ใช้ได้กับรอบนี้ (บางแบบต้องมีเส้นทาง/เพซรายกิโล/เวลาตามจุด GPS) */
export const layoutFits = (run: Run, l: ShareLayout) => {
  const hasRoute = (run.route?.length ?? 0) > 1
  if (l === 'route' || l === 'row') return hasRoute
  if (l === 'splits') return (run.splits?.length ?? 0) > 0
  if (l === 'pace') return hasRoute && paceSeries(run.route!, run.times ?? []).length >= 10
  return true
}
const WEEKDAY_TH = ['วันอาทิตย์', 'วันจันทร์', 'วันอังคาร', 'วันพุธ', 'วันพฤหัสบดี', 'วันศุกร์', 'วันเสาร์']
const WEEKDAY_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

/** วาดเส้นทางพร้อมจุดเริ่ม/จบ */
function drawRoute(g: CanvasRenderingContext2D, run: Run, box: { x: number; y: number; w: number; h: number }, color: string, width: number) {
  const pts = projectRoute(run.route!, box)
  g.lineJoin = 'round'
  g.lineCap = 'round'
  g.strokeStyle = color
  g.lineWidth = width
  g.beginPath()
  pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)))
  g.stroke()
  for (const [[x, y], dot] of [[pts[0], '#22C55E'], [pts.at(-1)!, color]] as const) {
    g.fillStyle = dot
    g.beginPath()
    g.arc(x, y, width * 1.4, 0, Math.PI * 2)
    g.fill()
  }
}

/**
 * card = การ์ดพื้นไล่สี, white/black = สติกเกอร์ PNG พื้นหลังโปร่ง (ไว้วางบนรูปอื่นในโซเชียล)
 * สติกเกอร์มีเงาจาง ๆ รอบตัวอักษร/เส้นทาง ให้อ่านออกทั้งบนรูปสว่างและมืด
 */
export async function renderRunCard(run: Run, style: CardStyle = 'card', layout: ShareLayout = 'stats'): Promise<HTMLCanvasElement> {
  await document.fonts?.load(`700 40px ${FONT}`).catch(() => {})
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const g = c.getContext('2d')!
  const hasRoute = (run.route?.length ?? 0) > 1
  if (style !== 'card') {
    const ink = style === 'white' ? '#ffffff' : '#111111'
    g.shadowColor = style === 'white' ? 'rgba(0,0,0,0.45)' : 'rgba(255,255,255,0.55)'
    g.shadowBlur = 14
    g.fillStyle = ink
    g.textBaseline = 'alphabetic'
    if (layout === 'row') drawRow(g, run, ink, hasRoute)
    else if (layout === 'route' && hasRoute) drawRouteOnly(g, run, ink)
    else if (layout === 'splits' && (run.splits?.length ?? 0) > 0) drawSplits(g, run, ink)
    else if (layout === 'ticket') drawTicket(g, run, ink)
    else if (layout === 'big') drawBig(g, run)
    else if (layout === 'circle') drawCircle(g, run, ink)
    else if (layout === 'pace' && layoutFits(run, 'pace')) drawPace(g, run, ink)
    else if (layout === 'bottom') drawBottom(g, run, ink)
    else return drawSticker(g, c, run, style, hasRoute)
    g.shadowBlur = 0
    g.textAlign = 'left'
    return c
  }

  const bg = g.createLinearGradient(0, 0, W, H)
  bg.addColorStop(0, '#E11D48')
  bg.addColorStop(1, '#6D28D9')
  g.fillStyle = bg
  g.fillRect(0, 0, W, H)

  if (hasRoute) {
    g.save()
    g.translate(0, 6)
    drawRoute(g, run, { x: 120, y: 330, w: W - 240, h: 520 }, 'rgba(0,0,0,0.25)', 22)
    g.restore()
    drawRoute(g, run, { x: 120, y: 330, w: W - 240, h: 520 }, '#ffffff', 12)
  }

  g.fillStyle = '#fff'
  g.textBaseline = 'alphabetic'
  g.font = `600 44px ${FONT}`
  g.fillText(trNow(`วิ่ง ${runKinds[run.kind]}`, `${runKindsEn[run.kind]} run`), 90, 150)
  g.globalAlpha = 0.8
  g.font = `400 38px ${FONT}`
  g.fillText(thaiDate(run.date), 90, 210)
  g.globalAlpha = 1

  const yKm = hasRoute ? 1050 : 760
  g.font = `800 ${hasRoute ? 190 : 260}px ${FONT}`
  const km = run.km.toFixed(2)
  g.fillText(km, 80, yKm)
  const kmW = g.measureText(km).width
  g.font = `600 64px ${FONT}`
  g.fillText(trNow('กม.', 'km'), 100 + kmW, yKm)

  const stats = [[trNow('เวลา', 'Time'), formatDuration(run.seconds)], [trNow('เพซเฉลี่ย', 'Avg pace'), `${formatPace(run.seconds, run.km)} ${trNow('/กม.', '/km')}`]]
  stats.forEach(([label, value], i) => {
    const x = 90 + i * 470
    g.globalAlpha = 0.8
    g.font = `400 36px ${FONT}`
    g.fillText(label, x, yKm + 110)
    g.globalAlpha = 1
    g.font = `700 64px ${FONT}`
    g.fillText(value, x, yKm + 185)
  })

  g.globalAlpha = 0.75
  g.font = `600 34px ${FONT}`
  g.textAlign = 'right'
  g.fillText('Kao', W - 90, 150)
  g.textAlign = 'left'
  g.globalAlpha = 1
  return c
}

// สติกเกอร์: ตัวเลขเรียงกลางแบบโซเชียล + เส้นทางด้านล่าง
function drawSticker(g: CanvasRenderingContext2D, c: HTMLCanvasElement, run: Run, style: 'white' | 'black', hasRoute: boolean) {
  const ink = style === 'white' ? '#ffffff' : '#111111'
  g.shadowColor = style === 'white' ? 'rgba(0,0,0,0.45)' : 'rgba(255,255,255,0.55)'
  g.shadowBlur = 14
  g.fillStyle = ink
  g.textAlign = 'center'
  g.textBaseline = 'alphabetic'
  const stats: [string, string][] = [
    [trNow('ระยะทาง', 'Distance'), `${run.km.toFixed(2)} ${trNow('กม.', 'km')}`],
    [trNow('เพซ', 'Pace'), `${formatPace(run.seconds, run.km)} ${trNow('/กม.', '/km')}`],
    [trNow('เวลา', 'Time'), formatDuration(run.seconds)],
  ]
  let y = hasRoute ? 150 : 330
  for (const [label, value] of stats) {
    g.globalAlpha = 0.85
    g.font = `500 38px ${FONT}`
    g.fillText(label, W / 2, y)
    g.globalAlpha = 1
    g.font = `800 96px ${FONT}`
    g.fillText(value, W / 2, y + 100)
    y += 205
  }
  if (hasRoute) drawRoute(g, run, { x: 200, y: y - 20, w: W - 400, h: H - y - 100 }, ink, 11)
  g.globalAlpha = 0.8
  g.font = `600 32px ${FONT}`
  g.fillText(`Kao · ${thaiDate(run.date)}`, W / 2, H - 40)
  g.globalAlpha = 1
  g.shadowBlur = 0
  g.textAlign = 'left'
  return c
}

const fileName = (run: Run, style: CardStyle = 'card') => `run-${run.date}-${run.id.slice(0, 6)}${style === 'card' ? '' : '-sticker'}.png`

const statList = (run: Run): [string, string][] => [
  [trNow('ระยะทาง', 'Distance'), `${run.km.toFixed(2)} ${trNow('กม.', 'km')}`],
  [trNow('เพซ', 'Pace'), `${formatPace(run.seconds, run.km)} ${trNow('/กม.', '/km')}`],
  [trNow('เวลา', 'Time'), formatDuration(run.seconds)],
  ...(run.elev && run.elev.gain > 0 ? [[trNow('ขึ้นสะสม', 'Elev gain'), `${run.elev.gain} ${trNow('ม.', 'm')}`] as [string, string]] : []),
]

const footer = (g: CanvasRenderingContext2D, run: Run, y = H - 40) => {
  g.textAlign = 'center'
  g.globalAlpha = 0.8
  g.font = `600 32px ${FONT}`
  g.fillText(`Kao · ${thaiDate(run.date)}`, W / 2, y)
  g.globalAlpha = 1
}

// เส้นทางใหญ่ด้านบน + ตัวเลขแถวเดียว (สูงสุด 4 ช่อง)
function drawRow(g: CanvasRenderingContext2D, run: Run, ink: string, hasRoute: boolean) {
  if (hasRoute) drawRoute(g, run, { x: 220, y: 260, w: W - 440, h: 640 }, ink, 12)
  const stats = statList(run)
  const colW = (W - 120) / stats.length
  g.textAlign = 'center'
  stats.forEach(([label, value], i) => {
    const x = 60 + colW * (i + 0.5)
    g.globalAlpha = 0.85
    g.font = `500 32px ${FONT}`
    g.fillText(label, x, hasRoute ? 1010 : 640)
    g.globalAlpha = 1
    g.font = `800 ${stats.length > 3 ? 54 : 64}px ${FONT}`
    g.fillText(value, x, hasRoute ? 1085 : 715)
  })
  footer(g, run)
}

// เส้นทางอย่างเดียว ตัวใหญ่ + ชื่อแอปเล็ก ๆ
function drawRouteOnly(g: CanvasRenderingContext2D, run: Run, ink: string) {
  drawRoute(g, run, { x: 160, y: 180, w: W - 320, h: H - 420 }, ink, 14)
  footer(g, run, H - 110)
}

// เพซรายกิโลเป็นแถบ (ยาว = เร็ว) — splits มีเฉพาะกิโลที่ครบ (addSplits)
function drawSplits(g: CanvasRenderingContext2D, run: Run, ink: string) {
  const sp = run.splits!.slice(0, 14)
  const fastest = Math.min(...sp), slowest = Math.max(...sp)
  const rowH = Math.min(70, 760 / sp.length)
  const top = (H - rowH * sp.length) / 2 + 40
  g.textAlign = 'left'
  g.font = `800 56px ${FONT}`
  g.fillText(trNow('เพซรายกิโล', 'KM splits'), 100, top - 70)
  sp.forEach((s, i) => {
    const y = top + i * rowH
    const frac = slowest === fastest ? 1 : 0.55 + (0.45 * (slowest - s)) / (slowest - fastest)
    g.globalAlpha = 0.9
    g.font = `600 30px ${FONT}`
    g.textAlign = 'left'
    g.fillText(String(i + 1), 100, y + rowH * 0.62)
    g.globalAlpha = 1
    g.fillStyle = '#E11D48'
    const bw = (W - 420) * frac
    g.beginPath()
    g.roundRect(170, y + rowH * 0.25, bw, rowH * 0.5, rowH * 0.25)
    g.fill()
    g.fillStyle = ink
    g.textAlign = 'right'
    g.font = `700 32px ${FONT}`
    g.fillText(formatPace(s, 1), W - 100, y + rowH * 0.62)
  })
  footer(g, run, top + rowH * sp.length + 90)
}

// ตั๋ววันวิ่ง: กรอบ + ชื่อวัน + ระยะใหญ่ ขอบล่างหยัก
function drawTicket(g: CanvasRenderingContext2D, run: Run, ink: string) {
  const [y0, m0, d0] = run.date.split('-').map(Number)
  const day = new Date(y0, m0 - 1, d0).getDay()
  const bx = 240, by = 330, bw = W - 480, bh = 640
  g.strokeStyle = ink
  g.lineWidth = 4
  g.beginPath()
  g.moveTo(bx, by + bh)
  g.lineTo(bx, by)
  g.lineTo(bx + bw, by)
  g.lineTo(bx + bw, by + bh)
  const teeth = 14
  const step = bw / teeth
  for (let i = 1; i <= teeth; i++) {
    g.lineTo(bx + bw - step * (i - 0.5), by + bh + 22)
    g.lineTo(bx + bw - step * i, by + bh)
  }
  g.stroke()
  g.textAlign = 'center'
  g.font = `800 48px ${FONT}`
  g.fillText('Kao', W / 2, by + 100)
  g.font = `800 150px ${FONT}`
  g.fillText(run.km.toFixed(2), W / 2, by + 320)
  g.font = `600 44px ${FONT}`
  g.fillText(trNow('กม.', 'km'), W / 2, by + 380)
  g.font = `800 64px ${FONT}`
  g.fillText(trNow(WEEKDAY_TH[day], WEEKDAY_EN[day]), W / 2, by + 500)
  g.globalAlpha = 0.85
  g.font = `500 36px ${FONT}`
  g.fillText(`${thaiDate(run.date)} · ${formatDuration(run.seconds)}`, W / 2, by + 565)
  g.globalAlpha = 1
}

// ระยะตัวใหญ่เต็มภาพ + เวลา/เพซบรรทัดเดียว
function drawBig(g: CanvasRenderingContext2D, run: Run) {
  g.textAlign = 'center'
  const km = run.km.toFixed(2)
  g.font = `800 300px ${FONT}`
  const scale = Math.min(1, (W - 120) / g.measureText(km).width)
  g.font = `800 ${Math.floor(300 * scale)}px ${FONT}`
  g.fillText(km, W / 2, 700)
  g.font = `700 72px ${FONT}`
  g.fillText(trNow('กิโลเมตร', 'kilometres'), W / 2, 810)
  g.globalAlpha = 0.9
  g.font = `600 48px ${FONT}`
  g.fillText(`${formatDuration(run.seconds)}  ·  ${formatPace(run.seconds, run.km)} ${trNow('/กม.', '/km')}`, W / 2, 920)
  g.globalAlpha = 1
  footer(g, run, H - 110)
}

// ป้ายวงกลม: วงแหวน + ระยะกลางวง + เวลา/เพซใต้วง
function drawCircle(g: CanvasRenderingContext2D, run: Run, ink: string) {
  const cx = W / 2, cy = 600, r = 330
  g.strokeStyle = ink
  g.lineWidth = 10
  g.beginPath()
  g.arc(cx, cy, r, 0, Math.PI * 2)
  g.stroke()
  g.lineWidth = 3
  g.beginPath()
  g.arc(cx, cy, r - 30, 0, Math.PI * 2)
  g.stroke()
  g.textAlign = 'center'
  g.font = `700 44px ${FONT}`
  g.fillText(trNow(`วิ่ง ${runKinds[run.kind]}`, `${runKindsEn[run.kind]} run`), cx, cy - 150)
  g.font = `800 190px ${FONT}`
  g.fillText(run.km.toFixed(2), cx, cy + 60)
  g.font = `600 52px ${FONT}`
  g.fillText(trNow('กม.', 'km'), cx, cy + 140)
  g.font = `800 64px ${FONT}`
  g.fillText(formatDuration(run.seconds), cx - 230, cy + r + 150)
  g.fillText(formatPace(run.seconds, run.km), cx + 230, cy + r + 150)
  g.globalAlpha = 0.85
  g.font = `500 34px ${FONT}`
  g.fillText(trNow('เวลา', 'Time'), cx - 230, cy + r + 80)
  g.fillText(trNow('เพซ /กม.', 'Pace /km'), cx + 230, cy + r + 80)
  g.globalAlpha = 1
  footer(g, run)
}

// กราฟเพซตลอดเส้นทาง (สูง = เร็ว) + ตัวเลขด้านล่าง
function drawPace(g: CanvasRenderingContext2D, run: Run, ink: string) {
  // เฉลี่ยเคลื่อนที่ 7 จุด ให้กราฟเรียบ (GPS แกว่ง)
  const raw = paceSeries(run.route!, run.times!)
  const series = raw.map((p, i) => {
    const win = raw.slice(Math.max(0, i - 3), i + 4)
    return { km: p.km, pace: win.reduce((a, q) => a + q.pace, 0) / win.length }
  })
  const box = { x: 100, y: 330, w: W - 200, h: 460 }
  const paces = series.map(p => p.pace)
  const fast = Math.min(...paces), slow = Math.max(...paces)
  const maxKm = series.at(-1)!.km
  const pt = (p: { km: number; pace: number }): [number, number] =>
    [box.x + (p.km / maxKm) * box.w, box.y + (slow === fast ? 0.5 : (p.pace - fast) / (slow - fast)) * box.h]
  g.textAlign = 'left'
  g.font = `800 56px ${FONT}`
  g.fillText(trNow('เพซตลอดเส้นทาง', 'Pace along the run'), box.x, box.y - 90)
  g.globalAlpha = 0.85
  g.font = `500 32px ${FONT}`
  g.fillText(trNow(`เร็วสุด ${formatPace(fast, 1)} · ช้าสุด ${formatPace(slow, 1)} /กม.`, `Fastest ${formatPace(fast, 1)} · slowest ${formatPace(slow, 1)} /km`), box.x, box.y - 35)
  g.globalAlpha = 1
  g.strokeStyle = ink
  g.lineWidth = 8
  g.lineJoin = 'round'
  g.lineCap = 'round'
  g.beginPath()
  series.forEach((p, i) => { const [x, y] = pt(p); if (i) g.lineTo(x, y); else g.moveTo(x, y) })
  g.stroke()
  g.lineWidth = 2
  g.globalAlpha = 0.6
  g.beginPath()
  g.moveTo(box.x, box.y + box.h + 30)
  g.lineTo(box.x + box.w, box.y + box.h + 30)
  g.stroke()
  g.globalAlpha = 1
  const stats = statList(run).slice(0, 3)
  const colW = (W - 120) / stats.length
  g.textAlign = 'center'
  stats.forEach(([label, value], i) => {
    const x = 60 + colW * (i + 0.5)
    g.globalAlpha = 0.85
    g.font = `500 32px ${FONT}`
    g.fillText(label, x, 990)
    g.globalAlpha = 1
    g.font = `800 60px ${FONT}`
    g.fillText(value, x, 1065)
  })
  footer(g, run)
}

// แถบตัวเลขชิดขอบล่าง — ด้านบนว่างให้เห็นรูปของตัวเองเต็ม ๆ
function drawBottom(g: CanvasRenderingContext2D, run: Run, ink: string) {
  const stats = statList(run)
  const colW = (W - 120) / stats.length
  g.textAlign = 'left'
  g.font = `800 52px ${FONT}`
  g.fillText(trNow(`วิ่ง ${runKinds[run.kind]}`, `${runKindsEn[run.kind]} run`), 60, H - 290)
  g.fillStyle = ink
  g.fillRect(60, H - 255, W - 120, 4)
  g.textAlign = 'center'
  stats.forEach(([label, value], i) => {
    const x = 60 + colW * (i + 0.5)
    g.globalAlpha = 0.85
    g.font = `500 30px ${FONT}`
    g.fillText(label, x, H - 190)
    g.globalAlpha = 1
    g.font = `800 ${stats.length > 3 ? 50 : 60}px ${FONT}`
    g.fillText(value, x, H - 125)
  })
  footer(g, run)
}

/** แชร์รูป: แอปใช้หน้าต่างแชร์ของ Android, เว็บใช้ Web Share ถ้ารองรับ ไม่งั้นดาวน์โหลด */
export async function shareRunImage(run: Run, canvas: HTMLCanvasElement, style: CardStyle = 'card') {
  const text = trNow(`วิ่ง ${run.km.toFixed(2)} กม. · ${formatDuration(run.seconds)} · เพซ ${formatPace(run.seconds, run.km)} /กม.`, `Ran ${run.km.toFixed(2)} km · ${formatDuration(run.seconds)} · pace ${formatPace(run.seconds, run.km)} /km`)
  if (isNative) {
    const data = canvas.toDataURL('image/png').split(',')[1]
    const { uri } = await Filesystem.writeFile({ path: fileName(run, style), data, directory: Directory.Cache })
    await Share.share({ files: [uri], text, dialogTitle: trNow('แชร์การวิ่ง', 'Share run') })
    return
  }
  const blob = await new Promise<Blob | null>(r => canvas.toBlob(r, 'image/png'))
  if (!blob) throw new Error(trNow('สร้างรูปไม่สำเร็จ', 'Couldn’t create the image'))
  const file = new File([blob], fileName(run, style), { type: 'image/png' })
  if (navigator.canShare?.({ files: [file] })) {
    await navigator.share({ files: [file], text }).catch(e => { if ((e as Error).name !== 'AbortError') throw e })
    return
  }
  downloadImage(run, canvas, style)
}

const ALBUM = 'Kao'

/** อัลบั้มของแอปในแกลเลอรี (สร้างครั้งแรก) — Android ต้องระบุอัลบั้มตอนบันทึก */
async function albumId() {
  const find = async () => (await Media.getAlbums()).albums.find(a => a.name === ALBUM)?.identifier
  const id = await find()
  if (id) return id
  await Media.createAlbum({ name: ALBUM })
  return find()
}

/** บันทึกรูป: แอปบันทึกลงแกลเลอรี (อัลบั้ม Kao) เป็น PNG คงความโปร่งใส, เว็บดาวน์โหลดไฟล์ */
export async function saveImage(run: Run, canvas: HTMLCanvasElement, style: CardStyle = 'card') {
  if (!isNative) return downloadImage(run, canvas, style)
  await Media.savePhoto({ path: canvas.toDataURL('image/png'), albumIdentifier: await albumId(), fileName: fileName(run, style).replace(/\.png$/, '') })
}

export function downloadImage(run: Run, canvas: HTMLCanvasElement, style: CardStyle = 'card') {
  const a = document.createElement('a')
  a.href = canvas.toDataURL('image/png')
  a.download = fileName(run, style)
  a.click()
}
