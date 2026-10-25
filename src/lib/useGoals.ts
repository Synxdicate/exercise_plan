import { useEffect, useMemo } from 'react'
import { BADGES, defaultMonthGoal, earnedBadges, type RaceKey } from './goals'
import { useRuns, useSessions } from './log'
import { usePersisted } from './storage'
import { useProgram } from './program'
import { notify } from './dialog'

export function useMonthGoal() {
  const p = useProgram()
  const [goals, setGoals] = usePersisted<{ monthKm?: number; race?: Partial<Record<RaceKey, number>> }>('goals', {})
  // เฉลี่ยทั้งโปรแกรม (ไม่นับสัปดาห์แข่ง) — ใช้สัปดาห์ปัจจุบันจะทำให้เป้าเดือนเปลี่ยนกลางเดือนตอนเข้าสัปดาห์ลด
  const weeks = Array.from({ length: p.meta.weeks - (p.isRace ? 1 : 0) }, (_, i) => p.kmTarget(i + 1))
  const avg = weeks.reduce((a, b) => a + b, 0) / Math.max(1, weeks.length)
  return [goals.monthKm ?? defaultMonthGoal(avg), (km: number) => setGoals(g => ({ ...g, monthKm: km })), goals.monthKm === undefined] as const
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


/** เวลาเป้าหมายแต่ละระยะ (ซิงก์ใน key 'goals' เดียวกับเป้ารายเดือน) */
export function useRaceGoals() {
  const [goals, setGoals] = usePersisted<{ monthKm?: number; race?: Partial<Record<RaceKey, number>> }>('goals', {})
  const set = (k: RaceKey, sec: number | null) => setGoals(g => {
    const race = { ...g.race }
    if (sec) race[k] = sec
    else delete race[k]
    return { ...g, race }
  })
  return [goals.race ?? {}, set] as const
}
