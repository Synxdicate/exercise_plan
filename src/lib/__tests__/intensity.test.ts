import { describe, expect, it } from 'vitest'
import { intensitySplit } from '../intensity'
import type { Run } from '../log'

const run = (id: string, date: string, kind: Run['kind'], seconds: number, extra: Partial<Run> = {}): Run => ({ id, date, km: seconds / 420, seconds, kind, source: 'manual', ...extra })

// เส้นตรงไปทางเหนือ จุดละ 20 ม. เพซต่อกม. ตามที่กำหนดแต่ละช่วง
function route(segments: [number, number][]) {
  const pts: [number, number][] = [[16.4, 102.8]], times = [0]
  for (const [m, pace] of segments) for (let k = 0; k < m / 20; k++) {
    pts.push([pts.at(-1)![0] + 20 / 111_195, 102.8])
    times.push(times.at(-1)! + (pace * 20) / 1000)
  }
  return { route: pts, times }
}

describe('intensitySplit', () => {
  it('without a reliable 5K pace counts whole runs by kind', () => {
    const r = intensitySplit([run('a', '2026-11-02', 'easy', 2400), run('b', '2026-11-04', 'tempo', 1800), run('c', '2026-11-08', 'long', 2700),
      run('w', '2026-11-05', 'walk', 3000), run('old', '2026-09-01', 'interval', 3000)], '2026-11-10', null)!
    expect(r).toMatchObject({ easySec: 5100, hardSec: 1800, easyPct: 74, by: 'kind', runs: 3 })
  })
  it('with a 5K pace counts time in zones from the GPS track', () => {
    // 5K pace 5:00 → ช่วง 2 กม. เพซ 7:00 = E, ช่วง 1 กม. เพซ 5:10 = I/T (หนัก)
    const t = route([[2000, 420], [1000, 310]])
    const r = intensitySplit([run('a', '2026-11-08', 'easy', 1150, t)], '2026-11-10', 300)!
    expect(r.by).toBe('pace')
    expect(r.easyPct).toBeGreaterThan(65)
    expect(r.easyPct).toBeLessThan(80)
    expect(intensitySplit([], '2026-11-10', 300)).toBeNull()
  })
})
