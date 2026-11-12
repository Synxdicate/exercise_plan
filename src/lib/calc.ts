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
  { value: 1.375, label: 'ออกกำลังกาย 1–3 วัน/สัปดาห์', labelEn: 'Exercise 1–3 days/week' },
  { value: 1.55, label: 'ออกกำลังกาย 4–5 วัน/สัปดาห์ (แผนนี้)', labelEn: 'Exercise 4–5 days/week (this plan)' },
  { value: 1.725, label: 'ออกกำลังกายหนัก 6–7 วัน/สัปดาห์', labelEn: 'Hard exercise 6–7 days/week' },
]

export const goals = {
  cut: { label: 'ลดไขมันให้เห็นซิกแพค', labelEn: 'Cut (visible abs)', delta: -400 },
  recomp: { label: 'Recomp (ลดไขมัน + เพิ่มกล้ามช้า ๆ)', labelEn: 'Recomp (lose fat + slowly gain muscle)', delta: -250 },
  'lean-bulk': { label: 'เพิ่มกล้าม (Lean bulk)', labelEn: 'Lean bulk (gain muscle)', delta: 250 },
} as const

export const bmi = (p: Profile) => p.weightKg / (p.heightCm / 100) ** 2

// Mifflin-St Jeor (ผู้ชาย)
export const bmr = (p: Profile) => 10 * p.weightKg + 6.25 * p.heightCm - 5 * p.age + 5

export const tdee = (p: Profile) => bmr(p) * p.activity

// race = อยู่ในโปรแกรมฮาล์ฟ/ฟูล: ใช้พลังงานมากขึ้น และไม่ควรกินขาด
// (กินน้อยเกินขณะซ้อมหนักเสี่ยงภาวะพลังงานไม่พอ บาดเจ็บ/ฮอร์โมนรวน)
/**
 * race = อยู่ในโปรแกรมแข่ง: ไม่กินขาด (เท่าที่ใช้ขึ้นไป) และเพิ่มคาร์บ
 * longRace = ฮาล์ฟ/ฟูล (ระยะซ้อมสูง): ใช้กิจกรรมอย่างน้อยระดับหนัก (×1.725) ด้วย
 * 5K/10K มือใหม่ (3 วิ่ง + 2 เวท) ใช้ระดับกิจกรรมตามโปรไฟล์ เดิมบังคับ ×1.725 ทุกโปรแกรมแข่ง เป้าเกิน TDEE ที่แสดง ~280 kcal/วัน
 */
export function targets(p: Profile, race = false, longRace = false) {
  const activity = race && longRace ? Math.max(p.activity, 1.725) : p.activity
  const delta = race ? Math.max(goals[p.goal].delta, 0) : goals[p.goal].delta
  const kcal = Math.round((bmr(p) * activity + delta) / 10) * 10
  // ISSN: 1.4–2.0 g/kg; ช่วงกินขาดใช้เอนไปทางสูง
  const protein = Math.round(p.weightKg * (p.goal === 'lean-bulk' || race ? 1.8 : 2.0))
  const fat = Math.round(p.weightKg * 0.9)
  const carbs = Math.max(0, Math.round((kcal - protein * 4 - fat * 9) / 4))
  return { kcal, protein, fat, carbs, raceAdjusted: race }
}
