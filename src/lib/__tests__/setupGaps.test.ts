import { describe, expect, it } from 'vitest'
import { setupGaps, zeroKgLifts, type GapInput } from '../setupGaps'

const T = '2026-11-13'
const run = (date: string, kind: 'easy' | 'walk' = 'easy') => ({ date, kind })
const base: GapInput = { today: T, race: { active: false, kmSet: false, cutoffSet: false, course: false }, runs: [], sessions: [], shoes: [], sweatTests: 0, legTests: [] }
const ids = (i: Partial<GapInput>) => setupGaps({ ...base, ...i }).map(g => g.id)
const gym = (date: string, name: string, kg: number) => ({ date, mode: 'gym' as const, dayKey: 'upperA', entries: [{ name, sets: [{ kg, reps: 8 }] }] })

describe('setupGaps', () => {
  it('ไม่มีข้อมูลเลย ไม่มีงานแข่ง: ไม่เตือนอะไร', () => {
    expect(ids({})).toEqual([])
  })
  it('งานแข่ง: เตือนระยะ/เวลาตัด ทดสอบเหงื่อ และเส้นทาง ทีละอย่างจนครบ', () => {
    expect(ids({ race: { active: true, kmSet: false, cutoffSet: true, course: false } })).toEqual(['race', 'sweat', 'course'])
    expect(ids({ race: { active: true, kmSet: true, cutoffSet: true, course: true }, sweatTests: 1 })).toEqual([])
  })
  it('รองเท้าและทดสอบขา: นับแต่การวิ่ง ไม่นับเดิน', () => {
    const walks = Array.from({ length: 6 }, (_, i) => run(`2026-11-0${i + 1}`, 'walk'))
    expect(ids({ runs: walks })).toEqual([])
    const runs = Array.from({ length: 5 }, (_, i) => run(`2026-11-0${i + 1}`))
    expect(ids({ runs })).toEqual(['legTest', 'shoes'])
    expect(ids({ runs, shoes: [{ retired: true }] })).toContain('shoes')
    expect(ids({ runs, shoes: [{}], legTests: [{ date: '2026-10-01' }] })).toEqual([])
    expect(ids({ runs, shoes: [{}], legTests: [{ date: '2026-09-01' }] })).toEqual(['legTest'])
  })
  it('น้ำหนักเวท 0: เฉพาะท่าที่ใช้น้ำหนัก ล่าสุดยังเป็น 0 ใน 28 วัน', () => {
    const s = [gym('2026-11-01', 'Barbell Back Squat', 0), gym('2026-11-03', 'Pull-up', 0), gym('2026-11-05', 'Bench Press', 0), gym('2026-11-08', 'Bench Press', 40), gym('2026-09-01', 'Lat Pulldown', 0)]
    expect(zeroKgLifts(s, T)).toEqual(['Barbell Back Squat'])
    expect(setupGaps({ ...base, sessions: s })).toEqual([{ id: 'kg', names: ['Barbell Back Squat'] }])
    expect(zeroKgLifts([{ ...gym('2026-11-01', 'Barbell Back Squat', 0), mode: 'park' }], T)).toEqual([])
  })
})
