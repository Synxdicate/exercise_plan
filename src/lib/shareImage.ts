import { Directory, Filesystem } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'
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

export async function renderRunCard(run: Run): Promise<HTMLCanvasElement> {
  await document.fonts?.load(`700 40px ${FONT}`).catch(() => {})
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const g = c.getContext('2d')!
  const bg = g.createLinearGradient(0, 0, W, H)
  bg.addColorStop(0, '#E11D48')
  bg.addColorStop(1, '#6D28D9')
  g.fillStyle = bg
  g.fillRect(0, 0, W, H)

  const hasRoute = (run.route?.length ?? 0) > 1
  if (hasRoute) {
    const pts = projectRoute(run.route!, { x: 120, y: 330, w: W - 240, h: 520 })
    g.lineJoin = 'round'
    g.lineCap = 'round'
    g.strokeStyle = 'rgba(0,0,0,0.25)'
    g.lineWidth = 22
    g.beginPath()
    pts.forEach(([x, y], i) => (i ? g.lineTo(x, y + 6) : g.moveTo(x, y + 6)))
    g.stroke()
    g.strokeStyle = '#ffffff'
    g.lineWidth = 12
    g.beginPath()
    pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)))
    g.stroke()
    for (const [[x, y], col] of [[pts[0], '#22C55E'], [pts.at(-1)!, '#111827']] as const) {
      g.fillStyle = col
      g.beginPath()
      g.arc(x, y, 18, 0, Math.PI * 2)
      g.fill()
      g.strokeStyle = '#fff'
      g.lineWidth = 6
      g.stroke()
    }
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

const fileName = (run: Run) => `run-${run.date}-${run.id.slice(0, 6)}.png`

/** แชร์รูป: แอปใช้หน้าต่างแชร์ของ Android, เว็บใช้ Web Share ถ้ารองรับ ไม่งั้นดาวน์โหลด */
export async function shareRunImage(run: Run, canvas: HTMLCanvasElement) {
  const text = `วิ่ง ${run.km.toFixed(2)} กม. · ${formatDuration(run.seconds)} · เพซ ${formatPace(run.seconds, run.km)} /กม.`
  if (isNative) {
    const data = canvas.toDataURL('image/png').split(',')[1]
    const { uri } = await Filesystem.writeFile({ path: fileName(run), data, directory: Directory.Cache })
    await Share.share({ files: [uri], text, dialogTitle: 'แชร์การวิ่ง' })
    return
  }
  const blob = await new Promise<Blob | null>(r => canvas.toBlob(r, 'image/png'))
  if (!blob) throw new Error('สร้างรูปไม่สำเร็จ')
  const file = new File([blob], fileName(run), { type: 'image/png' })
  if (navigator.canShare?.({ files: [file] })) {
    await navigator.share({ files: [file], text }).catch(e => { if ((e as Error).name !== 'AbortError') throw e })
    return
  }
  downloadImage(run, canvas)
}

export function downloadImage(run: Run, canvas: HTMLCanvasElement) {
  const a = document.createElement('a')
  a.href = canvas.toDataURL('image/png')
  a.download = fileName(run)
  a.click()
}
