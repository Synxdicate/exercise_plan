// เซอร์กิตแกนกลาง/สะโพกสำหรับนักวิ่ง: ทำท่าละ 30 วิ พัก 15 วิ วน 2 รอบ (~12 นาที) ใช้ร่างกายอย่างเดียว ทำที่ไหนก็ได้
// โมดูลล้วน: ตารางขั้นตอน + หาว่าตอนนี้อยู่ขั้นไหนจากเวลาที่ผ่านไป
export type Station = { name: string; th: string; en?: string; sec?: number; how?: string; howEn?: string; zone?: 'upper' | 'core' | 'lower' } // sec: เวลาเฉพาะท่านี้ (ไม่ใส่ = ใช้ work), how: วิธีทำ, zone: ส่วนของร่างกาย (เซอร์กิตทั้งตัว)
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

/**
 * เซอร์กิตทั้งตัวแบบอยู่กับที่ (in-place circuit) สลับท่อนบน → แกนกลาง → ท่อนล่าง กล้ามส่วนเดิมได้พักระหว่างท่า ไม่ใช้อุปกรณ์ ทำที่สวนหรือบ้าน
 * ครบทุกรูปแบบการเคลื่อนไหว: ดึง ดัน สะบัก / แกนกลางกันแอ่น กันบิด / ขาเดียว (ลันจ์) สะโพก-ต้นขาหลัง (hinge) และน่อง
 * น่อง (โดยเฉพาะมัดใน soleus) รับแรงตอนวิ่งมากที่สุด (Dorn 2012) side plank ยกขาบนได้ = สะโพกด้านข้าง (Fredericson 2000)
 * น้ำหนักตัวได้ผลต่อกล้ามเนื้อเมื่อทำใกล้หมดแรง (Schoenfeld 2017, Robinson 2024) ทุกท่าจึงมี "ง่ายไป" ให้ขยับขั้น
 * หลักฐาน: เซอร์กิตท่าพื้นฐาน 2–3 รอบ ทำ 2–3 ครั้ง/สัปดาห์ได้ผลมากกว่า 1 ครั้ง (Batrakoulis 2023)
 * แต่ไม่ได้ช่วยความประหยัดแรงในการวิ่งเหมือนเวทหนัก/ท่ากระโดด (Llanos-Lagos 2024) จึงเป็นทางเลือกวันที่ไม่ได้เข้ายิม ไม่ใช่ตัวแทนวันเวท
 */
