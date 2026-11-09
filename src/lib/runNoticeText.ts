import { stepLabel, stepLabelEn, type GuideState, type Step } from './guide'
import { formatDuration, formatPace } from './log'

// ข้อความแจ้งเตือนสดระหว่างวิ่ง (pure, tested) ส่วนที่ส่งไปแอป Android อยู่ใน runNotice.ts

export type NoticeAction = { id: 'pause' | 'resume' | 'skip'; title: string }

export type StepNow = { label: string; n: number; of: number; work: boolean; left: string | null; next: string | null }

const amount = (s: Step, en: boolean) => (s.sec ? (s.sec >= 60 ? `${+(s.sec / 60).toFixed(1)} ${en ? 'min' : 'นาที'}` : `${s.sec} ${en ? 's' : 'วิ'}`)
  : s.m ? (s.m >= 1000 ? `${+(s.m / 1000).toFixed(1)} ${en ? 'km' : 'กม.'}` : `${s.m} ${en ? 'm' : 'ม.'}`) : '')

/** ช่วงปัจจุบันของชุดซ้อม: ชื่อ ลำดับ (นับเฉพาะช่วงหลัก) ที่เหลือ และช่วงถัดไป */
export function stepNow(steps: Step[], st: GuideState, meters: number, en = false): StepNow | null {
  if (!st.started || st.done) return null
  const s = steps[st.index]
  if (!s) return null
  const label = (x: Step) => (en ? stepLabelEn(x) : stepLabel(x))
  const works = steps.filter(x => x.kind === 'work').length
  const n = steps.slice(0, st.index + 1).filter(x => x.kind === 'work').length
  const left = s.sec ? formatDuration(Math.max(0, Math.round(s.sec - (st.clock - st.stepT) / 1000)))
    : s.m ? (() => { const m = Math.max(0, Math.round(s.m - (meters - st.stepM))); return m >= 1000 ? `${(m / 1000).toFixed(2)} ${en ? 'km' : 'กม.'}` : `${m} ${en ? 'm' : 'ม.'}` })()
    : null
  const nx = steps[st.index + 1]
  return { label: label(s), n, of: works, work: s.kind === 'work', left, next: nx ? `${label(nx)} ${amount(nx, en)}`.trim() : null }
}

export type NoticeInput = {
  status: 'acquiring' | 'running' | 'autopaused' | 'paused' | 'idle'
  signalLost: boolean
  meters: number
  elapsed: number
  pace: number | null
  kind: string
  step: StepNow | null
}

export function noticeText(x: NoticeInput, en = false): { title: string; body: string; actions: NoticeAction[] } {
  const tr = (th: string, e: string) => (en ? e : th)
  const km = x.meters / 1000
  const head = x.step
    ? `${x.step.label}${x.step.work && x.step.of > 1 ? ` ${x.step.n}/${x.step.of}` : ''}${x.step.left ? tr(` · เหลือ ${x.step.left}`, ` · ${x.step.left} left`) : ''}`
    : `${x.kind} · ${km.toFixed(2)} ${tr('กม.', 'km')}`
  const title = x.status === 'paused' ? tr(`หยุดชั่วคราว · ${head}`, `Paused · ${head}`)
    : x.status === 'autopaused' ? tr(`หยุดอัตโนมัติ · ${head}`, `Auto-paused · ${head}`)
    : x.status === 'acquiring' ? tr('กำลังหาสัญญาณ GPS', 'Finding GPS')
    : head
  const per = tr('/กม.', '/km')
  const lines = [
    `${tr('เพซตอนนี้', 'Now')} ${x.pace ? formatPace(x.pace, 1) : '--:--'} · ${tr('เฉลี่ย', 'avg')} ${km >= 0.05 ? formatPace(x.elapsed, km) : '--:--'} ${per}`,
    `${km.toFixed(2)} ${tr('กม.', 'km')} · ${formatDuration(x.elapsed)}${x.step?.next ? tr(` · ถัดไป: ${x.step.next}`, ` · next: ${x.step.next}`) : ''}`,
  ]
  if (x.signalLost) lines.push(tr('สัญญาณ GPS หาย ระยะช่วงนี้อาจคลาดเคลื่อน', 'GPS signal lost; distance may be off'))
  const actions: NoticeAction[] = x.status === 'paused'
    ? [{ id: 'resume', title: tr('วิ่งต่อ', 'Resume') }]
    : x.status === 'running' || x.status === 'autopaused'
      ? [{ id: 'pause', title: tr('หยุดชั่วคราว', 'Pause') }, ...(x.step ? [{ id: 'skip' as const, title: tr('ข้ามช่วง', 'Skip step') }] : [])]
      : []
  return { title, body: lines.join('\n'), actions }
}
