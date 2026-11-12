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

describe('heatmap route thinning', () => {
  it('drops points closer than the gap but keeps both ends and the shape', async () => {
    const { thinRoute, haversine } = await import('../geo')
    // 5 กม. ทางตรง จุดทุก ~10 ม.
    const r: [number, number][] = Array.from({ length: 501 }, (_, i) => [16.44 + i * 0.00009, 102.83])
    const t = thinRoute(r)
    expect(t[0]).toBe(r[0])
    expect(t.at(-1)).toBe(r.at(-1))
    expect(t.length).toBeLessThan(r.length / 3)
    for (let i = 1; i < t.length - 1; i++) expect(haversine(t[i - 1], t[i])).toBeGreaterThanOrEqual(40)
    expect(thinRoute(r.slice(0, 2))).toHaveLength(2)
  })
})
