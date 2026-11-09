import { describe, expect, it } from 'vitest'
import { swipeDir } from '../swipe'

describe('swipeDir', () => {
  it('left = next, right = previous', () => {
    expect(swipeDir(-120, 10, 250)).toBe(1)
    expect(swipeDir(110, -15, 300)).toBe(-1)
  })
  it('ignores short, mostly vertical or slow moves', () => {
    expect(swipeDir(-40, 0, 200)).toBe(0)
    expect(swipeDir(-100, 90, 200)).toBe(0)
    expect(swipeDir(-150, 0, 1200)).toBe(0)
  })
})
