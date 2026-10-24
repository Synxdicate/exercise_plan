import { gymWeek, parkWeek, type Day, type Exercise } from './workouts'

export type ProgramId = 'physique' | 'ten' | 'half' | 'full'
type RaceId = Exclude<ProgramId, 'physique'>
export type Mode = 'gym' | 'park'
export type LocationPref = Mode | 'mix'

export const programs: Record<ProgramId, { name: string; short: string; weeks: number; raceKm?: number; summary: string }> = {
  physique: { name: 'หุ่นลีนแบบ Tom Holland', short: 'หุ่น', weeks: 12, summary: 'เวท 3 วัน + วิ่ง 2 วัน เน้นเพิ่มกล้าม ลดไขมัน' },
  ten: { name: '10K', short: '10K', weeks: 10, raceKm: 10, summary: 'ขั้นต่อจากฐานตอนนี้: วิ่ง 3 วัน (สัปดาห์ 1–3) → 4 วัน + เวท 2 วัน ระยะรวม ~10 → ~22 กม./สัปดาห์' },
  half: { name: 'ฮาล์ฟมาราธอน 21.1 กม.', short: 'ฮาล์ฟ', weeks: 16, raceKm: 21.1, summary: 'วิ่ง 4 วัน + เวท 2 วัน (รักษากล้าม) ระยะรวมค่อย ๆ เพิ่มจาก ~14 เป็น ~37 กม./สัปดาห์' },
  full: { name: 'ฟูลมาราธอน 42.2 กม.', short: 'ฟูล', weeks: 18, raceKm: 42.2, summary: 'ต่อจากฮาล์ฟ: วิ่ง 4 วัน + เวท 2 วัน ระยะรวม ~36 → ~60 กม./สัปดาห์' },
}

// ---------- วิ่ง ----------

type Q = { km: number; kind: 'tempo' | 'interval' | 'easy'; title: string; how: string }
type RunWeek = { easyA: number; q: Q; easyB: number; long: number; note?: string }

const fartlek = (km: number): Q => ({ km, kind: 'interval', title: 'Fartlek', how: 'วิ่งเบา สลับเร่ง 1 นาที × 6 ครั้ง (เร่งแบบเหนื่อย ~7/10 แล้วกลับมาเบา)' })
const strides = (km: number): Q => ({ km, kind: 'easy', title: 'Easy + Strides', how: 'วิ่งเบา แล้วปิดท้าย Strides 6 × 20 วิ (เร่งลื่น ๆ ไม่สุดแรง เดินกลับ)' })
const tempo = (km: number, min: string): Q => ({ km, kind: 'tempo', title: `Tempo ${min} นาที`, how: `วอร์ม 2 กม. → Tempo ${min} นาที (เหนื่อยแต่คุมได้ ~7/10 พูดได้เป็นคำ ๆ) → คูลดาวน์` })
const reps = (km: number, set: string): Q => ({ km, kind: 'interval', title: `Interval ${set}`, how: `วอร์ม 2 กม. → ${set} → คูลดาวน์ (ช่วงเร็ว ~เพซ 5K, ช่วงพักจ็อกเบา)` })
const pace = (km: number, set: string, label: string): Q => ({ km, kind: 'tempo', title: `${label} ${set}`, how: `วอร์ม 2 กม. → ${set} ที่${label} พักจ็อก 2 นาที → คูลดาวน์` })

// ปริมาณเพิ่มทีละน้อย มีสัปดาห์ลด (cutback) ทุก 3–4 สัปดาห์ และ taper ก่อนแข่ง
// easyB = 0 → วันเสาร์เป็นวันพัก (ช่วงแรกของ 10K วิ่ง 3 วันเท่ากับที่วิ่งอยู่เดิม)
const tenWeeks: RunWeek[] = [
  { easyA: 3, q: fartlek(3), easyB: 0, long: 4 },
  { easyA: 3, q: tempo(4, '2×5'), easyB: 0, long: 5 },
  { easyA: 3, q: strides(3), easyB: 0, long: 4, note: 'สัปดาห์ลดปริมาณ ให้ร่างกายปรับตัว' },
  { easyA: 3, q: reps(4, '6 × 1 นาที / จ็อก 2 นาที'), easyB: 2, long: 5, note: 'เริ่มวิ่ง 4 วัน — วันเสาร์วิ่งสั้น ๆ เบามาก' },
  { easyA: 3, q: tempo(4, '15'), easyB: 3, long: 6 },
  { easyA: 4, q: reps(5, '5 × 800 ม. / จ็อก 2 นาที'), easyB: 3, long: 7 },
  { easyA: 3, q: strides(4), easyB: 3, long: 5, note: 'สัปดาห์ลดปริมาณ' },
  { easyA: 4, q: pace(6, '3 × 2 กม.', 'เพซ 10K'), easyB: 4, long: 8, note: 'สัปดาห์พีค' },
  { easyA: 3, q: pace(4, '2 × 1 กม.', 'เพซ 10K'), easyB: 3, long: 6, note: 'Taper: ลดระยะ คงความเร็วไว้' },
  { easyA: 3, q: strides(3), easyB: 0, long: 10, note: 'สัปดาห์แข่ง! วิ่งเบาให้ขาสด นอนให้พอ' },
]

