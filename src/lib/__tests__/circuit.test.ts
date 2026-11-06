import { describe, expect, it } from 'vitest'
import { buildCircuit, circuitTotal } from '../circuit'


describe('pre-run drills', () => {
  it('uses each drill’s own duration and has a line drawing for every drill', async () => {
    const { easyDrills, qualityDrills, DRILL_REST } = await import('../../data/drills')
    const { stickDemos } = await import('../../data/stickDemos')
    const steps = buildCircuit(qualityDrills, 45, DRILL_REST, 1)
    expect(steps.filter(s => s.kind === 'work').map(s => s.sec)).toEqual(qualityDrills.map(d => d.sec))
    expect(circuitTotal(buildCircuit(easyDrills, 45, DRILL_REST, 1))).toBeLessThanOrEqual(6 * 60) // ชุดสั้น (Yamaguchi 2019)
    for (const d of qualityDrills) expect(stickDemos[d.name], d.name).toBeDefined()
    // ท่าแรงกระแทกสูงอยู่เฉพาะชุดก่อนวิ่งเร็ว
    expect(easyDrills.some(d => d.name === 'Straight-Leg Bound')).toBe(false)
  })
})
