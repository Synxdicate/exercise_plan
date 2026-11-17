import { describe, expect, it } from 'vitest'
import { hrZone, talkCheckIndex, tanakaMax, zoneRanges } from '../zone'

describe('zone 2 helpers', () => {
  it('talk-test reminders: first at 10 min of running, then every 10 min', () => {
    expect(talkCheckIndex(0)).toBe(0)
    expect(talkCheckIndex(599)).toBe(0)
    expect(talkCheckIndex(600)).toBe(1)
    expect(talkCheckIndex(1199)).toBe(1)
    expect(talkCheckIndex(1200)).toBe(2)
  })
  it('Tanaka max HR and %max zones', () => {
    expect(tanakaMax(20)).toBe(194)
    expect(zoneRanges(194)[1]).toEqual([116, 136])
    expect(hrZone(100, 194)).toBe(1)
    expect(hrZone(130, 194)).toBe(2)
    expect(hrZone(150, 194)).toBe(3)
    expect(hrZone(80, 194)).toBe(0)
    expect(hrZone(190, 194)).toBe(5)
  })
})
