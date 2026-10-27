import { gymWeek, parkWeek, type Day, type Exercise } from './workouts'
import { guides, type Step } from '../lib/guide'

export type ProgramId = 'physique' | 'strength' | 'start' | 'base' | 'five' | 'ten' | 'half' | 'full'
type RunProgram = Exclude<ProgramId, 'physique' | 'strength' | 'start'>
export type Mode = 'gym' | 'park'
export type LocationPref = Mode | 'mix'

// ongoing = ไม่มีวันจบ วนรอบตามสัปดาห์ในปฏิทิน (weeks = ความยาวรอบ)
export const programs: Record<ProgramId, { name: string; short: string; weeks: number; raceKm?: number; ongoing?: boolean; summary: string }> = {
  physique: { name: 'หุ่นลีนแบบ Tom Holland', short: 'หุ่น', weeks: 12, summary: 'เวท 3 วัน + วิ่ง 2 วัน เน้นสร้างกล้ามและลดไขมัน' },
  start: { name: 'เริ่มวิ่ง (วิ่งสลับเดิน)', short: 'เริ่มวิ่ง', weeks: 9, summary: 'วิ่งสลับเดิน 3 วัน + เวทเบา 2 วัน จนวิ่งต่อเนื่อง 30 นาทีได้' },
  base: { name: 'วิ่งต่อเนื่อง (ไม่มีเป้าแข่ง)', short: 'วิ่ง', weeks: 4, ongoing: true, summary: 'วิ่ง 3 วัน + เวท 2 วัน รักษาความฟิต ไม่มีเป้าแข่ง (~12–16 กม./สัปดาห์)' },
  strength: { name: 'เวทอย่างเดียว', short: 'เวท', weeks: 4, ongoing: true, summary: 'เวท 4 วัน ไม่มีวิ่ง สัปดาห์ที่ 4 ของรอบเบาลง' },
  five: { name: '5K เน้นความเร็ว', short: '5K', weeks: 8, raceKm: 5, summary: 'วิ่ง 3–4 วัน เน้น interval ให้ 5K เร็วขึ้น (~12 → 18 กม./สัปดาห์)' },
  ten: { name: '10K', short: '10K', weeks: 12, raceKm: 10, summary: 'วิ่ง 3 → 4 วัน + เวท 2 วัน จนวิ่ง 10 กม.ได้ (~11 → 22 กม./สัปดาห์)' },
  half: { name: 'ฮาล์ฟมาราธอน 21.1 กม.', short: 'ฮาล์ฟ', weeks: 16, raceKm: 21.1, summary: 'วิ่ง 4 วัน + เวท 2 วัน (~16 → 34 กม./สัปดาห์)' },
  full: { name: 'ฟูลมาราธอน 42.2 กม.', short: 'ฟูล', weeks: 18, raceKm: 42.2, summary: 'วิ่ง 4 วัน + เวท 2 วัน (~36 → 60 กม./สัปดาห์)' },
}

// ---------- วิ่ง ----------

type Q = { km: number; kind: 'tempo' | 'interval' | 'easy'; title: string; how: string; guide: Step[] }
type RunWeek = { easyA: number; q: Q; easyB: number; long: number; note?: string }

const fartlek = (km: number): Q => ({ km, kind: 'interval', title: 'Fartlek', how: 'วิ่งเบา สลับเร่ง 1 นาที × 6 ครั้ง (เร่งแบบเหนื่อย ~7/10 แล้วกลับมาเบา)', guide: guides.fartlek() })
const strides = (km: number): Q => ({ km, kind: 'easy', title: 'Easy + Strides', how: 'วิ่งเบา แล้วปิดท้าย Strides 6 × 20 วิ (เร่งลื่น ๆ ไม่สุดแรง เดินกลับ)', guide: guides.strides(km) })
const tempo = (km: number, min: string): Q => ({ km, kind: 'tempo', title: `Tempo ${min} นาที`, how: `วอร์ม 2 กม. → Tempo ${min} นาที (เหนื่อยแต่คุมได้ ~7/10 พูดได้เป็นคำ ๆ) → คูลดาวน์`, guide: guides.tempo(min) })
const reps = (km: number, set: string): Q => ({ km, kind: 'interval', title: `Interval ${set}`, how: `วอร์ม 2 กม. → ${set} → คูลดาวน์ (ช่วงเร็ว ~เพซ 5K, ช่วงพักจ็อกเบา)`, guide: guides.reps(set) })
const pace = (km: number, set: string, label: string): Q => ({ km, kind: 'tempo', title: `${label} ${set}`, how: `วอร์ม 2 กม. → ${set} ที่${label} พักจ็อก 2 นาที → คูลดาวน์`, guide: guides.pace(set, label) })

