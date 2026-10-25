export const yt = (q: string) =>
  `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`

export type Exercise = {
  name: string
  th: string
  sets: string
  reps: string
  rest: string
  cue: string
  video: string // คำค้นใน YouTube
  easier?: string
  harder?: string
}

export type Day = {
  key: string
  day: string
  title: string
  type: 'strength' | 'run' | 'rest'
  duration: string
  note?: string
  exercises: Exercise[]
  targetKm?: number // วันวิ่ง: ระยะเป้าหมาย
  runKind?: 'easy' | 'tempo' | 'interval' | 'long' | 'race'
  location?: 'gym' | 'park' // วันเวท: ฝึกที่ไหน (ตั้งโดย weekPlan)
}

const warmupNote = 'วอร์มอัพ 5–10 นาที: จ็อกเบา ๆ หรือกระโดดเชือก + หมุนข้อต่อ แล้วเล่นเซ็ตเบา 1–2 เซ็ตของท่าแรก'

const easyRun: Day = {
  key: 'easy',
  day: 'อังคาร',
  title: 'วิ่ง Easy',
  type: 'run',
  duration: '30–40 นาที',
  runKind: 'easy',
  targetKm: 5,
  note: 'ใช้ความเร็วที่ยังพูดเป็นประโยคได้ ถ้าหอบจนพูดไม่ได้แปลว่าเร็วไป ให้เดินสลับได้',
  exercises: [
    {
      name: 'Easy run',
      th: 'วิ่งเบา ระดับพูดคุยได้',
      sets: '1',
      reps: '4–6 กม.',
      rest: '-',
      cue: 'ก้าวสั้น ถี่ ลงเท้าใต้ลำตัว ไหล่ผ่อนคลาย',
      video: 'The Running Channel zone 2 running explained',
    },
  ],
}

const intervalRun: Day = {
  key: 'interval',
  day: 'เสาร์',
  title: 'วิ่ง Interval',
  type: 'run',
  duration: '25–35 นาที',
  runKind: 'interval',
  targetKm: 5,
  note: 'วอร์ม 10 นาที → วิ่งเร็ว 1 นาที / จ็อกเบา 2 นาที → คูลดาวน์ 5 นาที',
  exercises: [
    {
      name: 'Intervals 1:2',
      th: 'วิ่งเร็ว 1 นาที สลับจ็อก 2 นาที',
      sets: '5–8 รอบ',
      reps: '1 นาที (เหนื่อย ~8/10)',
      rest: 'จ็อก 2 นาที',
      cue: 'สัปดาห์ 1–4 เริ่ม 5 รอบ เพิ่มทีละ 1 รอบทุก 2 สัปดาห์',
      video: 'interval running workout for beginners',
    },
  ],
}

const rest = (key: string, day: string): Day => ({
  key,
  day,
  title: 'พัก / เดินเบา ๆ',
  type: 'rest',
  duration: '-',
  note: 'เดิน 6,000–10,000 ก้าว ยืดเหยียด นอนให้ได้ 7–9 ชั่วโมง',
  exercises: [],
})