const halfWeeks: RunWeek[] = [
  { easyA: 3, q: fartlek(3), easyB: 3, long: 5 },
  { easyA: 3, q: fartlek(4), easyB: 3, long: 6 },
  { easyA: 4, q: tempo(4, '2×5'), easyB: 3, long: 7 },
  { easyA: 3, q: strides(3), easyB: 3, long: 5, note: 'สัปดาห์ลดปริมาณ ให้ร่างกายปรับตัว' },
  { easyA: 4, q: tempo(5, '2×8'), easyB: 4, long: 8 },
  { easyA: 4, q: reps(5, '6 × 1 นาที / จ็อก 2 นาที'), easyB: 4, long: 9 },
  { easyA: 5, q: tempo(6, '20'), easyB: 4, long: 10 },
  { easyA: 4, q: strides(4), easyB: 3, long: 7, note: 'สัปดาห์ลดปริมาณ' },
  { easyA: 5, q: reps(6, '5 × 800 ม. / จ็อก 2 นาที'), easyB: 5, long: 12 },
  { easyA: 5, q: tempo(7, '25'), easyB: 5, long: 13 },
  { easyA: 5, q: pace(7, '2 × 3 กม.', 'เพซฮาล์ฟ'), easyB: 5, long: 14 },
  { easyA: 4, q: strides(5), easyB: 4, long: 10, note: 'สัปดาห์ลดปริมาณ' },
  { easyA: 6, q: tempo(8, '30'), easyB: 5, long: 16 },
  { easyA: 6, q: pace(8, '3 × 3 กม.', 'เพซฮาล์ฟ'), easyB: 5, long: 18, note: 'สัปดาห์พีค — ระยะยาวที่สุดของโปรแกรม' },
  { easyA: 5, q: pace(6, '2 × 2 กม.', 'เพซฮาล์ฟ'), easyB: 4, long: 12, note: 'Taper: ลดระยะ คงความเร็วไว้' },
  { easyA: 4, q: strides(4), easyB: 3, long: 21.1, note: 'สัปดาห์แข่ง! นอนให้พอ กินคาร์บเพิ่ม 1–2 วันก่อนแข่ง' },
]

const fullWeeks: RunWeek[] = [
  { easyA: 6, q: tempo(8, '20'), easyB: 6, long: 16 },
  { easyA: 6, q: reps(8, '6 × 800 ม. / จ็อก 2 นาที'), easyB: 6, long: 18 },
  { easyA: 7, q: pace(9, '6 กม.', 'เพซมาราธอน'), easyB: 6, long: 19 },
  { easyA: 5, q: strides(6), easyB: 5, long: 14, note: 'สัปดาห์ลดปริมาณ' },
  { easyA: 7, q: tempo(10, '25'), easyB: 7, long: 21 },
  { easyA: 7, q: reps(10, '5 × 1 กม. / จ็อก 2 นาที'), easyB: 7, long: 23 },
  { easyA: 8, q: pace(11, '8 กม.', 'เพซมาราธอน'), easyB: 7, long: 25 },
  { easyA: 6, q: strides(6), easyB: 6, long: 18, note: 'สัปดาห์ลดปริมาณ' },
  { easyA: 8, q: tempo(11, '30'), easyB: 8, long: 27 },
  { easyA: 8, q: pace(12, '10 กม.', 'เพซมาราธอน'), easyB: 8, long: 29 },
  { easyA: 6, q: strides(8), easyB: 6, long: 20, note: 'สัปดาห์ลดปริมาณ' },
  { easyA: 8, q: tempo(12, '35'), easyB: 8, long: 30 },
  { easyA: 8, q: pace(13, '12 กม.', 'เพซมาราธอน'), easyB: 8, long: 26 },
  { easyA: 8, q: reps(12, '6 × 1 กม. / จ็อก 2 นาที'), easyB: 8, long: 32, note: 'สัปดาห์พีค — ซ้อมกินเจล/น้ำระหว่างวิ่งยาว' },
  { easyA: 6, q: strides(8), easyB: 6, long: 21, note: 'สัปดาห์ลดปริมาณ' },
  { easyA: 7, q: pace(10, '8 กม.', 'เพซมาราธอน'), easyB: 7, long: 24, note: 'Taper เริ่ม: ลดปริมาณ ~25%' },
  { easyA: 6, q: pace(8, '5 กม.', 'เพซมาราธอน'), easyB: 5, long: 16, note: 'Taper: ลดปริมาณ ~45%' },
  { easyA: 5, q: strides(5), easyB: 3, long: 42.2, note: 'สัปดาห์แข่ง! กินคาร์บ 8–10 ก./กก. 1–2 วันก่อนแข่ง' },
]

