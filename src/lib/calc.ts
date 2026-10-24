export type Profile = {
  age: number
  heightCm: number
  weightKg: number
  activity: number
  goal: 'cut' | 'recomp' | 'lean-bulk'
}

export const defaultProfile: Profile = {
  age: 20,
  heightCm: 165,
  weightKg: 64.5,
  // ~1.55 = เวท 3 วัน + วิ่ง 2 วัน/สัปดาห์
  activity: 1.55,
  goal: 'recomp',
}

export const activityLevels = [
  { value: 1.375, label: 'ออกกำลังกาย 1–3 วัน/สัปดาห์' },
  { value: 1.55, label: 'ออกกำลังกาย 4–5 วัน/สัปดาห์ (แผนนี้)' },
  { value: 1.725, label: 'ออกกำลังกายหนัก 6–7 วัน/สัปดาห์' },
]

export const goals = {
  cut: { label: 'ลดไขมันให้เห็นซิกแพค', delta: -400 },
  recomp: { label: 'Recomp (ลดไขมัน + เพิ่มกล้ามช้า ๆ)', delta: -250 },
  'lean-bulk': { label: 'เพิ่มกล้าม (Lean bulk)', delta: 250 },
} as const

export const bmi = (p: Profile) => p.weightKg / (p.heightCm / 100) ** 2

// Mifflin-St Jeor (ผู้ชาย)
export const bmr = (p: Profile) => 10 * p.weightKg + 6.25 * p.heightCm - 5 * p.age + 5

export const tdee = (p: Profile) => bmr(p) * p.activity

// race = อยู่ในโปรแกรมฮาล์ฟ/ฟูล: ใช้พลังงานมากขึ้น และไม่ควรกินขาด
// (กินน้อยเกินขณะซ้อมหนักเสี่ยงภาวะพลังงานไม่พอ — บาดเจ็บ/ฮอร์โมนรวน)
export function targets(p: Profile, race = false) {
  const activity = race ? Math.max(p.activity, 1.725) : p.activity
  const delta = race ? Math.max(goals[p.goal].delta, 0) : goals[p.goal].delta
  const kcal = Math.round((bmr(p) * activity + delta) / 10) * 10
  // ISSN: 1.4–2.0 g/kg; ช่วงกินขาดใช้เอนไปทางสูง
  const protein = Math.round(p.weightKg * (p.goal === 'lean-bulk' || race ? 1.8 : 2.0))
  const fat = Math.round(p.weightKg * 0.9)
  const carbs = Math.max(0, Math.round((kcal - protein * 4 - fat * 9) / 4))
  return { kcal, protein, fat, carbs, raceAdjusted: race }
}
