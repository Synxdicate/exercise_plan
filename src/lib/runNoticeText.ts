import { stepLabel, stepLabelEn, type GuideState, type Step } from './guide'
import { formatDuration, formatPace } from './log'

// ข้อความแจ้งเตือนสดระหว่างวิ่ง (pure, tested) ส่วนที่ส่งไปแอป Android อยู่ใน runNotice.ts
// หน้าตา: หัวข้อ = ช่วงที่กำลังทำ, ตัวนับเวลา (Android เดินเองทุกวินาที) = นับถอยหลังของช่วงตามเวลา หรือเวลาวิ่งรวม,
// แถบความคืบหน้า = ช่วงนี้ (หรือระยะเป้าของวัน), บรรทัด = เพซตอนนี้/เป้า/เฉลี่ย, ระยะ·เวลา·ถัดไป, กม.ล่าสุด

export type NoticeAction = { id: 'pause' | 'resume' | 'skip'; title: string }

export type StepNow = {
  label: string; n: number; of: number; work: boolean
  /** ที่เหลือของช่วง (ข้อความ) และวินาทีที่เหลือ (ช่วงตามเวลาเท่านั้น) */
  left: string | null; leftSec: number | null
  /** วินาทีที่เหลือแบบไม่ปัด ใช้ตั้งตัวนับถอยหลังของ Android ให้ตรงทุกครั้งที่อัปเดต (ปัดแล้วตัวนับกระตุก ±1 วิ) */
  leftExact: number | null
  /** สัดส่วนที่ทำไปแล้วของช่วงนี้ 0–1 */
  progress: number | null
  next: string | null
  /** ความคืบหน้าทั้งชุดซ้อม 0–1 (นับตามจำนวนช่วง) */
  overall: number
}

const amount = (s: Step, en: boolean) => (s.sec ? (s.sec >= 60 ? `${+(s.sec / 60).toFixed(1)} ${en ? 'min' : 'นาที'}` : `${s.sec} ${en ? 's' : 'วิ'}`)
  : s.m ? (s.m >= 1000 ? `${+(s.m / 1000).toFixed(1)} ${en ? 'km' : 'กม.'}` : `${s.m} ${en ? 'm' : 'ม.'}`) : '')

const clamp01 = (x: number) => Math.max(0, Math.min(1, x))

/** ช่วงปัจจุบันของชุดซ้อม: ชื่อ ลำดับ (นับเฉพาะช่วงหลัก) ที่เหลือ ความคืบหน้า และช่วงถัดไป */
export function stepNow(steps: Step[], st: GuideState, meters: number, en = false): StepNow | null {
  if (!st.started || st.done) return null
  const s = steps[st.index]
  if (!s) return null
  const label = (x: Step) => (en ? stepLabelEn(x) : stepLabel(x))
  const works = steps.filter(x => x.kind === 'work').length
  const n = steps.slice(0, st.index + 1).filter(x => x.kind === 'work').length
  const usedSec = (st.clock - st.stepT) / 1000
  const usedM = meters - st.stepM
  const leftExact = s.sec ? Math.max(0, s.sec - usedSec) : null
  const leftSec = leftExact !== null ? Math.round(leftExact) : null
  const leftM = s.m ? Math.max(0, Math.round(s.m - usedM)) : null
  const left = leftSec !== null ? formatDuration(leftSec)
    : leftM !== null ? (leftM >= 1000 ? `${(leftM / 1000).toFixed(2)} ${en ? 'km' : 'กม.'}` : `${leftM} ${en ? 'm' : 'ม.'}`)
    : null
  const progress = s.sec ? clamp01(usedSec / s.sec) : s.m ? clamp01(usedM / s.m) : null
  const nx = steps[st.index + 1]
  return {
    label: label(s), n, of: works, work: s.kind === 'work', left, leftSec, leftExact, progress,
    next: nx ? `${label(nx)} ${amount(nx, en)}`.trim() : null,
    overall: clamp01((st.index + (progress ?? 0)) / steps.length),
  }
}

export type NoticeInput = {
  status: 'acquiring' | 'running' | 'autopaused' | 'paused' | 'idle'
  signalLost: boolean
  meters: number
  elapsed: number
  pace: number | null
  kind: string
  step: StepNow | null
  /** เป้าเพซของช่วงนี้ (วินาที/กม.) */
  target?: number | null
  /** ระยะเป้าของวัน (กม.) ใช้ทำแถบความคืบหน้าวันที่ไม่มีชุดซ้อม */
  targetKm?: number | null
  /** เวลากิโลเมตรล่าสุด */
  splits?: number[]
  now?: number
}

