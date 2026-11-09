import { useEffect, useMemo } from 'react'
import { BADGES, BADGES_EN, STICKY, defaultMonthGoal, earnedBadges, planStreak, type Ctx, type RaceKey } from './goals'
import { weekStart } from './date'
import { useDayDone } from './dayDone'
import { useRuns, useSessions } from './log'
import { usePersisted } from './storage'
import { useProgram } from './program'
import { notify } from './dialog'
import { trNow } from './i18n'

export function useMonthGoal() {
  const p = useProgram()
  const [goals, setGoals] = usePersisted<{ monthKm?: number; race?: Partial<Record<RaceKey, number>> }>('goals', {})
  // เฉลี่ยทั้งโปรแกรม (ไม่นับสัปดาห์แข่ง) ใช้สัปดาห์ปัจจุบันจะทำให้เป้าเดือนเปลี่ยนกลางเดือนตอนเข้าสัปดาห์ลด
  const weeks = Array.from({ length: p.meta.weeks - (p.isRace ? 1 : 0) }, (_, i) => p.kmTarget(i + 1))
  const avg = weeks.reduce((a, b) => a + b, 0) / Math.max(1, weeks.length)
  return [goals.monthKm ?? defaultMonthGoal(avg), (km: number) => setGoals(g => ({ ...g, monthKm: km })), goals.monthKm === undefined] as const
}

/** ข้อมูลสำหรับคิดเหรียญ: บันทึกทั้งหมด + สัปดาห์ที่ทำตามแผน (เฉพาะสัปดาห์ที่จบแล้ว) + วันแข่ง */
export function useBadgeCtx(): Ctx {
  const [runs] = useRuns()
  const [sessions] = useSessions()
  const [goalKm] = useMonthGoal()
  const p = useProgram()
  const dayDone = useDayDone()
  // โปรแกรมมีจุดจบ: สัปดาห์ 1 (หรือช่วงเตรียมตัว) ถึงสัปดาห์ที่จบแล้ว; วนรอบ: 26 สัปดาห์ล่าสุดนับจากวันเริ่ม (เลขสัปดาห์ ≤0 = รอบก่อน ๆ)
  const first = p.ongoing ? p.currentWeek - 26 : Math.min(1, ...p.prepWeeks)
  const last = p.finished ? p.meta.weeks : p.currentWeek - 1
  const since = p.storedStart ? weekStart(p.storedStart) : ''
  const weeks: { planned: number; done: number }[] = []
  for (let w = first; w <= last; w++) {
    if (p.ongoing && p.mondayOf(w) < since) continue
    let planned = 0, done = 0
    p.plan(w).forEach((d, i) => { if (d.type !== 'rest') { planned++; if (dayDone(w, i, d)) done++ } })
    weeks.push({ planned, done })
  }
  const planWeeks = planStreak(weeks)
  // เหรียญที่ขึ้นกับโปรแกรม/วันแข่งตอนนั้น: ได้แล้วไม่หายเมื่อเปลี่ยนโปรแกรมหรือวันแข่ง
  const [seen] = usePersisted<string[] | null>('badgesSeen', null)
  const kept = useMemo(() => (seen ?? []).filter(id => STICKY.includes(id)), [seen])
  return useMemo(() => ({ runs, sessions, goalKm, planWeeks, kept, raceDate: p.isRace && p.raceDate ? p.raceDate : undefined }), [runs, sessions, goalKm, planWeeks, kept, p.isRace, p.raceDate])
}

/** แจ้งเตือนเมื่อได้เหรียญใหม่ ครั้งแรกบนเครื่องนี้ถือว่าเหรียญที่มีอยู่แล้ว "เห็นแล้ว" ไม่แจ้งย้อนหลัง */
export function useBadgeWatcher() {
  const ctx = useBadgeCtx()
  const [seen, setSeen] = usePersisted<string[] | null>('badgesSeen', null)
  const earned = useMemo(() => earnedBadges(ctx), [ctx])
  useEffect(() => {
    if (seen === null) return setSeen(earned)
    const fresh = earned.filter(id => !seen.includes(id))
    if (!fresh.length) return
    for (const id of fresh) notify(trNow(`ได้เหรียญใหม่: ${BADGES.find(b => b.id === id)?.title}`, `New badge: ${BADGES_EN[id]?.[0] ?? id}`), 'good')
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
