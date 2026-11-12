import { describe, expect, it } from 'vitest'
import { mostRepeatedRoute } from '../goals'

describe('route matching scales with a year of runs', () => {
  it('mostRepeatedRoute over 150 GPS runs stays fast (was quadratic resampling: ~13M distance calls)', () => {
    const runs = Array.from({ length: 150 }, (_, i) => {
      const route: [number, number][] = Array.from({ length: 301 }, (_, k) => {
        const a = (k / 300) * Math.PI * 2
        return [16.4419 + 0.004 * Math.sin(a), 102.8359 + 0.006 * Math.cos(a)]
      })
      return { id: `r${i}`, km: 5, date: '2026-01-01', kind: 'easy' as const, source: 'gps' as const, seconds: 1800, splits: [], route }
    })
    const t = performance.now()
    expect(mostRepeatedRoute(runs)).toBe(150)
    const ms = performance.now() - t
    expect(ms).toBeLessThan(250)
  })
})