// ปริมาณเพิ่มทีละน้อย มีสัปดาห์ลด (cutback) ทุก 3–4 สัปดาห์ และ taper ก่อนแข่ง
// วิ่งยาวแต่ละครั้งยาวกว่าครั้งที่ยาวที่สุดใน 30 วันก่อนหน้าไม่เกิน 10% (Frandsen 2025: เกิน 10% เสี่ยงบาดเจ็บ ~1.6 เท่า)
// — ยกเว้นวันแข่ง ทดสอบใน programs.test.ts
// easyB = 0 → วันเสาร์เป็นวันพัก (ช่วงแรกของ 10K วิ่ง 3 วันเท่ากับที่วิ่งอยู่เดิม)
// วิ่งต่อเนื่อง: ระดับใกล้กับที่วิ่งอยู่ (2.5–5 กม. × 3) ขยับเล็กน้อย 3 สัปดาห์ แล้วลด 1 สัปดาห์ วนไปเรื่อย ๆ
const baseWeeks: RunWeek[] = [
  { easyA: 4, q: fartlek(4), easyB: 0, long: 5.5 },
  { easyA: 4, q: tempo(5, '2×5'), easyB: 0, long: 6 },
  { easyA: 4, q: reps(5, '5 × 800 ม. / จ็อก 2 นาที'), easyB: 0, long: 6.5 },
  { easyA: 3, q: strides(4), easyB: 0, long: 5, note: 'สัปดาห์ลดปริมาณ ให้ร่างกายปรับตัว ก่อนเริ่มรอบใหม่' },
]

// 5K เน้นความเร็ว: งาน interval สั้น (400–800 ม.) + tempo ปริมาณรวมไม่สูง จบด้วยวิ่ง 5K เต็มที่ (เป็นการทดสอบได้ด้วย)
const fiveWeeks: RunWeek[] = [
  { easyA: 3, q: reps(4, '6 × 400 ม. / จ็อก 2 นาที'), easyB: 0, long: 5 },
  { easyA: 3, q: tempo(4, '2×5'), easyB: 2, long: 5 },
  { easyA: 3, q: reps(5, '8 × 400 ม. / จ็อก 1.5 นาที'), easyB: 2, long: 5.5 },
  { easyA: 3, q: strides(3), easyB: 2, long: 5, note: 'สัปดาห์ลดปริมาณ ให้ร่างกายปรับตัว' },
  { easyA: 3, q: reps(5, '6 × 800 ม. / จ็อก 2 นาที'), easyB: 3, long: 6 },
  { easyA: 4, q: tempo(5, '20'), easyB: 3, long: 6.5, note: 'สัปดาห์พีค' },
  { easyA: 3, q: pace(4, '3 × 1 กม.', 'เพซ 5K'), easyB: 2, long: 5, note: 'Taper: ลดระยะ คงความเร็วไว้' },
  { easyA: 3, q: strides(3), easyB: 0, long: 5, note: 'สัปดาห์วิ่ง 5K! ออกตัวอย่ารีบ แล้วค่อยเร่ง' },
]

const tenWeeks: RunWeek[] = [
  { easyA: 3, q: fartlek(3), easyB: 0, long: 5 },
  { easyA: 3, q: tempo(4, '2×5'), easyB: 0, long: 5.5 },
  { easyA: 3, q: strides(3), easyB: 0, long: 5, note: 'สัปดาห์ลดปริมาณ ให้ร่างกายปรับตัว' },
  { easyA: 3, q: reps(4, '6 × 1 นาที / จ็อก 2 นาที'), easyB: 2, long: 6, note: 'เริ่มวิ่ง 4 วัน — วันเสาร์วิ่งสั้น ๆ เบามาก' },
  { easyA: 3, q: tempo(4, '15'), easyB: 3, long: 6.5 },
  { easyA: 4, q: reps(5, '5 × 800 ม. / จ็อก 2 นาที'), easyB: 3, long: 7 },
  { easyA: 3, q: strides(4), easyB: 3, long: 6, note: 'สัปดาห์ลดปริมาณ' },
  { easyA: 4, q: tempo(5, '20'), easyB: 3, long: 7.5 },
  { easyA: 4, q: pace(6, '3 × 2 กม.', 'เพซ 10K'), easyB: 4, long: 8 },
  { easyA: 4, q: reps(6, '5 × 1 กม. / จ็อก 2 นาที'), easyB: 4, long: 8.5, note: 'สัปดาห์พีค' },
  { easyA: 3, q: pace(4, '2 × 1 กม.', 'เพซ 10K'), easyB: 3, long: 6, note: 'Taper: ลดระยะ คงความเร็วไว้' },
  { easyA: 3, q: strides(3), easyB: 0, long: 10, note: 'สัปดาห์แข่ง! วิ่งเบาให้ขาสด นอนให้พอ' },
]

