import { Directory, Filesystem } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'
import { Media } from '@capacitor-community/media'
import { formatDuration, formatPace, runKinds, type Run } from './log'
import { isNative } from './native'
import { projectRoute } from './geo'

// การ์ดรูปการวิ่งสำหรับแชร์ (1080×1350 = สัดส่วน 4:5 ของ IG) — สีคงที่ ไม่ตามธีม เพราะเป็นรูปที่ส่งออก
const W = 1080
const H = 1350
const FONT = "'Noto Sans Thai', ui-sans-serif, system-ui, sans-serif"
const thMonths = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']
const thaiDate = (s: string) => {
  const [y, m, d] = s.split('-').map(Number)
  return `${d} ${thMonths[m - 1]} ${y + 543}`
}

export type CardStyle = 'card' | 'white' | 'black'

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
export async function renderRunCard(run: Run, style: CardStyle = 'card'): Promise<HTMLCanvasElement> {
  await document.fonts?.load(`700 40px ${FONT}`).catch(() => {})
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const g = c.getContext('2d')!
  const hasRoute = (run.route?.length ?? 0) > 1
  if (style !== 'card') return drawSticker(g, c, run, style, hasRoute)

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
  g.fillText(`วิ่ง ${runKinds[run.kind]}`, 90, 150)
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
  g.fillText('กม.', 100 + kmW, yKm)

  const stats = [['เวลา', formatDuration(run.seconds)], ['เพซเฉลี่ย', `${formatPace(run.seconds, run.km)} /กม.`]]
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
  g.fillText('Exercise-Plan', W - 90, 150)
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
    ['ระยะทาง', `${run.km.toFixed(2)} กม.`],
    ['เพซ', `${formatPace(run.seconds, run.km)} /กม.`],
    ['เวลา', formatDuration(run.seconds)],
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
  g.fillText(`Exercise-Plan · ${thaiDate(run.date)}`, W / 2, H - 40)
  g.globalAlpha = 1
  g.shadowBlur = 0
  g.textAlign = 'left'
  return c
}

const fileName = (run: Run, style: CardStyle = 'card') => `run-${run.date}-${run.id.slice(0, 6)}${style === 'card' ? '' : '-sticker'}.png`

/** แชร์รูป: แอปใช้หน้าต่างแชร์ของ Android, เว็บใช้ Web Share ถ้ารองรับ ไม่งั้นดาวน์โหลด */
export async function shareRunImage(run: Run, canvas: HTMLCanvasElement, style: CardStyle = 'card') {
  const text = `วิ่ง ${run.km.toFixed(2)} กม. · ${formatDuration(run.seconds)} · เพซ ${formatPace(run.seconds, run.km)} /กม.`
  if (isNative) {
    const data = canvas.toDataURL('image/png').split(',')[1]
    const { uri } = await Filesystem.writeFile({ path: fileName(run, style), data, directory: Directory.Cache })
    await Share.share({ files: [uri], text, dialogTitle: 'แชร์การวิ่ง' })
    return
  }
  const blob = await new Promise<Blob | null>(r => canvas.toBlob(r, 'image/png'))
  if (!blob) throw new Error('สร้างรูปไม่สำเร็จ')
  const file = new File([blob], fileName(run, style), { type: 'image/png' })
  if (navigator.canShare?.({ files: [file] })) {
    await navigator.share({ files: [file], text }).catch(e => { if ((e as Error).name !== 'AbortError') throw e })
    return
  }
  downloadImage(run, canvas, style)
}

const ALBUM = 'Exercise-Plan'

/** อัลบั้มของแอปในแกลเลอรี (สร้างครั้งแรก) — Android ต้องระบุอัลบั้มตอนบันทึก */
async function albumId() {
  const find = async () => (await Media.getAlbums()).albums.find(a => a.name === ALBUM)?.identifier
  const id = await find()
  if (id) return id
  await Media.createAlbum({ name: ALBUM })
  return find()
}

/** บันทึกรูป: แอปบันทึกลงแกลเลอรี (อัลบั้ม Exercise-Plan) เป็น PNG คงความโปร่งใส, เว็บดาวน์โหลดไฟล์ */
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
