import { describe, expect, it } from 'vitest'
import { idsOf, mergeConflict } from '../merge'

describe('mergeConflict 3-way', () => {
  const r = (id: string, date: string, x = {}) => ({ id, date, ...x })
  it('arrays: keeps adds from both sides, drops ids either side deleted, local wins on edits', () => {
    const base = ['a', 'b', 'c']
    const local = [r('a', '1', { v: 'L' }), r('b', '2'), r('d', '4')] // ลบ c เพิ่ม d
    const server = [r('a', '1', { v: 'S' }), r('c', '3'), r('e', '5')] // ลบ b เพิ่ม e
    expect(mergeConflict('runs', local, server, base)).toEqual([r('a', '1', { v: 'L' }), r('d', '4'), r('e', '5')])
  })
  it('objects: same rules on keys; scalars keep local; no base = union', () => {
    expect(mergeConflict('routes', { a: 1, d: 4 }, { a: 2, b: 3, e: 5 }, ['a', 'b'])).toEqual({ a: 1, d: 4, e: 5 })
    expect(mergeConflict('raceKm', 11.55, 10, undefined)).toBe(11.55)
    expect(mergeConflict('runs', [r('a', '1')], [r('b', '2')])).toEqual([r('a', '1'), r('b', '2')])
    expect(idsOf('log', [{ date: '2026-11-01', weight: 64 }])).toEqual(['2026-11-01'])
    expect(idsOf('program', 'ten')).toBeUndefined()
  })
})
