import { describe, expect, it } from 'vitest'
import { afterSet, sessionMinutes, setSeconds } from '../workoutTime'
import { variants } from '../../data/programs'
import type { Exercise } from '../../data/workouts'

const ex = (name: string, sets: string, reps: string, rest: string, pair?: string): Exercise => ({ name, th: '', sets, reps, rest, cue: '', video: '', pair })

describe('session time', () => {
  it('counts holds by their seconds and one-sided work twice', () => {
    expect(setSeconds(ex('Side Plank', '2', '30–45 วิ / ข้าง', '45 วิ'))).toBe(75)
    expect(setSeconds(ex('Squat', '3', '5', '2 นาที'))).toBe(25)
  })
  it('a superset is shorter than the same moves done one after another', () => {
    const list = [ex('A', '3', '10', '90 วิ'), ex('B', '3', '10', '90 วิ'), ex('C', '3', '10', '90 วิ')]
    const straight = sessionMinutes(list)
    const paired = sessionMinutes(list.map(e => ({ ...e, pair: 'x' })))
    expect(paired).toBeLessThan(straight)
  })
  it('race-program strength days state a duration close to the estimate and stay around an hour', () => {
    for (const w of [2, 6]) for (const d of variants('ten', w).gym.filter(d => d.type === 'strength')) {
      expect(d.duration).toBe(`${sessionMinutes(d.exercises)} นาที`)
      expect(sessionMinutes(d.exercises)).toBeLessThanOrEqual(70)
    }
  })
  it('a superset alternates with a short switch and rests fully after the round', () => {
    const list = [ex('Squat', '2', '5', '2 นาที'), ex('A', '2', '10', '90 วิ', 'u'), ex('B', '2', '10', '90 วิ', 'u'), ex('Calf', '2', '12', '60 วิ')]
    const rows = (done: Record<string, number>) => Object.fromEntries(list.map(e => [e.name, [0, 1].map(k => ({ done: k < (done[e.name] ?? 0) }))]))
    expect(afterSet(list, rows({}), 0, 0)).toEqual({ target: 0, sec: 120 })
    expect(afterSet(list, rows({ Squat: 1 }), 0, 1)).toEqual({ target: 1, sec: 120 })
    expect(afterSet(list, rows({ Squat: 2 }), 1, 0)).toEqual({ target: 2, sec: 15 })
    expect(afterSet(list, rows({ Squat: 2, A: 1 }), 2, 0)).toEqual({ target: 1, sec: 90 })
    expect(afterSet(list, rows({ Squat: 2, A: 1, B: 1 }), 1, 1)).toEqual({ target: 2, sec: 15 })
    expect(afterSet(list, rows({ Squat: 2, A: 2, B: 1 }), 2, 1)).toEqual({ target: 3, sec: 90 })
  })
})
