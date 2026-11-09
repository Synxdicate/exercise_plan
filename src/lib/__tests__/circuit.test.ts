import { describe, expect, it } from 'vitest'
import { strengthOnly } from '../sessionKind'
import { BADGES, periodStats } from '../goals'
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

describe('circuits are not strength workouts', () => {
  const base = { mode: 'park' as const, entries: [], title: '' }
  const sessions = [
    { ...base, id: 'a', date: '2026-11-03', dayKey: 'strA' },
    { ...base, id: 'b', date: '2026-11-06', dayKey: 'circuit' },
    { ...base, id: 'c', date: '2026-11-08', dayKey: 'circuit' },
  ]
  it('strengthOnly drops circuit and cross sessions', () => {
    expect(strengthOnly([...sessions, { ...base, id: 'd', date: '2026-11-07', dayKey: 'cross' }]).map(s => s.id)).toEqual(['a'])
  })
  it('month workouts and the first-workout badge ignore circuits', () => {
    expect(periodStats([], sessions, '2026-11').workouts).toBe(1)
    expect(BADGES.find(b => b.id === 'first-workout')!.earned({ runs: [], sessions: sessions.slice(1), goalKm: 0 })).toBe(false)
  })
})
