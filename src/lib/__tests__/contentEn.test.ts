import { describe, expect, it } from 'vitest'
import { programs, weekPlan, withHills, type ProgramId } from '../../data/programs'
import { allLibrary } from '../../data/library'
import { cueToEn, noteToEn } from '../../data/contentEn'

const thai = /[฀-๿]/

describe('English plan content', () => {
  it('every note and cue in every program, location and week has an English version', () => {
    const missing = new Set<string>()
    for (const id of Object.keys(programs) as ProgramId[])
      for (let w = 1; w <= programs[id].weeks; w++)
        for (const m of ['gym', 'park', 'home'] as const)
          for (const d of [...weekPlan(id, w, () => m), ...withHills(weekPlan(id, w, () => m), id, w)]) {
            if (d.note && thai.test(noteToEn(d.note))) missing.add(d.note)
            for (const e of d.exercises) if (thai.test(cueToEn(e.cue) ?? 'ไทย')) missing.add(e.cue)
          }
    for (const e of allLibrary) if (thai.test(cueToEn(e.cue) ?? 'ไทย')) missing.add(e.cue)
    expect([...missing]).toEqual([])
  })
  it('templated run cues translate by rule', () => {
    expect(cueToEn('วอร์ม 2 กม. → 5 × 800 ม. / จ็อก 2 นาที → คูลดาวน์ (ช่วงเร็ว ~เพซ 5K, ช่วงพักจ็อกเบา)'))
      .toBe('Warm up 2 km → 5 × 800 m / jog 2 min → cool down (fast reps ~5K pace, easy jog recoveries)')
    expect(cueToEn('วิ่ง 4 นาที / เดิน 1 นาที จนครบระยะ (วิ่งช้าพูดเป็นประโยคได้)')).toBe('Run 4 min / walk 1 min until the distance is done (slow enough to talk in sentences)')
  })
})
