import { describe, expect, it } from 'vitest'
import { bestEffort, paceSeries, personalBests, splitAnalysis, trainingLoad, formLabel } from '../analysis'
import type { Point } from '../geo'
import type { Run } from '../log'

// เส้นตรงขึ้นเหนือ จุดละ ~100 ม. (0.0009° lat) — paceFn คืนวินาทีต่อจุด
function track(n: number, secPerPoint: (i: number) => number) {
  const route: Point[] = []
  const times: number[] = []
  let t = 0
  for (let i = 0; i < n; i++) {
    route.push([13.7 + i * 0.0009, 100.5])
    if (i) t += secPerPoint(i)
    times.push(t)
  }
  return { route, times }
}

describe('pace analysis', () => {
  it('เพซคงที่ 30 วิ/100 ม. ≈ 5:00/กม.', () => {
    const { route, times } = track(60, () => 30)
    const s = paceSeries(route, times)
    expect(s.length).toBeGreaterThan(40)
    for (const p of s) {
      expect(p.pace).toBeGreaterThan(290)
      expect(p.pace).toBeLessThan(310)
    }
  })
  it('ตัดจุด GPS กระโดดที่เร็วเกินมนุษย์', () => {
    const { route, times } = track(60, i => (i === 30 ? 1 : 30))
    expect(paceSeries(route, times).every(p => p.pace >= 150)).toBe(true)
  })
})

describe('best efforts', () => {
  it('หาช่วง 1 กม. ที่เร็วที่สุดกลางการวิ่ง', () => {
    // 3 กม.: กม.แรก 6:00, กม.กลาง 4:30, กม.สุดท้าย 6:00
    const { route, times } = track(34, i => (i > 11 && i <= 22 ? 27 : 36))
    const t = bestEffort(route, times, 1)!
    expect(t).toBeGreaterThan(260)
    expect(t).toBeLessThan(285)
  })
  it('วิ่งไม่ถึงระยะ → ไม่มีสถิติ', () => {
    const { route, times } = track(20, () => 30)
    expect(bestEffort(route, times, 5)).toBeNull()
  })
  it('การวิ่งที่กรอกเองนับเฉพาะระยะที่ตรง (±2%)', () => {
    const r = (km: number, seconds: number): Run => ({ id: String(km), date: '2026-10-01', km, seconds, kind: 'easy', source: 'manual' })
    const pb = personalBests([r(5.05, 1500), r(7, 2000)])
    expect(pb.find(p => p.label === '5K')!.best!.seconds).toBe(Math.round((1500 * 5) / 5.05))
    expect(pb.find(p => p.label === '10K')!.best).toBeNull()
  })
})

describe('split analysis', () => {
  it('negative split', () => expect(splitAnalysis([330, 320, 310, 300])!.kind).toBe('negative'))
  it('positive split', () => expect(splitAnalysis([300, 305, 330, 340])!.kind).toBe('positive'))
  it('even + CV ต่ำ', () => {
    const a = splitAnalysis([300, 301, 299, 300])!
    expect(a.kind).toBe('even')
    expect(a.cv).toBeLessThan(1)
  })
})

describe('training load (session-RPE + EWMA)', () => {
  const run = (date: string, minutes: number, rpe?: number): Run => ({ id: date, date, km: 5, seconds: minutes * 60, kind: 'easy', source: 'manual', rpe })
  it('ภาระ = RPE × นาที', () => {
    const d = trainingLoad([run('2026-10-01', 30, 5)], [], '2026-10-01')
    expect(d.at(-1)!.load).toBe(150)
  })
  it('ฝึกต่อเนื่อง → ฟิตขึ้น, หยุด → ล้าลดเร็วกว่าฟิต', () => {
    const runs = Array.from({ length: 28 }, (_, i) => run(`2026-09-${String(i + 1).padStart(2, '0')}`, 40, 5))
    const d = trainingLoad(runs, [], '2026-10-12')
    const atStop = d.find(x => x.date === '2026-09-28')!
    const later = d.at(-1)!
    expect(atStop.fitness).toBeGreaterThan(50)
    expect(later.fatigue / atStop.fatigue).toBeLessThan(later.fitness / atStop.fitness)
    expect(later.form).toBeGreaterThan(0) // พักแล้วฟอร์มกลับเป็นบวก (แนวคิด taper)
  })
  it('ไม่มีข้อมูล → ไม่มีกราฟ', () => expect(trainingLoad([], [], '2026-10-01')).toEqual([]))
  it('ฝึกสม่ำเสมอเท่าเดิม → ฟอร์มไม่ติดลบเกินจริงช่วงแรก', () => {
    const runs = Array.from({ length: 21 }, (_, i) => run(`2026-09-${String(i + 1).padStart(2, '0')}`, 40, 5))
    const d = trainingLoad(runs, [], '2026-09-21')
    expect(Math.abs(d.at(-1)!.form) / d.at(-1)!.fitness).toBeLessThan(0.3)
  })
  it('ข้อมูลไม่ถึง 4 สัปดาห์ → ยังไม่ตัดสินฟอร์ม', () => expect(formLabel(-50, 100, 20).label).toBe('เริ่มต้น'))
  it('ป้ายฟอร์ม', () => {
    expect(formLabel(20, 100).label).toBe('สดชื่น')
    expect(formLabel(-40, 100).label).toBe('ล้าสะสมมาก')
  })
})