export const gymWeek: Day[] = [
  {
    key: 'upperA',
    day: 'จันทร์',
    title: 'Upper A — เน้นแรง (ช่วงบน)',
    type: 'strength',
    duration: '60 นาที',
    note: warmupNote,
    exercises: [
      { name: 'Bench Press', th: 'ดันบาร์นอนราบ', sets: '3', reps: '6–8', rest: '2–3 นาที', cue: 'บีบสะบักลง เท้าวางแน่น บาร์ลงแตะกลางอก', video: 'Jeff Nippard how to bench press', easier: 'Dumbbell press', harder: 'เพิ่มน้ำหนัก 2.5 กก.' },
      { name: 'Pull-up', th: 'ดึงข้อ', sets: '3', reps: '5–8', rest: '2 นาที', cue: 'เริ่มจากห้อยตัวสุด ดึงอกขึ้นหาบาร์ ไม่เหวี่ยงตัว', video: 'how to do your first pull up progression', easier: 'Assisted pull-up / Negative', harder: 'ถ่วงน้ำหนัก' },
      { name: 'Overhead Press', th: 'ดันบาร์เหนือศีรษะ (ยืน)', sets: '3', reps: '8–10', rest: '2 นาที', cue: 'เกร็งก้นและท้อง ดันบาร์เป็นเส้นตรงผ่านหน้า', video: 'how to overhead press proper form' },
      { name: 'Seated Cable Row', th: 'ดึงเคเบิลนั่ง', sets: '3', reps: '8–12', rest: '90 วิ', cue: 'ดึงศอกไปด้านหลัง อกยืด ไม่โยกหลัง', video: 'seated cable row proper form' },
      { name: 'Lateral Raise', th: 'ยกดัมเบลด้านข้าง (ไหล่กว้าง)', sets: '3', reps: '12–15', rest: '60 วิ', cue: 'ยกถึงระดับไหล่ ช้า ๆ ควบคุมขาลง', video: 'Jeff Nippard lateral raise form' },
      { name: 'Hanging Knee Raise', th: 'ห้อยตัวยกเข่า', sets: '3', reps: '10–15', rest: '60 วิ', cue: 'ม้วนสะโพกขึ้น ไม่เหวี่ยง', video: 'hanging knee raise form', harder: 'Hanging leg raise' },
    ],
  },
  easyRun,
  {
    key: 'lower',
    day: 'พุธ',
    title: 'Lower + Core (ช่วงล่าง)',
    type: 'strength',
    duration: '65–70 นาที',
    note: warmupNote,
    exercises: [
      { name: 'Back Squat', th: 'สควอทบาร์หลัง', sets: '4', reps: '6–8', rest: '2–3 นาที', cue: 'หายใจเข้าเกร็งท้อง ลงให้ต้นขาขนานพื้นหรือต่ำกว่า เข่าตามแนวปลายเท้า', video: 'Jeff Nippard how to squat', easier: 'Goblet squat' },
      { name: 'Romanian Deadlift', th: 'โรมาเนียนเดดลิฟต์', sets: '3', reps: '8–10', rest: '2 นาที', cue: 'ดันสะโพกไปหลัง หลังตรง บาร์ชิดขา รู้สึกตึงต้นขาหลัง', video: 'romanian deadlift proper form' },
      { name: 'Bulgarian Split Squat', th: 'สควอทขาเดียว เท้าหลังพาดม้านั่ง', sets: '3', reps: '8–12 / ข้าง', rest: '90 วิ', cue: 'ลำตัวเอนหน้าเล็กน้อย ลงช้า ๆ', video: 'bulgarian split squat form' },
      { name: 'Lying Leg Curl', th: 'นอนคว่ำงอเข่า (ต้นขาหลัง)', sets: '3', reps: '10–12', rest: '60 วิ', cue: 'ยกช้า ค้าง 1 วิ ลงช้า สะโพกแนบเบาะ', video: 'lying leg curl proper form', easier: 'Nordic curl แบบลงช้า (สวน)' },
      { name: 'Leg Extension', th: 'เตะขาเครื่อง (ต้นขาหน้า)', sets: '2', reps: '12–15', rest: '60 วิ', cue: 'เหยียดสุดแล้วบีบค้าง 1 วิ ลงช้า', video: 'leg extension proper form' },
      { name: 'Standing Calf Raise', th: 'เขย่งน่อง', sets: '3', reps: '12–15', rest: '60 วิ', cue: 'ค้างด้านบน 1 วิ ลงให้สุดยืดน่อง', video: 'calf raise proper form' },
      { name: 'Plank', th: 'แพลงก์', sets: '3', reps: '30–60 วิ', rest: '60 วิ', cue: 'ตัวตรงเป็นแนวเดียว บีบก้น', video: 'how to plank correctly' },
    ],
  },
  rest('rest1', 'พฤหัสบดี'),
  {
    key: 'upperB',
    day: 'ศุกร์',
    title: 'Upper B — เน้นสร้างกล้าม (ช่วงบน)',
    type: 'strength',
    duration: '60 นาที',
    note: warmupNote,
    exercises: [
      { name: 'Dips', th: 'ดิปบาร์คู่', sets: '3', reps: '6–10', rest: '2 นาที', cue: 'ไหล่ไม่ห่อ ลงจนศอกประมาณ 90°', video: 'how to do dips correctly', easier: 'Bench dip / Assisted dip', harder: 'ถ่วงน้ำหนัก' },
      { name: 'Lat Pulldown', th: 'ดึงเคเบิลลงหน้าอก', sets: '3', reps: '10–12', rest: '90 วิ', cue: 'ดึงศอกลงหาสะโพก', video: 'lat pulldown proper form' },
      { name: 'Incline DB Press', th: 'ดันดัมเบลม้านั่งเอียง', sets: '3', reps: '8–12', rest: '90 วิ', cue: 'ม้านั่งเอียง 30° เน้นอกส่วนบน', video: 'incline dumbbell press form' },
      { name: 'Face Pull', th: 'ดึงเชือกเข้าหน้า', sets: '3', reps: '12–15', rest: '60 วิ', cue: 'ดึงไปที่หน้าผาก หมุนแขนออก ช่วยไหล่หลังและท่าทาง', video: 'face pull proper form' },
      { name: 'DB Curl', th: 'ดัมเบลเคิร์ล', sets: '2', reps: '10–12', rest: '60 วิ', cue: 'ศอกนิ่งข้างลำตัว', video: 'dumbbell curl proper form' },
      { name: 'Triceps Pushdown', th: 'กดเคเบิลหลังแขน', sets: '2', reps: '10–12', rest: '60 วิ', cue: 'ล็อกศอก กดจนแขนเหยียดสุด', video: 'tricep pushdown form' },
      { name: 'Lateral Raise', th: 'ยกดัมเบลด้านข้าง (ไหล่กว้าง)', sets: '2', reps: '12–15', rest: '60 วิ', cue: 'ยกถึงระดับไหล่ ช้า ๆ ควบคุมขาลง', video: 'Jeff Nippard lateral raise form' },
    ],
  },
  intervalRun,
  rest('rest2', 'อาทิตย์'),
]

