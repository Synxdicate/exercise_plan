// เซอร์กิตแกนกลาง/สะโพกสำหรับนักวิ่ง: ทำท่าละ 30 วิ พัก 15 วิ วน 2 รอบ (~12 นาที) — ใช้ร่างกายอย่างเดียว ทำที่ไหนก็ได้
// โมดูลล้วน: ตารางขั้นตอน + หาว่าตอนนี้อยู่ขั้นไหนจากเวลาที่ผ่านไป
export type Station = { name: string; th: string }
export type CircuitStep = { kind: 'work' | 'rest'; sec: number; station: Station; round: number }

export const coreCircuit: Station[] = [
  { name: 'Plank', th: 'แพลงก์' },
  { name: 'Side Plank', th: 'แพลงก์ด้านข้าง (ซ้าย)' },
  { name: 'Side Plank', th: 'แพลงก์ด้านข้าง (ขวา)' },
  { name: 'Dead Bug', th: 'นอนหงายยืดแขนขาสลับ' },
  { name: 'Single-leg Glute Bridge', th: 'ยกสะโพกขาเดียว (ซ้าย)' },
  { name: 'Single-leg Glute Bridge', th: 'ยกสะโพกขาเดียว (ขวา)' },
  { name: 'Hollow Body Hold', th: 'นอนเกร็งท้องทรงเรือ' },
  { name: 'Single-leg Calf Raise', th: 'เขย่งน่องขาเดียว (สลับข้างทุก 15 วิ)' },
]

export function buildCircuit(stations: Station[], work = 30, rest = 15, rounds = 2): CircuitStep[] {
  const out: CircuitStep[] = []
  for (let r = 1; r <= rounds; r++)
    stations.forEach((station, i) => {
      out.push({ kind: 'work', sec: work, station, round: r })
      const last = r === rounds && i === stations.length - 1
      if (!last) out.push({ kind: 'rest', sec: rest, station: stations[(i + 1) % stations.length], round: r })
    })
  return out
}

export const circuitTotal = (steps: CircuitStep[]) => steps.reduce((a, s) => a + s.sec, 0)

/** ขั้นปัจจุบันจากเวลาที่ผ่านไป (วินาที) — เกินเวลารวม = จบ */
export function circuitAt(steps: CircuitStep[], elapsed: number) {
  let t = 0
  for (let i = 0; i < steps.length; i++) {
    if (elapsed < t + steps[i].sec) return { index: i, step: steps[i], left: t + steps[i].sec - elapsed, done: false }
    t += steps[i].sec
  }
  return { index: steps.length, step: steps.at(-1)!, left: 0, done: true }
}
