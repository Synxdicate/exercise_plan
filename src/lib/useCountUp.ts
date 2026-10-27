import { useEffect, useState } from 'react'

/** ตัวเลขนับขึ้นจาก 0 ถึง target (ease-out) — ปิดเองเมื่อผู้ใช้ตั้งลดการเคลื่อนไหว */
export function useCountUp(target: number, ms = 700) {
  const [v, setV] = useState(() => (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? target : 0))
  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    let raf = 0
    const start = performance.now()
    const step = (now: number) => {
      const p = Math.min(1, (now - start) / ms)
      setV(target * (1 - (1 - p) ** 3))
      if (p < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [target, ms])
  return v
}
