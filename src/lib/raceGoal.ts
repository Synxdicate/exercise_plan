import { useMemo } from 'react'
import { estimate } from './pace'
import { planGoal, racePlan, raceKeyOf } from './racePlan'
import { useRaceGoals } from './useGoals'
import { useRuns } from './log'

/** เวลาเป้าของงานแข่งระยะ km (เป้าที่ตั้งไว้ผ่าน planGoal หรือเวลาคาดการณ์) null = ยังไม่มีข้อมูลพอ */
export function useRaceGoalSec(km: number) {
  const [runs] = useRuns()
  const [goals] = useRaceGoals()
  const key = raceKeyOf(km)
  const est = useMemo(() => (key ? estimate(runs) : null), [key, runs])
  const g = key ? planGoal(goals[key], est?.[key]) : null
  return key && g ? racePlan(key, g.sec, km).goalSec : null
}
