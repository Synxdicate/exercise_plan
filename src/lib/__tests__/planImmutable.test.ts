import { describe, expect, it } from 'vitest'
import { programs, variants, weekPlan, withHills, type ProgramId } from '../../data/programs'
import { applyCustom, placeRaceDay, withRaceKm } from '../program'
import { applyMoves } from '../moves'
import { applyEaseOff } from '../easeOff'
import { applyRampIn } from '../rampIn'

const deepFreeze = <T,>(o: T): T => {
  if (o && typeof o === 'object' && !Object.isFrozen(o)) {
    Object.freeze(o)
    for (const v of Object.values(o)) deepFreeze(v)
  }
  return o
}

// variants() ถูกเก็บไว้ใช้ซ้ำ (cache) ถ้าชั้นไหนของ plan() แก้ของเดิมในที่ แผนสัปดาห์อื่น/การ render ถัดไปจะเพี้ยน
describe('plan layers never mutate cached variants', () => {
  it('every layer returns new objects over frozen variants', () => {
    for (const program of Object.keys(programs) as ProgramId[]) {
      for (let w = 1; w <= (programs[program].weeks || 4); w++) {
        const v = variants(program, w)
        expect(variants(program, w)).toBe(v)
        deepFreeze(v)
        for (const pick of [() => 'gym' as const, () => 'park' as const, () => 'home' as const, (i: number) => (i % 2 ? 'park' as const : 'gym' as const)]) {
          let d = weekPlan(program, w, pick)
          d = applyCustom(d, program, { 'Back Squat': 'Goblet Squat', 'Bench Press': 'Push-up' }, { [`${program}:strA:gym`]: [{ name: 'Plank', th: 'แพลงก์', sets: '2', reps: '30 วิ', rest: '30 วิ', cue: '', video: '' }] }, true)
          d = withHills(d, program, w)
          d = applyRampIn(d, 5, true)
          d = applyMoves(d, [[1, 0], [3, 4]])
          d = withRaceKm(d, 11.55)
          d = placeRaceDay(d, 6)
          applyEaseOff(d, '2026-11-09', { from: '2026-11-09', to: '2026-11-15', reason: 'sore' })
          applyEaseOff(d, '2026-11-09', { from: '2026-11-09', to: '2026-11-15', reason: 'sick' })
          applyEaseOff(d, '2026-11-09', { from: '2026-11-09', to: '2026-11-15', reason: 'busy' })
        }
      }
    }
  })
})
