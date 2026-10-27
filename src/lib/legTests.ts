// ทดสอบขา (ทำเองได้ ไม่ต้องมีอุปกรณ์): กระโดดขาเดียวไกลสุด (ซม.) และเขย่งขาเดียวจนล้า (ครั้ง)
// ความสมมาตร LSI = ขาที่อ่อนกว่า ÷ ขาที่แข็งกว่า × 100 — ≥90% เป็นเกณฑ์ที่ใช้กันในการกลับไปเล่นกีฬา (Grindem 2016)
// เขย่งขาเดียว ≥25 ครั้งถือว่าปกติ (Lunsford & Perry 1995) — ความทนทานของน่อง/soleus สำคัญกับนักวิ่ง
import { usePersisted } from './storage'

export type LegTest = { id: string; date: string; hopL?: number; hopR?: number; calfL?: number; calfR?: number }

export const LSI_OK = 90
export const CALF_OK = 25

/** ขาที่อ่อนกว่าเป็นกี่ % ของขาที่แข็งกว่า (null ถ้าไม่ครบสองข้าง) */
export function lsi(l?: number, r?: number) {
  if (!l || !r) return null
  return Math.round((Math.min(l, r) / Math.max(l, r)) * 100)
}

export const weaker = (l?: number, r?: number) => (!l || !r || l === r ? null : l < r ? 'ซ้าย' : 'ขวา')

export type LegVerdict = { tone: 'good' | 'warn'; text: string }

export function legVerdict(t: LegTest): LegVerdict[] {
  const out: LegVerdict[] = []
  const hop = lsi(t.hopL, t.hopR)
  if (hop !== null) out.push(hop >= LSI_OK
    ? { tone: 'good', text: `กระโดด: สองขาใกล้เคียงกัน (${hop}%)` }
    : { tone: 'warn', text: `กระโดด: ขา${weaker(t.hopL, t.hopR)}ได้ ${hop}% ของอีกข้าง — เพิ่มท่าขาเดียว (Bulgarian split squat, step-up) ข้างนั้นก่อนเพิ่มพลัยโอเมตริก` })
  const calf = t.calfL && t.calfR ? Math.min(t.calfL, t.calfR) : null
  const calfSym = lsi(t.calfL, t.calfR)
  if (calf !== null) out.push(calf >= CALF_OK && (calfSym ?? 100) >= LSI_OK
    ? { tone: 'good', text: `เขย่ง: ผ่านเกณฑ์ (≥${CALF_OK} ครั้งทั้งสองขา)` }
    : { tone: 'warn', text: calf < CALF_OK
      ? `เขย่ง: ขา${weaker(t.calfL, t.calfR) ?? ''}ได้ ${calf} ครั้ง ต่ำกว่า ${CALF_OK} — เพิ่ม Calf Raise และ Seated/Bent-knee Calf Raise`
      : `เขย่ง: ขา${weaker(t.calfL, t.calfR)}ได้ ${calfSym}% ของอีกข้าง — ฝึกข้างที่อ่อนเพิ่ม 1 เซ็ต` })
  return out
}

export const useLegTests = () => usePersisted<LegTest[]>('legTests', [])