const halfWeeks: RunWeek[] = [
  { easyA: 3, q: fartlek(3), easyB: 3, long: 7.5 },
  { easyA: 3, q: fartlek(4), easyB: 3, long: 8 },
  { easyA: 4, q: tempo(4, '2×5'), easyB: 3, long: 8.5 },
  { easyA: 3, q: strides(3), easyB: 3, long: 7, note: 'สัปดาห์ลดปริมาณ ให้ร่างกายปรับตัว' },
  { easyA: 4, q: tempo(5, '2×8'), easyB: 4, long: 9 },
  { easyA: 4, q: reps(5, '6 × 1 นาที / จ็อก 2 นาที'), easyB: 4, long: 9.5 },
  { easyA: 5, q: tempo(6, '20'), easyB: 4, long: 10 },
  { easyA: 4, q: strides(4), easyB: 3, long: 8, note: 'สัปดาห์ลดปริมาณ' },
  { easyA: 5, q: reps(6, '5 × 800 ม. / จ็อก 2 นาที'), easyB: 5, long: 11 },
  { easyA: 5, q: tempo(7, '25'), easyB: 5, long: 12 },
  { easyA: 5, q: pace(7, '2 × 3 กม.', 'เพซฮาล์ฟ'), easyB: 5, long: 13 },
  { easyA: 4, q: strides(5), easyB: 4, long: 10.5, note: 'สัปดาห์ลดปริมาณ' },
  { easyA: 6, q: tempo(8, '30'), easyB: 5, long: 14 },
  { easyA: 6, q: pace(8, '3 × 3 กม.', 'เพซฮาล์ฟ'), easyB: 5, long: 15, note: 'สัปดาห์พีค — ระยะยาวที่สุดของโปรแกรม' },
  { easyA: 5, q: pace(6, '2 × 2 กม.', 'เพซฮาล์ฟ'), easyB: 4, long: 11, note: 'Taper: ลดระยะ คงความเร็วไว้' },
  { easyA: 4, q: strides(4), easyB: 3, long: 21.1, note: 'สัปดาห์แข่ง! นอนให้พอ กินคาร์บเพิ่ม 1–2 วันก่อนแข่ง' },
]

const fullWeeks: RunWeek[] = [
  { easyA: 6, q: tempo(8, '20'), easyB: 6, long: 16 },
  { easyA: 6, q: reps(8, '6 × 800 ม. / จ็อก 2 นาที'), easyB: 6, long: 17.5 },
  { easyA: 7, q: pace(9, '6 กม.', 'เพซมาราธอน'), easyB: 6, long: 19 },
  { easyA: 5, q: strides(6), easyB: 5, long: 15, note: 'สัปดาห์ลดปริมาณ' },
  { easyA: 7, q: tempo(10, '25'), easyB: 7, long: 20.5 },
  { easyA: 7, q: reps(10, '5 × 1 กม. / จ็อก 2 นาที'), easyB: 7, long: 22.5 },
  { easyA: 8, q: pace(11, '8 กม.', 'เพซมาราธอน'), easyB: 7, long: 24.5 },
  { easyA: 6, q: strides(6), easyB: 6, long: 19, note: 'สัปดาห์ลดปริมาณ' },
  { easyA: 8, q: tempo(11, '30'), easyB: 8, long: 26.5 },
  { easyA: 8, q: pace(12, '10 กม.', 'เพซมาราธอน'), easyB: 8, long: 29 },
  { easyA: 6, q: strides(8), easyB: 6, long: 23, note: 'สัปดาห์ลดปริมาณ' },
  { easyA: 8, q: tempo(12, '35'), easyB: 8, long: 31.5 },
  { easyA: 8, q: pace(13, '12 กม.', 'เพซมาราธอน'), easyB: 8, long: 26 },
  { easyA: 8, q: reps(12, '6 × 1 กม. / จ็อก 2 นาที'), easyB: 8, long: 32, note: 'สัปดาห์พีค — ซ้อมกินเจล/น้ำระหว่างวิ่งยาว' },
  { easyA: 6, q: strides(8), easyB: 6, long: 22, note: 'สัปดาห์ลดปริมาณ' },
  { easyA: 7, q: pace(10, '8 กม.', 'เพซมาราธอน'), easyB: 7, long: 24, note: 'Taper เริ่ม: ลดปริมาณ ~20%' },
  { easyA: 6, q: pace(8, '5 กม.', 'เพซมาราธอน'), easyB: 5, long: 16, note: 'Taper: ลดปริมาณ ~40%' },
  { easyA: 5, q: strides(5), easyB: 3, long: 42.2, note: 'สัปดาห์แข่ง! กินคาร์บ 8–10 ก./กก. 1–2 วันก่อนแข่ง' },
]

// วิ่งนานเกิน ~75–90 นาที ควรเติมคาร์บระหว่างวิ่ง 30–60 ก./ชม. (ACSM 2016, Jeukendrup 2014)
const fuelNote = 'วิ่งนานเกิน ~75 นาที: พกเจล/เครื่องดื่มเกลือแร่ เติมคาร์บ 30–60 ก./ชม. (เจล 1 ซองทุก 30–40 นาที) และซ้อมกินแบบนี้ก่อนวันแข่ง'
const runDay = (key: string, day: string, title: string, km: number, runKind: Day['runKind'], how: string, note?: string, guide?: Step[]): Day => ({
  key, day, title, type: 'run', duration: `${km} กม.`, targetKm: km, runKind, guide,
  note: km >= 14 && (runKind === 'long' || runKind === 'race') ? [note, fuelNote].filter(Boolean).join(' · ') : note,
  exercises: [{ name: title, th: how, sets: '1', reps: `${km} กม.`, rest: '-', cue: how, video: `${title} running workout how to` }],
})

// ---------- เวทสำหรับนักวิ่ง: 2 วัน/สัปดาห์ หนักพอรักษากล้าม แต่ไม่ล้าจนกระทบการวิ่ง ----------

const ex = (name: string, th: string, sets: string, reps: string, rest: string, cue: string, video: string, extra: Partial<Exercise> = {}): Exercise =>
  ({ name, th, sets, reps, rest, cue, video, ...extra })

