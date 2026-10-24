import { describe, expect, it } from 'vitest'
import { clearance } from '../screening'
import { heatLevel, wbgtApprox, wetBulb, bestHour, type Hour } from '../weather'
import { comeback } from '../detraining'

const s = (o: Partial<Parameters<typeof clearance>[0]>) => ({ exercising: true, disease: false, symptoms: false, joint: false, ...o })

describe('คัดกรองสุขภาพ (ACSM 2015)', () => {
  it('มีอาการ → พบแพทย์เสมอ', () => expect(clearance(s({ symptoms: true }))).toBe('see-doctor'))
  it('มีโรคแต่ยังไม่ออกกำลังกาย → พบแพทย์ก่อน', () => expect(clearance(s({ disease: true, exercising: false }))).toBe('see-doctor'))
  it('มีโรค ออกกำลังกายอยู่ ไม่มีอาการ → ปานกลางได้', () => expect(clearance(s({ disease: true }))).toBe('moderate-only'))
  it('ไม่มีโรค/อาการ → เริ่มได้ (แม้ยังไม่เคยออกกำลังกาย)', () => expect(clearance(s({ exercising: false }))).toBe('clear'))
  it('ปัญหาข้อไม่ได้ห้ามออกกำลังกาย', () => expect(clearance(s({ joint: true }))).toBe('clear'))
})

describe('ความร้อน', () => {
  it('wet-bulb ตามตารางไซโครเมตริก: 20°C RH 50% ≈ 13.7°C (Stull 2011)', () => {
    expect(wetBulb(20, 50)).toBeCloseTo(13.7, 0)
  })
  it('WBGT ในที่ร่ม: เช้าในกรุงเทพฯ 26°C ชื้น 90% ≈ 25', () => {
    expect(wbgtApprox(26, 90)).toBeGreaterThan(24.5)
    expect(wbgtApprox(26, 90)).toBeLessThan(26)
  })
  it('ชื้นมากขึ้น = ร้อนขึ้น', () => expect(wbgtApprox(30, 80)).toBeGreaterThan(wbgtApprox(30, 40)))
  it.each([[20, 'ok'], [25, 'warm'], [29, 'hot'], [32, 'danger']] as const)('WBGT %d → %s', (w, l) => expect(heatLevel(w)).toBe(l))
  it('เลือกชั่วโมงที่เย็นที่สุดจากนี้ไป ในช่วง 05–21 น.', () => {
    const h = (time: string, wbgt: number): Hour => ({ time, hour: +time.slice(11, 13), temp: 0, rh: 0, wbgt })
    const hours = [h('2026-10-25T03:00', 20), h('2026-10-25T06:00', 26), h('2026-10-25T12:00', 31), h('2026-10-25T19:00', 27)]
    expect(bestHour(hours, '2026-10-25T05:00')?.hour).toBe(6)
    expect(bestHour(hours, '2026-10-25T10:00')?.hour).toBe(19)
  })
})

describe('กลับมาหลังหยุดฝึก (Mujika & Padilla 2000)', () => {
  it('หยุดไม่ถึงสัปดาห์ → ไม่ต้องปรับ', () => expect(comeback(['2026-10-20'], '2026-10-25')).toBeNull())
  it('ยังไม่เคยฝึก → ไม่เตือน', () => expect(comeback([], '2026-10-25')).toBeNull())
  it('8–14 วัน → เบาลง ไม่ย้อน', () => expect(comeback(['2026-10-15'], '2026-10-25')?.weeksBack).toBe(0))
  it('15–28 วัน → ย้อน 1 สัปดาห์', () => expect(comeback(['2026-10-01'], '2026-10-25')?.weeksBack).toBe(1))
  it('เกิน 4 สัปดาห์ → ย้อน 2 สัปดาห์', () => expect(comeback(['2026-09-01', '2026-08-01'], '2026-10-25')?.weeksBack).toBe(2))
})
