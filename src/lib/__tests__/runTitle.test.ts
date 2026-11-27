import { describe, expect, it } from 'vitest'
import { dayPart, runTitle, startTime } from '../runTitle'
import { paceTicks } from '../paceTicks'

const at = (h: number, m = 0) => new Date(2026, 10, 27, h, m).getTime()

describe('run title', () => {
  it('names the run by kind and the part of the day it started', () => {
    expect(runTitle({ kind: 'easy', startedAt: at(6, 10) }, false)).toBe('วิ่งเบาตอนเช้า')
    expect(runTitle({ kind: 'long', startedAt: at(18) }, true)).toBe('Evening long run')
    expect(runTitle({ kind: 'interval', startedAt: at(12) }, true)).toBe('Lunch interval session')
    expect(runTitle({ kind: 'tempo' }, false)).toBe('วิ่งเทมโป')
    expect(dayPart(2)[1]).toBe('Night')
    expect(startTime({ startedAt: at(6, 5) })).toBe('06:05')
    expect(startTime({})).toBeNull()
  })
})

describe('pace axis', () => {
  it('uses round values', () => {
    expect(paceTicks(440, 640)).toEqual([480, 540, 600]) // 7:20–10:40 → 8:00, 9:00, 10:00
    expect(paceTicks(390, 430)).toEqual([390, 405, 420]) // แคบ: ทุก 15 วิ
  })
})

