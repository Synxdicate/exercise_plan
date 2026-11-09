import { describe, expect, it } from 'vitest'
import { guides } from '../guide'
import { noticeText, stepNow } from '../runNoticeText'

const reps = guides.reps('5 × 800 ม. / จ็อก 2 นาที')
const workIdx = reps.findIndex(s => s.kind === 'work')

describe('live run notification', () => {
  it('describes the current guided step with what is left and what comes next', () => {
    const st = { started: true, index: workIdx + 2, clock: 600_000, stepT: 590_000, stepM: 3000, warned: false, done: false }
    const s = stepNow(reps, st, 3350)!
    expect(s).toMatchObject({ n: 2, of: 5, work: true, left: '450 ม.' })
    expect(s.next).toMatch(/2 นาที$/)
    const n = noticeText({ status: 'running', signalLost: false, meters: 3350, elapsed: 1500, pace: 290, kind: 'Interval', step: s })
    expect(n.title).toMatch(/2\/5 · เหลือ 450 ม\.$/)
    expect(n.body).toContain('เพซตอนนี้ 4:50 · เฉลี่ย 7:28 /กม.')
    expect(n.body).toContain('3.35 กม. · 25:00 · ถัดไป:')
    expect(n.actions.map(a => a.id)).toEqual(['pause', 'skip'])
  })
  it('time-based steps count down; paused shows only resume; English works', () => {
    const tempo = guides.tempo('15')
    const i = tempo.findIndex(s => s.kind === 'work')
    const s = stepNow(tempo, { started: true, index: i, clock: 300_000, stepT: 0, stepM: 0, warned: false, done: false }, 2000, true)!
    expect(s.left).toBe('10:00')
    const n = noticeText({ status: 'paused', signalLost: true, meters: 2000, elapsed: 900, pace: null, kind: 'Tempo', step: s }, true)
    expect(n.title).toMatch(/^Paused · /)
    expect(n.body).toContain('Now --:--')
    expect(n.body).toContain('GPS signal lost')
    expect(n.actions).toEqual([{ id: 'resume', title: 'Resume' }])
  })
  it('a plain run shows kind and distance, no skip button', () => {
    const n = noticeText({ status: 'running', signalLost: false, meters: 4210, elapsed: 2040, pace: 480, kind: 'วิ่งเบา', step: null })
    expect(n.title).toBe('วิ่งเบา · 4.21 กม.')
    expect(n.actions.map(a => a.id)).toEqual(['pause'])
    expect(stepNow(reps, { started: false, index: 0, clock: 0, stepT: 0, stepM: 0, warned: false, done: false }, 0)).toBeNull()
  })
})
