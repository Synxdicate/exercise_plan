import type { Station } from '../lib/circuit'

// ดริลล์ก่อนวิ่ง (dynamic warm-up): ทำหลังจ็อก/เดินเร็ว 5–10 นาที ไม่ใช่ตอนตัวเย็น
// หลักฐาน: วอร์มอัพช่วยสมรรถภาพ (Fradkin 2010), ยืดแบบเคลื่อนไหวก่อนวิ่งเร็วไม่เสีย (Behm 2011, Yamaguchi 2015/2019 ผลปนกัน)
// สอนท่าวิ่งทำให้ก้าวถี่ขึ้น/สั้นลงได้ แต่ไม่ได้ทำให้ประหยัดแรงขึ้นทันที (Craighead 2014) ดริลล์จึงเป็นวอร์มอัพ + ฝึกจังหวะ ไม่ใช่ทางลัดเพิ่มความเร็ว
// แองค์ลิงกับสเตรตเลกบาวด์จากโค้ชกรีฑาทีมชาติ (iStyle Sports EP.1–2) สเตรตเลกบาวด์มีแรงกระแทกมากกว่า ใส่เฉพาะชุดก่อนวิ่งเร็ว

export type Drill = Station & { sec: number; how: string; howEn: string }

const legSwing: Drill = {
  name: 'Leg Swing', th: 'เหวี่ยงขาหน้า-หลัง', en: 'Leg swings (front–back)', sec: 40,
  how: 'มือแตะผนัง/ต้นไม้ เหวี่ยงขาไปหน้า-หลังสบาย ๆ ค่อย ๆ กว้างขึ้น ข้างละ ~10 ครั้ง ครึ่งเวลาแล้วสลับขา',
  howEn: 'Hand on a wall or tree, swing the leg forward and back, gradually bigger, ~10 per side — switch halfway',
}
const lateralSwing: Drill = {
  name: 'Lateral Leg Swing', th: 'เหวี่ยงขาซ้าย-ขวา', en: 'Leg swings (side to side)', sec: 40,
  how: 'หันหน้าเข้าผนัง เหวี่ยงขาข้ามลำตัวแล้วออกด้านข้าง ข้างละ ~10 ครั้ง ลำตัวตรง ไม่บิดสะโพก',
  howEn: 'Face the wall, swing the leg across your body and out to the side, ~10 per side, trunk upright',
}
const ankling: Drill = {
  name: 'Ankling', th: 'แองค์ลิง (ก้าวเล็กด้วยข้อเท้า)', en: 'Ankling', sec: 45,
  how: 'ก้าวสั้นมาก เข่าแทบไม่งอ กระดกปลายเท้าขึ้น แล้ววางลงใต้ตัวเบา ๆ ด้วยเท้าส่วนหน้า เหมือนปาดพื้นไปข้างหลัง ถี่ ๆ ไป 20 ม. เดินกลับ ทำ 2 เที่ยว',
  howEn: 'Tiny steps, knees barely bend, toes pulled up, then land lightly under you on the forefoot and paw the ground back — quick, 20 m, walk back, 2 reps',
}
const aMarch: Drill = {
  name: 'A-March', th: 'เดินยกเข่า', en: 'A-march (high-knee walk)', sec: 45,
  how: 'ยกเข่าถึงระดับสะโพก ปลายเท้ากระดก วางเท้าลงใต้ตัว แกว่งแขนสลับ ลำตัวตรง 20 ม. เดินกลับ 2 เที่ยว',
  howEn: 'Drive the knee to hip height, toes up, step down under your hips, opposite arm swings, tall trunk — 20 m, walk back, 2 reps',
}
const buttKicks: Drill = {
  name: 'Butt Kicks', th: 'วิ่งเตะก้น', en: 'Butt kicks', sec: 45,
  how: 'วิ่งเหยาะช้า ๆ ดึงส้นเท้าขึ้นหาก้น เข่าชี้ลงพื้น ไม่ต้องตึงจนเจ็บ 20 ม. เดินกลับ 2 เที่ยว',
  howEn: 'Slow jog pulling the heel up toward your butt, knees pointing down, no straining — 20 m, walk back, 2 reps',
}
const aSkip: Drill = {
  name: 'A-Skip', th: 'เอสคิป (กระโดดยกเข่า)', en: 'A-skip', sec: 45,
  how: 'เหมือนเดินยกเข่าแต่เพิ่มการกระโดดสั้น ๆ ตะปบเท้าลงใต้ตัว เบา ๆ เป็นจังหวะ 20 ม. เดินกลับ 2 เที่ยว',
  howEn: 'Like the A-march with a small skip — paw the foot down under you, light and rhythmic — 20 m, walk back, 2 reps',
}
const straightLeg: Drill = {
  name: 'Straight-Leg Bound', th: 'สเตรตเลกบาวด์ (วิ่งขาตรง)', en: 'Straight-leg bound', sec: 45,
  how: 'ขาเกือบตรง เหวี่ยงจากสะโพก ตะปบเท้าลงใต้ตัวแล้วปาดพื้นไปข้างหลังให้ตัวเด้งไปข้างหน้า เริ่มเบา ๆ ถ้าน่อง/เอ็นร้อยหวายตึงหรือเจ็บ ข้ามท่านี้ 20 ม. เดินกลับ 2 เที่ยว',
  howEn: 'Legs almost straight, swing from the hip, paw the foot down under you and sweep back so you bounce forward — start gently; skip it if your calf/Achilles feels tight or sore — 20 m, walk back, 2 reps',
}

/** ก่อนวิ่งเบา/วิ่งยาว: แรงกระแทกต่ำ ~4 นาที */
export const easyDrills: Drill[] = [legSwing, lateralSwing, ankling, aMarch, buttKicks]
/** ก่อนวิ่งเร็ว/เนิน/ทดสอบ/แข่ง: เพิ่มเอสคิปและสเตรตเลกบาวด์ ~6 นาที */
export const qualityDrills: Drill[] = [legSwing, lateralSwing, ankling, aMarch, buttKicks, aSkip, straightLeg]

export const DRILL_REST = 10 // วินาที เปลี่ยนท่า/เดินกลับจุดเริ่ม
