import type { Muscle } from './muscles'

// คลังท่าสำหรับ "สลับท่า" / "เพิ่มท่า" — จัดกลุ่มตามรูปแบบการเคลื่อนไหว
// ท่าในกลุ่มเดียวกันใช้กล้ามหลักชุดเดียวกัน จึงสลับกันได้โดยไม่เสียสมดุลของโปรแกรม
// (ท่าที่มีในโปรแกรมอยู่แล้วใช้ชื่อเดียวกับ workouts.ts — กล้ามของท่าเหล่านั้นอยู่ใน muscles.ts)

export type Pattern =
  | 'squat' | 'single' | 'hinge' | 'hams' | 'quads' | 'hpush' | 'dip' | 'vpush' | 'hpull' | 'vpull'
  | 'side' | 'rear' | 'biceps' | 'triceps' | 'calf' | 'core' | 'hip' | 'plyo'

export const patternNames: Record<Pattern, string> = {
  squat: 'สควอท', single: 'ขาเดียว / ลันจ์', hinge: 'พับสะโพก (ก้น-ต้นขาหลัง)', hams: 'ต้นขาหลัง', quads: 'ต้นขาหน้า',
  hpush: 'ดันแนวนอน (อก)', dip: 'ดิป', vpush: 'ดันขึ้น (ไหล่)', hpull: 'ดึงแนวนอน (หลังบน)', vpull: 'ดึงลง (ปีก)',
  side: 'ไหล่ข้าง', rear: 'ไหล่หลัง', biceps: 'หน้าแขน', triceps: 'หลังแขน', calf: 'น่อง', core: 'แกนกลาง',
  hip: 'สะโพกด้านข้าง', plyo: 'กระโดด (พลัยโอเมตริก)',
}

export type LibEx = {
  name: string
  th: string
  cue: string
  video: string
  reps: string // ช่วงครั้งเริ่มต้น เมื่อสลับจากท่าที่นับต่างหน่วย (ครั้ง ↔ วินาที)
  where: 'gym' | 'park' | 'both'
  muscles?: { primary: Muscle[]; secondary: Muscle[] } // เฉพาะท่าใหม่ที่ไม่มีใน muscles.ts
}

const m = (primary: Muscle[], secondary: Muscle[] = []) => ({ primary, secondary })
const x = (name: string, th: string, cue: string, video: string, reps: string, where: LibEx['where'], muscles?: LibEx['muscles']): LibEx =>
  ({ name, th, cue, video, reps, where, muscles })

