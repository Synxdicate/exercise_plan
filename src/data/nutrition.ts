export type Food = {
  name: string
  portion: string
  kcal: number
  protein: number
  where: string
}

// ค่าประมาณ: วัตถุดิบอ้างอิง USDA FoodData Central / ฉลากทั่วไป,
// อาหารจานเดียวอ้างอิงค่าพลังงานที่กรมอนามัยเผยแพร่ทั่วไป ปริมาณจริงขึ้นกับร้าน
export const proteinFoods: Food[] = [
  { name: 'อกไก่ต้ม/ย่าง', portion: '100 กรัม (สุก)', kcal: 165, protein: 31, where: 'ทำเอง / ตลาด' },
  { name: 'อกไก่พร้อมทาน', portion: '1 ซอง (~100 กรัม)', kcal: 120, protein: 23, where: '7-Eleven (ดูฉลาก)' },
  { name: 'ไข่ไก่ต้ม', portion: '1 ฟอง', kcal: 72, protein: 6, where: 'ทุกที่' },
  { name: 'ไข่ขาวต้ม', portion: '1 ฟอง', kcal: 17, protein: 4, where: 'ทำเอง / 7-Eleven' },
  { name: 'ปลาทูนึ่ง/ทอดน้อยน้ำมัน', portion: '1 ตัวกลาง', kcal: 150, protein: 20, where: 'ตลาด' },
  { name: 'ทูน่ากระป๋องในน้ำแร่', portion: '1 กระป๋อง (สะเด็ดน้ำ)', kcal: 110, protein: 24, where: 'ซูเปอร์มาร์เก็ต' },
  { name: 'หมูสันใน', portion: '100 กรัม (สุก)', kcal: 145, protein: 26, where: 'ตลาด' },
  { name: 'เต้าหู้แข็ง', portion: '100 กรัม', kcal: 145, protein: 16, where: 'ตลาด / ซูเปอร์มาร์เก็ต' },
  { name: 'นมจืดพร่องมันเนย', portion: '200 มล.', kcal: 75, protein: 7, where: '7-Eleven' },
  { name: 'นมถั่วเหลืองไม่หวาน', portion: '250 มล.', kcal: 95, protein: 8, where: '7-Eleven' },
  { name: 'กรีกโยเกิร์ตไม่หวาน', portion: '1 ถ้วย (~140 กรัม)', kcal: 100, protein: 13, where: 'ซูเปอร์มาร์เก็ต' },
  { name: 'เวย์โปรตีน', portion: '1 สกู๊ป', kcal: 120, protein: 24, where: 'ไม่จำเป็น แค่ช่วยให้สะดวก' },
]

export const carbFoods: Food[] = [
  { name: 'ข้าวสวย / ข้าวกล้อง', portion: '1 ทัพพี', kcal: 80, protein: 2, where: 'วันฝึกกิน 2–3 ทัพพี/มื้อ' },
  { name: 'มันหวานต้ม', portion: '100 กรัม', kcal: 90, protein: 2, where: '7-Eleven / ตลาด' },
  { name: 'กล้วยน้ำว้า / กล้วยหอม', portion: '1 ผล', kcal: 90, protein: 1, where: 'ก่อนฝึก 30–60 นาที' },
  { name: 'ข้าวโอ๊ต', portion: '40 กรัม', kcal: 150, protein: 5, where: 'มื้อเช้า' },
  { name: 'ขนมปังโฮลวีต', portion: '1 แผ่น', kcal: 70, protein: 3, where: '7-Eleven' },
]

export type Dish = {
  name: string
  kcal: number
  protein: number
  verdict: 'good' | 'ok' | 'limit'
  tip: string
}

