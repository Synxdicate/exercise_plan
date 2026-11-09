import { useMemo } from 'react'
import { useRuns } from './log'
import { finishEstimate } from './pace'
import { useProgram } from './program'
import { today } from './date'

/** เวลาจบงานแข่งโดยประมาณ (รวมวิ่งสลับเดิน) เทียบเวลาตัดตัว สำหรับมือใหม่ที่ยังไม่มีผลวิ่งต่อเนื่องให้ทำนายแบบเต็ม */
export function useFinish() {
  const p = useProgram()
  const [runs] = useRuns()
  const km = p.raceKm
  const f = useMemo(() => (p.isRace && km ? finishEstimate(runs, km, today()) : null), [runs, km, p.isRace])
  const margin = f && p.raceCutoff ? p.raceCutoff * 60 - f.sec : null
  return { f, km, cutoff: p.raceCutoff, margin, show: p.isRace && !p.finished }
}

