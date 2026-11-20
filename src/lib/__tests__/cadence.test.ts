import { describe, expect, it } from 'vitest'
import { cadenceFrom, cadenceOf, cadenceTarget, latestCadence, spmFromCount, stepTimes, type Sample } from '../cadence'

/** สัญญาณวิ่งจำลอง: ยอดแหลมทุกก้าว + สัญญาณรบกวน ที่ 50 Hz */
function run(spm: number, sec = 30, noise = 0.6, seed = 1): Sample[] {
  let x = seed
  const rnd = () => { x = (x * 16807) % 2147483647; return x / 2147483647 - 0.5 }
  const period = 60000 / spm
  const out: Sample[] = []
  for (let t = 0; t < sec * 1000; t += 20) {
    const ph = (t % period) / period
    const impact = Math.exp(-((ph - 0.1) ** 2) / 0.004) * 14
    out.push({ t, m: 9.8 + impact - 3 + rnd() * noise * 2 })
  }
  return out
}

describe('cadence', () => {
  it('measures simulated running within 2 spm', () => {
    for (const spm of [150, 164, 172, 186]) {
      const got = cadenceOf(run(spm))!
      expect(Math.abs(got - spm)).toBeLessThanOrEqual(2)
    }
  })
  it('returns null when standing still', () => {
    const still = Array.from({ length: 1500 }, (_, i) => ({ t: i * 20, m: 9.8 + (i % 3) * 0.05 }))
    expect(stepTimes(still)).toEqual([])
    expect(cadenceOf(still)).toBeNull()
  })
  it('tolerates a missed step via median gap', () => {
    const times = Array.from({ length: 40 }, (_, i) => i * 375).filter(t => t !== 3750)
    expect(cadenceFrom(times)).toBe(160)
  })
  it('rejects out-of-range values', () => {
    expect(cadenceFrom(Array.from({ length: 30 }, (_, i) => i * 600))).toBeNull()
  })
  it('targets +5%, even, capped at 190 and never lower', () => {
    expect(cadenceTarget(160)).toBe(168)
    expect(cadenceTarget(185)).toBe(190)
    expect(cadenceTarget(195)).toBe(195)
    expect(cadenceTarget(160) % 2).toBe(0)
  })
  it('counts one foot ×4', () => expect(spmFromCount(41)).toBe(164))
  it('latest check within 90 days', () => {
    const log = [
      { id: 'a', date: '2026-01-01', spm: 150, how: 'count' as const },
      { id: 'b', date: '2026-11-10', spm: 162, how: 'sensor' as const },
      { id: 'c', date: '2026-11-25', spm: 170, how: 'sensor' as const },
    ]
    expect(latestCadence(log, '2026-11-21')?.spm).toBe(162)
    expect(latestCadence(log.slice(0, 1), '2026-11-21')).toBeNull()
  })
})
