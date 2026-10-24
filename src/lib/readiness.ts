export type Readiness = { sleep: 0 | 1 | 2; sore: 0 | 1 | 2; pain: boolean }
export type Level = 'green' | 'yellow' | 'red'

// คะแนนง่าย ๆ: นอนน้อย + ล้ามาก = ควรเบาลง, เจ็บแปลบ = หยุดส่วนนั้น
export function readinessLevel(r: Readiness): Level {
  if (r.pain) return 'red'
  const score = r.sleep + r.sore
  return score >= 4 ? 'red' : score >= 2 ? 'yellow' : 'green'
}