export type Notice = {
  title: string
  body: string
  /** บรรทัดเดียวตอนแจ้งเตือนย่อ */
  text: string
  actions: NoticeAction[]
  /** แถบความคืบหน้า 0–1 */
  progress: number | null
  /** ตัวนับเวลาของ Android: at = เวลาอ้างอิง (ms), down = นับถอยหลังไปหา at */
  chrono: { at: number; down: boolean } | null
}

export function noticeText(x: NoticeInput, en = false): Notice {
  const tr = (th: string, e: string) => (en ? e : th)
  const km = x.meters / 1000
  const unit = tr('กม.', 'km')
  const per = tr('/กม.', '/km')
  const moving = x.status === 'running'
  const plain = x.targetKm ? `${km.toFixed(2)} / ${x.targetKm} ${unit}` : `${km.toFixed(2)} ${unit}`
  const head = x.step
    ? `${x.step.label}${x.step.work && x.step.of > 1 ? ` ${x.step.n}/${x.step.of}` : ''}${x.step.left ? tr(` · เหลือ ${x.step.left}`, ` · ${x.step.left} left`) : ''}`
    : `${x.kind} · ${plain}`
  const title = x.status === 'paused' ? tr(`หยุดชั่วคราว · ${head}`, `Paused · ${head}`)
    : x.status === 'autopaused' ? tr(`หยุดอัตโนมัติ · ${head}`, `Auto-paused · ${head}`)
    : x.status === 'acquiring' ? tr('กำลังหาสัญญาณ GPS', 'Finding GPS')
    : head
  const now = x.pace ? formatPace(x.pace, 1) : '--:--'
  const avg = km >= 0.05 ? formatPace(x.elapsed, km) : '--:--'
  const target = x.target ? tr(` (เป้า ${formatPace(x.target, 1)})`, ` (target ${formatPace(x.target, 1)})`) : ''
  const paceLine = `${tr('เพซตอนนี้', 'Now')} ${now}${target} · ${tr('เฉลี่ย', 'avg')} ${avg} ${per}`
  const lines = [paceLine, `${km.toFixed(2)} ${unit} · ${formatDuration(x.elapsed)}${x.step?.next ? tr(` · ถัดไป: ${x.step.next}`, ` · next: ${x.step.next}`) : ''}`]
  const k = x.splits?.length ?? 0
  if (k) lines.push(tr(`กม. ${k}: ${formatPace(x.splits![k - 1], 1)}`, `km ${k}: ${formatPace(x.splits![k - 1], 1)}`))
  if (x.signalLost) lines.push(tr('สัญญาณ GPS หาย ระยะช่วงนี้อาจคลาดเคลื่อน', 'GPS signal lost; distance may be off'))
  const actions: NoticeAction[] = x.status === 'paused'
    ? [{ id: 'resume', title: tr('วิ่งต่อ', 'Resume') }]
    : x.status === 'running' || x.status === 'autopaused'
      ? [{ id: 'pause', title: tr('หยุดชั่วคราว', 'Pause') }, ...(x.step ? [{ id: 'skip' as const, title: tr('ข้ามช่วง', 'Skip step') }] : [])]
      : []
  const progress = x.step?.progress ?? (x.targetKm ? clamp01(km / x.targetKm) : null)
  const t = x.now ?? 0
  // ตัวนับเดินเองบนเครื่อง: ช่วงตามเวลา = นับถอยหลังถึงจบช่วง (นาฬิกาชุดซ้อมเดินต่อตอนหยุดอัตโนมัติ เช่น ยืนพัก)
  // นอกนั้น = เวลาวิ่งรวม (หยุดอยู่ = ไม่เดิน) ใช้ค่าไม่ปัด เวลาอ้างอิงจึงเท่าเดิมทุกครั้งที่อัปเดต ตัวนับไม่กระโดด
  const left = x.step?.leftExact ?? x.step?.leftSec
  const chrono = !t ? null
    : left != null && (moving || x.status === 'autopaused') ? { at: Math.round(t + left * 1000), down: true }
    : moving ? { at: Math.round(t - x.elapsed * 1000), down: false }
    : null
  return { title, body: lines.join('\n'), text: paceLine, actions, progress, chrono }
}
