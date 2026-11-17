import { addDays } from './date'
import { CALF_OK, type LegTest } from './legTests'
import { GUARD_AREAS } from './painPlan'
import type { Readiness } from './readiness'
import type { TendonLog } from './tendon'

// กระโดดเชือกแทน Pogo Jumps: ฝึกแบบเดียวกัน (เด้งด้วยข้อเท้า แตะพื้นสั้น) วิ่ง 3 กม.เร็วขึ้นหลัง 10 สัปดาห์ (García-Pinillos 2020)
// แต่ลงแรงที่เอ็นร้อยหวายมาก จึงเสนอเมื่อพร้อมเท่านั้น: เขย่งขาเดียว ≥25 ครั้งทั้งสองข้าง (Lunsford & Perry 1995)
// และไม่มีอาการเจ็บขาใน 7 วัน (แบบเช็กความพร้อมหรือเช็กขาตอนเช้าที่ไม่ใช่ 0) (pure, tested)
export type RopeReady = { ready: true } | { ready: false; why: 'test' | 'calf' | 'pain' }

export function ropeReady(tests: LegTest[], readiness: Record<string, Readiness>, tendon: TendonLog, today: string): RopeReady {
  const from = addDays(today, -6)
  const pain = Object.entries(readiness).some(([d, r]) => d >= from && d <= today && r.pain && r.areas?.some(a => GUARD_AREAS.includes(a)))
    || Object.entries(tendon).some(([d, s]) => d >= from && d <= today && s > 0)
  if (pain) return { ready: false, why: 'pain' }
  const last = [...tests].filter(t => t.calfL && t.calfR).sort((a, b) => a.date.localeCompare(b.date)).at(-1)
  if (!last) return { ready: false, why: 'test' }
  return Math.min(last.calfL!, last.calfR!) >= CALF_OK ? { ready: true } : { ready: false, why: 'calf' }
}