const runnerStrength: Record<Mode, [Exercise[], Exercise[]]> = {
  gym: [
    [
      ex('Back Squat', 'สควอทบาร์หลัง', '3', '5', '2–3 นาที', 'หนักแต่เหลือแรง 2–3 ครั้ง ไม่เล่นจนหมด', 'Jeff Nippard how to squat', { easier: 'Goblet squat' }),
      ex('Bench Press', 'ดันบาร์นอนราบ', '3', '6–8', '2 นาที', 'บีบสะบัก เท้าวางแน่น', 'Jeff Nippard how to bench press'),
      ex('Pull-up', 'ดึงข้อ', '3', '5–8', '2 นาที', 'ไม่เหวี่ยงตัว', 'how to do your first pull up progression', { easier: 'Lat pulldown' }),
      ex('Single-leg RDL', 'เดดลิฟต์ขาเดียว (ดัมเบล)', '2', '8 / ข้าง', '90 วิ', 'สะโพกตรง ช่วยการทรงตัวและต้นขาหลังของนักวิ่ง', 'single leg romanian deadlift form'),
      ex('Single-leg Calf Raise', 'เขย่งน่องขาเดียว', '3', '12–15 / ข้าง', '60 วิ', 'ลงช้า 3 วิ ช่วยกันเจ็บเอ็นร้อยหวาย', 'single leg calf raise runners'),
      ex('Banded Lateral Walk', 'เดินข้างพันยางยืดเหนือเข่า', '2', '12–15 ก้าว / ข้าง', '45 วิ', 'สะโพกด้านข้างอ่อน → สะโพกตก/เจ็บ IT band ตอนวิ่ง ไม่มียางทำนอนตะแคงยกขาแทน', 'banded lateral walk glute medius', { easier: 'Side-lying Hip Abduction' }),
      ex('Side Plank', 'แพลงก์ด้านข้าง', '2', '30–45 วิ / ข้าง', '45 วิ', 'ลำตัวตรง สะโพกไม่ตก', 'side plank proper form'),
    ],
    [
      ex('Romanian Deadlift', 'โรมาเนียนเดดลิฟต์', '3', '6–8', '2 นาที', 'หลังตรง บาร์ชิดขา', 'romanian deadlift proper form'),
      ex('Overhead Press', 'ดันบาร์เหนือศีรษะ', '3', '6–8', '2 นาที', 'เกร็งก้นและท้อง', 'how to overhead press proper form'),
      ex('Seated Cable Row', 'ดึงเคเบิลนั่ง', '3', '8–12', '90 วิ', 'ดึงศอกไปหลัง อกยืด', 'seated cable row proper form'),
      ex('Bulgarian Split Squat', 'สควอทขาเดียว เท้าหลังพาดม้านั่ง', '2', '8 / ข้าง', '90 วิ', 'ลงช้า ๆ คุมเข่าไม่บิดเข้าใน', 'bulgarian split squat form'),
      ex('Dips', 'ดิปบาร์คู่', '2', '6–10', '90 วิ', 'ลงจนศอก ~90°', 'how to do dips correctly'),
      ex('Seated Calf Raise', 'นั่งเขย่งน่อง (น่องมัดใน)', '2', '12–15', '60 วิ', 'เข่างอ ~90° ลงช้า — น่องมัดใน (soleus) รับแรงตอนวิ่งมากที่สุด', 'seated calf raise form'),
      ex('Dead Bug', 'นอนหงายยืดแขนขาสลับ', '2', '8 / ข้าง', '45 วิ', 'หลังล่างแนบพื้นตลอด', 'dead bug exercise form'),
    ],
  ],
  park: [
    [
      ex('Bulgarian Split Squat', 'สควอทขาเดียว เท้าหลังพาดม้านั่ง', '3', '8–12 / ข้าง', '90 วิ', 'ลงช้า 3 วิ', 'bulgarian split squat form'),
      ex('Push-up', 'วิดพื้น', '3', '8–15', '90 วิ', 'ลำตัวตรง', 'FitnessFAQs push up progression', { harder: 'Decline / Archer push-up' }),
      ex('Pull-up', 'ดึงข้อ', '3', '4–8', '2 นาที', 'ทำไม่ได้ใช้ Negative', 'pull up progression for beginners calisthenics', { easier: 'Negative pull-up' }),
      ex('Single-leg Glute Bridge', 'ยกสะโพกขาเดียว', '2', '12 / ข้าง', '60 วิ', 'บีบก้นค้าง 1 วิ', 'single leg glute bridge form'),
      ex('Single-leg Calf Raise', 'เขย่งน่องขาเดียว (บนขอบบันได)', '3', '12–15 / ข้าง', '60 วิ', 'ลงช้า 3 วิ', 'single leg calf raise runners'),
      ex('Banded Lateral Walk', 'เดินข้างพันยางยืดเหนือเข่า', '2', '12–15 ก้าว / ข้าง', '45 วิ', 'สะโพกด้านข้างอ่อน → สะโพกตก/เจ็บ IT band ตอนวิ่ง ไม่มียางทำนอนตะแคงยกขาแทน', 'banded lateral walk glute medius', { easier: 'Side-lying Hip Abduction' }),
      ex('Side Plank', 'แพลงก์ด้านข้าง', '2', '30–45 วิ / ข้าง', '45 วิ', 'สะโพกไม่ตก', 'side plank proper form'),
    ],
    [
      ex('Pistol Squat progression', 'ฝึกสควอทขาเดียว (นั่งลงม้านั่ง)', '3', '5–8 / ข้าง', '90 วิ', 'ค่อย ๆ ลดความสูงม้านั่ง', 'pistol squat progression beginner'),
      ex('Pike Push-up', 'วิดพื้นสะโพกสูง', '3', '6–10', '90 วิ', 'ศีรษะลงหน้ามือ', 'pike push up tutorial'),
      ex('Australian Row', 'ดึงตัวบาร์ต่ำ', '3', '8–12', '90 วิ', 'ตัวตรง ดึงอกแตะบาร์', 'australian pull up inverted row form'),
      ex('Single-leg RDL', 'เดดลิฟต์ขาเดียว (ตัวเปล่า)', '2', '10 / ข้าง', '60 วิ', 'ช้า ๆ คุมการทรงตัว', 'single leg romanian deadlift form'),
      ex('Dips', 'ดิปบาร์คู่', '2', '6–10', '90 วิ', 'ลงจนศอก ~90°', 'dips progression beginner calisthenics'),
      ex('Bent-knee Calf Raise', 'เขย่งน่องงอเข่า (น่องมัดใน)', '2', '15', '60 วิ', 'งอเข่าเล็กน้อยตลอด ลงช้า 3 วิ', 'bent knee calf raise soleus'),
      ex('Hollow Body Hold', 'นอนเกร็งท้องทรงเรือ', '2', '20–40 วิ', '45 วิ', 'หลังล่างแนบพื้น', 'hollow body hold tutorial'),
    ],
  ],
}

