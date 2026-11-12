import { describe, expect, it } from 'vitest'
import { variants } from '../../data/programs'
import { applyPainGuard, painGuardUntil, PAIN_NOTES } from '../painPlan'
import { noteToEn } from '../../data/contentEn'

const log = (d: string, areas?: string[], pain = true) => ({ [d]: { sleep: 0, sore: 0, pain, areas } }) as never

describe('pain guard', () => {
  it('lower-leg pain in the last 7 days guards the plan for 7 days from the report', () => {
    expect(painGuardUntil(log('2026-11-10', ['achilles']), '2026-11-12')).toBe('2026-11-16')
    expect(painGuardUntil(log('2026-11-10', ['calf']), '2026-11-16')).toBe('2026-11-16')
    expect(painGuardUntil(log('2026-11-10', ['achilles']), '2026-11-17')).toBeNull()
    expect(painGuardUntil(log('2026-11-10', ['knee']), '2026-11-12')).toBeNull()
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
})
