import { useEffect, useRef } from 'react'

// ปัดซ้าย/ขวาเพื่อสลับหน้าย่อย (เช่น วิ่ง / ประวัติ / สถิติ) ตัดสินจากระยะ ทิศ และความเร็วของนิ้ว
// ไม่ทำงานเมื่อเริ่มแตะบนสิ่งที่ลากแนวนอนเองได้: แผนที่ กราฟที่ลากดูค่า ช่องกรอก แถบเลื่อนแนวนอน หรือขอบจอ (ท่าย้อนกลับของ Android)

const IGNORE = 'input, textarea, select, [data-noswipe], .leaflet-container, svg[role="img"]'
const EDGE = 24

function scrollsSideways(el: Element | null, root: Element): boolean {
  for (let n = el; n && n !== root; n = n.parentElement) {
    const s = getComputedStyle(n)
    if ((s.overflowX === 'auto' || s.overflowX === 'scroll') && n.scrollWidth > n.clientWidth + 2) return true
  }
  return false
}

/** ทิศที่ปัด: 1 = ไปหน้าถัดไป (ปัดซ้าย), -1 = ย้อนกลับ (ปัดขวา), 0 = ไม่ใช่การปัด (pure, tested) */
export function swipeDir(dx: number, dy: number, ms: number) {
  if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.6 || ms > 700) return 0
  return dx < 0 ? 1 : -1
}

/** ฟังการปัดทั้งหน้า (ใน <main> ของแท็บ ไม่รวมหน้าต่างที่ซ้อนขึ้นมา) แล้วเลื่อน value ไปตัวถัดไป/ก่อนหน้าใน values */
export function useSwipe<T extends string>(values: readonly T[], value: T, set: (v: T) => void) {
  const latest = useRef({ values, value, set })
  useEffect(() => { latest.current = { values, value, set } })
  useEffect(() => {
    let start: { x: number; y: number; t: number } | null = null
    const down = (e: TouchEvent) => {
      const t = e.touches[0]
      const target = e.target as Element
      const main = target.closest?.('main')
      start = main && e.touches.length === 1 && t.clientX > EDGE && t.clientX < window.innerWidth - EDGE
        && !target.closest(IGNORE) && !scrollsSideways(target, main) ? { x: t.clientX, y: t.clientY, t: Date.now() } : null
    }
    // จำจุดล่าสุดตอนลาก: บางครั้งเบราว์เซอร์ยกเลิกการแตะ (touchcancel) แทน touchend เมื่อเริ่มเลื่อนหน้าเอง
    let last: { x: number; y: number } | null = null
    const move = (e: TouchEvent) => { if (start) last = { x: e.touches[0].clientX, y: e.touches[0].clientY } }
    const up = (e: TouchEvent) => {
      const s = start
      start = null
      const p = e.changedTouches[0] ? { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY } : last
      last = null
      if (!s || !p) return
      const dir = swipeDir(p.x - s.x, p.y - s.y, Date.now() - s.t)
      const { values: vs, value: v, set: f } = latest.current
      const i = vs.indexOf(v) + dir
      if (dir && i >= 0 && i < vs.length) f(vs[i])
    }
    document.addEventListener('touchstart', down, { passive: true })
    document.addEventListener('touchmove', move, { passive: true })
    document.addEventListener('touchend', up, { passive: true })
    document.addEventListener('touchcancel', up, { passive: true })
    return () => {
      document.removeEventListener('touchstart', down)
      document.removeEventListener('touchmove', move)
      document.removeEventListener('touchend', up)
      document.removeEventListener('touchcancel', up)
    }
  }, [])
}
