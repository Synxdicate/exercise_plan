// จุดให้น้ำของงานแข่ง (synced `raceAid`: กิโลของแต่ละจุด) + อัตราดื่มจากทดสอบเหงื่อ → ดื่มเท่าไรที่จุดไหน (pure, tested)
// แต่ละจุดดื่มพอสำหรับช่วงจนถึงจุดถัดไป (หรือเส้นชัย) ตามเวลาเป้า (ACSM 2007: ไม่ให้น้ำหนักลดเกิน 2% ไม่ดื่มเกินที่เสีย)

/** "2.5, 5 7.5" → [2.5, 5, 7.5] (เรียง ตัดซ้ำ ตัดค่านอกสนาม) */
export function parseAid(text: string, raceKm: number): number[] {
  const nums = text.split(/[\s,;/]+/).map(s => parseFloat(s.replace(/[^\d.]/g, ''))).filter(n => Number.isFinite(n) && n > 0 && n < raceKm)
  return [...new Set(nums.map(n => Math.round(n * 10) / 10))].sort((a, b) => a - b)
}

export type AidRow = { km: number; ml: number; untilKm: number }

/** ดื่มกี่ มล. ที่แต่ละจุด (ปัดทีละ 50) จากอัตราที่ต้องดื่ม มล./ชม. และเพซเฉลี่ยตามเวลาเป้า */
export function aidPlan(aid: number[], raceKm: number, goalSec: number, needMlph: number): AidRow[] {
  const secPerKm = goalSec / raceKm
  return aid.map((km, i) => {
    const next = aid[i + 1] ?? raceKm
    const ml = Math.round(((needMlph * (next - km) * secPerKm) / 3600) / 50) * 50
    return { km, ml, untilKm: next }
  })
}

/** ช่วงที่ไกลที่สุดระหว่างจุดให้น้ำ (รวมจากจุดปล่อยตัวถึงจุดแรก) */
export function longestAidGap(aid: number[], raceKm: number) {
  const marks = [0, ...aid, raceKm]
  let best = { from: 0, to: raceKm, km: raceKm }
  if (aid.length) best = { from: 0, to: 0, km: 0 }
  for (let i = 1; i < marks.length; i++) {
    const km = Math.round((marks[i] - marks[i - 1]) * 10) / 10
    if (km > best.km) best = { from: marks[i - 1], to: marks[i], km }
  }
  return best
}
