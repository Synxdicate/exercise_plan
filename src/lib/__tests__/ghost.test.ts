import { describe, expect, it } from 'vitest'
import { ghostLead, ghostMeters, ghostText, raceGhost, trialGhost } from '../ghost'

describe('นักวิ่งเงา', () => {
  it('ทดสอบ 5K: เร็วกว่า 5K ที่ดีที่สุด 1.5% และใช้คาดการณ์เมื่อยังไม่มี', () => {
    expect(trialGhost(1500, 1400)?.seconds).toBe(1478)
    expect(trialGhost(null, 1400)?.seconds).toBe(1379)
    expect(trialGhost(null, null)).toBeNull()
  })
  it('วันแข่ง: ใช้เป้าหมายก่อนคาดการณ์ ไม่บวกเพิ่ม', () => {
    expect(raceGhost('tenK', 3000, 3200)?.seconds).toBe(3000)
    expect(raceGhost('tenK', undefined, 3200.4)?.seconds).toBe(3200)
    expect(raceGhost('tenK', undefined, null)).toBeNull()
  })
  it('นำ/ตามหลังเงาที่วิ่งเพซคงที่', () => {
    const g = { km: 5, seconds: 1500, label: '' } // 5:00/กม.
    expect(ghostLead(g, 1000, 290)).toBe(10)
    expect(ghostLead(g, 1000, 305)).toBe(-5)
    expect(ghostMeters(g, 150)).toBe(500)
    expect(ghostMeters(g, 9999)).toBe(5000)
    expect(ghostText(10)).toBe('นำเงา 10 วินาที')
    expect(ghostText(-5.4)).toBe('ตามหลังเงา 5 วินาที')
    expect(ghostText(1)).toBe('วิ่งเคียงเงา')
  })
})