// วิ่งนานเกิน ~75–90 นาที ควรเติมคาร์บระหว่างวิ่ง 30–60 ก./ชม. (ACSM 2016, Jeukendrup 2014)
const fuelNote = 'วิ่งนานเกิน ~75 นาที: พกเจล/เครื่องดื่มเกลือแร่ เติมคาร์บ 30–60 ก./ชม. (เจล 1 ซองทุก 30–40 นาที) และซ้อมกินแบบนี้ก่อนวันแข่ง'
const runDay = (key: string, day: string, title: string, km: number, runKind: Day['runKind'], how: string, note?: string): Day => ({
  key, day, title, type: 'run', duration: `${km} กม.`, targetKm: km, runKind,
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
      ex('Side Plank', 'แพลงก์ด้านข้าง', '2', '30–45 วิ / ข้าง', '45 วิ', 'ลำตัวตรง สะโพกไม่ตก', 'side plank proper form'),
    ],
    [
      ex('Romanian Deadlift', 'โรมาเนียนเดดลิฟต์', '3', '6–8', '2 นาที', 'หลังตรง บาร์ชิดขา', 'romanian deadlift proper form'),
      ex('Overhead Press', 'ดันบาร์เหนือศีรษะ', '3', '6–8', '2 นาที', 'เกร็งก้นและท้อง', 'how to overhead press proper form'),
      ex('Seated Cable Row', 'ดึงเคเบิลนั่ง', '3', '8–12', '90 วิ', 'ดึงศอกไปหลัง อกยืด', 'seated cable row proper form'),
      ex('Bulgarian Split Squat', 'สควอทขาเดียว เท้าหลังพาดม้านั่ง', '2', '8 / ข้าง', '90 วิ', 'ลงช้า ๆ คุมเข่าไม่บิดเข้าใน', 'bulgarian split squat form'),
      ex('Dips', 'ดิปบาร์คู่', '2', '6–10', '90 วิ', 'ลงจนศอก ~90°', 'how to do dips correctly'),
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
      ex('Side Plank', 'แพลงก์ด้านข้าง', '2', '30–45 วิ / ข้าง', '45 วิ', 'สะโพกไม่ตก', 'side plank proper form'),
    ],
    [
      ex('Pistol Squat progression', 'ฝึกสควอทขาเดียว (นั่งลงม้านั่ง)', '3', '5–8 / ข้าง', '90 วิ', 'ค่อย ๆ ลดความสูงม้านั่ง', 'pistol squat progression beginner'),
      ex('Pike Push-up', 'วิดพื้นสะโพกสูง', '3', '6–10', '90 วิ', 'ศีรษะลงหน้ามือ', 'pike push up tutorial'),
      ex('Australian Row', 'ดึงตัวบาร์ต่ำ', '3', '8–12', '90 วิ', 'ตัวตรง ดึงอกแตะบาร์', 'australian pull up inverted row form'),
      ex('Single-leg RDL', 'เดดลิฟต์ขาเดียว (ตัวเปล่า)', '2', '10 / ข้าง', '60 วิ', 'ช้า ๆ คุมการทรงตัว', 'single leg romanian deadlift form'),
      ex('Dips', 'ดิปบาร์คู่', '2', '6–10', '90 วิ', 'ลงจนศอก ~90°', 'dips progression beginner calisthenics'),
      ex('Hollow Body Hold', 'นอนเกร็งท้องทรงเรือ', '2', '20–40 วิ', '45 วิ', 'หลังล่างแนบพื้น', 'hollow body hold tutorial'),
    ],
  ],
}

const strengthNote = 'เหลือแรง 2–3 ครั้งทุกเซ็ต ไม่เล่นจนหมดแรง เพื่อไม่ให้ขาล้าก่อนวันวิ่งคุณภาพ'

const tables: Record<RaceId, RunWeek[]> = { ten: tenWeeks, half: halfWeeks, full: fullWeeks }

