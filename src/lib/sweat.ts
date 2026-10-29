// ทดสอบเหงื่อ: ชั่งน้ำหนักก่อน–หลังวิ่ง (เช็ดตัวแห้ง) + น้ำที่ดื่ม → อัตราเหงื่อ ลิตร/ชม.
// แผนดื่ม: ไม่ให้น้ำหนักลดเกิน 2% ระหว่างวิ่ง และไม่ดื่มเกินที่เสีย (ดื่มมากเกินเสี่ยงโซเดียมต่ำ) — ACSM 2007
import { usePersisted } from './storage'
import { defaultProfile, type Profile } from './calc'

export type SweatTest = { id: string; date: string; preKg: number; postKg: number; drankMl: number; minutes: number }

export function sweatRate(t: Pick<SweatTest, 'preKg' | 'postKg' | 'drankMl' | 'minutes'>) {
  const lossKg = t.preKg - t.postKg
  const sweatL = lossKg + t.drankMl / 1000
  return {
    lossKg,
    lossPct: (lossKg / t.preKg) * 100,
    sweatL,
    rateLph: t.minutes > 0 ? sweatL / (t.minutes / 60) : 0,
  }
}

/** ต้องดื่มกี่ มล./ชม. ในการวิ่ง minutes นาที เพื่อให้น้ำหนักลดไม่เกิน 2% (ไม่ติดลบ ไม่เกินอัตราเหงื่อ) */
export function drinkPlan(rateLph: number, weightKg: number, minutes: number) {
  const hours = minutes / 60
  const allowedL = 0.02 * weightKg
  const needLph = Math.min(rateLph, Math.max(0, rateLph - allowedL / hours))
  const per20 = Math.round((needLph * 1000) / 3 / 10) * 10
  return { needMlph: Math.round(needLph * 1000), per20, sodium: minutes > 120 || rateLph > 1.2 }
}

export const useSweatTests = () => usePersisted<SweatTest[]>('sweatTests', [])

/** บรรทัดแผนดื่มน้ำในแผนวันแข่ง */
export function useRaceDrink(minutes: number) {
  const [tests] = useSweatTests()
  const [profile] = usePersisted<Profile>('profile', defaultProfile)
  const last = tests.at(-1)
  if (!last) return null
  const p = drinkPlan(sweatRate(last).rateLph, last.preKg || profile.weightKg, minutes)
  return p.needMlph ? `จากผลทดสอบเหงื่อ: ดื่ม ~${p.per20} มล. ทุก 20 นาที${p.sodium ? ' + เกลือแร่' : ''}` : 'จากผลทดสอบเหงื่อ: ระยะนี้ไม่จำเป็นต้องดื่มมาก จิบตามจุดให้น้ำพอ'
}
