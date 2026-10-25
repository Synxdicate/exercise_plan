export type Readiness = { sleep: 0 | 1 | 2; sore: 0 | 1 | 2; pain: boolean }
export type Level = 'green' | 'yellow' | 'red'

// คะแนนง่าย ๆ: นอนน้อย + ล้ามาก = ควรเบาลง, เจ็บแปลบ = หยุดส่วนนั้น
export function readinessLevel(r: Readiness): Level {
  if (r.pain) return 'red'
  const score = r.sleep + r.sore
  return score >= 4 ? 'red' : score >= 2 ? 'yellow' : 'green'
}

/** วันที่ตอบว่า "เจ็บแปลบ/เจ็บผิดปกติ" ใน 7 วันล่าสุด (นับวันนี้) — เจ็บซ้ำแปลว่าแผนหนักเกินสำหรับตอนนี้ */
export function recentPainDays(log: Record<string, Readiness>, today: string, days = 7) {
  const t = new Date(today).getTime()
  return Object.entries(log)
    .filter(([d, r]) => r.pain && (t - new Date(d).getTime()) / 864e5 < days && d <= today)
    .map(([d]) => d)
    .sort()
}
