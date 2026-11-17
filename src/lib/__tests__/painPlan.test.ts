import { describe, expect, it } from 'vitest'
import { variants } from '../../data/programs'
import { applyPainGuard, applyReturn, legPhase, offValue, painGuardUntil, PAIN_NOTES } from '../painPlan'
import { noteToEn } from '../../data/contentEn'

const log = (d: string, areas?: string[], pain = true) => ({ [d]: { sleep: 0, sore: 0, pain, areas } }) as never

describe('pain guard', () => {
  it('lower-leg pain in the last 7 days guards the plan for 7 days from the report', () => {
    expect(painGuardUntil(log('2026-11-10', ['achilles']), '2026-11-12')).toBe('2026-11-16')
    expect(painGuardUntil(log('2026-11-10', ['calf']), '2026-11-16')).toBe('2026-11-16')
    expect(painGuardUntil(log('2026-11-10', ['achilles']), '2026-11-17')).toBeNull()
    expect(painGuardUntil(log('2026-11-10', ['knee']), '2026-11-12')).toBe('2026-11-16')
    expect(painGuardUntil(log('2026-11-10', ['back']), '2026-11-12')).toBeNull()
    expect(painGuardUntil(log('2026-11-10'), '2026-11-12')).toBeNull()
    expect(painGuardUntil(log('2026-11-10', ['achilles'], false), '2026-11-12')).toBeNull()
  })
  it('turns strides/hills/quality days into easy runs of the same distance and removes jumps, only inside the window', () => {
    for (const w of [3, 5, 6]) {
      const days = variants('ten', w).gym
      const monday = '2026-11-09'
      const out = applyPainGuard(days, monday, '2026-11-09', '2026-11-15')
      out.forEach((d, i) => {
        if (d.type === 'run') {
          expect(d.title).not.toMatch(/strides|เนินสั้น/i)
          expect(['easy', 'long']).toContain(d.runKind)
          expect(d.targetKm).toBe(days[i].targetKm)
          if (days[i].runKind !== 'easy' && days[i].runKind !== 'long' || /Strides|เนินสั้น/.test(days[i].title)) {
            expect(d.guide).toBeUndefined()
            expect(d.note).toContain(PAIN_NOTES.run)
            expect(d.exercises[0].cue).not.toMatch(/Strides|เร่ง|เนิน/)
          }
        }
        if (d.type === 'strength') expect(d.exercises.map(e => e.name)).not.toContain('Pogo Jumps')
      })
      expect(out.reduce((s, d) => s + (d.targetKm ?? 0), 0)).toBe(days.reduce((s, d) => s + (d.targetKm ?? 0), 0))
    }
    const days = variants('ten', 5).gym
    expect(variants('ten', 5).gym[0].exercises.map(e => e.name)).toContain('Pogo Jumps')
    // นอกช่วง/วันที่ผ่านแล้ว/ไม่มีบันทึกปวด: แผนเดิม
    expect(applyPainGuard(days, '2026-11-09', '2026-11-09', null)).toBe(days)
    expect(applyPainGuard(days, '2026-11-09', '2026-11-16', '2026-11-20')).toEqual(days)
    const part = applyPainGuard(days, '2026-11-09', '2026-11-09', '2026-11-10')
    expect(part[2]).toBe(days[2])
    expect(part[0].exercises.map(e => e.name)).not.toContain('Pogo Jumps')
  })
  it('never touches race day and its notes have English', () => {
    const last = variants('ten', 12).gym
    const out = applyPainGuard(last, '2027-01-04', '2027-01-04', '2027-01-10')
    expect(out[6]).toBe(last[6])
    for (const n of Object.values(PAIN_NOTES)) expect(noteToEn(n)).not.toMatch(/[฀-๿]/)
  })

  it('knee pain: long run at 80%, flat-ground note on run days, side-hip work on strength days', () => {
    const days = variants('ten', 6).gym
    const out = applyPainGuard(days, '2026-11-23', '2026-11-23', '2026-11-29', true)
    const long = out.find(d => d.runKind === 'long')!
    expect(long.targetKm).toBe(5.5) // 7 × 0.8 = 5.6 → 5.5
    expect(long.exercises[0].reps).toBe('5.5 กม.')
    expect(long.note).toContain(PAIN_NOTES.kneeLong)
    for (const d of out.filter(d => d.type === 'run')) expect(d.note).toContain(PAIN_NOTES.kneeRun)
    for (const d of out.filter(d => d.type === 'strength')) {
      const names = d.exercises.map(e => e.name)
      expect(names.filter(n => n === 'Side-lying Hip Abduction' || n.startsWith('Banded Lateral Walk')).length).toBeGreaterThan(0)
      expect(names).not.toContain('Pogo Jumps')
      expect(d.note).toContain(PAIN_NOTES.kneeStrength)
    }
    // ไม่ใช่เข่า: วิ่งยาวระยะเดิม
    expect(applyPainGuard(days, '2026-11-23', '2026-11-23', '2026-11-29').find(d => d.runKind === 'long')!.targetKm).toBe(7)
  })

  it('return week: quality → easy + strides, long ≤90%, no jumps; easy runs untouched', () => {
    const days = variants('ten', 6).gym
    const out = applyReturn(days, '2026-11-23', '2026-11-23', '2026-11-29')
    out.forEach((d, i) => {
      if (days[i].runKind === 'tempo' || days[i].runKind === 'interval') {
        expect(d.runKind).toBe('easy')
        expect(d.guide).toBeUndefined()
        expect(d.targetKm).toBe(days[i].targetKm)
        expect(d.note).toContain(PAIN_NOTES.backRun)
      }
      if (d.type === 'strength') expect(d.exercises.map(e => e.name)).not.toContain('Pogo Jumps')
    })
    expect(out.find(d => d.runKind === 'long')!.targetKm).toBe(6) // 7 × 0.9 = 6.3 → 6
    expect(out[1]).toBe(days[1])
    expect(applyReturn(days, '2026-11-23', '2026-11-23', null)).toBe(days)
  })

  it('phases: guard 7 days → return 7 days → full plan; "recovered" starts the return week that day', () => {
    const l = log('2026-11-16', ['knee'])
    expect(legPhase(l, '2026-11-18')).toEqual({ guard: '2026-11-22', back: null, raw: '2026-11-22', knee: true })
    expect(legPhase(l, '2026-11-23')).toMatchObject({ guard: null, back: '2026-11-29', raw: null })
    expect(legPhase(l, '2026-11-30')).toMatchObject({ guard: null, back: null })
    // กดหายแล้ววันที่ 18: ช่วงกลับมาซ้อม 18–24
    const off = offValue('2026-11-22', '2026-11-18')
    expect(legPhase(l, '2026-11-18', [], off)).toMatchObject({ guard: null, back: '2026-11-24', raw: '2026-11-22' })
    expect(legPhase(l, '2026-11-25', [], off)).toMatchObject({ back: null })
    // ค่าปิดแบบเก่า (มีแค่วันสิ้นสุด): ไม่มีช่วงกลับมาซ้อม
    expect(legPhase(l, '2026-11-18', [], '2026-11-22')).toMatchObject({ guard: null, back: null })
    // ปิดช่วงกลับมาซ้อม
    expect(legPhase(l, '2026-11-23', [], '', '2026-11-29')).toMatchObject({ back: null })
    // เจ็บใหม่ระหว่างช่วงกลับมาซ้อม: กลับไปถนอมขา
    expect(legPhase(Object.assign({}, l, log('2026-11-24', ['achilles'])), '2026-11-24')).toMatchObject({ guard: '2026-11-30', back: null })
    // เช้าเกิน 3/10 นับเป็นวันเจ็บ
    expect(legPhase({}, '2026-11-18', ['2026-11-17'])).toMatchObject({ guard: '2026-11-23', knee: false })
  })

  it('new notes have English', () => {
    for (const n of Object.values(PAIN_NOTES)) expect(noteToEn(n)).not.toMatch(/[฀-๿]/)
  })
})

