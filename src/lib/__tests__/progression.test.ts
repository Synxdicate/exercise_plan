import { describe, expect, it } from 'vitest'
import { restSeconds, suggest } from '../progression'
import type { Exercise } from '../../data/workouts'

const ex = (name: string, sets = '3', reps = '6–8', extra: Partial<Exercise> = {}): Exercise =>
  ({ name, th: '', sets, reps, rest: '2 นาที', cue: '', video: '', ...extra })

describe('double progression', () => {
  it('ครั้งแรกไม่มีน้ำหนักแนะนำ', () => {
    expect(suggest(ex('Bench Press'), undefined).kg).toBeNull()
  })

  it('ยังไม่ครบช่วงบน → น้ำหนักเดิม', () => {
    const s = suggest(ex('Bench Press'), [{ kg: 40, reps: 8 }, { kg: 40, reps: 7 }, { kg: 40, reps: 6 }])
    expect(s).toMatchObject({ kg: 40, up: false })
  })

  it('ครบทุกเซ็ต → +2.5 กก. (ช่วงบน)', () => {
    const s = suggest(ex('Bench Press'), [{ kg: 40, reps: 8 }, { kg: 40, reps: 8 }, { kg: 40, reps: 9 }])
    expect(s).toMatchObject({ kg: 42.5, up: true })
  })

  it('ท่าขาใหญ่ +5 กก.', () => {
    expect(suggest(ex('Back Squat', '3', '5'), [{ kg: 60, reps: 5 }, { kg: 60, reps: 5 }, { kg: 60, reps: 5 }]).kg).toBe(65)
  })

  it('ทำไม่ครบจำนวนเซ็ต ไม่ถือว่าผ่าน', () => {
    expect(suggest(ex('Bench Press'), [{ kg: 40, reps: 8 }]).up).toBe(false)
  })

  it('บอดี้เวทครบ → แนะนำท่าที่ยากขึ้น', () => {
    const s = suggest(ex('Push-up', '3', '8–15', { harder: 'Archer push-up' }), [{ kg: 0, reps: 15 }, { kg: 0, reps: 15 }, { kg: 0, reps: 16 }])
    expect(s.up).toBe(true)
    expect(s.text).toContain('Archer')
  })
})

describe('restSeconds', () => {
  it.each([['2–3 นาที', 150], ['2 นาที', 120], ['90 วิ', 90], ['-', 60]])('%s → %i', (txt, sec) => {
    expect(restSeconds(txt)).toBe(sec)
  })
})
