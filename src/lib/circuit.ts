// เซอร์กิตแกนกลาง/สะโพกสำหรับนักวิ่ง: ทำท่าละ 30 วิ พัก 15 วิ วน 2 รอบ (~12 นาที) — ใช้ร่างกายอย่างเดียว ทำที่ไหนก็ได้
// โมดูลล้วน: ตารางขั้นตอน + หาว่าตอนนี้อยู่ขั้นไหนจากเวลาที่ผ่านไป
export type Station = { name: string; th: string; en?: string; sec?: number; how?: string; howEn?: string } // sec: เวลาเฉพาะท่านี้ (ไม่ใส่ = ใช้ work), how: วิธีทำ
export type CircuitStep = { kind: 'work' | 'rest'; sec: number; station: Station; round: number }

export const coreCircuit: Station[] = [
  { name: 'Plank', th: 'แพลงก์' },
  { name: 'Side Plank', th: 'แพลงก์ด้านข้าง (ซ้าย)', en: 'Side Plank (left)' },
  { name: 'Side Plank', th: 'แพลงก์ด้านข้าง (ขวา)', en: 'Side Plank (right)' },
  { name: 'Dead Bug', th: 'นอนหงายยืดแขนขาสลับ' },
  { name: 'Single-leg Glute Bridge', th: 'ยกสะโพกขาเดียว (ซ้าย)', en: 'Single-leg Glute Bridge (left)' },
  { name: 'Single-leg Glute Bridge', th: 'ยกสะโพกขาเดียว (ขวา)', en: 'Single-leg Glute Bridge (right)' },
  { name: 'Hollow Body Hold', th: 'นอนเกร็งท้องทรงเรือ' },
  { name: 'Single-leg Calf Raise', th: 'เขย่งน่องขาเดียว (สลับข้างทุก 15 วิ)', en: 'Single-leg Calf Raise (switch every 15 s)' },
]

export function buildCircuit(stations: Station[], work = 30, rest = 15, rounds = 2): CircuitStep[] {
  const out: CircuitStep[] = []
  for (let r = 1; r <= rounds; r++)
    stations.forEach((station, i) => {
      out.push({ kind: 'work', sec: station.sec ?? work, station, round: r })
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

/**
 * วันนี้เหมาะทำเซอร์กิตไหม (สัปดาห์ละ 2–3 ครั้งพอ): วันพักหรือหลังวิ่งเบา = เหมาะ;
 * วันวิ่งยาว/วิ่งหนัก หรือก่อนวันวิ่งยาว/วิ่งหนัก/แข่ง = เลี่ยง (ไม่ให้ขาล้าก่อนวันสำคัญ);
 * วันเวท = ไม่ต้อง (มีท่าแกนกลางในวันเวทแล้ว)
 */
export function circuitFit(plan: { type: string; runKind?: string }[], todayIdx: number): 'good' | 'avoid' | 'skip' {
  const d = plan[todayIdx]
  const next = plan[todayIdx + 1]
  const key = (x?: { type: string; runKind?: string }) => x?.type === 'run' && x.runKind !== 'easy'
  if (!d) return 'good'
  if (key(d) || key(next)) return 'avoid'
  if (d.type === 'strength') return 'skip'
  return 'good'
}
