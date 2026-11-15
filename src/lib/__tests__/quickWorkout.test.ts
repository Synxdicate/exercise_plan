import { describe, expect, it } from 'vitest'
import { quickExercises, canQuick, QUICK_MAX } from '../quickWorkout'
import { programs } from '../../data/programs'
import { variants } from '../../data/programs'

const names = (l: { name: string }[]) => l.map(e => e.name)

describe('quick strength workout', () => {
  it('runner day A (10K, week 5): main lift, calf, pull and push, 2 sets each, in day order', () => {
    const days = variants('ten', 5).gym
    const a = days.find(d => d.key === 'strA')!
    const q = quickExercises(a.exercises)
    expect(names(q)).toEqual(['Back Squat', 'Bench Press', 'Pull-up', 'Single-leg Calf Raise'])
    expect(q.every(e => e.sets === '2')).toBe(true)
  })

  it('every strength day of every program gives ≤4 exercises incl. a leg move, never more than 2 sets', () => {
    for (const prog of Object.keys(programs) as (keyof typeof programs)[]) {
      for (let w = 1; w <= programs[prog].weeks; w++) {
        const v = variants(prog, w)
        for (const loc of ['gym', 'park', 'home'] as const)
          for (const d of v[loc]) {
            if (d.type !== 'strength') continue
            const q = quickExercises(d.exercises)
            expect(q.length).toBe(Math.min(QUICK_MAX, d.exercises.length))
            expect(q.every(e => Number(e.sets) <= 2), `${prog} w${w} ${loc} ${d.key}`).toBe(true)
            const order = d.exercises.map(e => e.name)
            expect(names(q).map(n => order.indexOf(n))).toEqual([...names(q).map(n => order.indexOf(n))].sort((a, b) => a - b))
          }
      }
    }
  })

  it('canQuick: only strength days that actually shrink', () => {
    const ex = (sets: string) => ({ name: 'Plank', th: '', sets, reps: '30 วิ', rest: '45 วิ', cue: '', video: '' })
    const day = (exercises: ReturnType<typeof ex>[], type: 'strength' | 'run' = 'strength') => ({ key: 'x', day: 'จันทร์', title: '', type, duration: '', exercises })
    expect(canQuick(day([ex('2'), ex('2')]))).toBe(false)
    expect(canQuick(day([ex('3')]))).toBe(true)
    expect(canQuick(day([ex('3')], 'run'))).toBe(false)
  })
})
