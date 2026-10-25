import { useEffect, useMemo } from 'react'
import { BADGES, defaultMonthGoal, earnedBadges } from './goals'
import { useRuns, useSessions } from './log'
import { usePersisted } from './storage'
import { useProgram } from './program'
import { notify } from './dialog'

export function useMonthGoal() {
  const p = useProgram()
  const [goals, setGoals] = usePersisted<{ monthKm?: number }>('goals', {})
  return [goals.monthKm ?? defaultMonthGoal(p.kmTarget()), (km: number) => setGoals(g => ({ ...g, monthKm: km })), goals.monthKm === undefined] as const
}

/** แจ้งเตือนเมื่อได้เหรียญใหม่ — ครั้งแรกบนเครื่องนี้ถือว่าเหรียญที่มีอยู่แล้ว "เห็นแล้ว" ไม่แจ้งย้อนหลัง */
export function useBadgeWatcher() {
  const [runs] = useRuns()
  const [sessions] = useSessions()
  const [goalKm] = useMonthGoal()
  const [seen, setSeen] = usePersisted<string[] | null>('badgesSeen', null)
  const earned = useMemo(() => earnedBadges({ runs, sessions, goalKm }), [runs, sessions, goalKm])
  useEffect(() => {
    if (seen === null) return setSeen(earned)
    const fresh = earned.filter(id => !seen.includes(id))
    if (!fresh.length) return
    for (const id of fresh) notify(`ได้เหรียญใหม่: ${BADGES.find(b => b.id === id)?.title}`, 'good')
    setSeen([...seen, ...fresh])
  }, [earned, seen, setSeen])
}

