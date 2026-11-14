import { describe, expect, it } from 'vitest'
import { archiveSlots } from '../program'

describe('archiveSlots', () => {
  it('moves this program’s week ticks (new and legacy ids) out of the way, leaves others', () => {
    const done = { 'physique-w1-d0': true, 'physique-w12-d3': true, 'physique-pre2026-01-05-d1': true, 'gym-w1-upperB': true, 'ten-w1-d0': true, 'ten-gym-w2-easy': true, 'old-physique-x-physique-w1-d0': true }
    const out = archiveSlots(done, 'physique', '2026-01-05')
    expect(Object.keys(out).sort()).toEqual([
      'old-physique-2026-01-05-gym-w1-upperB', 'old-physique-2026-01-05-physique-pre2026-01-05-d1', 'old-physique-2026-01-05-physique-w1-d0', 'old-physique-2026-01-05-physique-w12-d3',
      'old-physique-x-physique-w1-d0', 'ten-gym-w2-easy', 'ten-w1-d0',
    ])
    expect(Object.keys(archiveSlots(done, 'ten', 't')).filter(k => k.startsWith('old-ten')).sort()).toEqual(['old-ten-t-ten-gym-w2-easy', 'old-ten-t-ten-w1-d0'])
  })
})
