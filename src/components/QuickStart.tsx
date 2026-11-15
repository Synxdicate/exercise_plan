import { Zap } from 'lucide-react'
import type { Day } from '../data/workouts'
import { quickExercises } from '../lib/quickWorkout'
import { useT } from '../lib/i18n'
import { useDayText } from '../lib/dayText'

/** ปุ่มเวทฉบับสั้น (~20 นาที) ใต้ปุ่มเริ่มฝึก บอกว่าทำท่าไหนบ้าง วันที่เวลาน้อย ทำแบบนี้ดีกว่าข้าม */
export function QuickStart({ day, onStart }: { day: Day; onStart: () => void }) {
  const t = useT()
  const dt = useDayText()
  const list = quickExercises(day.exercises)
  return (
    <button onClick={onStart} className="mt-2 flex w-full items-start gap-3 rounded-2xl bg-raised p-3 text-left">
      <Zap size={18} className="mt-0.5 shrink-0 text-accent" />
      <span className="min-w-0">
        <span className="block text-sm font-semibold">{t('เวลาน้อย ทำฉบับสั้น ~20 นาที', 'Short on time? Quick version ~20 min')}</span>
        <span className="block text-xs text-muted">
          {list.map(e => (dt.en ? e.name : e.th)).join(' · ')} {t(`ท่าละ ${list[0]?.sets ?? 2} เซ็ต น้ำหนักเท่าเดิม ทำแบบนี้ดีกว่าข้ามวัน`, `· ${list[0]?.sets ?? 2} sets each, same weight — better than skipping`)}
        </span>
      </span>
    </button>
  )
}
