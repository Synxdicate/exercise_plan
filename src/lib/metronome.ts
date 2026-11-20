// เครื่องให้จังหวะก้าว + วัดรอบขาจากเซนเซอร์ความเร่ง (เบราว์เซอร์/WebView)
// เสียงคลิกเป็น AudioBuffer วนซ้ำ: เล่นบนเธรดเสียง ไม่พึ่งตัวจับเวลา JS ที่ถูกหน่วงตอนจอดับ
import { MEASURE_SEC, cadenceOf, type Sample } from './cadence'

let ctx: AudioContext | null = null
let src: AudioBufferSourceNode | null = null
let playing = 0

function click(c: AudioContext, spm: number) {
  const len = Math.round((c.sampleRate * 60) / spm)
  const buf = c.createBuffer(1, len, c.sampleRate)
  const d = buf.getChannelData(0)
  // คลิกสั้น 25 ms ความถี่ 1.6 kHz ค่อย ๆ จางลง ได้ยินชัดบนเสียงลม
  const n = Math.min(len, Math.round(c.sampleRate * 0.025))
  for (let i = 0; i < n; i++) d[i] = Math.sin((2 * Math.PI * 1600 * i) / c.sampleRate) * (1 - i / n) * 0.6
  return buf
}

export const metronomeSupported = () => typeof window !== 'undefined' && 'AudioContext' in window

export function startMetronome(spm: number) {
  if (!metronomeSupported()) return
  if (src && playing === spm) return
  stopMetronome()
  ctx ??= new AudioContext()
  void ctx.resume()
  src = ctx.createBufferSource()
  src.buffer = click(ctx, spm)
  src.loop = true
  src.connect(ctx.destination)
  src.start()
  playing = spm
}

export function stopMetronome() {
  try { src?.stop() } catch { /* หยุดไปแล้ว */ }
  src?.disconnect()
  src = null
  playing = 0
}

export const motionSupported = () => typeof window !== 'undefined' && 'DeviceMotionEvent' in window

/** ฟังเซนเซอร์ MEASURE_SEC วินาที แล้วคืนก้าว/นาที (null = วัดไม่ได้) onProgress รับวินาทีที่เหลือ */
export function measureCadence(onProgress?: (left: number) => void, signal?: AbortSignal): Promise<number | null> {
  return new Promise(resolve => {
    if (!motionSupported()) return resolve(null)
    const samples: Sample[] = []
    const start = performance.now()
    const onMotion = (e: DeviceMotionEvent) => {
      const a = e.accelerationIncludingGravity
      if (!a || a.x == null || a.y == null || a.z == null) return
      samples.push({ t: performance.now(), m: Math.hypot(a.x, a.y, a.z) })
    }
    const tick = setInterval(() => onProgress?.(Math.max(0, MEASURE_SEC - Math.floor((performance.now() - start) / 1000))), 500)
    const done = (v: number | null) => {
      clearInterval(tick)
      clearTimeout(end)
      window.removeEventListener('devicemotion', onMotion)
      resolve(v)
    }
    const end = setTimeout(() => done(cadenceOf(samples)), MEASURE_SEC * 1000)
    signal?.addEventListener('abort', () => done(null))
    window.addEventListener('devicemotion', onMotion)
  })
}