export const fullCircuit: Station[] = [
  { name: 'Backpack Row', zone: 'upper', th: 'ดึงเป้แขนเดียว (สลับข้างครึ่งเวลา)', en: 'Backpack row (switch halfway)',
    how: 'ใส่ขวดน้ำในเป้ มือกับเข่าข้างหนึ่งวางบนเตียงหรือเก้าอี้ หลังตรง ดึงศอกไปทางสะโพกจนเป้ชิดเอว ลงช้า ๆ ครึ่งเวลาสลับข้าง ไม่มีเป้ใช้นอนคว่ำยกแขนตัว Y-T-W แทน ง่ายไป: ใส่ขวดเพิ่ม หรือค้างบนสุด 2 วิ',
    howEn: 'Water bottles in a backpack, one hand and knee on a bed or chair, back flat, pull the elbow to the hip until the pack touches the waist, lower slowly; switch halfway. No backpack: prone Y-T-W raises. Too easy: add bottles or hold 2 s at the top' },
  { name: 'Dead Bug', zone: 'core', th: 'นอนหงายยืดแขนขาสลับ', en: 'Dead bug',
    how: 'นอนหงาย ยกแขนตรงชี้เพดาน เข่างอ 90 องศา ยืดแขนกับขาฝั่งตรงข้ามลงช้า ๆ สลับข้าง หลังล่างแนบพื้นตลอด หายใจออกตอนยืด ง่ายไป: ยืดค้าง 2 วิ',
    howEn: 'On your back, arms to the ceiling, knees at 90°; slowly lower the opposite arm and leg, alternate — low back stays on the floor, breathe out as you reach. Too easy: hold the reach 2 s' },
  { name: 'Reverse Lunge', zone: 'lower', th: 'ลันจ์ถอยหลัง (สลับขา)', en: 'Reverse lunge (alternate)',
    how: 'ถอยเท้าไปข้างหลัง ย่อจนเข่าหลังเกือบแตะพื้น ลำตัวตั้ง เข่าหน้าชี้ตามปลายเท้า ดันกลับด้วยส้นเท้าหน้า สลับขา ง่ายไป: ลงช้า 3 วิ หรือถือเป้ใส่ขวดน้ำ',
    howEn: 'Step back and lower until the back knee nearly touches the floor, trunk upright, front knee over the toes, push back through the front heel — alternate. Too easy: 3 s down or hold a loaded backpack' },
  { name: 'Push-up', zone: 'upper', th: 'วิดพื้น', en: 'Push-up',
    how: 'ลำตัวตรงเหมือนแพลงก์ตลอด อกลงเกือบแตะพื้น ยังทำไม่ไหวให้วางมือบนม้านั่ง โต๊ะ หรือผนังแทนการคุกเข่า ง่ายไป: วางเท้าบนม้านั่ง หรือลงช้า 3 วิ',
    howEn: 'Body straight like a plank, chest nearly to the floor; if it’s too hard, hands on a bench, table or wall instead of the knees. Too easy: feet on a bench or 3 s down' },
  { name: 'Side Plank', zone: 'core', th: 'แพลงก์ด้านข้าง (สลับข้างครึ่งเวลา)', en: 'Side plank (switch halfway)',
    how: 'ศอกอยู่ใต้ไหล่ ยกสะโพกจนศีรษะถึงเท้าเป็นเส้นตรง ครึ่งเวลาแล้วสลับข้าง ยากไปให้วางเข่าล่าง ง่ายไป: ยกขาบนขึ้นลงช้า ๆ (ได้สะโพกด้านข้างด้วย ช่วยเรื่อง IT band)',
    howEn: 'Elbow under the shoulder, lift the hips so head to feet form a line, switch sides halfway; drop the bottom knee if it’s too hard. Too easy: slowly raise and lower the top leg (works the side hip too, helps the IT band)' },
  { name: 'Single-leg Glute Bridge', zone: 'lower', th: 'ยกสะโพกขาเดียว (สลับข้างครึ่งเวลา)', en: 'Single-leg glute bridge (switch halfway)',
    how: 'นอนหงาย เท้าหนึ่งวางพื้น อีกขาเหยียดหรือชันเข่าขึ้น ดันส้นเท้ายกสะโพกจนลำตัวถึงเข่าเป็นเส้นตรง บีบก้นค้าง 1 วิ สะโพกไม่เอียง ครึ่งเวลาสลับข้าง ง่ายไป: วางเท้าบนม้านั่ง',
    howEn: 'On your back, one foot down, the other leg up; drive through the heel until shoulders, hips and knee line up, squeeze 1 s, hips level — switch halfway. Too easy: foot on a bench' },
  { name: 'Prone Y-T-W Raise', zone: 'upper', th: 'นอนคว่ำบีบสะบัก (Y-T-W)', en: 'Prone Y-T-W raise',
    how: 'นอนคว่ำ บีบสะบักเข้าหากันก่อน แล้วค่อยยกแขนเป็นตัว Y, T, W สลับไป ยกค้างสั้น ๆ คอยาว ไม่แหงนหน้า ง่ายไป: ถือขวดน้ำ',
    howEn: 'Face down, squeeze the shoulder blades together first, then lift the arms into a Y, T and W in turn with a short hold — long neck, don’t look up. Too easy: hold water bottles' },
  { name: 'Mountain Climber', zone: 'core', th: 'ปีนเขา', en: 'Mountain climber',
    how: 'ท่าแพลงก์แขนตรง มืออยู่ใต้ไหล่ ดึงเข่าเข้าหาอกสลับข้างเป็นจังหวะ สะโพกไม่โด่ง เริ่มช้า ๆ ก่อน ง่ายไป: เร็วขึ้นแต่สะโพกยังนิ่ง',
    howEn: 'High plank, hands under shoulders, drive the knees to the chest alternately — hips stay level; start slow. Too easy: go faster with still hips' },
  { name: 'Single-leg Calf Raise', zone: 'lower', th: 'เขย่งน่องขาเดียว (สลับข้างครึ่งเวลา)', en: 'Single-leg calf raise (switch halfway)',
    how: 'ยืนขาเดียวบนขอบบันไดหรือพื้น มือแตะผนังทรงตัว เขย่งขึ้นสุด ลงช้า 3 วิจนส้นต่ำกว่าขอบ ครึ่งเวลาสลับข้าง ครึ่งหลังงอเข่าเล็กน้อย (น่องมัดใน) ปวดเอ็นร้อยหวายให้เขย่งสองขาแทน ง่ายไป: สะพายเป้ใส่ขวดน้ำ',
    howEn: 'On one foot on a step edge or the floor, fingertips on a wall, rise all the way, lower over 3 s below the edge — switch halfway; bend the knee slightly for the second half (soleus). Achilles pain: use both legs. Too easy: wear a loaded backpack' },
]

export type CircuitKind = 'core' | 'full'
export const CIRCUITS: Record<CircuitKind, Station[]> = { core: coreCircuit, full: fullCircuit }
export const CIRCUIT_TITLE: Record<CircuitKind, string> = { core: 'เซอร์กิตแกนกลาง/สะโพก', full: 'เซอร์กิตทั้งตัว' }

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

/** ขั้นปัจจุบันจากเวลาที่ผ่านไป (วินาที) เกินเวลารวม = จบ */
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
