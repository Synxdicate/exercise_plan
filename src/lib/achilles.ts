import { addDays } from './date'
import { CALF_OK, type LegTest } from './legTests'
import type { Readiness } from './readiness'
import { tendonStatus, TENDON_LIMIT, type TendonLog } from './tendon'

// โปรแกรมคืนสภาพเอ็นร้อยหวาย: แผนถนอมขาแค่ตัดของหนักออก แต่เอ็นต้องได้รับแรงเพิ่มทีละขั้นถึงจะแข็งแรงขึ้น (JOSPT CPG 2024: การฝึกรับน้ำหนักเป็นการรักษาหลัก)
// ลำดับขั้นตามแรงที่เอ็นรับ จาก ~0.5 เท่าน้ำหนักตัว (เขย่งนั่ง) ถึง 7.3 เท่า (กระโดดขาเดียว) (Baxter 2021):
// เขย่งค้าง → เขย่งสองขาช้า → เขย่งขาเดียวช้า → เขย่งขาเดียวถือน้ำหนัก (heavy slow resistance, Beyer 2015) → กระโดดเขย่ง
// ขยับขั้นด้วย pain-monitoring (Silbernagel 2007): ระหว่างทำปวดไม่เกิน 3/10 และเช้าวันรุ่งขึ้นไม่แย่ลง (งานวิจัยใช้ 5/10 แอปใช้ค่าที่เข้มกว่า)
// ขั้นกระโดดต้องผ่านทดสอบเขย่งขาเดียว ≥25 ครั้งทั้งสองข้างก่อน (Lunsford & Perry 1995) (pure, tested)

export type RehabSession = { date: string; stage: number; pain: number }
/** synced key `achillesRehab` */
export type Rehab = { start: string; stage: number; stageStart: string; sessions: RehabSession[]; off?: string; done?: string }

export type Stage = { name: string; th: string; dose: string; doseEn: string; how: string; howEn: string; video: string }

export const STAGES: Stage[] = [
  { name: 'Isometric Calf Hold', th: 'เขย่งค้างสองขา', dose: '5 × ค้าง 30–45 วิ พัก 1 นาที', doseEn: '5 × 30–45 s holds, 1 min rest',
    how: 'ยืนจับผนัง เขย่งขึ้นครึ่งทางแล้วค้างไว้ เกร็งน่องแรงพอสมควร ไม่ต้องสุด ช่วยลดปวดและเริ่มให้เอ็นรับแรง', howEn: 'Hold a wall, rise halfway and hold. Firm but not maximal; it eases pain and starts loading the tendon.', video: 'isometric calf raise hold achilles' },
  { name: 'Double-leg Heel Raise (slow)', th: 'เขย่งสองขาช้า ๆ', dose: '3 × 15 ขึ้น 3 วิ ลง 3 วิ', doseEn: '3 × 15, 3 s up, 3 s down',
    how: 'ยืนบนพื้นราบหรือขอบบันได ขึ้นสุดช้า ๆ ลงช้า ๆ ครึ่งหลังของแต่ละเซ็ตงอเข่าเล็กน้อยเพื่อฝึกน่องส่วนลึก (soleus)', howEn: 'Flat floor or a step edge, slowly all the way up and down. Bend the knees slightly for the second half of each set to work the deep calf (soleus).', video: 'slow double leg heel raise' },
  { name: 'Single-leg Heel Raise (slow)', th: 'เขย่งขาเดียวช้า ๆ', dose: '3 × 15 / ข้าง ขึ้น 3 วิ ลง 3 วิ', doseEn: '3 × 15 / side, 3 s up, 3 s down',
    how: 'ขาเดียว แตะผนังแค่ทรงตัว ทำข้างที่ไม่เจ็บก่อน ทำได้ไม่ครบ 15 ให้ใช้สองขาขึ้น ขาเดียวลง', howEn: 'One leg, fingertips on a wall for balance, good side first. Can’t get 15? Up on two, down on one.', video: 'single leg heel raise slow' },
  { name: 'Weighted Single-leg Heel Raise', th: 'เขย่งขาเดียวถือน้ำหนัก', dose: '3 × 8–12 / ข้าง ขึ้น 3 วิ ลง 3 วิ', doseEn: '3 × 8–12 / side, 3 s up, 3 s down',
    how: 'สะพายเป้ใส่ขวดน้ำหรือถือดัมเบล หนักพอให้ครั้งสุดท้ายยาก ทำบนขอบบันไดให้ส้นลงต่ำกว่าขั้น ทำวันเว้นวัน', howEn: 'Backpack with water bottles or a dumbbell, heavy enough that the last rep is hard. On a step edge so the heel drops below it. Every other day.', video: 'weighted single leg calf raise step' },
  { name: 'Pogo Hops', th: 'กระโดดเขย่งเบา ๆ', dose: '3 × 20 สองขา แล้ว 2 × 10 / ข้าง ขาเดียว', doseEn: '3 × 20 on both feet, then 2 × 10 / side on one',
    how: 'กระโดดเบา ๆ ด้วยข้อเท้า เข่าเกือบตรง แตะพื้นสั้น ๆ ไม่ต้องสูง เริ่มสองขาก่อน เช้าวันรุ่งขึ้นไม่แย่ลงค่อยเพิ่มขาเดียว', howEn: 'Small quick hops off the ankles, knees nearly straight, short contacts, not high. Both feet first; add single-leg once the next morning isn’t worse.', video: 'pogo hops achilles rehab' },
]
export const LAST = STAGES.length - 1
/** ทำครบกี่ครั้งในขั้นหนึ่ง และอยู่ขั้นนั้นอย่างน้อยกี่วัน ก่อนขยับ */
export const STAGE_SESSIONS = 3
export const STAGE_DAYS = 6
/** บันทึกปวดเอ็นร้อยหวาย/น่องกี่ครั้งใน 28 วัน ถึงเสนอโปรแกรม */
const TRIGGER = 2
const WATCH = 28

