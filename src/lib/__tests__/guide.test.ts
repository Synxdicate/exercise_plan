import { describe, expect, it } from 'vitest'
import { GuideRunner, guides, stepAnnouncement, type Step } from '../guide'
import { weekPlan, programs, type ProgramId } from '../../data/programs'

describe('guide builders', () => {
  it('parses every quality run in every program', () => {
    for (const id of Object.keys(programs) as ProgramId[]) {
      for (let w = 1; w <= programs[id].weeks; w++) {
        for (const d of weekPlan(id, w, () => 'gym')) {
          if (d.runKind === 'tempo' || d.runKind === 'interval') {
            expect(d.guide?.length, `${id} w${w} ${d.title}`).toBeGreaterThan(1)
            expect(d.guide!.every(s => (s.sec ?? 0) > 0 || (s.m ?? 0) > 0)).toBe(true)
          }
        }
      }
    }
  })
  it('reps by distance and minutes', () => {
    const a = guides.reps('5 × 800 ม. / จ็อก 2 นาที')
    expect(a.filter(s => s.kind === 'work')).toHaveLength(5)
    expect(a.find(s => s.kind === 'work')?.m).toBe(800)
    expect(a.filter(s => s.kind === 'recover')).toHaveLength(4) // ไม่มีพักหลังเที่ยวสุดท้าย
    expect(guides.reps('6 × 1 นาที / จ็อก 2 นาที').find(s => s.kind === 'work')?.sec).toBe(60)
    expect(guides.tempo('2×5').filter(s => s.kind === 'work').map(s => s.sec)).toEqual([300, 300])
    expect(guides.pace('6 กม.', 'เพซมาราธอน').find(s => s.kind === 'work')).toMatchObject({ m: 6000, pace: 'marathon' })
  })
})

describe('GuideRunner', () => {
  const steps: Step[] = [{ kind: 'warm', m: 1000 }, { kind: 'work', sec: 60 }, { kind: 'recover', sec: 120 }, { kind: 'work', sec: 60 }]
  it('advances by distance then time, warns and finishes', () => {
    const g = new GuideRunner(steps)
    expect(g.start(0, 0)).toEqual([{ type: 'step', index: 0 }])
    expect(g.update(300_000, 999, true)).toEqual([])
    expect(g.update(301_000, 1001, true)).toEqual([{ type: 'step', index: 1 }])
    expect(g.update(352_000, 1200, true)).toEqual([{ type: 'warn', index: 1 }])
    expect(g.update(361_000, 1250, true)).toEqual([{ type: 'step', index: 2 }])
    // กด "พัก" 5 นาที — นาฬิกาชุดซ้อมไม่เดิน
    expect(g.update(661_000, 1250, false)).toEqual([])
    expect(g.progress(1250).left).toBe(120)
    expect(g.update(781_000, 1400, true)).toEqual([{ type: 'step', index: 3 }])
    expect(g.update(841_000, 1600, true).at(-1)).toEqual({ type: 'done' })
    expect(g.update(900_000, 1700, true)).toEqual([])
  })
  it('skip moves to the next step', () => {
    const g = new GuideRunner(steps)
    g.start(0, 0)
    expect(g.skip(200)).toEqual([{ type: 'step', index: 1 }])
    expect(g.progress(200).left).toBe(60)
  })
  it('announcement counts reps and speaks the pace', () => {
    const s = guides.reps('5 × 800 ม. / จ็อก 2 นาที')
    expect(stepAnnouncement(s, 3, { interval: 310 })).toBe('ช่วงเร็ว ครั้งที่ 2 จาก 5. 800 เมตร. เพซ 5 นาที 10 วินาที ต่อกิโล')
    expect(stepAnnouncement(s, 0)).toBe('วอร์มอัพ. 2 กิโลเมตร')
  })
})

describe('guideResult', () => {
  it('counts completed work steps only', async () => {
    const { guideResult, guides, GuideRunner } = await import('../guide')
    const steps = guides.reps('3 × 1 นาที / จ็อก 2 นาที') // warm, w, r, w, r, w, cool
    const g = new GuideRunner(steps)
    expect(guideResult(steps, g.state)).toBeNull()
    g.start(0, 0)
    g.skip(2000) // warm → work 1
    g.skip(2000) // → recover (work 1 done)
    expect(guideResult(steps, g.state)).toEqual({ work: 1, total: 3, finished: false })
    for (let i = 0; i < 5; i++) g.skip(2000)
    expect(guideResult(steps, g.state)).toEqual({ work: 3, total: 3, finished: true })
  })
})
