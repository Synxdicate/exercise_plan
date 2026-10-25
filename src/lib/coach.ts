// โค้ชเสียงคุมเพซ: เตือนเมื่อเพซหลุดช่วงเป้า "ต่อเนื่อง" สักพัก (ไม่ใช่ทุกครั้งที่ GPS แกว่ง) แล้วเว้นช่วงก่อนเตือนซ้ำ
// - วิ่งเบา/วิ่งยาว/ช่วงพัก: เตือนเฉพาะ "เร็วเกิน" (มือใหม่มักวิ่งเบาเร็วเกิน → ล้าสะสม; ช้าไม่เป็นไร)
// - ช่วงเร็วของชุดซ้อม: เตือนทั้งเร็วและช้ากว่าเป้า
// โมดูลล้วน ทดสอบได้ (coach.test ใน misc.test.ts)

export type Band = { min: number; max: number } // วินาที/กม. — min = เร็วสุดที่ยอมรับ, max = ช้าสุด
export type Cue = 'fast' | 'slow'

export class PaceCoach {
  private outSince: number | null = null
  private outKind: Cue | null = null
  private lastCue = -Infinity
  private readonly cooldownMs: number
  constructor(cooldownMs = 150_000) {
    this.cooldownMs = cooldownMs
  }

  /** pace = เพซปัจจุบัน (null ถ้ายังไม่มี/หยุดอยู่), dwellMs = ต้องหลุดช่วงนานแค่ไหนถึงเตือน */
  update(now: number, pace: number | null, band: Band | null, dwellMs = 45_000): Cue | null {
    const kind: Cue | null = !band || pace == null ? null : pace < band.min ? 'fast' : pace > band.max ? 'slow' : null
    if (kind !== this.outKind) {
      this.outKind = kind
      this.outSince = kind ? now : null
      return null
    }
    if (!kind || this.outSince === null) return null
    if (now - this.outSince < dwellMs || now - this.lastCue < this.cooldownMs) return null
    this.lastCue = now
    this.outSince = now // ยังหลุดอยู่ → นับใหม่ เตือนอีกครั้งหลังพ้น cooldown
    return kind
  }

  reset() {
    this.outSince = null
    this.outKind = null
  }
}

/** ช่วงเพซวิ่งเบา: ยอมเร็วกว่าขอบล่างของโซน E ได้ 3% (กันเตือนจุกจิก) */
export const easyBand = (easyFastest: number): Band => ({ min: easyFastest * 0.97, max: Infinity })
/** ช่วงเพซของช่วงเร็ว: เป้า −5% ถึง +6% */
export const workBand = (target: number): Band => ({ min: target * 0.95, max: target * 1.06 })

export const cueText = (cue: Cue, work: boolean) =>
  work ? (cue === 'fast' ? 'เร็วกว่าเป้า ผ่อนลงนิดนึง' : 'ช้ากว่าเป้า เร่งอีกนิด')
    : 'เร็วไปนิด ช้าลงหน่อย วิ่งเบาต้องพูดเป็นประโยคได้'