/** ควรเสนอโปรแกรม: ปวดเอ็นร้อยหวาย/น่องซ้ำ (≥2 วันใน 28 วัน) หรือเช็กขาตอนเช้าเกิน 3/10 */
export function rehabDue(readiness: Record<string, Readiness>, tendon: TendonLog, today: string) {
  const from = addDays(today, -(WATCH - 1))
  const days = Object.entries(readiness).filter(([d, r]) => d >= from && d <= today && r.pain && r.areas?.some(a => a === 'achilles' || a === 'calf'))
  return days.length >= TRIGGER || Object.entries(tendon).some(([d, s]) => d >= from && d <= today && s > TENDON_LIMIT)
}

export const startRehab = (today: string): Rehab => ({ start: today, stage: 0, stageStart: today, sessions: [] })

/** โปรแกรมยังทำอยู่ (ยังไม่จบขั้นสุดท้าย ไม่ได้ปิด) → แผนยังงดท่ากระโดด */
export const rehabActive = (r: Rehab | null | undefined) => !!r && !r.off && !r.done

export type RehabNext =
  | { kind: 'up' }
  | { kind: 'stay'; left: number; days: number }
  | { kind: 'back' }
  | { kind: 'test' }
  | { kind: 'finish' }

const inStage = (r: Rehab) => r.sessions.filter(s => s.stage === r.stage && s.date >= r.stageStart)

/** เช้าหลังทำครั้งใดในขั้นนี้แย่ลงหรือเกิน 3/10 → ถอยหนึ่งขั้น นับใหม่ตั้งแต่วันนี้ (ใช้ทั้งตอนแสดงและก่อนบันทึก) */
export function settle(r: Rehab, tendon: TendonLog, today: string): Rehab & { backed?: boolean } {
  const bad = inStage(r).some(s => { const m = tendonStatus(tendon, addDays(s.date, 1)); return !!m && (m.level === 'high' || m.level === 'worse') })
  return bad ? { ...r, stage: Math.max(0, r.stage - 1), stageStart: today, backed: true } : r
}

/** หลังบันทึก: ปวดระหว่างทำเกิน 3/10 → ถอย; ทำครบ 3 ครั้งในขั้นและผ่านมา ≥6 วัน → ขึ้นขั้น (ขั้นกระโดดต้องผ่านทดสอบเขย่งก่อน) */
export function rehabNext(r: Rehab, tests: LegTest[], today: string): RehabNext {
  const done = inStage(r)
  if (done.at(-1) && done.at(-1)!.pain > TENDON_LIMIT) return { kind: 'back' }
  const days = Math.round((Date.parse(today) - Date.parse(r.stageStart)) / 864e5)
  if (done.length < STAGE_SESSIONS || days < STAGE_DAYS) return { kind: 'stay', left: Math.max(0, STAGE_SESSIONS - done.length), days: Math.max(0, STAGE_DAYS - days) }
  if (r.stage === LAST) return { kind: 'finish' }
  if (r.stage + 1 === LAST) {
    const t = [...tests].filter(x => x.calfL && x.calfR).sort((a, b) => a.date.localeCompare(b.date)).at(-1)
    if (!t || Math.min(t.calfL!, t.calfR!) < CALF_OK) return { kind: 'test' }
  }
  return { kind: 'up' }
}

/** บันทึกหนึ่งครั้ง (pain = ปวดระหว่างทำ 0–10) แล้วขยับขั้นตามกฎ คืนค่าใหม่ ไม่แก้ของเดิม */
export function logRehab(r0: Rehab, pain: number, tendon: TendonLog, tests: LegTest[], today: string): Rehab {
  const { backed: _, ...r } = settle(r0, tendon, today)
  const next: Rehab = { ...r, sessions: [...r.sessions.filter(s => s.date !== today), { date: today, stage: r.stage, pain }] }
  const n = rehabNext(next, tests, today)
  if (n.kind === 'back') return { ...next, stage: Math.max(0, r.stage - 1), stageStart: addDays(today, 1) }
  if (n.kind === 'up') return { ...next, stage: r.stage + 1, stageStart: addDays(today, 1) }
  if (n.kind === 'finish') return { ...next, done: today }
  return next
}

/** ทำวันเว้นวัน (เอ็นต้องการเวลาฟื้นระหว่างครั้ง, Beyer 2015 ทำ 3 ครั้ง/สัปดาห์): เมื่อวานทำแล้ว วันนี้พัก */
export const rehabToday = (r: Rehab, today: string) => !r.sessions.some(s => s.date === addDays(today, -1)) && !r.sessions.some(s => s.date === today)