function raceWeek(program: RaceId, mode: Mode, week: number): Day[] {
  const table = tables[program]
  const w = table[Math.min(Math.max(week, 1), table.length) - 1]
  const last = week === table.length
  const taper = last || (w.note?.startsWith('Taper') ?? false)
  const [a, b] = runnerStrength[mode]
  const lighten = (list: Exercise[]) => (taper ? list.map(e => ({ ...e, sets: '2' })) : list)

  return [
    { key: 'strA', day: 'จันทร์', title: 'เวท A — ทั้งตัว', type: 'strength', duration: '45 นาที', note: taper ? `ช่วง taper: ลดเหลือ 2 เซ็ต น้ำหนักเท่าเดิม` : strengthNote, exercises: lighten(a) },
    // วิ่งหนักห่างจากเวทขาอย่างน้อย 48 ชม. — เวทขาทำให้วิ่งได้แย่ลงได้นาน 6–48 ชม. (Doma 2017)
    runDay('easyA', 'อังคาร', 'Easy run', w.easyA, 'easy', 'วิ่งเบาระดับพูดคุยได้ (Zone 2)'),
    runDay('quality', 'พุธ', w.q.title, w.q.km, w.q.kind, w.q.how),
    last
      ? { key: 'strB', day: 'พฤหัสบดี', title: 'พัก / เดินเบา ๆ', type: 'rest', duration: '-', note: 'สัปดาห์แข่ง งดเวท ยืดเหยียดเบา ๆ', exercises: [] }
      : { key: 'strB', day: 'พฤหัสบดี', title: 'เวท B — ทั้งตัว', type: 'strength', duration: '45 นาที', note: taper ? 'ช่วง taper: ลดเหลือ 2 เซ็ต' : strengthNote, exercises: lighten(b) },
    { key: 'rest', day: 'ศุกร์', title: 'พัก', type: 'rest', duration: '-', note: 'พักเต็มวัน นอน 8 ชม. ก่อนวิ่งยาว', exercises: [] },
    w.easyB > 0
      ? runDay('easyB', 'เสาร์', 'Easy run + Strides', w.easyB, 'easy', 'วิ่งเบา แล้ว Strides 4 × 20 วิ')
      : { key: 'easyB', day: 'เสาร์', title: 'พัก / เดินเบา ๆ', type: 'rest', duration: '-', note: 'เดิน 20–30 นาที หรือยืดเหยียด', exercises: [] },
    last
      ? runDay('long', 'อาทิตย์', `วันแข่ง ${programs[program].raceKm} กม.`, w.long, 'race', 'ออกตัวช้ากว่าเพซเป้าหมาย 5–10 วิ/กม. ช่วงแรก ดื่มน้ำทุกจุด', w.note)
      : runDay('long', 'อาทิตย์', 'วิ่งยาว (Long run)', w.long, 'long', 'ช้า ๆ ระดับพูดคุยได้ — ความช้าคือหัวใจของวิ่งยาว'),
  ]
}

// ทั้งสองเวอร์ชันมี 7 วันเรียง จันทร์→อาทิตย์ ตรงกัน วันวิ่ง/พักเหมือนกัน ต่างกันแค่วันเวท
export function variants(program: ProgramId, week: number): Record<Mode, Day[]> {
  if (program === 'physique') return { gym: gymWeek, park: parkWeek }
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
  return Math.round(variants(program, week).gym.reduce((s, d) => s + (d.targetKm ?? 0), 0))
}

export const locationInfo: Record<LocationPref, { label: string; text: string }> = {
  gym: { label: 'ยิมทุกวัน', text: 'เพิ่มน้ำหนักได้ละเอียด เห็นผลเรื่องกล้ามเร็วที่สุด โดยเฉพาะขา' },
  mix: { label: 'ผสม (แนะนำถ้ามีสมาชิกยิม)', text: 'วันที่มีขา/ท่าหนักไปยิม วันเวทวันสุดท้ายของสัปดาห์ไปสวน (บอดี้เวทแบบ Tom Holland)' },
  park: { label: 'สวนทุกวัน', text: 'ฟรี ใกล้บ้าน ดีมากสำหรับดึงข้อ/ดิป/วิดพื้น แต่ขาเพิ่มความหนักยาก ใช้ท่าขาเดียวและจังหวะลงช้าแทน' },
}

export const weekNote = (program: ProgramId, week: number) =>
  program !== 'physique' ? tables[program][week - 1]?.note : week === 9 ? 'สัปดาห์ Deload: ทำทุกท่าครึ่งหนึ่งของจำนวนเซ็ต น้ำหนักเท่าเดิม วิ่งเบาอย่างเดียว' : undefined

export const thaiDays = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์']
