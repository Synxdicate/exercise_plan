import { describe, expect, it } from 'vitest'
import { HrRecorder, parseHeartRate } from '../hrLog'

describe('heart-rate strap', () => {
  it('parses uint8 and uint16 Heart Rate Measurement values', () => {
    expect(parseHeartRate(new Uint8Array([0x00, 142]))).toBe(142)
    expect(parseHeartRate(new Uint8Array([0x16, 150, 0x10, 0x03]))).toBe(150) // RR intervals after the value are ignored
    expect(parseHeartRate(new Uint8Array([0x01, 0x2c, 0x00]))).toBe(44)
    expect(parseHeartRate(new Uint8Array([0x01, 0x2c]))).toBeNull()
    expect(parseHeartRate(new Uint8Array([0x00, 0]))).toBeNull() // no skin contact
    expect(parseHeartRate(new Uint8Array([0x00]))).toBeNull()
  })

  it('time-weights the average, counts zone time and 30-s buckets, skips gaps', () => {
    const r = new HrRecorder(200)
    for (let t = 0; t <= 60; t++) r.add(t, 130) // zone 2 (65%)
    for (let t = 61; t <= 90; t++) r.add(t, 150) // zone 3 (75%)
    r.add(91, null)
    r.add(200, 190) // after a dropout: not counted as time
    r.add(201, 190)
    const out = r.result()!
    expect(out.max).toBe(190)
    expect(out.zones[1]).toBe(61)
    expect(out.zones[2]).toBe(29)
    expect(out.zones[4]).toBe(1)
    expect(out.avg).toBe(Math.round((130 * 61 + 150 * 29 + 190) / 91))
    expect(out.series[0]).toBe(130)
    expect(out.series[2]).toBe(Math.round((130 + 150 * 29) / 30))
    expect(out.series[4]).toBe(out.series[2]) // empty bucket carries the previous value
    expect(out.ref).toBe(200)
  })

  it('needs at least a minute of data', () => {
    const r = new HrRecorder(194)
    for (let t = 0; t < 30; t++) r.add(t, 140)
    expect(r.result()).toBeUndefined()
  })
})
