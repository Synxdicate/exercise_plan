import { addDays } from './date'

// รอบขา (ก้าว/นาที): วัดจากเซนเซอร์ความเร่งของมือถือระหว่างวิ่ง หรือนับเอง แล้วตั้งเป้าถี่ขึ้น 5% (เข่ารับแรงน้อยลง)
// Heiderscheit 2011 (+5–10% ลดแรงเข่า/สะโพก), Lenhart 2014 (+10% ลดแรงที่ลูกสะบ้า), Willy 2016 (ฝึกด้วยสัญญาณจังหวะ +7.5% ลดแรงเข่า คงอยู่ 1 เดือน)

export type Sample = { t: number; m: number } // t = มิลลิวินาที, m = ขนาดความเร่ง m/s²
export type CadenceCheck = { id: string; date: string; spm: number; how: 'sensor' | 'count' }

export const MIN_SPM = 130
export const MAX_SPM = 220
export const MEASURE_SEC = 30
/** ช่วงห่างสั้นสุดระหว่างก้าว (ms) = 240 ก้าว/นาที */
const MIN_GAP = 250

/** เวลาที่เท้าแตะพื้นแต่ละครั้ง (ms): หาจุดสูงสุดของความเร่งหลังกรองสัญญาณ */
export function stepTimes(samples: Sample[]): number[] {
  if (samples.length < 20) return []
  // กรองความถี่สูง: ค่าเฉลี่ยเคลื่อนที่ ~5 ค่า
  const sm = samples.map((_, i) => {
    let s = 0, n = 0
    for (let j = Math.max(0, i - 2); j <= Math.min(samples.length - 1, i + 2); j++) { s += samples[j].m; n++ }
    return s / n
  })
  const mean = sm.reduce((a, b) => a + b, 0) / sm.length
  const sd = Math.sqrt(sm.reduce((a, b) => a + (b - mean) ** 2, 0) / sm.length)
  // ยืนนิ่ง/เดินเบามาก: สัญญาณเล็กเกินไป ไม่นับ
  if (sd < 0.8) return []
  const thr = mean + 0.5 * sd
  const out: number[] = []
  for (let i = 1; i < sm.length - 1; i++) {
    if (sm[i] < thr || sm[i] < sm[i - 1] || sm[i] < sm[i + 1]) continue
    const t = samples[i].t
    const last = out.at(-1)
    if (last !== undefined && t - last < MIN_GAP) {
      // สองยอดใกล้กัน: เก็บยอดที่สูงกว่า
      const li = samples.findIndex(s => s.t === last)
      if (sm[i] > sm[li]) out[out.length - 1] = t
      continue
    }
    out.push(t)
  }
  return out
}

/** ก้าว/นาทีจากเวลาแตะพื้น (ทนต่อก้าวที่หลุด) null = วัดไม่ได้ */
export function cadenceFrom(times: number[]): number | null {
  if (times.length < 20) return null
  const gaps = times.slice(1).map((t, i) => t - times[i]).sort((a, b) => a - b)
  const med = gaps[Math.floor(gaps.length / 2)]
  // ช่วงที่ยาวเป็น 2 เท่า = ก้าวที่หลุดไป นับตามจำนวนก้าวที่ควรมี แล้วเฉลี่ยทั้งช่วง (ค่ามัธยฐานอย่างเดียวติดความละเอียดของเซนเซอร์)
  const steps = gaps.reduce((n, g) => n + Math.max(1, Math.round(g / med)), 0)
  const spm = Math.round((60000 * steps) / (times.at(-1)! - times[0]))
  return spm >= MIN_SPM && spm <= MAX_SPM ? spm : null
}

export const cadenceOf = (samples: Sample[]) => cadenceFrom(stepTimes(samples))

/** นับเท้าข้างเดียว 30 วิ → ก้าว/นาที */
export const spmFromCount = (oneFoot30s: number) => oneFoot30s * 4

/** เป้า: ถี่ขึ้น 5% ปัดเป็นเลขคู่ ไม่เกิน 190 (ไม่ใช่ "ต้อง 180" ทุกคน) */
export function cadenceTarget(spm: number) {
  return Math.max(spm, Math.min(190, Math.round((spm * 1.05) / 2) * 2))
}

/** ผลวัดล่าสุดใน days วัน */
export function latestCadence(log: CadenceCheck[], today: string, days = 90): CadenceCheck | null {
  const min = addDays(today, -days)
  return [...log].filter(c => c.date >= min && c.date <= today).sort((a, b) => a.date.localeCompare(b.date)).at(-1) ?? null
}
