import { useEffect, useState } from 'react'
import { daysBetween, today, weekStart } from './date'

/**
 * วันนี้ (YYYY-MM-DD) ที่อัปเดตเมื่อข้ามเที่ยงคืนหรือกลับมาเปิดแอป — แอป Android ค้างอยู่ใน memory ได้หลายวัน
 * ถ้าจำวันไว้ตอนเปิดหน้าครั้งแรก หน้าหลักจะโชว์แผนของเมื่อวานเป็น "วันนี้"
 */
export function useToday() {
  const [date, setDate] = useState(today)
  useEffect(() => {
    const check = () => setDate(today())
    const id = setInterval(check, 60_000)
    document.addEventListener('visibilitychange', check)
    window.addEventListener('focus', check)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', check)
      window.removeEventListener('focus', check)
    }
  }, [])
  return date
}

/** 0 = จันทร์ … 6 = อาทิตย์ ของวันนี้ */
export function useTodayIdx() {
  const date = useToday()
  return daysBetween(weekStart(date), date)
}

/** ช่องวันที่ในฟอร์มบันทึก: ใช้วันนี้ (เลื่อนตามเมื่อข้ามวัน) จนกว่าผู้ใช้จะเลือกวันเอง */
export function useDateField() {
  const now = useToday()
  const [picked, setPicked] = useState<string | null>(null)
  return [picked ?? now, setPicked] as const
}
