// จุดที่เจ็บ (ไม่บังคับตอบ) — ใช้ให้คำเตือนเจาะจงว่าควรเลี่ยงอะไร ไม่ใช่การวินิจฉัย
export type PainArea = 'foot' | 'achilles' | 'shin' | 'calf' | 'knee' | 'hamstring' | 'hip' | 'back' | 'upper'

export const PAIN_AREAS: Record<PainArea, { label: string; avoid: string }> = {
  foot: { label: 'ฝ่าเท้า/ส้นเท้า', avoid: 'งดวิ่งเร็วและขึ้นเนิน เลือกพื้นเรียบ' },
  achilles: { label: 'เอ็นร้อยหวาย', avoid: 'งดกระโดด (Pogo) เนิน และวิ่งเร็ว — เขย่งช้า ๆ ได้ถ้าเจ็บไม่เกิน 3/10' },
  shin: { label: 'หน้าแข้ง', avoid: 'พักวิ่ง 2–3 วัน ใช้ปั่น/ว่ายแทน — ถ้ากดแล้วเจ็บเฉพาะจุดบนกระดูก ควรให้แพทย์ตรวจ' },
  calf: { label: 'น่อง', avoid: 'งดวิ่งเร็ว strides และกระโดด จนเขย่งขาเดียวได้ไม่เจ็บ' },
  knee: { label: 'เข่า', avoid: 'ลดระยะวิ่งและเลี่ยงลงเนิน งดสควอตลึก/ลันจ์ที่ทำให้เจ็บ' },
  hamstring: { label: 'ต้นขาหลัง', avoid: 'งดวิ่งเร็ว strides และ deadlift หนัก — วิ่งเบาได้ถ้าไม่เจ็บ' },
  hip: { label: 'สะโพก/ก้น', avoid: 'ลดระยะวิ่ง เลี่ยงท่าขาเดียวที่ทำให้เจ็บ' },
  back: { label: 'หลังล่าง', avoid: 'งดท่าที่มีบาร์บนหลังหรือก้มยก (squat, deadlift)' },
  upper: { label: 'ไหล่/ศอก/ข้อมือ', avoid: 'งดท่าดัน/ดึงที่ทำให้เจ็บ — วิ่งได้ตามปกติ' },
}

export type Readiness = { sleep: 0 | 1 | 2; sore: 0 | 1 | 2; pain: boolean; areas?: PainArea[] }
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

/** จุดที่เจ็บซ้ำ (≥2 วันใน 7 วันล่าสุด) เรียงจากบ่อยสุด */
export function repeatedPainAreas(log: Record<string, Readiness>, today: string, days = 7) {
  const count = new Map<PainArea, number>()
  for (const d of recentPainDays(log, today, days)) for (const a of log[d].areas ?? []) count.set(a, (count.get(a) ?? 0) + 1)
  return [...count].filter(([, n]) => n >= 2).sort((a, b) => b[1] - a[1]).map(([a]) => a)
}
