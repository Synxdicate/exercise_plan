// เครื่องคิดแผ่นน้ำหนัก + เซ็ตวอร์มอัพสำหรับท่าบาร์เบล

export const BAR_KG = 20
export const PLATES_KG = [25, 20, 15, 10, 5, 2.5, 1.25]

const BARBELL = /^(Back Squat|Front Squat|Bench Press|Overhead Press|Romanian Deadlift|Deadlift|Hip Thrust)$/
export const isBarbell = (name: string) => BARBELL.test(name)

/** แผ่นต่อข้าง (มากไปน้อย) ให้ได้น้ำหนักรวมที่ใกล้เป้าที่สุดโดยไม่เกิน */
export function platesPerSide(totalKg: number, bar = BAR_KG, plates = PLATES_KG) {
  let side = Math.max(0, (totalKg - bar) / 2)
  const out: number[] = []
  for (const p of plates) {
    while (side >= p - 1e-9) {
      out.push(p)
      side -= p
    }
  }
  return { plates: out, actual: bar + 2 * out.reduce((s, p) => s + p, 0) }
}

const round = (kg: number, step = 2.5) => Math.round(kg / step) * step

/**
 * เซ็ตวอร์มอัพไล่น้ำหนักก่อนเซ็ตทำงาน — วอร์มอัพเฉพาะท่าช่วยให้ทำครั้งได้ดีกว่า
 * (Ribeiro et al. 2014, 2020) ใช้ครั้งน้อยลงเมื่อหนักขึ้นเพื่อไม่ให้ล้าก่อนเซ็ตจริง
 */
export function warmupSets(workKg: number, bar = BAR_KG) {
  if (workKg <= bar) return []
  const sets = [{ kg: bar, reps: 10 }]
  for (const [pct, reps] of [[0.4, 5], [0.6, 3], [0.8, 2]] as const) {
    const kg = round(workKg * pct)
    if (kg > sets.at(-1)!.kg && kg < workKg) sets.push({ kg, reps })
  }
  return sets
}