export const parkWeek: Day[] = [
  {
    key: 'parkA',
    day: 'จันทร์',
    title: 'Calisthenics A — Push/Pull',
    type: 'strength',
    duration: '50–60 นาที',
    note: 'ใช้บาร์โหน/บาร์คู่ในสวน เลือกระดับท่าที่ทำได้ตามจำนวนครั้ง ถ้าทำได้เกินช่วงบนทุกเซ็ต ให้ขยับไปท่าที่ยากขึ้น',
    exercises: [
      { name: 'Pull-up', th: 'ดึงข้อ', sets: '4', reps: '4–8', rest: '2 นาที', cue: 'ทำไม่ได้: กระโดดขึ้นแล้วลงช้า 3–5 วิ (Negative)', video: 'pull up progression for beginners calisthenics', easier: 'Negative pull-up', harder: 'Archer pull-up' },
      { name: 'Push-up', th: 'วิดพื้น', sets: '4', reps: '8–15', rest: '90 วิ', cue: 'ลำตัวตรง ศอกทำมุม ~45° กับลำตัว', video: 'FitnessFAQs push up progression', easier: 'Incline push-up', harder: 'Diamond / Decline / Archer push-up' },
      { name: 'Dips', th: 'ดิปบาร์คู่', sets: '3', reps: '6–12', rest: '90 วิ', cue: 'ลงจนศอกงอ ~90° ไหล่กดลง ไม่ห่อขึ้นหาหู', video: 'dips progression beginner calisthenics', easier: 'Bench dip' },
      { name: 'Australian Row', th: 'ดึงตัวบาร์ต่ำ', sets: '3', reps: '8–15', rest: '90 วิ', cue: 'ตัวตรง ดึงอกแตะบาร์', video: 'australian pull up inverted row form', harder: 'ยกเท้าสูง' },
      { name: 'Pike Push-up', th: 'วิดพื้นสะโพกสูง (ไหล่)', sets: '3', reps: '6–12', rest: '90 วิ', cue: 'ยกสะโพกสูง ก้มศีรษะลงไปข้างหน้ามือ ให้มือสองข้างกับศีรษะเป็นรูปสามเหลี่ยม', video: 'pike push up tutorial', harder: 'ยกเท้าบนม้านั่ง' },
      { name: 'Hanging Knee/Leg Raise', th: 'ห้อยตัวยกขา', sets: '3', reps: '8–15', rest: '60 วิ', cue: 'ม้วนสะโพก ไม่เหวี่ยง', video: 'hanging leg raise progression' },
    ],
  },
  easyRun,
  {
    key: 'parkLegs',
    day: 'พุธ',
    title: 'Calisthenics — ขา + Core',
    type: 'strength',
    duration: '45–55 นาที',
    note: 'ขาเป็นส่วนที่บอดี้เวทเพิ่มความหนักยาก ให้เน้นท่าขาเดียวและจังหวะลงช้า (3 วิ)',
    exercises: [
      { name: 'Bulgarian Split Squat', th: 'สควอทขาเดียว เท้าหลังพาดม้านั่ง', sets: '4', reps: '8–15 / ข้าง', rest: '90 วิ', cue: 'ลงช้า 3 วิ ถือขวดน้ำ/กระเป๋าเพิ่มน้ำหนักได้', video: 'bulgarian split squat form' },
      { name: 'Jump Squat', th: 'สควอทกระโดด', sets: '3', reps: '8–10', rest: '90 วิ', cue: 'ลงเบา งอเข่าซับแรง', video: 'jump squat proper form' },
      { name: 'Single-leg Glute Bridge', th: 'ยกสะโพกขาเดียว', sets: '3', reps: '10–15 / ข้าง', rest: '60 วิ', cue: 'บีบก้นค้างด้านบน 1 วิ', video: 'single leg glute bridge form' },
      { name: 'Pistol Squat progression', th: 'ฝึกสควอทขาเดียว (นั่งลงม้านั่ง)', sets: '3', reps: '5–8 / ข้าง', rest: '90 วิ', cue: 'เริ่มจากนั่งลงม้านั่งด้วยขาเดียว ค่อย ๆ ลดความสูง', video: 'pistol squat progression beginner' },
      { name: 'Hollow Body Hold', th: 'นอนเกร็งท้องทรงเรือ', sets: '3', reps: '20–40 วิ', rest: '60 วิ', cue: 'หลังล่างแนบพื้นตลอด', video: 'hollow body hold tutorial' },
    ],
  },
  rest('rest1', 'พฤหัสบดี'),
  {
    key: 'parkB',
    day: 'ศุกร์',
    title: 'Calisthenics B + "Cindy"',
    type: 'strength',
    duration: '50 นาที',
    note: 'ส่วนแรกฝึกความแข็งแรง ปิดท้ายด้วย "Cindy" (5 pull-up, 10 push-up, 15 squat ให้ได้มากรอบที่สุด) ซึ่งตามที่ Men\'s Health รายงาน Tom Holland ใช้ท่านี้',
    exercises: [
      { name: 'Chin-up', th: 'ดึงข้อมือหงาย', sets: '3', reps: '5–8', rest: '2 นาที', cue: 'เน้นหลังและไบเซ็ป', video: 'chin up proper form' },
      { name: 'Archer / Decline Push-up', th: 'วิดพื้นแบบยาก', sets: '3', reps: '6–10', rest: '90 วิ', cue: 'เลือกท่าที่ทำได้ 6–10 ครั้ง', video: 'archer push up progression' },
      { name: 'Straight Bar Dip', th: 'ดิปบาร์เดี่ยว', sets: '3', reps: '6–10', rest: '90 วิ', cue: 'พื้นฐานสู่ muscle-up', video: 'straight bar dip tutorial', easier: 'Parallel bar dip' },
      { name: 'Prone Y-T-W Raise', th: 'นอนคว่ำยกแขนเป็นตัว Y-T-W (ไหล่หลัง/ข้าง)', sets: '3', reps: '8 / ตัวอักษร', rest: '60 วิ', cue: 'บีบสะบัก ยกช้า ค้าง 2 วิ ไม่ต้องใช้อุปกรณ์', video: 'prone YTW raise exercise' },
      { name: 'Cindy (AMRAP)', th: '5 ดึงข้อ + 10 วิดพื้น + 15 สควอท วนให้ได้มากรอบที่สุด', sets: '1', reps: '10 นาที (wk 1–4) → 15 → 20', rest: '-', cue: 'จดจำนวนรอบไว้ทุกครั้ง ดึงข้อไม่ไหวใช้ Australian row แทน', video: 'Tom Holland Cindy workout' },
    ],
  },
  intervalRun,
  rest('rest2', 'อาทิตย์'),
]

