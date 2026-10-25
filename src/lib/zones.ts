// โซนเพซ 5 ระดับ ตามแนวคิดของ Jack Daniels (E/M/T/I/R) เทียบกับเพซ 5K ของผู้ใช้
// ขอบเขตเป็นค่าประมาณ: E ช้ากว่าเพซ 5K ≥20%, M 10–20%, T 4–10%, I ±3–4%, R เร็วกว่าเพซ 5K
export type ZoneId = 'E' | 'M' | 'T' | 'I' | 'R'

export const ZONES: { id: ZoneId; label: string; desc: string; color: string }[] = [
  { id: 'E', label: 'Easy', desc: 'เบา พูดคุยได้', color: 'var(--z-e)' },
  { id: 'M', label: 'Marathon', desc: 'เพซมาราธอน', color: 'var(--z-m)' },
  { id: 'T', label: 'Threshold', desc: 'Tempo เหนื่อยแต่คุมได้', color: 'var(--z-t)' },
  { id: 'I', label: 'Interval', desc: 'ใกล้เพซ 5K', color: 'var(--z-i)' },
  { id: 'R', label: 'Speed', desc: 'เร็วกว่าเพซ 5K', color: 'var(--z-r)' },
]

// ขอบล่างของแต่ละโซน (สัดส่วนของเพซ 5K) — เพซมากกว่า = ช้ากว่า
const BOUNDS: [ZoneId, number][] = [['E', 1.2], ['M', 1.1], ['T', 1.04], ['I', 0.97]]

export function zoneOf(pace: number, fiveKPace: number): ZoneId {
  const r = pace / fiveKPace
  for (const [id, min] of BOUNDS) if (r >= min) return id
  return 'R'
}

export const zoneInfo = (id: ZoneId) => ZONES.find(z => z.id === id)!

/** สัดส่วนระยะทางในแต่ละโซน จากชุดเพซตามระยะ (km สะสม) */
export function distanceByZone(series: { km: number; pace: number }[], fiveKPace: number) {
  const out: Record<ZoneId, number> = { E: 0, M: 0, T: 0, I: 0, R: 0 }
  for (let i = 1; i < series.length; i++) out[zoneOf(series[i].pace, fiveKPace)] += series[i].km - series[i - 1].km
  const total = Object.values(out).reduce((s, v) => s + v, 0)
  return ZONES.map(z => ({ ...z, km: out[z.id], pct: total ? out[z.id] / total : 0 }))
}
