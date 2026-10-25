// วิ่งแบบมีเสียงนำ: ชุดซ้อมเป็นขั้น (วอร์ม → เร็ว/พัก → คูลดาวน์) — โมดูลล้วน ทดสอบได้ (guide.test.ts)
// GuideRunner ถูกเรียกจาก callback ของ GPS และนาฬิกาทุกวินาที จึงพูดได้แม้ปิดจอ (แอป Android)

export type StepKind = 'warm' | 'work' | 'recover' | 'cool' | 'easy'
export type PaceKey = 'easy' | 'tempo' | 'interval' | 'tenK' | 'half' | 'marathon' | 'stride'
/** ขั้นหนึ่งของชุดซ้อม — กำหนดด้วยเวลา (sec) หรือระยะ (m) อย่างใดอย่างหนึ่ง */
export type Step = { kind: StepKind; sec?: number; m?: number; pace?: PaceKey; label?: string }

const warm = (m = 2000): Step => ({ kind: 'warm', m, pace: 'easy' })
const cool = (sec = 300): Step => ({ kind: 'cool', sec, pace: 'easy' })
const repeat = (n: number, work: Step, rec: Step): Step[] =>
  Array.from({ length: n }, (_, i) => (i < n - 1 ? [work, rec] : [work])).flat()

export const guides = {
  /** วิ่งเบา สลับเร่ง 1 นาที × 6 */
  fartlek: (): Step[] => [{ kind: 'warm', sec: 600, pace: 'easy' }, ...repeat(6, { kind: 'work', sec: 60, pace: 'interval' }, { kind: 'recover', sec: 120, pace: 'easy' }), cool()],
  /** วิ่งเบาเกือบทั้งหมด แล้วปิดท้าย strides 6 × 20 วิ เดินกลับ */
  strides: (km: number): Step[] => [
    { kind: 'easy', m: Math.max(1000, km * 1000 - 500), pace: 'easy' },
    ...repeat(6, { kind: 'work', sec: 20, pace: 'stride' }, { kind: 'recover', sec: 60 }),
  ],
  /** "15" = tempo 15 นาที, "2×5" = 5 นาที 2 ครั้ง พักจ็อก 2 นาที */
  tempo: (min: string): Step[] => {
    const [n, each] = min.includes('×') ? min.split('×').map(Number) : [1, Number(min)]
    return [warm(), ...repeat(n, { kind: 'work', sec: each * 60, pace: 'tempo' }, { kind: 'recover', sec: 120, pace: 'easy' }), cool()]
  },
  /** "6 × 1 นาที / จ็อก 2 นาที", "5 × 800 ม. / จ็อก 2 นาที", "5 × 1 กม. / จ็อก 2 นาที" */
  reps: (set: string): Step[] => {
    const m = set.match(/(\d+)\s*×\s*([\d.]+)\s*(นาที|ม\.|กม\.)\s*\/\s*จ็อก\s*([\d.]+)\s*นาที/)
    if (!m) return []
    const amount = Number(m[2])
    const work: Step = m[3] === 'นาที' ? { kind: 'work', sec: amount * 60, pace: 'interval' } : { kind: 'work', m: m[3] === 'กม.' ? amount * 1000 : amount, pace: 'interval' }
    return [warm(), ...repeat(Number(m[1]), work, { kind: 'recover', sec: Number(m[4]) * 60, pace: 'easy' }), cool()]
  },
  /** "3 × 2 กม." หรือ "6 กม." ที่เพซแข่ง พักจ็อก 2 นาที */
  pace: (set: string, label: string): Step[] => {
    const m = set.match(/(?:(\d+)\s*×\s*)?([\d.]+)\s*กม\./)
    if (!m) return []
    const pace: PaceKey = /10K/.test(label) ? 'tenK' : /ฮาล์ฟ/.test(label) ? 'half' : 'marathon'
    return [warm(), ...repeat(Number(m[1] ?? 1), { kind: 'work', m: Number(m[2]) * 1000, pace }, { kind: 'recover', sec: 120, pace: 'easy' }), cool()]
  },
  /** ทดสอบ 5K (แทนการตรวจ VO2max ในแล็บ): วอร์ม 10 นาที → 5 กม. เต็มที่แบบคุมได้ → คูลดาวน์ — ผลใช้อัปเดตโซนเพซ */
  timeTrial: (): Step[] => [{ kind: 'warm', sec: 600, pace: 'easy' }, { kind: 'work', m: 5000, pace: 'interval', label: 'ทดสอบ 5K' }, cool(600)],
  /** โปรแกรมหุ่น: วอร์ม 10 นาที → เร็ว 1 / จ็อก 2 × n → คูลดาวน์ 5 นาที */
  intervals: (n: number): Step[] => [{ kind: 'warm', sec: 600, pace: 'easy' }, ...repeat(n, { kind: 'work', sec: 60, pace: 'interval' }, { kind: 'recover', sec: 120, pace: 'easy' }), cool()],
}

export type Paces = Partial<Record<Exclude<PaceKey, 'stride' | 'easy'>, number>> & { easy?: readonly [number, number] }

const KIND_LABEL: Record<StepKind, string> = { warm: 'วอร์มอัพ', work: 'ช่วงเร็ว', recover: 'พัก', cool: 'คูลดาวน์', easy: 'วิ่งเบา' }
export const stepLabel = (s: Step) => s.label ?? (s.pace === 'stride' ? 'เร่ง (Stride)' : s.kind === 'recover' && !s.pace ? 'เดินกลับ' : KIND_LABEL[s.kind])