const strengthNote = 'เหลือแรง 2–3 ครั้งทุกเซ็ต ไม่เล่นจนหมดแรง เพื่อไม่ให้ขาล้าก่อนวันวิ่งคุณภาพ'

const tables: Record<RunProgram, RunWeek[]> = { base: baseWeeks, five: fiveWeeks, ten: tenWeeks, half: halfWeeks, full: fullWeeks }

function raceWeek(program: RunProgram, mode: Mode, week: number): Day[] {
  const table = tables[program]
  const w = table[Math.min(Math.max(week, 1), table.length) - 1]
  const last = !!programs[program].raceKm && week === table.length
  const taper = last || (w.note?.startsWith('Taper') ?? false)
  const [a0, b] = runnerStrength[mode]
  // กระโดดเขย่ง (pogo) ตั้งแต่สัปดาห์ 4 หลังน่อง/เอ็นได้ฝึกแบบช้ามาก่อน — เวทแบบระเบิดแรงช่วยความประหยัดแรงวิ่ง (Rønnestad & Mujika 2014)
  const a = week >= 4 && !taper && !last
    ? [...a0, ex('Pogo Jumps', 'กระโดดเขย่ง (ข้อเท้าแข็ง)', '3', '15–20', '60 วิ', 'เข่าเกือบตรง เด้งด้วยข้อเท้า แตะพื้นสั้นที่สุด เบาและเงียบ — เจ็บน่อง/เอ็นร้อยหวายให้หยุด', 'pogo jumps runners')]
    : a0
  const lighten = (list: Exercise[]) => (taper ? list.map(e => ({ ...e, sets: '2' })) : list)
  // ขึ้นเนินสั้น ๆ สัปดาห์เว้นสัปดาห์ (ไม่ใส่ในสัปดาห์ลดปริมาณ/taper) — วิ่งเร็วขึ้นเนินช่วยความประหยัดแรง (Barnes & Kilding 2015)
  const hillWeek = week % 2 === 0 && !taper && !w.note?.startsWith('สัปดาห์ลด')

  return [
    { key: 'strA', day: 'จันทร์', title: 'เวท A — ทั้งตัว', type: 'strength', duration: '45 นาที', note: taper ? `ช่วง taper: ลดเหลือ 2 เซ็ต น้ำหนักเท่าเดิม` : strengthNote, exercises: lighten(a) },
    // วิ่งหนักห่างจากเวทขาอย่างน้อย 48 ชม. — เวทขาทำให้วิ่งได้แย่ลงได้นาน 6–48 ชม. (Doma 2017)
    runDay('easyA', 'อังคาร', 'Easy run', w.easyA, 'easy', 'วิ่งเบาระดับพูดคุยได้ (โซน E)'),
    runDay('quality', 'พุธ', w.q.title, w.q.km, w.q.kind, w.q.how, undefined, w.q.guide),
    last
      ? { key: 'strB', day: 'พฤหัสบดี', title: 'พัก / เดินเบา ๆ', type: 'rest', duration: '-', note: 'สัปดาห์แข่ง งดเวท ยืดเหยียดเบา ๆ', exercises: [] }
      : { key: 'strB', day: 'พฤหัสบดี', title: 'เวท B — ทั้งตัว', type: 'strength', duration: '45 นาที', note: taper ? 'ช่วง taper: ลดเหลือ 2 เซ็ต' : strengthNote, exercises: lighten(b) },
    { key: 'rest', day: 'ศุกร์', title: 'พัก', type: 'rest', duration: '-', note: 'พักเต็มวัน ให้ขาสดสำหรับวิ่งเสาร์–อาทิตย์', exercises: [] },
    w.easyB > 0
      ? (hillWeek
        ? runDay('easyB', 'เสาร์', 'Easy run + เนินสั้น', w.easyB, 'easy', 'วิ่งเบา แล้ววิ่งขึ้นเนินสั้น ๆ 6 × 10 วิ (แรงแต่ฟอร์มดี) เดินลงพัก — ไม่มีเนินใช้สะพาน/ทางลาด', undefined, guides.hills(w.easyB))
        : runDay('easyB', 'เสาร์', 'Easy run + Strides', w.easyB, 'easy', 'วิ่งเบา แล้ว Strides 4 × 20 วิ'))
      : { key: 'easyB', day: 'เสาร์', title: 'พัก / เดินเบา ๆ', type: 'rest', duration: '-', note: 'เดิน 20–30 นาที หรือยืดเหยียด', exercises: [] },
    last
      ? runDay('long', 'อาทิตย์', `วันแข่ง ${programs[program].raceKm} กม.`, w.long, 'race', 'ออกตัวช้ากว่าเพซเป้าหมาย 5–10 วิ/กม. ช่วงแรก ดื่มน้ำทุกจุด', w.note)
      : runDay('long', 'อาทิตย์', 'วิ่งยาว (Long run)', w.long, 'long', 'ช้าระดับพูดคุยได้ (โซน E) — วิ่งยาวเน้นเวลาบนขา ไม่เน้นความเร็ว'),
  ]
}

