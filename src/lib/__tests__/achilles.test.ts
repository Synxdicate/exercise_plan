import { describe, expect, it } from 'vitest'
import { LAST, logRehab, rehabActive, rehabDue, rehabNext, rehabToday, rehabWaitFrom, settle, STAGES, startRehab, type Rehab } from '../achilles'
import { addDays } from '../date'
import { noteToEn } from '../../data/contentEn'
import { REHAB_NOTE, REHAB_WAIT_NOTE, applyRehab } from '../painPlan'
import { variants } from '../../data/programs'

const pain = (d: string, areas: string[]) => ({ [d]: { sleep: 0, sore: 0, pain: true, areas } }) as Record<string, never>
const calf = (date: string, n: number) => [{ id: date, date, calfL: n, calfR: n }]

/** ทำวันเว้นวันจาก `from` n ครั้ง ปวด p */
function run(r: Rehab, from: string, n: number, p = 1, tests = calf('2026-11-01', 0)) {
  let d = from
  for (let i = 0; i < n; i++, d = addDays(d, 2)) r = logRehab(r, p, {}, tests, d)
  return { r, next: d }
}

describe('Achilles rehab', () => {
  it('drops jumps from the first pain day while rehab is due but not started, and counts only new pain after it ends', () => {
    const two = { ...pain('2026-11-10', ['achilles']), ...pain('2026-11-19', ['calf']) }
    expect(rehabWaitFrom(null, two, {}, '2026-11-26')).toBe('2026-11-10')
    expect(rehabWaitFrom(startRehab('2026-11-20'), two, {}, '2026-11-26')).toBeNull()
    expect(rehabWaitFrom({ ...startRehab('2026-11-01'), done: '2026-11-15' }, two, {}, '2026-11-26')).toBeNull()
    expect(rehabWaitFrom({ ...startRehab('2026-11-01'), off: '2026-11-15' }, two, { '2026-11-25': 5 }, '2026-11-26')).toBe('2026-11-19')
    expect(rehabDue(two, {}, '2026-11-26', '2026-11-15')).toBe(false)
    expect(noteToEn(REHAB_WAIT_NOTE)).not.toMatch(/[฀-๿]/)
  })
  it('is offered after 2 Achilles/calf pain days in 28 days or a morning check over 3', () => {
    expect(rehabDue(pain('2026-11-10', ['achilles']), {}, '2026-11-26')).toBe(false)
    expect(rehabDue({ ...pain('2026-11-10', ['achilles']), ...pain('2026-11-19', ['calf']) }, {}, '2026-11-26')).toBe(true)
    expect(rehabDue({ ...pain('2026-10-20', ['achilles']), ...pain('2026-11-19', ['achilles']) }, {}, '2026-11-26')).toBe(false)
    expect(rehabDue({ ...pain('2026-11-10', ['knee']), ...pain('2026-11-19', ['knee']) }, {}, '2026-11-26')).toBe(false)
    expect(rehabDue({}, { '2026-11-25': 4 }, '2026-11-26')).toBe(true)
  })
  it('moves up after 3 pain-free sessions over at least 6 days, never faster', () => {
    let r = startRehab('2026-11-26')
    r = logRehab(r, 1, {}, [], '2026-11-26')
    r = logRehab(r, 1, {}, [], '2026-11-27')
    r = logRehab(r, 1, {}, [], '2026-11-28')
    expect(r.stage).toBe(0)
    expect(rehabNext(r, [], '2026-11-28')).toEqual({ kind: 'stay', left: 0, days: 4 })
    r = logRehab(r, 1, {}, [], '2026-12-02')
    expect(r.stage).toBe(1)
    expect(r.stageStart).toBe('2026-12-03')
  })
  it('steps back when pain during the session is over 3/10, or the next morning is worse', () => {
    let { r } = run(startRehab('2026-11-01'), '2026-11-01', 4)
    expect(r.stage).toBe(1)
    r = logRehab(r, 5, {}, [], '2026-11-10')
    expect(r.stage).toBe(0)
    let s = run(startRehab('2026-11-01'), '2026-11-01', 4).r
    s = logRehab(s, 1, {}, [], '2026-11-10')
    // เช้า 11 แย่กว่าเช้า 9
    const morning = { '2026-11-09': 1, '2026-11-11': 3 }
    expect(settle(s, morning, '2026-11-12')).toMatchObject({ stage: 0, backed: true, stageStart: '2026-11-12' })
    expect(logRehab(s, 1, morning, [], '2026-11-12').stage).toBe(0)
  })
  it('the jumping stage needs a passed calf test, then the program finishes', () => {
    let r: Rehab = { ...startRehab('2026-11-01'), stage: LAST - 1 }
    r = run(r, '2026-11-01', 4, 1, calf('2026-11-01', 20)).r
    expect(r.stage).toBe(LAST - 1)
    expect(rehabNext(r, calf('2026-11-01', 20), '2026-11-08')).toEqual({ kind: 'test' })
    r = logRehab(r, 1, {}, calf('2026-11-09', 26), '2026-11-09')
    expect(r.stage).toBe(LAST)
    r = run(r, '2026-11-11', 4).r
    expect(r.done).toBeTruthy()
    expect(rehabActive(r)).toBe(false)
  })
  it('every other day; every stage has a dose and English', () => {
    const r = logRehab(startRehab('2026-11-01'), 1, {}, [], '2026-11-01')
    expect(rehabToday(r, '2026-11-01')).toBe(false)
    expect(rehabToday(r, '2026-11-02')).toBe(false)
    expect(rehabToday(r, '2026-11-03')).toBe(true)
    for (const s of STAGES) { expect(s.howEn).toBeTruthy(); expect(s.doseEn).toBeTruthy() }
  })
  it('while running, strength days in its date range have no jumps (with a note); outside the range they keep them', () => {
    const days = variants('ten', 6).gym
    expect(days.some(d => d.exercises.some(e => e.name === 'Pogo Jumps'))).toBe(true)
    const out = applyRehab(days, '2026-11-23', '2026-11-23', null)
    expect(out.some(d => d.exercises.some(e => e.name === 'Pogo Jumps'))).toBe(false)
    expect(out.filter(d => d.note?.includes(REHAB_NOTE)).length).toBeGreaterThan(0)
    expect(applyRehab(days, '2026-11-23', '2026-12-01', null)).toEqual(days)
    expect(applyRehab(days, '2026-11-23', '2026-11-01', '2026-11-20')).toEqual(days)
    expect(noteToEn(REHAB_NOTE)).not.toMatch(/[฀-๿]/)
  })
})