const spokenTime = (sec: number) => {
  const m = Math.floor(sec / 60), s = Math.round(sec % 60)
  return [m && `${m} นาที`, s && `${s} วินาที`].filter(Boolean).join(' ')
}
const spokenDist = (m: number) => (m >= 1000 ? `${+(m / 1000).toFixed(1)} กิโลเมตร` : `${m} เมตร`)
export const stepAmount = (s: Step) => (s.sec ? spokenTime(s.sec) : spokenDist(s.m ?? 0))

function paceSec(s: Step, p?: Paces) {
  if (!p || !s.pace || s.pace === 'stride') return null
  if (s.pace === 'easy') return p.easy?.[0] ?? null
  return p[s.pace] ?? null
}

/** ข้อความเสียงตอนเริ่มขั้น เช่น "ช่วงเร็ว ครั้งที่ 2 จาก 5. 800 เมตร. เพซ 5 นาที 10 วินาที" */
export function stepAnnouncement(steps: Step[], i: number, paces?: Paces) {
  const s = steps[i]
  const works = steps.filter(x => x.kind === 'work')
  const n = steps.slice(0, i + 1).filter(x => x.kind === 'work').length
  const head = s.kind === 'work' && works.length > 1 ? `${stepLabel(s)} ครั้งที่ ${n} จาก ${works.length}` : stepLabel(s)
  const pace = s.kind === 'work' ? paceSec(s, paces) : null
  return [head, stepAmount(s), pace && `เพซ ${spokenTime(pace)} ต่อกิโล`].filter(Boolean).join('. ')
}

export type GuideEvent = { type: 'step'; index: number } | { type: 'warn'; index: number } | { type: 'done' }
export type GuideState = { started: boolean; index: number; clock: number; stepT: number; stepM: number; warned: boolean; done: boolean }

const WARN_SEC = 10

const initial = (): GuideState => ({ started: false, index: 0, clock: 0, stepT: 0, stepM: 0, warned: false, done: false })

export class GuideRunner {
  readonly steps: Step[]
  state: GuideState
  private lastNow: number | null = null
  constructor(steps: Step[], state?: GuideState | null) {
    this.steps = steps
    this.state = state ?? initial()
  }

  reset() {
    this.state = initial()
    this.lastNow = null
  }

  /** เรียกตอนเริ่มวิ่ง: ประกาศขั้นแรก */
  start(now: number, meters: number): GuideEvent[] {
    this.lastNow = now
    this.state = { ...this.state, started: true, stepM: meters }
    return [{ type: 'step', index: 0 }]
  }

  /**
   * นาฬิกาของชุดซ้อมเดินตลอดเวลาที่ไม่ได้กด "พัก" (รวมช่วงหยุดอัตโนมัติ — ช่วงพักยืนรอก็ยังนับ)
   * ระยะใช้ระยะ GPS สะสม
   */
  update(now: number, meters: number, active: boolean): GuideEvent[] {
    const st = this.state
    if (st.done) return []
    if (active && this.lastNow !== null) st.clock += Math.max(0, now - this.lastNow)
    this.lastNow = now
    const out: GuideEvent[] = []
    for (;;) {
      const s = this.steps[st.index]
      const t = (st.clock - st.stepT) / 1000
      const d = meters - st.stepM
      const finished = s.sec ? t >= s.sec : d >= (s.m ?? 0)
      if (!finished) {
        if (!st.warned && s.sec && s.sec >= 30 && s.kind !== 'warm' && s.sec - t <= WARN_SEC) {
          st.warned = true
          out.push({ type: 'warn', index: st.index })
        }
        return out
      }
      // ขั้นถัดไปเริ่มจากเส้นจบพอดี ไม่สะสมความคลาดเคลื่อน
      if (s.sec) st.stepT += s.sec * 1000
      else st.stepT = st.clock
      st.stepM = s.m ? st.stepM + s.m : meters
      st.warned = false
      st.index++
      if (st.index >= this.steps.length) {
        st.done = true
        out.push({ type: 'done' })
        return out
      }
      out.push({ type: 'step', index: st.index })
    }
  }

  /** ข้ามไปขั้นถัดไป (เช่น ช่วงพักรู้สึกพร้อมแล้ว) */
  skip(meters: number): GuideEvent[] {
    const st = this.state
    if (st.done) return []
    st.index++
    st.stepT = st.clock
    st.stepM = meters
    st.warned = false
    if (st.index >= this.steps.length) {
      st.done = true
      return [{ type: 'done' }]
    }
    return [{ type: 'step', index: st.index }]
  }

  /** เหลืออีกเท่าไรในขั้นนี้ (วินาที หรือ เมตร) และสัดส่วนที่ทำไป */
  progress(meters: number) {
    const st = this.state
    const s = this.steps[Math.min(st.index, this.steps.length - 1)]
    if (st.done) return { step: s, left: 0, pct: 1, unit: s.sec ? 'sec' as const : 'm' as const }
    if (s.sec) {
      const t = (st.clock - st.stepT) / 1000
      return { step: s, left: Math.max(0, s.sec - t), pct: Math.min(1, t / s.sec), unit: 'sec' as const }
    }
    const d = meters - st.stepM
    return { step: s, left: Math.max(0, (s.m ?? 0) - d), pct: Math.min(1, d / (s.m || 1)), unit: 'm' as const }
  }
}

export const totalWork = (steps: Step[]) => steps.filter(s => s.kind === 'work').length