// ---------- เริ่มวิ่ง: วิ่งสลับเดิน ----------
// แบบเดียวกับ Couch to 5K (9 สัปดาห์): เวลาบนขาคงที่ ~25–30 นาที ช่วงวิ่งค่อย ๆ ยาวขึ้น ช่วงเดินคือการพัก
// มือใหม่บาดเจ็บง่ายแม้ในโปรแกรมที่ค่อย ๆ เพิ่ม (Buist 2008) — เอ็นและกระดูกปรับตัวช้ากว่าหัวใจ จึงไม่เร่งเพซเลย
// แต่ละ session: [นาทีวิ่ง, นาทีเดิน, จำนวนรอบ] หรือรายการช่วงวิ่งต่อเนื่อง
type RunWalk = { run: number; walk: number; reps: number } | { runs: number[]; walk: number }
const startWeeks: { s: RunWalk[]; note?: string }[] = [
  { s: [{ run: 1, walk: 2, reps: 8 }], note: 'วิ่งช้าแค่ไหนก็ได้ ขอให้พูดเป็นประโยคได้ — เหนื่อยเกินให้เดินนานขึ้น' },
  { s: [{ run: 2, walk: 2, reps: 6 }] },
  { s: [{ run: 3, walk: 2, reps: 5 }] },
  { s: [{ run: 4, walk: 2, reps: 4 }] },
  { s: [{ run: 5, walk: 2, reps: 4 }] },
  { s: [{ run: 8, walk: 2, reps: 3 }] },
  { s: [{ run: 10, walk: 1.5, reps: 3 }] },
  { s: [{ run: 15, walk: 1.5, reps: 2 }], note: 'ถ้าสัปดาห์ไหนยังหนักไป ทำสัปดาห์เดิมซ้ำได้ ไม่ต้องรีบ' },
  { s: [{ runs: [20, 8], walk: 1.5 }, { runs: [25], walk: 0 }, { runs: [30], walk: 0 }], note: 'สัปดาห์สุดท้าย! วิ่งต่อเนื่อง 30 นาทีได้แล้ว → ไปต่อโปรแกรม 10K' },
]

const runWalkSteps = (rw: RunWalk): { steps: Step[]; runMin: number; longest: number; text: string } => {
  const runs = 'runs' in rw ? rw.runs : Array.from({ length: rw.reps }, () => rw.run)
  const body = runs.flatMap((m, i) => [
    { kind: 'work' as const, sec: m * 60, label: 'วิ่งเบา' },
    ...(i < runs.length - 1 ? [{ kind: 'recover' as const, sec: rw.walk * 60, label: 'เดิน' }] : []),
  ])
  const walk = rw.walk >= 1 ? `${rw.walk} นาที` : `${rw.walk * 60} วิ`
  const text = 'runs' in rw
    ? runs.length > 1 ? `วิ่ง ${runs.join(' นาที / เดิน ' + walk + ' / วิ่ง ')} นาที` : `วิ่งต่อเนื่อง ${runs[0]} นาที`
    : `วิ่ง ${rw.run} นาที / เดิน ${walk} × ${rw.reps}`
  return {
    steps: [{ kind: 'warm', sec: 300, label: 'เดินเร็ววอร์มอัพ' }, ...body, { kind: 'cool', sec: 300, label: 'เดินคูลดาวน์' }],
    runMin: runs.reduce((a, b) => a + b, 0),
    longest: Math.max(...runs),
    text,
  }
}

/** เวลาวิ่ง (ไม่รวมเดิน) และช่วงวิ่งต่อเนื่องที่ยาวที่สุดของแต่ละวันวิ่งในสัปดาห์ — ใช้ในเทสต์ */
export const startSessions = (week: number) => {
  const w = startWeeks[Math.min(Math.max(week, 1), startWeeks.length) - 1]
  return [0, 1, 2].map(i => runWalkSteps(w.s[i] ?? w.s[0]))
}

