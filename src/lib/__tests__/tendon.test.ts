import { describe, expect, it } from 'vitest'
import { tendonAlarmDates, tendonCheckDue, tendonStatus } from '../tendon'
import { painGuardUntil } from '../painPlan'
import type { Readiness } from '../readiness'

const ach: Record<string, Readiness> = { '2026-11-10': { sleep: 0, sore: 1, pain: true, areas: ['achilles'] } }
const run = (date: string, kind = 'long') => ({ date, kind })

describe('morning leg check', () => {
  it('is asked the morning after a run when lower-leg pain was logged in the last 28 days', () => {
    expect(tendonCheckDue([run('2026-11-15')], ach, {}, '2026-11-16')).toBe(true)
    expect(tendonCheckDue([run('2026-11-15')], ach, { '2026-11-16': 2 }, '2026-11-16')).toBe(false) // answered
    expect(tendonCheckDue([run('2026-11-14')], ach, {}, '2026-11-16')).toBe(false) // no run yesterday
    expect(tendonCheckDue([run('2026-11-15', 'walk')], ach, {}, '2026-11-16')).toBe(false)
    expect(tendonCheckDue([run('2026-12-20')], ach, {}, '2026-12-21')).toBe(false) // pain too long ago
    expect(tendonCheckDue([run('2026-11-15')], { '2026-11-10': { sleep: 0, sore: 0, pain: true, areas: ['knee'] } }, {}, '2026-11-16')).toBe(true) // knee is watched too
    expect(tendonCheckDue([run('2026-11-15')], { '2026-11-10': { sleep: 0, sore: 0, pain: true, areas: ['back'] } }, {}, '2026-11-16')).toBe(false)
    // a non-zero morning check keeps the watch going
    expect(tendonCheckDue([run('2026-12-20')], ach, { '2026-12-01': 1 }, '2026-12-21')).toBe(true)
    // the morning after an Achilles rehab session, even with no run and old pain
    expect(tendonCheckDue([], {}, {}, '2026-12-21', ['2026-12-18', '2026-12-20'])).toBe(true)
    expect(tendonCheckDue([], {}, {}, '2026-12-22', ['2026-12-18', '2026-12-20'])).toBe(false)
  })

  it('≤3 and not worse is ok; worse than last time or above 3 raises the alarm', () => {
    expect(tendonStatus({ '2026-11-16': 0 }, '2026-11-16')?.level).toBe('none')
    expect(tendonStatus({ '2026-11-14': 3, '2026-11-16': 2 }, '2026-11-16')).toMatchObject({ level: 'ok', prev: 3 })
    expect(tendonStatus({ '2026-11-14': 1, '2026-11-16': 2 }, '2026-11-16')?.level).toBe('worse')
    expect(tendonStatus({ '2026-11-16': 4 }, '2026-11-16')?.level).toBe('high')
    // previous answer older than 7 days is not compared
    expect(tendonStatus({ '2026-11-01': 1, '2026-11-16': 2 }, '2026-11-16')?.level).toBe('ok')
    expect(tendonStatus({}, '2026-11-16')).toBeNull()
  })

  it('suggests a physio after 14 days of continuous pain; a 0 resets the count', () => {
    const log = { '2026-11-02': 2, '2026-11-06': 1, '2026-11-10': 2, '2026-11-15': 2 }
    expect(tendonStatus(log, '2026-11-15')).toMatchObject({ painDays: 14, physio: true })
    expect(tendonStatus({ ...log, '2026-11-06': 0 }, '2026-11-15')).toMatchObject({ painDays: 6, physio: false })
  })

  it('alarm days feed the leg-friendly plan like a logged Achilles pain', () => {
    const log = { '2026-11-14': 1, '2026-11-16': 2 }
    expect(tendonAlarmDates(log)).toEqual(['2026-11-16'])
    expect(painGuardUntil({}, '2026-11-17', tendonAlarmDates(log))).toBe('2026-11-22')
    expect(painGuardUntil({}, '2026-11-17', tendonAlarmDates({ '2026-11-16': 2 }))).toBeNull()
  })
})
