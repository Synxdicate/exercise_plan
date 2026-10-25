import { describe, expect, it } from 'vitest'
import { isBarbell, platesPerSide, warmupSets } from '../plates'

describe('plate calculator', () => {
  it('60 กก. = 20 ต่อข้าง', () => expect(platesPerSide(60).plates).toEqual([20]))
  it('82.5 กก. = 25 + 5 + 1.25 ต่อข้าง', () => expect(platesPerSide(82.5)).toEqual({ plates: [25, 5, 1.25], actual: 82.5 }))
  it('ทำไม่ได้พอดี → ใกล้ที่สุดไม่เกิน', () => expect(platesPerSide(61).actual).toBe(60))
  it('เบากว่าบาร์ → ไม่มีแผ่น', () => expect(platesPerSide(15).plates).toEqual([]))
})

describe('warm-up sets', () => {
  it('80 กก.: บาร์ → 32.5 → 47.5 → 65', () => {
    expect(warmupSets(80)).toEqual([{ kg: 20, reps: 10 }, { kg: 32.5, reps: 5 }, { kg: 47.5, reps: 3 }, { kg: 65, reps: 2 }])
  })
  it('น้ำหนักเบา: ไม่ซ้ำและไม่เกินเซ็ตจริง', () => {
    const w = warmupSets(30)
    expect(w.every((s, i) => !i || s.kg > w[i - 1].kg)).toBe(true)
    expect(w.every(s => s.kg < 30)).toBe(true)
  })
  it('เฉพาะท่าบาร์เบล', () => {
    expect(isBarbell('Back Squat')).toBe(true)
    expect(isBarbell('Bulgarian Split Squat')).toBe(false)
  })
})
