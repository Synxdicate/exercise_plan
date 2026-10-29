// นักวิ่งเงา (ghost runner): วิ่งแข่งกับเวลาอ้างอิงที่บอกตรง ๆ ว่าเร็วแค่ไหน — ใช้เฉพาะวันทดสอบ 5K และวันแข่ง
// วันวิ่งเบาไม่มีเงา (ต้องเบาจริง) · เงาเร็วกว่าครั้งก่อนแค่ 1.5%: ท้าทายแต่ทำได้ (Locke & Latham 2002)
// ไม่หลอกความเร็วเงา — การหลอกให้ผลไม่คงอยู่และทำให้รู้สึกแย่ลง (Jones 2016) ต่างจากการแข่งกับตัวเองที่รู้ความเร็ว (Stone 2012)
import { raceKm, raceLabel, type RaceKey } from './goals'
import { formatDuration } from './log'

export const GHOST_EDGE = 0.985

export type Ghost = { km: number; seconds: number; label: string }

/** วิ่งทดสอบ 5K: เงา = 5K ที่ดีที่สุด (หรือเวลาคาดการณ์ถ้ายังไม่มี) เร็วขึ้น 1.5% */
export function trialGhost(best5k: number | null | undefined, predicted5k: number | null | undefined): Ghost | null {
  const base = best5k ?? predicted5k
  if (!base) return null
  const seconds = Math.round(base * GHOST_EDGE)
  return { km: 5, seconds, label: `${best5k ? '5K ที่ดีที่สุด' : '5K ที่คาดการณ์'} เร็วขึ้น 1.5% (${formatDuration(seconds)})` }
}

/** วันแข่ง: เงา = เวลาเป้าหมายที่ตั้งไว้ ไม่งั้นเวลาคาดการณ์ (ไม่บวกเพิ่ม — วันแข่งคุมเพซตามแผน) */
/** km = ระยะงานจริง (เช่น มินิ 11.55) — เวลาของระยะมาตรฐานปรับด้วย Riegel ให้เงาวิ่งครบระยะงาน */
export function raceGhost(key: RaceKey, goal: number | undefined, predicted: number | null | undefined, km = raceKm[key]): Ghost | null {
  const base = goal ?? (predicted ? Math.round(predicted) : null)
  if (!base) return null
  const seconds = km === raceKm[key] ? base : Math.round(base * (km / raceKm[key]) ** 1.07)
  const name = km === raceKm[key] ? raceLabel[key] : `${km} กม.`
  return { km, seconds, label: `${goal ? 'เป้าหมาย' : 'คาดการณ์'} ${name} ${formatDuration(seconds)}` }
}

/** วินาทีที่นำ (+) หรือตามหลัง (−) เงาที่วิ่งเพซคงที่ เมื่อวิ่งได้ m เมตรในเวลา sec วินาที */
export const ghostLead = (g: Ghost, m: number, sec: number) => (g.seconds * m) / (g.km * 1000) - sec

/** ระยะของเงา ณ เวลา sec (เมตร ไม่เกินระยะทั้งหมด) */
export const ghostMeters = (g: Ghost, sec: number) => Math.min(g.km * 1000, (sec / g.seconds) * g.km * 1000)

export function ghostText(lead: number) {
  const s = Math.round(Math.abs(lead))
  return s < 2 ? 'วิ่งเคียงเงา' : lead > 0 ? `นำเงา ${s} วินาที` : `ตามหลังเงา ${s} วินาที`
}
