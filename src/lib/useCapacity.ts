import { useMemo } from 'react'
import { useRuns } from './log'
import { capacity } from './programFit'

/** ความสามารถวิ่งตอนนี้ (ไกลสุด/นานสุดใน 60 วัน) — ใช้เลือก/แนะนำโปรแกรม */
export function useCapacity() {
  const [runs] = useRuns()
  return useMemo(() => capacity(runs), [runs])
}
