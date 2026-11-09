import { describe, expect, it } from 'vitest'
import type { Day } from '../../data/workouts'
import type { Run } from '../log'
import { nextSession, runReview, strengthGap } from '../coachNotes'

const d = (type: Day['type'], extra: Partial<Day> = {}): Day => ({ day: '', title: type, type, exercises: [], ...extra } as Day)
const week: Day[] = [d('strength'), d('run', { targetKm: 3, runKind: 'easy' }), d('rest'), d('strength'), d('run', { targetKm: 3, runKind: 'easy' }), d('rest'), d('run', { targetKm: 5, runKind: 'long' })]
const run = (p: Partial<Run>): Run => ({ id: 'r', date: '2026-11-10', km: 3, seconds: 3 * 480, kind: 'easy', source: 'gps', ...p })

describe('strengthGap', () => {
  const base = { start: '2026-10-01', today: '2026-11-09', plan: week, todayIdx: 0, done: () => false }
  it('nudges after 8+ days without strength and lists the days left this week', () => {
    expect(strengthGap({ ...base, lastStrength: '2026-10-30' })).toEqual({ days: 10, never: false, left: [0, 3] })
  })
  it('stays quiet within a week of the last session', () => {
    expect(strengthGap({ ...base, lastStrength: '2026-11-03' })).toBeNull()
  })
  it('stays quiet for programs without strength days and early in a new program', () => {
    expect(strengthGap({ ...base, lastStrength: null, plan: week.map(x => (x.type === 'strength' ? d('rest') : x)) })).toBeNull()
    expect(strengthGap({ ...base, lastStrength: null, start: '2026-11-05' })).toBeNull()
  })
  it('skips days already done or past', () => {
    expect(strengthGap({ ...base, lastStrength: '2026-10-30', todayIdx: 1, done: i => i === 3 })?.left).toEqual([])
  })
})

describe('runReview', () => {
  it('praises a completed plan', () => {
    const r = runReview(run({ rpe: 3 }), { planned: week[1], prev: [] })!
    expect(r.tone).toBe('good')
    expect(r.headline.en).toMatch(/Plan done/)
  })
  it('says no make-up when short of the plan', () => {
    const r = runReview(run({ km: 1.5, seconds: 720, rpe: 3 }), { planned: week[1], prev: [] })!
    expect(r.headline.en).toMatch(/50% of the plan/)
    expect(r.points.some(p => /make it up/.test(p.en))).toBe(true)
  })
  it('flags an easy run that is too fast', () => {
    const r = runReview(run({ seconds: 3 * 360, rpe: 4 }), { planned: week[1], easyFloor: 420, prev: [] })!
    expect(r.tone).toBe('warn')
    expect(r.headline.en).toBe('Easy run too fast')
  })
  it('suggests repeating the week after two hard-feeling easy runs', () => {
    const r = runReview(run({ rpe: 8 }), { planned: week[1], prev: [run({ id: 'a', date: '2026-11-06', rpe: 7 })] })!
    expect(r.headline.en).toMatch(/Two hard-feeling/)
    expect(r.points.some(p => /repeating this week/.test(p.en))).toBe(true)
  })
  it('asks for an effort rating and ignores walks', () => {
    expect(runReview(run({}), { prev: [] })!.points.some(p => /effort rating/.test(p.en))).toBe(true)
    expect(runReview(run({ kind: 'walk' }), { prev: [] })).toBeNull()
  })
})

describe('nextSession', () => {
  it('finds the next non-rest day after the run', () => {
    expect(nextSession(week, '2026-11-09', '2026-11-10')?.i).toBe(3)
    expect(nextSession(week, '2026-11-09', '2026-11-15')).toBeNull()
  })
})
