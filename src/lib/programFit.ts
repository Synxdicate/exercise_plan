// โปรแกรมไหนพร้อมแล้ว: ดูจากการวิ่งจริงใน 60 วันล่าสุด (เดิน/เดินสลับวิ่งที่ช้ากว่า 10:00/กม. ไม่นับ)
// เกณฑ์เริ่มของแต่ละโปรแกรมตรงกับระยะวิ่งยาวสัปดาห์แรกในตาราง — ข้ามไปโปรแกรมที่ยังไม่ถึงเกณฑ์เสี่ยงบาดเจ็บที่สุด
// (มือใหม่เพิ่มระยะเร็วเกินเจ็บบ่อยกว่า — Nielsen 2014)
import type { ProgramId } from '../data/programs'
import type { Run } from './log'
import { addDays, today } from './date'
import { MAX_SOURCE_PACE } from './pace'

// anyKm: ระยะไกลสุดรวมวิ่งสลับเดิน (ไม่นับเดินล้วน ช้ากว่า 15:00/กม.) — ใช้กับโปรแกรมที่เริ่มจากวิ่งสลับเดิน
export type Capacity = { longestKm: number; longestMin: number; anyKm?: number }

export function capacity(runs: Run[], asOf = today(), days = 60): Capacity {
  const from = addDays(asOf, -days)
  // วิ่งเบาที่มีชุดซ้อม (วิ่งสลับเดิน) ไม่ใช่การวิ่งต่อเนื่อง แม้เพซเฉลี่ยจะเร็วกว่า 10:00/กม. — นับแค่ใน anyKm
  const real = runs.filter(r => r.date > from && r.date <= asOf && r.km > 0 && r.seconds > 0 && r.seconds / r.km <= MAX_SOURCE_PACE && !(r.kind === 'easy' && r.guide))
  const any = runs.filter(r => r.date > from && r.date <= asOf && r.km > 0 && r.seconds > 0 && r.seconds / r.km <= 900)
  return {
    longestKm: Math.max(0, ...real.map(r => r.km)),
    longestMin: Math.max(0, ...real.map(r => r.seconds / 60)),
    anyKm: Math.max(0, ...any.map(r => r.km)),
  }
}

type Need = { km?: number; min?: number; anyKm?: number; text: string }
export const NEEDS: Record<ProgramId, Need | null> = {
  start: null,
  strength: null,
  mini: { anyKm: 4, text: 'วิ่งสลับเดิน 4 กม.' },
  physique: { min: 20, text: 'วิ่งต่อเนื่อง 20 นาที' },
  base: { km: 5, text: 'วิ่งต่อเนื่อง 5 กม.' },
  five: { km: 5, text: 'วิ่งต่อเนื่อง 5 กม.' },
  ten: { min: 30, text: 'วิ่งต่อเนื่อง 30 นาที' },
  half: { km: 7, text: 'วิ่งยาว 7 กม.' },
  full: { km: 18, text: 'วิ่งยาว 18 กม.' },
}

/** ระยะเผื่อ 5% (GPS คลาดเคลื่อน / วิ่ง 4.8 กม. ก็ถือว่า 5 กม.) */
export function isReady(id: ProgramId, c: Capacity) {
  const n = NEEDS[id]
  if (!n) return true
  return (!n.km || c.longestKm >= n.km * 0.95) && (!n.min || c.longestMin >= n.min * 0.95) && (!n.anyKm || (c.anyKm ?? 0) >= n.anyKm * 0.95)
}

/** เส้นทางหลัก: เริ่มวิ่ง → มินิ (วิ่งสลับเดินได้) → 10K → ฮาล์ฟ → ฟูล */
export const PATH: ProgramId[] = ['start', 'mini', 'ten', 'half', 'full']

/** ขั้นที่ไกลที่สุดบนเส้นทางที่พร้อมแล้ว */
export function recommended(c: Capacity): ProgramId {
  return [...PATH].reverse().find(id => isReady(id, c)) ?? 'start'
}

export type NextStep = { to: ProgramId; why: string }

/** ควรเปลี่ยนโปรแกรมไหม: พร้อมขั้นต่อไปแล้ว (เริ่มวิ่ง) หรือถึงสัปดาห์สุดท้ายของโปรแกรมที่มีวันจบ */
export function nextStep(current: ProgramId, c: Capacity, week: number, weeks: number, ongoing: boolean): NextStep | null {
  if (current === 'start')
    return isReady('ten', c) ? { to: 'ten', why: 'วิ่งต่อเนื่อง 30 นาทีได้แล้ว พร้อมเริ่ม 10K' } : null
  if (ongoing || week < weeks) return null
  switch (current) {
    case 'ten': return isReady('half', c)
      ? { to: 'half', why: 'จบ 10K และวิ่งยาว 7 กม.ได้แล้ว — วิ่งเบา 1–2 สัปดาห์ก่อนเริ่มฮาล์ฟ' }
      : { to: 'base', why: 'จบ 10K แล้ว — รักษาฐานไว้ก่อน วิ่งยาวได้ 7 กม. เมื่อไรค่อยไปฮาล์ฟ' }
    case 'mini': return { to: isReady('ten', c) ? 'ten' : 'base', why: 'จบมินิแล้ว — พักวิ่งเบา 1 สัปดาห์ แล้วต่อ 10K เพื่อสร้างฐานไปฮาล์ฟ' }
    case 'five': return { to: isReady('ten', c) ? 'ten' : 'base', why: 'จบ 5K แล้ว — ต่อด้วยการเพิ่มระยะ' }
    case 'half': return { to: 'base', why: 'จบฮาล์ฟแล้ว — พักฟื้นและค่อย ๆ เพิ่มวิ่งยาวถึง 18 กม. ก่อนเข้าฟูล' }
    case 'full': return { to: 'base', why: 'จบฟูลแล้ว — วิ่งเบาฟื้นตัว 2–4 สัปดาห์' }
    case 'physique': return { to: isReady('ten', c) ? 'ten' : 'start', why: 'จบโปรแกรมหุ่นแล้ว — ต่อด้วยการวิ่งตามเส้นทาง' }
    default: return null
  }
}
