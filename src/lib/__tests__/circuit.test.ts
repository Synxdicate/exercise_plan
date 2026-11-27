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

describe('full-body circuit', () => {
  it('rotates upper → core → lower, every move has a demo and how-to, and fits ~15 min at 2 rounds', async () => {
    const { fullCircuit } = await import('../circuit')
    const { demoImages } = await import('../../data/demos')
    const { stickDemos } = await import('../../data/stickDemos')
    expect(fullCircuit.length % 3).toBe(0)
    for (const s of fullCircuit) {
      expect(demoImages(s.name) ?? stickDemos[s.name], s.name).toBeTruthy()
      expect(s.how && s.howEn, s.name).toBeTruthy()
    }
    // เรียงแขน → แกนกลาง → ขา กล้ามส่วนเดิมได้พักระหว่างท่า
    expect(fullCircuit.map(s => s.zone)).toEqual(fullCircuit.map((_, i) => (['upper', 'core', 'lower'] as const)[i % 3]))
    expect(circuitTotal(buildCircuit(fullCircuit, 30, 15, 2))).toBeLessThanOrEqual(15 * 60)
  })
  it('covers every movement pattern a runner needs and every move has a harder step', async () => {
    const { fullCircuit } = await import('../circuit')
    const names = fullCircuit.map(s => s.name)
    // ดึง ดัน / ขาเดียว สะโพก-ต้นขาหลัง น่อง (น่องรับแรงตอนวิ่งมากที่สุด Dorn 2012)
    for (const n of ['Backpack Row', 'Push-up', 'Reverse Lunge', 'Single-leg Glute Bridge', 'Single-leg Calf Raise']) expect(names).toContain(n)
    // ท่าที่แทบไม่มีแรงต้านไม่นับเป็นท่าสร้างแรง
    expect(names).not.toContain('Running Arm Swing')
    for (const s of fullCircuit) {
      expect(s.how, s.name).toMatch(/ง่ายไป|ยากไป/)
      expect(s.howEn, s.name).toMatch(/Too easy|too hard/)
    }
    expect(circuitTotal(buildCircuit(fullCircuit, 30, 15, 3))).toBeLessThanOrEqual(21 * 60)
  })
})