function startWeek(mode: Mode, week: number): Day[] {
  const w = startWeeks[Math.min(Math.max(week, 1), startWeeks.length) - 1]
  const [a, b] = runnerStrength[mode]
  // มือใหม่: เวท 2 เซ็ต ไม่มีกระโดด — สร้างความแข็งแรงให้เอ็น/กล้ามรับแรงกระแทกก่อน
  const light = (list: Exercise[]) => list.map(e => ({ ...e, sets: '2' }))
  const note = 'มือใหม่: เลือกน้ำหนักที่เหลือแรง 3–4 ครั้ง ฝึกท่าให้ถูกก่อนเพิ่มน้ำหนัก'
  const rw = (key: string, day: string, i: number): Day => {
    const { steps, runMin, text } = runWalkSteps(w.s[i] ?? w.s[0])
    const total = Math.round(steps.reduce((t, st) => t + (st.sec ?? 0), 0) / 60)
    const how = `เดินเร็ว 5 นาที → ${text} → เดิน 5 นาที (วิ่งช้าระดับพูดเป็นประโยคได้)`
    return {
      key, day, type: 'run', runKind: 'easy', guide: steps, duration: `${total} นาที`, note: w.note,
      title: text.startsWith('วิ่งต่อเนื่อง') ? text : `วิ่งสลับเดิน (วิ่งรวม ${runMin} นาที)`,
      exercises: [{ name: 'Run-walk', th: 'วิ่งสลับเดิน', sets: '1', reps: text, rest: '-', cue: how, video: 'couch to 5k run walk beginner' }],
    }
  }
  return [
    { key: 'strA', day: 'จันทร์', title: 'เวท A — ทั้งตัว', type: 'strength', duration: '35 นาที', note, exercises: light(a) },
    rw('rw1', 'อังคาร', 0),
    restDay('rest1', 'พุธ'),
    rw('rw2', 'พฤหัสบดี', 1),
    { key: 'strB', day: 'ศุกร์', title: 'เวท B — ทั้งตัว', type: 'strength', duration: '35 นาที', note, exercises: light(b) },
    restDay('rest2', 'เสาร์'),
    rw('rw3', 'อาทิตย์', 2),
  ]
}

// ---------- เวทอย่างเดียว ----------
// ใช้วันเวทของโปรแกรมหุ่น 3 วัน (บน/ล่าง/บน) + วันขาที่ 2 = 4 วัน/สัปดาห์ (บน 2 ล่าง 2 — แต่ละกล้ามได้ฝึก 2 ครั้ง/สัปดาห์)
// สัปดาห์ที่ 4 ของรอบเป็น Deload ลดเซ็ตครึ่งหนึ่ง น้ำหนักเท่าเดิม
const STRENGTH_DELOAD = 'สัปดาห์ Deload: ทำทุกท่าครึ่งหนึ่งของจำนวนเซ็ต น้ำหนักเท่าเดิม ให้ร่างกายฟื้นก่อนรอบใหม่'

const lowerB: Record<Mode, Exercise[]> = {
  gym: [
    ex('Trap Bar Deadlift', 'เดดลิฟต์บาร์หกเหลี่ยม', '3', '5–8', '2–3 นาที', 'ยืนกลางบาร์ ดันพื้น หลังตรง (ไม่มีบาร์หกเหลี่ยมใช้ Romanian Deadlift)', 'trap bar deadlift form', { easier: 'Romanian Deadlift' }),
    ex('Walking Lunge', 'ลันจ์เดิน', '3', '10–12 / ข้าง', '90 วิ', 'ก้าวยาวพอดี เข่าหลังเกือบแตะพื้น', 'walking lunge proper form'),
    ex('Hip Thrust', 'ฮิปทรัสต์', '3', '8–12', '2 นาที', 'หลังบนพาดม้านั่ง คางชิดอก บีบก้นค้างด้านบน', 'hip thrust proper form'),
    ex('Seated Leg Curl', 'นั่งงอขา', '3', '10–15', '60 วิ', 'ลงช้า คุมตลอดช่วง', 'seated leg curl form'),
    ex('Seated Calf Raise', 'นั่งเขย่งน่อง', '3', '12–15', '60 วิ', 'เข่างอ ~90° ลงสุด ค้างบน', 'seated calf raise form'),
    ex('Hanging Knee Raise', 'ห้อยตัวยกเข่า', '3', '8–12', '60 วิ', 'ไม่แกว่งตัว ม้วนสะโพกขึ้น', 'hanging knee raise form'),
  ],
  park: [
    ex('Reverse Lunge', 'ลันจ์ถอยหลัง', '3', '10–12 / ข้าง', '90 วิ', 'ถอยเท้าไปหลัง ลำตัวตั้ง ดันกลับด้วยส้นเท้าหน้า', 'reverse lunge form'),
    ex('Step-up', 'ก้าวขึ้นม้านั่ง', '3', '8–12 / ข้าง', '90 วิ', 'ดันขึ้นด้วยขาบน ไม่ถีบขาล่าง', 'step up exercise form'),
    ex('Nordic Curl', 'นอร์ดิกเคิร์ล (เกี่ยวเท้าใต้ม้านั่ง)', '3', '3–6', '2 นาที', 'ค่อย ๆ ล้มไปข้างหน้าช้าที่สุด ใช้มือรับ', 'nordic hamstring curl beginner'),
    ex('Single-leg Glute Bridge', 'ยกสะโพกขาเดียว', '3', '12 / ข้าง', '60 วิ', 'บีบก้นค้างด้านบน 1 วิ', 'single leg glute bridge form'),
    ex('Single-leg Calf Raise', 'เขย่งน่องขาเดียว (บนขอบบันได)', '3', '12–15 / ข้าง', '60 วิ', 'ลงช้า 3 วิ', 'single leg calf raise runners'),
    ex('Side Plank', 'แพลงก์ด้านข้าง', '3', '30–45 วิ / ข้าง', '45 วิ', 'สะโพกไม่ตก', 'side plank proper form'),
  ],
}