// พลังงานอิงค่าอาหารจานเดียวที่กรมอนามัยเผยแพร่ทั่วไป โปรตีนประมาณจากส่วนประกอบหลัก (USDA) — ต่างกันได้มากตามร้าน
export const streetDishes: Dish[] = [
  { name: 'ข้าวอกไก่ย่าง + ส้มตำไทย', kcal: 450, protein: 35, verdict: 'good', tip: 'โปรตีนสูง ส้มตำขอหวานน้อย' },
  { name: 'ไก่ย่าง (อก 1 ชิ้น)', kcal: 200, protein: 30, verdict: 'good', tip: 'ลอกหนังออก กินคู่ข้าวเหนียว/ส้มตำ' },
  { name: 'ปลานิลเผา (ครึ่งตัว)', kcal: 200, protein: 38, verdict: 'good', tip: 'โปรตีนสูง ไขมันต่ำ น้ำจิ้มซีฟู้ดแคลอรี่ไม่มาก' },
  { name: 'ลาบหมู / ลาบไก่', kcal: 200, protein: 20, verdict: 'good', tip: 'ไม่รวมข้าวเหนียว ขอผักแนมเยอะ' },
  { name: 'ยำวุ้นเส้นทะเล', kcal: 200, protein: 15, verdict: 'good', tip: 'สั่งพิเศษกุ้ง/หมึก' },
  { name: 'ข้าวต้มปลา / ข้าวต้มกุ้ง', kcal: 300, protein: 22, verdict: 'good', tip: 'สั่งพิเศษเนื้อ ไม่เอากระเทียมเจียวเยอะ' },
  { name: 'โจ๊กหมู + ไข่', kcal: 300, protein: 18, verdict: 'good', tip: 'มื้อเช้าย่อยง่าย ใส่ไข่เพิ่มโปรตีน' },
  { name: 'สุกี้น้ำ / แห้ง (ไก่ หรือ ทะเล)', kcal: 300, protein: 22, verdict: 'good', tip: 'ผักเยอะ โปรตีนดี ระวังน้ำจิ้มหวาน' },
  { name: 'ก๋วยเตี๋ยวเส้นเล็กน้ำใส ไก่/หมูสับ', kcal: 330, protein: 20, verdict: 'good', tip: 'สั่งพิเศษเนื้อ ไม่เติมน้ำตาล' },
  { name: 'เกาเหลาเนื้อ/หมู + ข้าว', kcal: 400, protein: 28, verdict: 'good', tip: 'ไม่มีเส้น สั่งข้าวแยกคุมปริมาณได้' },
  { name: 'ต้มยำ/แกงจืดเต้าหู้ + ข้าว', kcal: 400, protein: 20, verdict: 'good', tip: 'น้ำใส ไม่ใส่กะทิ' },
  { name: 'ข้าวกะเพราไก่ + ไข่ต้ม', kcal: 550, protein: 33, verdict: 'ok', tip: 'ไข่ดาวเพิ่ม ~100 kcal ขอน้ำมันน้อย' },
  { name: 'ข้าวหมูแดง', kcal: 540, protein: 25, verdict: 'ok', tip: 'น้ำราดหวาน ขอราดน้อย' },
  { name: 'ข้าวหมูกระเทียม', kcal: 550, protein: 25, verdict: 'ok', tip: 'ขอน้ำมันน้อย เพิ่มไข่ต้มได้' },
  { name: 'ข้าวไข่เจียว', kcal: 450, protein: 14, verdict: 'ok', tip: 'อมน้ำมันมาก โปรตีนต่ำ เพิ่มหมูสับ/ไก่' },
  { name: 'ราดหน้าหมู', kcal: 400, protein: 18, verdict: 'ok', tip: 'น้ำราดแป้งเยอะ สั่งพิเศษหมู' },
  { name: 'ข้าวมันไก่ (ไก่ต้ม)', kcal: 600, protein: 30, verdict: 'ok', tip: 'ข้าวมันพลังงานสูง ขอเนื้อไก่พิเศษ หนังน้อย' },
  { name: 'แกงเขียวหวานไก่ + ข้าว', kcal: 600, protein: 22, verdict: 'ok', tip: 'กะทิไขมันสูง ตักน้ำแกงน้อย' },
  { name: 'ข้าวผัด', kcal: 560, protein: 18, verdict: 'ok', tip: 'โปรตีนต่ำเมื่อเทียบพลังงาน เพิ่มไข่/ไก่' },
  { name: 'ผัดไทย', kcal: 550, protein: 20, verdict: 'ok', tip: 'น้ำตาลและน้ำมันสูง กินเป็นครั้งคราว' },
  { name: 'ข้าวขาหมู', kcal: 690, protein: 30, verdict: 'limit', tip: 'ไขมันสูง เลาะหนังออก' },
  { name: 'หมูกระทะ / ของทอด', kcal: 1000, protein: 50, verdict: 'limit', tip: 'ไม่ต้องงด แต่นับเป็นมื้อพิเศษ 1 ครั้ง/สัปดาห์' },
  { name: 'ชานมไข่มุก / กาแฟเย็นหวาน', kcal: 350, protein: 3, verdict: 'limit', tip: 'แคลอรี่ส่วนใหญ่มาจากน้ำตาล สั่งหวาน 0–25% แทน' },
]

// ของกินเล่น/เครื่องดื่มที่มักลืมนับ
export const extraFoods: Food[] = [
  { name: 'ข้าวเหนียว', portion: '1 ปั้นเล็ก (~70 กรัม)', kcal: 120, protein: 2, where: 'ร้านส้มตำ' },
  { name: 'ไข่ดาว', portion: '1 ฟอง', kcal: 110, protein: 6, where: 'เพิ่มในจานตามสั่ง' },
  { name: 'ซาลาเปาหมูสับ', portion: '1 ลูก', kcal: 200, protein: 7, where: '7-Eleven' },
  { name: 'ผลไม้ (มะละกอ/แตงโม/สับปะรด)', portion: '1 ถุง', kcal: 80, protein: 1, where: 'รถเข็นผลไม้' },
  { name: 'กาแฟดำ / อเมริกาโน่ไม่หวาน', portion: '1 แก้ว', kcal: 5, protein: 0, where: 'ทุกร้าน' },
  { name: 'น้ำอัดลม', portion: '1 กระป๋อง 325 มล.', kcal: 140, protein: 0, where: 'เลือกสูตรไม่มีน้ำตาลได้' },
]

export type LogFood = { name: string; protein: number; kcal: number; detail?: string }

