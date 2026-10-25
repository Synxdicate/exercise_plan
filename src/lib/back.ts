import { useEffect, useRef } from 'react'
import { App } from '@capacitor/app'
import { isNative } from './native'

// ปุ่มย้อนกลับของ Android: ปิดสิ่งที่เปิดซ้อนอยู่บนสุดก่อน (แผ่น/หน้าเต็มจอ/กล่องยืนยัน)
// ถ้าไม่มีอะไรเปิดอยู่ → ให้ App จัดการ (เช่น กลับหน้าหลัก) → ไม่งั้นย่อแอป (ไม่ปิดแอป GPS จะได้ทำงานต่อ)
const stack: { id: number; fn: () => void }[] = []
let nextId = 0

/** ลงทะเบียนตัวปิดของ overlay ขณะที่ active */
export function useBackClose(onBack: () => void, active = true) {
  const ref = useRef(onBack)
  useEffect(() => { ref.current = onBack })
  useEffect(() => {
    if (!active) return
    const id = nextId++
    stack.push({ id, fn: () => ref.current() })
    return () => {
      const i = stack.findIndex(e => e.id === id)
      if (i >= 0) stack.splice(i, 1)
    }
  }, [active])
}

/** เรียกครั้งเดียวที่ราก — fallback คืน true ถ้าจัดการเองแล้ว */
export function useBackButton(fallback: () => boolean) {
  const ref = useRef(fallback)
  useEffect(() => { ref.current = fallback })
  useEffect(() => {
    if (!isNative) return
    const sub = App.addListener('backButton', () => {
      const top = stack.at(-1)
      if (top) return top.fn()
      if (ref.current()) return
      void App.minimizeApp()
    })
    return () => { void sub.then(s => s.remove()) }
  }, [])
}
