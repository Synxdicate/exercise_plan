import { describe, expect, it, vi } from 'vitest'
import { weekPlan } from '../../data/programs'
import { applyCustom, extrasKey, safeLayer } from '../program'

describe('safeLayer', () => {
  it('returns the layer result when it works', () => {
    const report = vi.fn()
    expect(safeLayer('x', () => 1, () => 0, report)).toBe(1)
    expect(report).not.toHaveBeenCalled()
  })

  it('falls back and reports when synced data breaks a layer', () => {
    const days = weekPlan('physique', 1, () => 'gym')
    const strength = days.find(d => d.type === 'strength')!
    // ข้อมูลจากแอปรุ่นอื่น/เสีย: ค่าท่าเพิ่มไม่ใช่ array
    const bad = { [extrasKey('physique', strength)]: 'oops' } as never
    const report = vi.fn()
    const out = safeLayer('custom', () => applyCustom(days, 'physique', {}, bad), () => days, report)
    expect(out).toBe(days)
    expect(report).toHaveBeenCalledWith(expect.any(Error), 'plan:custom')
  })
})