export const library: Record<Pattern, LibEx[]> = {
  squat: [
    x('Back Squat', 'สควอทบาร์หลัง', 'ลงจนต้นขาขนานพื้น เข่าตามปลายเท้า หลังตรง', 'how to squat proper form', '6–10', 'gym'),
    x('Front Squat', 'สควอทบาร์หน้า', 'ศอกสูง ลำตัวตั้ง เข่าไปข้างหน้าได้', 'front squat proper form', '6–10', 'gym', m(['quads', 'glutes'], ['abs', 'upperBack'])),
    x('Goblet Squat', 'สควอทถือดัมเบลที่อก', 'ถือดัมเบลชิดอก ลงลึก ศอกอยู่ในเข่า', 'goblet squat form', '8–12', 'gym', m(['quads', 'glutes'], ['abs'])),
    x('Leg Press', 'เครื่องดันขา', 'หลังล่างแนบเบาะ ไม่ล็อกเข่าตอนเหยียด', 'leg press proper form', '8–12', 'gym', m(['quads', 'glutes'], ['hamstrings'])),
    x('Pistol Squat progression', 'ฝึกสควอทขาเดียว (นั่งลงม้านั่ง)', 'ค่อย ๆ ลดความสูงม้านั่ง', 'pistol squat progression beginner', '5–8 / ข้าง', 'park'),
    x('Jump Squat', 'สควอทกระโดด', 'ลงนุ่ม ๆ งอเข่ารับแรง', 'jump squat form', '8–10', 'both'),
  ],
  single: [
    x('Bulgarian Split Squat', 'สควอทขาเดียว เท้าหลังพาดม้านั่ง', 'ลงช้า ๆ คุมเข่าไม่บิดเข้าใน', 'bulgarian split squat form', '8–12 / ข้าง', 'both'),
    x('Walking Lunge', 'ลันจ์เดิน', 'ก้าวยาวพอดี เข่าหลังเกือบแตะพื้น', 'walking lunge proper form', '10–12 / ข้าง', 'both', m(['quads', 'glutes'], ['hamstrings'])),
    x('Reverse Lunge', 'ลันจ์ถอยหลัง', 'ถอยเท้าไปหลัง ลำตัวตั้ง ดันกลับด้วยส้นเท้าหน้า', 'reverse lunge form', '8–12 / ข้าง', 'both', m(['quads', 'glutes'], ['hamstrings'])),
    x('Step-up', 'ก้าวขึ้นกล่อง/ม้านั่ง', 'ดันขึ้นด้วยขาบน ไม่ถีบขาล่าง', 'step up exercise form', '8–12 / ข้าง', 'both', m(['quads', 'glutes'], ['hamstrings', 'calves'])),
  ],
  hinge: [
    x('Romanian Deadlift', 'โรมาเนียนเดดลิฟต์', 'หลังตรง บาร์ชิดขา ดันสะโพกไปหลัง', 'romanian deadlift proper form', '6–10', 'gym'),
    x('Trap Bar Deadlift', 'เดดลิฟต์บาร์หกเหลี่ยม', 'ยืนกลางบาร์ ดันพื้น หลังตรง', 'trap bar deadlift form', '5–8', 'gym', m(['glutes', 'quads', 'hamstrings'], ['lowerBack', 'traps', 'forearms'])),
    x('Hip Thrust', 'ฮิปทรัสต์', 'หลังบนพาดม้านั่ง คางชิดอก บีบก้นค้างด้านบน', 'hip thrust proper form', '8–12', 'gym', m(['glutes'], ['hamstrings'])),
    x('Single-leg RDL', 'เดดลิฟต์ขาเดียว', 'สะโพกตรง ช้า ๆ คุมการทรงตัว', 'single leg romanian deadlift form', '8–10 / ข้าง', 'both'),
    x('Single-leg Glute Bridge', 'ยกสะโพกขาเดียว', 'บีบก้นค้าง 1 วิ', 'single leg glute bridge form', '12 / ข้าง', 'park'),
    x('Kettlebell Swing', 'สวิงเคตเทิลเบล', 'แรงมาจากการดีดสะโพก ไม่ใช่ยกด้วยแขน', 'kettlebell swing form', '12–15', 'gym', m(['glutes', 'hamstrings'], ['lowerBack', 'abs'])),
  ],
  hams: [
    x('Lying Leg Curl', 'นอนคว่ำงอขา', 'ลงช้า 2–3 วิ สะโพกแนบเบาะ', 'lying leg curl form', '10–15', 'gym'),
    x('Seated Leg Curl', 'นั่งงอขา', 'ลงช้า คุมตลอดช่วง', 'seated leg curl form', '10–15', 'gym', m(['hamstrings'])),
    x('Nordic Curl', 'นอร์ดิกเคิร์ล (มีคนจับเท้า)', 'ค่อย ๆ ล้มไปข้างหน้าช้าที่สุด ใช้มือรับ', 'nordic hamstring curl beginner', '3–6', 'both', m(['hamstrings'], ['glutes'])),
  ],
  quads: [
    x('Leg Extension', 'เหยียดขา', 'ค้างด้านบน 1 วิ ลงช้า', 'leg extension form', '10–15', 'gym'),
    x('Wall Sit', 'นั่งพิงกำแพง', 'ต้นขาขนานพื้น หลังแนบกำแพง', 'wall sit form', '30–60 วิ', 'both', m(['quads'], ['glutes'])),
  ],
  hpush: [
    x('Bench Press', 'นอนดันบาร์', 'สะบักบีบ เท้าแนบพื้น บาร์ลงกลางอก', 'how to bench press proper form', '6–10', 'gym'),
    x('DB Bench Press', 'นอนดันดัมเบล', 'ศอกทำมุม ~45° กับลำตัว ลงช้า', 'dumbbell bench press form', '8–12', 'gym', m(['chest', 'triceps'], ['frontDelts'])),
    x('Incline DB Press', 'ดันดัมเบลม้านั่งเอียง', 'เอียง 30° ลงช้า', 'incline dumbbell press form', '8–12', 'gym'),
    x('Machine Chest Press', 'เครื่องดันอก', 'ปรับเบาะให้ด้ามจับอยู่ระดับกลางอก', 'machine chest press form', '8–12', 'gym', m(['chest', 'triceps'], ['frontDelts'])),
    x('Push-up', 'วิดพื้น', 'ลำตัวตรง อกเกือบแตะพื้น', 'push up proper form', '8–15', 'both'),
    x('Archer / Decline Push-up', 'วิดพื้นแบบยาก', 'คุมลำตัวตรง ลงช้า', 'archer push up progression', '6–10', 'park'),
  ],
  dip: [
    x('Dips', 'ดิปบาร์คู่', 'ลงจนศอก ~90° ไหล่ไม่ห่อ', 'how to do dips correctly', '6–10', 'both'),
    x('Straight Bar Dip', 'ดิปบาร์เดี่ยว', 'ตัวเอนหน้าเล็กน้อย ลงจนบาร์แตะใต้อก', 'straight bar dip tutorial', '5–8', 'park'),
    x('Bench Dip', 'ดิปม้านั่ง', 'ก้นชิดม้านั่ง ลงจนศอก ~90°', 'bench dip form', '10–15', 'both', m(['triceps'], ['chest', 'frontDelts'])),
  ],
  vpush: [
    x('Overhead Press', 'ดันบาร์เหนือศีรษะ', 'เกร็งก้นและท้อง ไม่แอ่นหลัง', 'how to overhead press proper form', '6–10', 'gym'),
    x('Seated DB Shoulder Press', 'นั่งดันดัมเบลเหนือศีรษะ', 'หลังพิงเบาะ ดันขึ้นตรง', 'seated dumbbell shoulder press form', '8–12', 'gym', m(['frontDelts', 'sideDelts'], ['triceps'])),
    x('Pike Push-up', 'วิดพื้นสะโพกสูง', 'ศีรษะลงหน้ามือ เป็นสามเหลี่ยม', 'pike push up tutorial', '6–10', 'both'),
  ],
  hpull: [
    x('Seated Cable Row', 'ดึงเคเบิลนั่ง', 'ดึงศอกไปหลัง อกยืด', 'seated cable row proper form', '8–12', 'gym'),
    x('One-arm DB Row', 'ดึงดัมเบลแขนเดียว', 'มือ-เข่าพาดม้านั่ง ดึงศอกไปทางสะโพก', 'one arm dumbbell row form', '8–12 / ข้าง', 'gym', m(['lats', 'upperBack'], ['biceps', 'rearDelts'])),
    x('Chest-supported Row', 'ดึงดัมเบลนอนคว่ำม้านั่งเอียง', 'อกแนบเบาะ ไม่เหวี่ยงตัว', 'chest supported dumbbell row', '8–12', 'gym', m(['upperBack', 'lats'], ['rearDelts', 'biceps'])),
    x('Australian Row', 'ดึงตัวบาร์ต่ำ', 'ตัวตรง ดึงอกแตะบาร์', 'australian pull up inverted row form', '8–12', 'park'),
  ],
  vpull: [
    x('Pull-up', 'ดึงข้อ', 'ไม่เหวี่ยงตัว ลงสุดแขน', 'how to do your first pull up progression', '5–8', 'both'),
    x('Chin-up', 'ดึงข้อมือหงาย', 'คางพ้นบาร์ ลงช้า', 'chin up proper form', '5–8', 'both'),
    x('Lat Pulldown', 'ดึงบาร์ลงหน้าอก', 'อกยืด ดึงศอกลงข้างลำตัว', 'lat pulldown proper form', '8–12', 'gym'),
    x('Negative Pull-up', 'ดึงข้อขาลงช้า', 'กระโดดขึ้นค้าง แล้วลงช้า 3–5 วิ', 'negative pull up beginner', '4–6', 'both', m(['lats', 'biceps'], ['upperBack'])),
  ],
  side: [
    x('Lateral Raise', 'ยกดัมเบลด้านข้าง', 'ยกถึงระดับไหล่ ศอกงอเล็กน้อย ลงช้า', 'lateral raise proper form', '12–15', 'gym'),
    x('Cable Lateral Raise', 'ยกเคเบิลด้านข้าง', 'แรงตึงคงที่ตลอดช่วง', 'cable lateral raise form', '12–15', 'gym', m(['sideDelts'])),
  ],
  rear: [
    x('Face Pull', 'ดึงเชือกเข้าหาหน้า', 'ดึงไปที่หน้าผาก หมุนแขนออก', 'face pull proper form', '12–15', 'gym'),
    x('Reverse Pec Deck', 'เครื่องกางแขนไหล่หลัง', 'กางแขนออก ไม่ใช้แรงเหวี่ยง', 'reverse pec deck form', '12–15', 'gym', m(['rearDelts'], ['upperBack'])),
    x('Prone Y-T-W Raise', 'นอนคว่ำยกแขน Y-T-W', 'ยกช้า ค้าง 1 วิ', 'prone y t w raise', '8 / ท่า', 'both'),
  ],
  biceps: [
    x('DB Curl', 'ยกดัมเบลหน้าแขน', 'ศอกนิ่งข้างลำตัว ลงช้า', 'dumbbell curl proper form', '10–12', 'gym'),
    x('Hammer Curl', 'ยกดัมเบลหน้าแขนแบบค้อน', 'ฝ่ามือหันเข้าหากัน', 'hammer curl form', '10–12', 'gym', m(['biceps', 'forearms'])),
    x('Cable Curl', 'ยกเคเบิลหน้าแขน', 'ศอกนิ่ง บีบค้างด้านบน', 'cable curl form', '10–15', 'gym', m(['biceps'])),
  ],
  triceps: [
    x('Triceps Pushdown', 'กดเคเบิลหลังแขน', 'ศอกแนบลำตัว เหยียดสุด', 'triceps pushdown form', '10–15', 'gym'),
    x('Overhead Triceps Extension', 'เหยียดแขนเหนือศีรษะ', 'ศอกชี้ขึ้น ลงจนยืดสุด', 'overhead triceps extension form', '10–15', 'gym', m(['triceps'])),
    x('Diamond Push-up', 'วิดพื้นมือชิด', 'มือชิดใต้อก ศอกแนบลำตัว', 'diamond push up form', '8–12', 'both', m(['triceps', 'chest'], ['frontDelts'])),
  ],
  calf: [
    x('Standing Calf Raise', 'เขย่งน่อง', 'ลงสุด ค้างบน 1 วิ', 'standing calf raise form', '12–15', 'gym'),
    x('Single-leg Calf Raise', 'เขย่งน่องขาเดียว', 'ลงช้า 3 วิ', 'single leg calf raise runners', '12–15 / ข้าง', 'both'),
    x('Seated Calf Raise', 'นั่งเขย่งน่อง', 'เข่างอ ~90° ลงสุด ค้างบน', 'seated calf raise form', '12–15', 'gym', m(['calves'])),
    x('Bent-knee Calf Raise', 'เขย่งน่องงอเข่า (น่องมัดใน)', 'งอเข่าเล็กน้อยตลอด ขึ้นสุด ลงช้า 3 วิ — น่องมัดใน (soleus) รับแรงวิ่งมากที่สุด', 'bent knee calf raise soleus', '12–15', 'both', m(['calves'])),
  ],
  // สะโพกด้านข้าง (glute medius) อ่อน → สะโพกตกตอนวิ่ง เข่าบิดเข้า เจ็บ IT band (review 2024)
  hip: [
    x('Banded Lateral Walk', 'เดินข้างพันยางยืดเหนือเข่า', 'ย่อเข่าเล็กน้อย ลำตัวตั้ง ก้าวข้างช้า ๆ เข่าไม่บิดเข้า', 'banded lateral walk glute medius', '12–15 ก้าว / ข้าง', 'both', m(['glutes'], ['quads'])),
    x('Side-lying Hip Abduction', 'นอนตะแคงยกขา', 'ขาบนเหยียดตรง ปลายเท้าชี้ไปข้างหน้า ยกช้า ค้าง 1 วิ ไม่ม้วนสะโพกไปหลัง', 'side lying hip abduction form', '15–20 / ข้าง', 'both', m(['glutes'])),
  ],
  // กระโดดเบา ๆ แตะพื้นสั้น — ฝึกเอ็นร้อยหวาย/น่องให้เด้งเหมือนสปริง (เริ่มหลังฝึกน่องแบบช้ามาแล้ว)
  plyo: [
    x('Pogo Jumps', 'กระโดดเขย่ง (ข้อเท้าแข็ง)', 'เข่าเกือบตรง เด้งด้วยข้อเท้า แตะพื้นสั้นที่สุด เบาและเงียบ', 'pogo jumps runners', '3 × 15–20', 'both', m(['calves'], ['quads'])),
    x('Jump Rope', 'กระโดดเชือก', 'กระโดดต่ำ ลงปลายเท้า จังหวะสม่ำเสมอ', 'jump rope for runners', '1–2 นาที', 'both', m(['calves'], ['quads'])),
  ],
  core: [
    x('Plank', 'แพลงก์', 'ลำตัวตรง เกร็งก้นและท้อง', 'plank proper form', '30–45 วิ', 'both'),
    x('Side Plank', 'แพลงก์ด้านข้าง', 'สะโพกไม่ตก', 'side plank proper form', '30–45 วิ / ข้าง', 'both'),
    x('Hollow Body Hold', 'นอนเกร็งท้องทรงเรือ', 'หลังล่างแนบพื้น', 'hollow body hold tutorial', '20–40 วิ', 'both'),
    x('Dead Bug', 'นอนหงายยืดแขนขาสลับ', 'หลังล่างแนบพื้นตลอด', 'dead bug exercise form', '8 / ข้าง', 'both'),
    x('Hanging Knee Raise', 'ห้อยตัวยกเข่า', 'ไม่แกว่งตัว ม้วนสะโพกขึ้น', 'hanging knee raise form', '8–12', 'both'),
    x('Ab Wheel Rollout', 'ล้อกลิ้งหน้าท้อง', 'หลังไม่แอ่น ไปเท่าที่คุมได้', 'ab wheel rollout beginner', '6–10', 'gym', m(['abs'], ['obliques', 'lats'])),
    x('Cable Crunch', 'คุกเข่าครันช์เคเบิล', 'ม้วนลำตัวลง ไม่ใช่ดึงด้วยแขน', 'cable crunch form', '10–15', 'gym', m(['abs'])),
    x('Pallof Press', 'ดันเคเบิลต้านการบิด', 'ลำตัวนิ่ง ดันออกค้าง 2 วิ', 'pallof press form', '10 / ข้าง', 'gym', m(['obliques', 'abs'])),
  ],
}

