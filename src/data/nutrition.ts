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
  verdict: 'good' | 'ok' | 'limit'
  tip: string
}

export const streetDishes: Dish[] = [
  { name: 'ข้าวอกไก่ย่าง + ส้มตำไทย', kcal: 450, verdict: 'good', tip: 'โปรตีนสูง ส้มตำขอหวานน้อย' },
  { name: 'ข้าวต้มปลา / ข้าวต้มกุ้ง', kcal: 300, verdict: 'good', tip: 'สั่งพิเศษเนื้อ ไม่เอากระเทียมเจียวเยอะ' },
  { name: 'สุกี้น้ำ / แห้ง (ไก่ หรือ ทะเล)', kcal: 300, verdict: 'good', tip: 'ผักเยอะ โปรตีนดี ระวังน้ำจิ้มหวาน' },
  { name: 'ก๋วยเตี๋ยวเส้นเล็กน้ำใส ไก่/หมูสับ', kcal: 330, verdict: 'good', tip: 'สั่งพิเศษเนื้อ ไม่เติมน้ำตาล' },
  { name: 'ต้มยำ/แกงจืดเต้าหู้ + ข้าว', kcal: 400, verdict: 'good', tip: 'น้ำใส ไม่ใส่กะทิ' },
  { name: 'ข้าวกะเพราไก่ + ไข่ต้ม', kcal: 550, verdict: 'ok', tip: 'ไข่ดาวเพิ่ม ~100 kcal ขอน้ำมันน้อย' },
  { name: 'ข้าวมันไก่ (ไก่ต้ม)', kcal: 600, verdict: 'ok', tip: 'ข้าวมันพลังงานสูง ขอเนื้อไก่พิเศษ หนังน้อย' },
  { name: 'ข้าวผัด', kcal: 560, verdict: 'ok', tip: 'โปรตีนต่ำเมื่อเทียบพลังงาน เพิ่มไข่/ไก่' },
  { name: 'ผัดไทย', kcal: 550, verdict: 'ok', tip: 'น้ำตาลและน้ำมันสูง กินเป็นครั้งคราว' },
  { name: 'ข้าวขาหมู', kcal: 690, verdict: 'limit', tip: 'ไขมันสูง เลาะหนังออก' },
  { name: 'หมูกระทะ / ของทอด', kcal: 1000, verdict: 'limit', tip: 'ไม่ต้องงด แต่นับเป็นมื้อพิเศษ 1 ครั้ง/สัปดาห์' },
  { name: 'ชานมไข่มุก / กาแฟเย็นหวาน', kcal: 350, verdict: 'limit', tip: 'แคลอรี่จากน้ำตาลล้วน สั่งหวาน 0–25% แทน' },
]

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
