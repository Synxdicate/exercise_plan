import { ClipboardCheck, Timer } from 'lucide-react'
import type { Day } from '../data/workouts'
import { raceKm, raceLabel } from '../lib/goals'
import { racePlan, raceKeyOf } from '../lib/racePlan'
import { formatDuration, formatPace, useRuns } from '../lib/log'
import { estimate } from '../lib/pace'
import { useRaceGoals } from '../lib/useGoals'
import { usePersisted } from '../lib/storage'
import { defaultProfile, type Profile } from '../lib/calc'
import { cx } from '../lib/cx'
import { useRaceDrink } from '../lib/sweat'

/** แผนวันแข่ง: เพซแต่ละช่วง + เวลาที่ควรถึงแต่ละจุด + เช็กลิสต์สัปดาห์แข่ง */
export function RacePlan({ day, date }: { day: Day; date: string }) {
  const key = raceKeyOf(day.targetKm)
  const [runs] = useRuns()
  const [goals] = useRaceGoals()
  const [profile] = usePersisted<Profile>('profile', defaultProfile)
  const [checked, setChecked] = usePersisted<Record<string, string[]>>('raceChecklist', {})
  const est = key ? estimate(runs) : null
  const goal = key ? goals[key] ?? est?.[key] : undefined
  const plan = key && goal ? racePlan(key, goal, day.targetKm) : null
  const drink = useRaceDrink(plan ? plan.goalSec / 60 : 75)
  if (!key) return null
  const carbs = Math.round(profile.weightKg * (key === 'full' ? 8 : 6))
  const items = [
    'ลดปริมาณตามแผน (taper) ไม่ซ้อมหนักเพิ่มเพื่อ "ชดเชย"',
    key === 'full' || key === 'half' ? `1–2 วันก่อนแข่ง กินคาร์บ ~${carbs} ก./วัน (ข้าว เส้น ขนมปัง) ลดอาหารไขมัน/ไฟเบอร์สูง` : 'มื้อก่อนแข่งเป็นอาหารที่กินประจำ ย่อยง่าย',
    'นอนให้พอ 2 คืนก่อนแข่ง (คืนก่อนแข่งนอนไม่หลับไม่เป็นไร)',
    'ใช้รองเท้า ชุด และเจลที่เคยซ้อมแล้วเท่านั้น — ห้ามของใหม่วันแข่ง',
    'ซ้อมดื่มน้ำ/กินเจลระหว่างวิ่งยาวมาแล้ว',
    'เช็กอากาศ (หน้าวิ่ง) ร้อนมากให้ลดเป้าเวลา',
    'ไปถึงก่อนปล่อยตัว 45–60 นาที วอร์มเบา ๆ',
  ]
  const done = checked[date] ?? []
  const toggle = (i: string) => setChecked(prev => {
    const cur = prev[date] ?? []
    return { ...prev, [date]: cur.includes(i) ? cur.filter(x => x !== i) : [...cur, i] }
  })

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-raised p-3 text-sm">
        <div className="mb-2 flex items-center gap-2 font-bold"><Timer size={16} className="text-accent" /> แผนเพซ {raceLabel[key]}</div>
        {plan ? (
          <>
            <div className="text-xs text-muted">{goals[key] ? 'จากเป้าที่ตั้งไว้' : 'จากเวลาคาดการณ์ (ตั้งเป้าเองได้ที่หน้าวิ่ง → สถิติ)'} · {formatDuration(plan.goalSec)}{day.targetKm !== raceKm[key] && ` (${day.targetKm} กม.)`}</div>
            <ol className="mt-2 space-y-1">
              <li className="flex justify-between gap-2"><span>2 กม. แรก — อย่ารีบ</span><b className="tabular-nums">{formatPace(plan.startPace, 1)} /กม.</b></li>
              <li className="flex justify-between gap-2"><span>หลังจากนั้นถือเพซ</span><b className="tabular-nums">{formatPace(plan.restPace, 1)} /กม.</b></li>
              {key !== 'fiveK' && key !== 'tenK' && <li className="text-xs text-muted">ครึ่งหลังยังไหวค่อยเร่ง — ครึ่งแรกเร็วเกินคือสาเหตุ "ชนกำแพง" ที่พบบ่อย</li>}
            </ol>
            <div className="mt-2 grid grid-cols-3 gap-1.5 text-center">
              {plan.splits.map(s => (
                <div key={s.km} className="rounded-lg bg-card px-1 py-1.5 ring-1 ring-line">
                  <div className="text-[10px] text-muted">กม. {+s.km.toFixed(1)}</div>
                  <div className="text-xs font-bold tabular-nums">{formatDuration(s.at)}</div>
                </div>
              ))}
            </div>
            <p className="mt-2 text-xs">{drink ?? 'ยังไม่ได้ทดสอบเหงื่อ — ทำที่หน้าวิ่ง → สถิติ จะรู้ว่าต้องดื่มเท่าไร'}</p>
            {plan.fuel > 0 && <p className="mt-2 text-xs">ดื่มน้ำทุกจุดให้น้ำ (จิบ 2–3 อึก) · เจล/คาร์บ ~{plan.fuel} ครั้ง: ครั้งแรกนาทีที่ ~45 แล้วทุก ~35 นาที</p>}
          </>
        ) : <p className="text-xs text-muted">วิ่งให้ได้ ≥3 กม. สักครั้ง หรือตั้งเวลาเป้าหมาย แล้วแอปจะคำนวณแผนเพซให้</p>}
      </div>
      <div className="rounded-2xl bg-raised p-3 text-sm">
        <div className="mb-2 flex items-center gap-2 font-bold"><ClipboardCheck size={16} className="text-good" /> เช็กลิสต์สัปดาห์แข่ง <span className="ml-auto text-xs font-normal text-muted">{done.length}/{items.length}</span></div>
        <ul className="space-y-1.5">
          {items.map(i => (
            <li key={i}>
              <label className="flex items-start gap-2">
                <input type="checkbox" className="mt-0.5 size-4 shrink-0 accent-accent" checked={done.includes(i)} onChange={() => toggle(i)} />
                <span className={cx(done.includes(i) && 'text-muted line-through')}>{i}</span>
              </label>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