const all = Object.entries(library).flatMap(([p, list]) => list.map(e => ({ ...e, pattern: p as Pattern })))
const byName = new Map(all.map(e => [e.name, e]))

// ท่าในโปรแกรมที่ชื่อไม่ตรงกับคลัง (เป็นตัวแปรของท่าเดียวกัน)
const alias: Record<string, string> = { 'Hanging Knee/Leg Raise': 'Hanging Knee Raise' }

export const libEx = (name: string) => byName.get(alias[name] ?? name)
export const patternOf = (name: string) => libEx(name)?.pattern
export const allLibrary = all

// ท่าที่บาร์อยู่เหนือหน้า/บนหลัง — ถ้าหมดแรงกลางเซ็ตแล้วไม่มีคนช่วย (spotter) อาจโดนบาร์ทับ
// โหมด "ฝึกคนเดียว" จะสลับเป็นท่าที่ปล่อยน้ำหนักได้ปลอดภัย (ดัมเบล/เครื่อง) — กล้ามโตไม่ต่างกัน (Haugen 2023)
export const needsSpotter: Record<string, { alt: string; note: string }> = {
  'Bench Press': { alt: 'DB Bench Press', note: 'ดัมเบลวางลงข้างตัวได้ถ้าหมดแรง' },
  'Back Squat': { alt: 'Leg Press', note: 'เครื่องมีตัวล็อก หรือใช้ squat rack ที่ตั้งเหล็กกันตก (safety bar) ต่ำกว่าจุดลึกสุดเล็กน้อย' },
  'Front Squat': { alt: 'Goblet Squat', note: 'ถือดัมเบลที่อก ปล่อยลงพื้นได้' },
}

/** ท่าที่สลับแทนได้ (กลุ่มเดียวกัน ไม่รวมตัวเอง) — ท่าที่ทำได้ในที่นั้นขึ้นก่อน */
export function alternatives(name: string, where: 'gym' | 'park') {
  const p = patternOf(name)
  if (!p) return []
  const self = alias[name] ?? name
  return library[p]
    .filter(e => e.name !== self)
    .sort((a, b) => Number(b.where === where || b.where === 'both') - Number(a.where === where || a.where === 'both'))
}
