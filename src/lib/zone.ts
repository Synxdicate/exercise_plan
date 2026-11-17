// zone 2 / วิ่งเบา: ไม่มีนาฬิกาก็คุมได้ด้วยการทดสอบการพูด (talk test) — พูดเป็นประโยคได้สบายสัมพันธ์กับช่วงต่ำกว่า
// ventilatory threshold แรก (Foster 2008; Reed & Pipe 2014 review) ชีพจรใช้ประกอบเมื่อมีสายวัด (pure, tested)
// ชีพจรสูงสุดโดยประมาณ: Tanaka 2001 (208 − 0.7 × อายุ, meta-analysis 351 งาน) คลาดเคลื่อนรายคน ±10 ครั้ง/นาที

/** เตือนให้ลองพูดครั้งแรกนาทีที่ 10 แล้วทุก 10 นาที (เวลาวิ่งจริง ไม่รวมหยุด) ช่วงแรกชีพจรยังขึ้นไม่สุด เช็กเร็วไปจะหลอกว่ายังเบา */
export const TALK_FIRST = 600
export const TALK_EVERY = 600

/** ครั้งที่เท่าไรของการเตือน ณ เวลาวิ่งนี้ (0 = ยังไม่ถึงครั้งแรก) เตือนเมื่อค่านี้เพิ่มขึ้น */
export const talkCheckIndex = (elapsedSec: number) => (elapsedSec < TALK_FIRST ? 0 : Math.floor((elapsedSec - TALK_FIRST) / TALK_EVERY) + 1)

export const TALK_TEXT = 'ลองพูดประโยคยาว ๆ ดู ถ้าต้องหยุดหายใจกลางประโยค ให้ช้าลง'

/** ชีพจรสูงสุดโดยประมาณ (Tanaka 2001) */
export const tanakaMax = (age: number) => Math.round(208 - 0.7 * age)

/** โซนชีพจร 5 โซนแบบ % ชีพจรสูงสุด (แบบที่นาฬิกาส่วนใหญ่ใช้): ขอบล่างของโซน 1–5 */
export const ZONE_PCT = [0.5, 0.6, 0.7, 0.8, 0.9] as const

/** ช่วงชีพจรของแต่ละโซน [ต่ำ, สูง] */
export const zoneRanges = (max: number) => ZONE_PCT.map((p, i) => [Math.round(max * p), Math.round(max * (ZONE_PCT[i + 1] ?? 1))] as const)

/** อยู่โซนไหน (0 = ต่ำกว่าโซน 1) */
export function hrZone(bpm: number, max: number) {
  let z = 0
  ZONE_PCT.forEach((p, i) => { if (bpm >= max * p) z = i + 1 })
  return z
}

/** ชีพจรสูงสุดที่ใช้: ค่าที่ผู้ใช้ใส่ (วัดจริง) หรือ Tanaka จากอายุ */
export const hrMaxFor = (stored: number | null, age: number) => (stored && stored >= 120 && stored <= 230 ? stored : tanakaMax(age))