/** รายการทั้งหมดที่ค้นหาและบันทึกได้ในหน้าอาหาร */
export const logFoods: LogFood[] = [
  ...streetDishes.map(d => ({ name: d.name, protein: d.protein, kcal: d.kcal })),
  ...[...proteinFoods, ...carbFoods, ...extraFoods].map(f => ({ name: f.name, protein: f.protein, kcal: f.kcal, detail: f.portion })),
]

/**
 * ค้นหาแบบไม่สนช่องว่าง/ตัวพิมพ์ — ภาษาไทยไม่เว้นวรรคระหว่างคำ จึงรับทั้ง
 * ตรงทุกคำ (เช่น "ข้าว ไก่") และตัวอักษรเรียงตามลำดับ (เช่น "ไข่ต้ม" → "ไข่ไก่ต้ม") โดยแบบแรกขึ้นก่อน
 */
export function searchFoods<T extends { name: string }>(foods: T[], q: string): T[] {
  const norm = (s: string) => s.toLowerCase().replace(/\s+/g, '')
  const words = q.trim().toLowerCase().split(/\s+/).filter(Boolean)
  if (!words.length) return foods
  const query = words.join('')
  const inOrder = (name: string) => {
    let i = 0
    for (const ch of name) if (ch === query[i]) i++
    return i === query.length
  }
  const score = (f: T) => (words.every(w => norm(f.name).includes(w)) ? 2 : inOrder(norm(f.name)) ? 1 : 0)
  return foods.map(f => [f, score(f)] as const).filter(([, sc]) => sc > 0).sort((a, b) => b[1] - a[1]).map(([f]) => f)
}

export type MealPlan = {
  title: string
  meals: { time: string; items: string; kcal: number; protein: number }[]
}

export const sampleDays: MealPlan[] = [
  {
    title: 'วันฝึก — ทำเอง + 7-Eleven',
    meals: [
      { time: 'เช้า', items: 'ข้าวโอ๊ต 50 ก. + นมพร่องมันเนย 200 มล. + ไข่ต้ม 2 ฟอง + กล้วย 1 ผล', kcal: 500, protein: 26 },
      { time: 'กลางวัน', items: 'ข้าวกะเพราไก่ (ขอไก่พิเศษ) + ไข่ต้ม', kcal: 650, protein: 38 },
      { time: 'ก่อนฝึก', items: 'มันหวานต้ม 150 ก. หรือ ขนมปังโฮลวีต 2 แผ่น', kcal: 140, protein: 4 },
      { time: 'หลังฝึก / เย็น', items: 'ข้าวสวย 2 ทัพพี + อกไก่ 150 ก. + ผักลวก/ผัดผัก', kcal: 560, protein: 50 },
      { time: 'ก่อนนอน', items: 'นมถั่วเหลืองไม่หวาน หรือ กรีกโยเกิร์ต', kcal: 100, protein: 10 },
    ],
  },
  {
    title: 'วันพัก — กินนอกบ้าน',
    meals: [
      { time: 'เช้า', items: 'ข้าวต้มปลา + นมถั่วเหลืองไม่หวาน', kcal: 400, protein: 30 },
      { time: 'กลางวัน', items: 'ก๋วยเตี๋ยวเส้นเล็กน้ำใส (พิเศษเนื้อ) + ไข่ต้ม 1', kcal: 450, protein: 32 },
      { time: 'ว่าง', items: 'อกไก่พร้อมทาน 1 ซอง + ผลไม้ 1 กำมือ', kcal: 200, protein: 23 },
      { time: 'เย็น', items: 'ข้าวไก่ย่าง (อก) + ส้มตำไทยหวานน้อย + ข้าวเหนียว 1 ปั้นเล็ก', kcal: 650, protein: 40 },
    ],
  },
]

export const nutritionRules = [
  'โปรตีนทุกมื้อ ~30–40 ก. (ฝ่ามือ 1–1.5 ชิ้น) รวมทั้งวันตามเป้าด้านบน',
  'ผักอย่างน้อย 2 มื้อ/วัน — สั่ง "ผักเยอะ" หรือเพิ่มผักลวกได้ทุกร้าน',
  'ดื่มน้ำ ~2.5–3 ลิตร/วัน (อากาศไทยร้อน วันวิ่งให้ดื่มเพิ่ม)',
  'เครื่องดื่มหวานคือตัวทำลายเป้าหมายอันดับต้น ๆ — เลือกหวาน 0–25%',
  'ชั่งน้ำหนักตอนเช้าหลังเข้าห้องน้ำ 3–4 วัน/สัปดาห์ ดูค่าเฉลี่ยรายสัปดาห์ ไม่ใช่รายวัน',
  'ถ้าน้ำหนักเฉลี่ยไม่ลงเลย 2–3 สัปดาห์ ให้ลด ~150–200 kcal (เช่น ข้าวลด 1 ทัพพี/วัน)',
  'อาหารเสริมที่มีหลักฐานดี: ครีเอทีน โมโนไฮเดรต 3–5 ก./วัน (ไม่บังคับ) — นอกนั้นส่วนใหญ่ไม่จำเป็น',
]
