import { describe, expect, it } from 'vitest'
import { defaultShoe, shoeKm, shoeStatus, type Shoe } from '../shoes'
import type { Run } from '../log'

const run = (km: number, shoeId?: string): Run => ({ id: String(Math.random()), date: '2026-10-01', km, seconds: 1800, kind: 'easy', source: 'manual', shoeId })

describe('shoes', () => {
  const a: Shoe = { id: 'a', name: 'A', startKm: 100, limitKm: 700 }
  const b: Shoe = { id: 'b', name: 'B', startKm: 0, limitKm: 700, isDefault: true }
  it('ระยะ = ระยะเริ่มต้น + การวิ่งที่ใส่คู่นี้', () => expect(shoeKm(a, [run(5, 'a'), run(10, 'b'), run(3, 'a')])).toBe(108))
  it('คู่ default ก่อน ถ้าไม่มีใช้คู่แรกที่ยังไม่เลิกใช้', () => {
    expect(defaultShoe([a, b])?.id).toBe('b')
    expect(defaultShoe([{ ...a, retired: true }, { ...b, isDefault: false }])?.id).toBe('b')
  })
  it('สถานะ 80% เตือน, 100% ควรเปลี่ยน', () => {
    expect(shoeStatus(500, 700)).toBe('good')
    expect(shoeStatus(600, 700)).toBe('warn')
    expect(shoeStatus(710, 700)).toBe('bad')
  })
})
