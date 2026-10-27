import type { Day } from '../data/workouts'
import { addDays, today, weekStart } from './date'
import { useRuns, useSessions } from './log'
import { useProgram } from './program'
import { usePersisted } from './storage'

/**
 * วันในแผนนับว่า "ทำแล้ว" เมื่อติ๊กเอง หรือมีบันทึกตรงชนิดในวันนั้น (วันวิ่งมีการวิ่ง, วันเวทมีเซ็ตที่บันทึก)
 * — วิ่งเสร็จแล้วกลับหน้าหลักจะไม่ขึ้น "เริ่มวิ่ง" อีก; ติ๊กออกเอง (false) ชนะบันทึก
 */
export function useDayDone() {
  const p = useProgram()
  const [done] = usePersisted<Record<string, boolean>>('done', {})
  const [runs] = useRuns()
  const [sessions] = useSessions()
  return (week: number, i: number, day: Day | undefined) => {
    const id = p.doneId(week, i)
    if (id in done) return done[id]
    if (p.isDone(done, week, i)) return true
    const date = addDays(weekStart(today()), (week - p.currentWeek) * 7 + i)
    if (day?.type === 'run') return runs.some(r => r.date === date)
    if (day?.type === 'strength') return sessions.some(s => s.date === date && s.dayKey !== 'circuit' && s.dayKey !== 'cross')
    return false
  }
}
