import type { Run } from './log'

// ประมาณเพซจากการวิ่งจริงที่ดีที่สุด (≥3 กม.) ด้วยสูตร Riegel: T2 = T1 × (D2/D1)^1.06
// เป็นค่าประมาณ — ใช้เป็นแนวทาง ไม่ใช่ตัวเลขตายตัว
const riegel = (sec: number, km: number, toKm: number) => sec * (toKm / km) ** 1.06

export function estimate(runs: Run[]) {
  const candidates = runs.filter(r => r.km >= 3 && r.seconds > 0)
  if (!candidates.length) return null
  const best = candidates.reduce((b, r) => (riegel(r.seconds, r.km, 5) < riegel(b.seconds, b.km, 5) ? r : b))
  const t5 = riegel(best.seconds, best.km, 5)
  const p5 = t5 / 5 // วินาที/กม. ที่เพซ 5K
  return {
    from: best,
    fiveK: t5,
    tenK: riegel(best.seconds, best.km, 10),
    half: riegel(best.seconds, best.km, 21.1),
    full: riegel(best.seconds, best.km, 42.2),
    paces: {
      easy: [p5 * 1.25, p5 * 1.4] as const,
      long: [p5 * 1.25, p5 * 1.4] as const,
      tempo: p5 * 1.08,
      interval: p5,
      tenK: riegel(best.seconds, best.km, 10) / 10,
      half: riegel(best.seconds, best.km, 21.1) / 21.1,
      marathon: riegel(best.seconds, best.km, 42.2) / 42.2,
    },
  }
}

export type Estimate = NonNullable<ReturnType<typeof estimate>>

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`

// ข้อความเพซแนะนำของวันวิ่งตามชนิด
export function paceHint(e: Estimate | null, kind?: string, title = '') {
  if (!e) return null
  if (/10K/.test(title)) return `เพซ 10K ~${fmt(e.paces.tenK)} /กม.`
  if (/ฮาล์ฟ/.test(title)) return `เพซฮาล์ฟ ~${fmt(e.paces.half)} /กม.`
  if (/มาราธอน/.test(title)) return `เพซมาราธอน ~${fmt(e.paces.marathon)} /กม.`
  switch (kind) {
    case 'tempo': return `Tempo ~${fmt(e.paces.tempo)} /กม.`
    case 'interval': return `ช่วงเร็ว ~${fmt(e.paces.interval)} /กม.`
    case 'race': return null
    default: return `เบา ${fmt(e.paces.easy[0])}–${fmt(e.paces.easy[1])} /กม.`
  }
}
