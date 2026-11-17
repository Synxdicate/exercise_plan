import { describe, expect, it } from 'vitest'
import { ropeReady } from '../jumpRope'

const test = (date: string, calfL: number, calfR: number) => ({ id: date, date, calfL, calfR })

describe('jump rope readiness', () => {
  it('needs a calf-raise test with ≥25 on both legs and no leg pain in 7 days', () => {
    expect(ropeReady([], {}, {}, '2026-11-30')).toEqual({ ready: false, why: 'test' })
    expect(ropeReady([test('2026-11-20', 25, 22)], {}, {}, '2026-11-30')).toEqual({ ready: false, why: 'calf' })
    // ใช้ผลทดสอบล่าสุด
    expect(ropeReady([test('2026-11-20', 25, 22), test('2026-11-28', 27, 26)], {}, {}, '2026-11-30')).toEqual({ ready: true })
    const pass = [test('2026-11-28', 27, 26)]
    expect(ropeReady(pass, { '2026-11-25': { sleep: 0, sore: 0, pain: true, areas: ['knee'] } }, {}, '2026-11-30')).toEqual({ ready: false, why: 'pain' })
    expect(ropeReady(pass, { '2026-11-22': { sleep: 0, sore: 0, pain: true, areas: ['knee'] } }, {}, '2026-11-30')).toEqual({ ready: true })
    expect(ropeReady(pass, { '2026-11-29': { sleep: 0, sore: 0, pain: true, areas: ['back'] } }, {}, '2026-11-30')).toEqual({ ready: true })
    expect(ropeReady(pass, {}, { '2026-11-29': 1 }, '2026-11-30')).toEqual({ ready: false, why: 'pain' })
    expect(ropeReady(pass, {}, { '2026-11-29': 0 }, '2026-11-30')).toEqual({ ready: true })
  })
})
