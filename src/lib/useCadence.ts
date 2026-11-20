import { cadenceTarget, latestCadence, type CadenceCheck } from './cadence'
import { usePersisted } from './storage'
import { useToday } from './useToday'
import { uid } from './log'

export const useCadenceLog = () => usePersisted<CadenceCheck[]>('cadenceLog', [])

/** เป้าที่ใช้: ค่าที่ตั้งเอง หรือ +5% จากผลวัดล่าสุดใน 90 วัน */
export function useCadenceGoal() {
  const [log] = useCadenceLog()
  const [goal, setGoal] = usePersisted<number | null>('cadenceGoal', null)
  const last = latestCadence(log, useToday())
  return { last, goal: goal ?? (last ? cadenceTarget(last.spm) : null), custom: goal !== null, setGoal }
}

export function useAddCadence() {
  const [, setLog] = useCadenceLog()
  const day = useToday()
  return (spm: number, how: CadenceCheck['how']) => setLog(prev => [...prev, { id: uid(), date: day, spm, how }])
}