const restDay = (key: string, day: string): Day => ({ key, day, title: 'พัก / เดินเบา ๆ', type: 'rest', duration: '-', note: 'เดิน 6,000–10,000 ก้าว ยืดเหยียด นอนให้ได้ 7–9 ชั่วโมง', exercises: [] })

function strengthWeek(mode: Mode, week: number): Day[] {
  const [a, legs, b] = (mode === 'gym' ? gymWeek : parkWeek).filter(d => d.type === 'strength')
  const deload = week === 4
  const half = (d: Day): Day => (deload
    ? { ...d, note: STRENGTH_DELOAD, exercises: d.exercises.map(e => ({ ...e, sets: String(Math.max(1, Math.ceil((parseInt(e.sets, 10) || 2) / 2))) })) }
    : d)
  const legsB: Day = { key: 'lowerB', day: 'เสาร์', title: mode === 'gym' ? 'Lower B — สะโพก/ต้นขาหลัง' : 'ขา B — ขาเดียวและต้นขาหลัง (สวน)', type: 'strength', duration: '55 นาที', note: a.note, exercises: lowerB[mode] }
  return [
    half({ ...a, day: 'จันทร์' }), restDay('rest1', 'อังคาร'), half({ ...legs, day: 'พุธ' }), restDay('rest2', 'พฤหัสบดี'),
    half({ ...b, day: 'ศุกร์' }), half(legsB), restDay('rest3', 'อาทิตย์'),
  ]
}

// ทั้งสองเวอร์ชันมี 7 วันเรียง จันทร์→อาทิตย์ ตรงกัน วันวิ่ง/พักเหมือนกัน ต่างกันแค่วันเวท
export function variants(program: ProgramId, week: number): Record<Mode, Day[]> {
  if (program === 'physique') return { gym: gymWeek, park: parkWeek }
  if (program === 'strength') return { gym: strengthWeek('gym', week), park: strengthWeek('park', week) }
  if (program === 'start') return { gym: startWeek('gym', week), park: startWeek('park', week) }
  return { gym: raceWeek(program, 'gym', week), park: raceWeek(program, 'park', week) }
}

// เลือกยิม/สวนทีละวัน (i = 0 จันทร์ … 6 อาทิตย์)
export function weekPlan(program: ProgramId, week: number, pick: (i: number) => Mode): Day[] {
  const v = variants(program, week)
  return v.gym.map((g, i) => {
    if (g.type !== 'strength') return g
    const where = pick(i)
    return { ...v[where][i], location: where }
  })
}

// ระยะวิ่งเป้าหมายของสัปดาห์
export function weekKm(program: ProgramId, week: number) {
  if (program === 'physique') return week <= 4 ? 13 : week === 9 ? 8 : 16
  if (program === 'strength') return 0
  return Math.round(variants(program, week).gym.reduce((s, d) => s + (d.targetKm ?? 0), 0))
}

export const programLength = (id: ProgramId) => (programs[id].ongoing ? `วนรอบ ${programs[id].weeks} สัปดาห์` : `${programs[id].weeks} สัปดาห์`)

export const locationInfo: Record<LocationPref, { label: string; text: string }> = {
  gym: { label: 'ยิมทุกวัน', text: 'เพิ่มน้ำหนักได้ละเอียด เห็นผลเรื่องกล้ามเร็วที่สุด โดยเฉพาะขา' },
  mix: { label: 'ผสม (แนะนำถ้ามีสมาชิกยิม)', text: 'วันที่มีขา/ท่าหนักไปยิม วันเวทวันสุดท้ายของสัปดาห์ไปสวน (บอดี้เวทแบบ Tom Holland)' },
  park: { label: 'สวนทุกวัน', text: 'ฟรี ใกล้บ้าน ดีมากสำหรับดึงข้อ/ดิป/วิดพื้น แต่ขาเพิ่มความหนักยาก ใช้ท่าขาเดียวและจังหวะลงช้าแทน' },
}

export const weekNote = (program: ProgramId, week: number) =>
  program === 'strength' ? (week === 4 ? STRENGTH_DELOAD : undefined)
    : program === 'start' ? startWeeks[week - 1]?.note
    : program !== 'physique' ? tables[program][(week - 1) % tables[program].length]?.note
      : week === 9 ? 'สัปดาห์ Deload: ทำทุกท่าครึ่งหนึ่งของจำนวนเซ็ต น้ำหนักเท่าเดิม วิ่งเบาอย่างเดียว' : undefined

