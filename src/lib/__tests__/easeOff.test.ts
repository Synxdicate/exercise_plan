import { describe, expect, it } from 'vitest'
import { weekPlan } from '../../data/programs'
import { titleEn } from '../dayText'
import { NOTE_EN } from '../../data/contentEn'
import { applyEaseOff, easeActive } from '../easeOff'

const monday = '2026-11-09'
const week = weekPlan('mini', 5, () => 'park')

describe('applyEaseOff', () => {
  it('leaves days outside the window alone', () => {
    expect(applyEaseOff(week, monday, { from: '2026-11-20', to: '2026-11-25', reason: 'sore' })).toEqual(week)
    expect(applyEaseOff(week, monday, null)).toBe(week)
  })
  it('sick turns training days into rest', () => {
    const out = applyEaseOff(week, monday, { from: monday, to: '2026-11-15', reason: 'sick' })
    expect(out.every(d => d.type === 'rest')).toBe(true)
  })
  it('sore halves runs, removes fast parts and guides', () => {
    const out = applyEaseOff(week, monday, { from: monday, to: '2026-11-15', reason: 'sore' })
    week.forEach((d, i) => {
      if (d.type !== 'run') return
      expect(out[i].runKind).toBe('easy')
      expect(out[i].guide).toBeUndefined()
      expect(out[i].targetKm!).toBeLessThanOrEqual(Math.max(1, d.targetKm! * 0.5 + 0.25))
    })
  })
  it('never touches race day', () => {
    const race = weekPlan('mini', 10, () => 'park')
    const out = applyEaseOff(race, monday, { from: monday, to: '2026-11-15', reason: 'busy' })
    race.forEach((d, i) => { if (d.runKind === 'race') expect(out[i]).toBe(d) })
  })
  it('has English for every title and note it generates', () => {
    for (const reason of ['sick', 'sore', 'busy'] as const) {
      for (const d of applyEaseOff(week, monday, { from: monday, to: '2026-11-15', reason })) {
        expect(titleEn(d.title)).not.toMatch(/[฀-๿]/)
        if (d.note) expect(NOTE_EN[d.note] ?? d.note).toBeTruthy()
      }
    }
  })
  it('is active only within the window', () => {
    expect(easeActive({ from: monday, to: '2026-11-12', reason: 'busy' }, '2026-11-12')).toBe(true)
    expect(easeActive({ from: monday, to: '2026-11-12', reason: 'busy' }, '2026-11-13')).toBe(false)
  })
})