export const phases = [
  { weeks: '1–4', name: 'ฐาน', text: 'เรียนท่าให้ถูก ใช้น้ำหนักที่เหลือแรงอีก 2–3 ครั้งก่อนหมดแรง (RIR 2–3) วิ่งรวม ~12–15 กม./สัปดาห์' },
  { weeks: '5–8', name: 'เพิ่มความหนัก', text: 'ดันให้ใกล้หมดแรงขึ้น (RIR 1–2) เพิ่มน้ำหนัก/ครั้งทุกสัปดาห์ เพิ่มรอบ interval วิ่งรวม ~15–18 กม.' },
  { weeks: '9', name: 'Deload', text: 'ลดจำนวนเซ็ตลงครึ่งหนึ่ง น้ำหนักเท่าเดิม ให้ร่างกายฟื้นตัว' },
  { weeks: '10–12', name: 'ทดสอบ & ต่อยอด', text: 'กลับไปความหนักเต็มที่ ทดสอบสถิติ (pull-up สูงสุด, วิ่ง 5 กม.) ถ่ายรูปเทียบกับสัปดาห์ที่ 1 แล้ววางแผนรอบต่อไป' },
]

export const principles = [
  { title: 'Double progression', text: 'เมื่อทำได้ครบจำนวนครั้งสูงสุดทุกเซ็ต (เช่น 3×8) ให้เพิ่มน้ำหนักเล็กน้อยแล้วเริ่มนับใหม่ที่ช่วงล่าง (3×6) — นี่คือ progressive overload ซึ่งเป็นหลักสำคัญของการเพิ่มกล้าม' },
  { title: 'ปริมาณที่พอ', text: 'งานวิจัยแบบ meta-analysis พบว่าราว 10+ เซ็ตหนัก/กลุ่มกล้ามเนื้อ/สัปดาห์ให้ผลดีกว่าปริมาณน้อย แผนนี้ให้ ~9–14 เซ็ตต่อกลุ่มกล้ามใหญ่' },
  { title: 'ช่วงบน 2 ครั้ง ขา 1 ครั้ง/สัปดาห์', text: 'ถ้าปริมาณเซ็ตรวมต่อสัปดาห์เท่ากัน ความถี่ไม่ได้มีผลต่อการโตของกล้ามมากนัก (Schoenfeld 2019) วันขาจึงรวมไว้วันเดียว และขายังได้ฝึกจากการวิ่ง' },
  { title: 'วิ่งไม่ขัดกล้าม ถ้าไม่มากไป', text: 'วิ่งเบาเป็นหลัก (โซน E) วิ่งหนักแค่ 1 ครั้ง/สัปดาห์ และไม่วิ่งหนักในวันถัดจากวันเล่นขา' },
  { title: 'นอนและเดิน', text: 'นอน 7–9 ชม. ช่วยเรื่องการฟื้นตัวและความอยากอาหาร เดินวันละ 7,000+ ก้าวช่วยเผาผลาญโดยไม่กระทบการฟื้นตัว' },
]
