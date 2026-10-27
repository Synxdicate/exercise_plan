import { useState, type ReactNode } from 'react'
import { muscleNames, weeklySets, type Muscle } from '../data/muscles'
import type { Day } from '../data/workouts'
import { heat } from '../lib/heat'
import { BodyMap } from './BodyMap'
import { Card } from './ui'

const TARGET_SETS = 10
const fmt = (n: number) => n.toFixed(1).replace('.0', '')

/** กล้ามเนื้อที่ได้ฝึกในสัปดาห์ (จำนวนเซ็ต) — แสดงในแท็บฝึกใต้ตารางของสัปดาห์นั้น */
export function WeeklyMuscles({ plan }: { plan: Day[] }) {
  const sets = weeklySets(plan)
  if (!Object.values(sets).some(Boolean)) return null
  const intensity = Object.fromEntries(Object.entries(sets).map(([m, n]) => [m, Math.min(1, n! / TARGET_SETS)]))
  return (
    <Card title="กล้ามเนื้อที่ได้ฝึกสัปดาห์นี้">
      <p className="-mt-2 mb-2 text-xs text-muted">สีเข้ม = ใกล้ {TARGET_SETS} เซ็ต/สัปดาห์ (กล้ามรองนับครึ่งเซ็ต)</p>
      <BodyMap intensity={intensity} label={m => `${muscleNames[m]}: ${fmt(sets[m] ?? 0)} เซ็ต/สัปดาห์`} />
      <MuscleList>
        {(Object.keys(muscleNames) as Muscle[])
          .sort((a, b) => (sets[b] ?? 0) - (sets[a] ?? 0))
          .map(m => (
            <li key={m} className="grid grid-cols-[6.5rem_1fr_2rem] items-center gap-2">
              <span>{muscleNames[m]}</span>
              <span className="h-2 overflow-hidden rounded-full bg-body">
                <span className="block h-full rounded-full transition-[width] duration-700" style={{ width: `${Math.min(100, ((sets[m] ?? 0) / TARGET_SETS) * 100)}%`, background: heat((sets[m] ?? 0) / TARGET_SETS) }} />
              </span>
              <span className="text-right tabular-nums text-muted">{fmt(sets[m] ?? 0)}</span>
            </li>
          ))}
      </MuscleList>
    </Card>
  )
}

function MuscleList({ children }: { children: ReactNode[] | ReactNode }) {
  const [all, setAll] = useState(false)
  const items = Array.isArray(children) ? children.flat() : [children]
  const shown = all ? items : items.slice(-5)
  return (
    <div className="mt-3">
      {!all && <div className="mb-1 text-xs text-muted">ได้น้อยที่สุด 5 ส่วน</div>}
      <ul className="space-y-1.5 text-sm">{shown}</ul>
      <button onClick={() => setAll(!all)} className="mt-2 text-sm font-semibold text-run">{all ? 'ย่อ' : `ดูทั้งหมด ${items.length} ส่วน`}</button>
    </div>
  )
}
