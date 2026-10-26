import { CalendarRange } from 'lucide-react'
import { defaultProfile, targets, type Profile } from '../lib/calc'
import { useRuns, useSessions } from '../lib/log'
import { useProgram } from '../lib/program'
import { usePersisted } from '../lib/storage'
import { addDays, shortDate, today, weekStart } from '../lib/date'
import { cx } from '../lib/cx'
import { Disclosure } from './ui'

type FoodLog = Record<string, { protein: number }[]>

/** สรุปสัปดาห์ที่แล้ว (เทียบเป้าของสัปดาห์นั้น) + สิ่งที่รอในสัปดาห์นี้ */
export function WeekSummary() {
  const [runs] = useRuns()
  const [sessions] = useSessions()
  const [food] = usePersisted<FoodLog>('foodLog', {})
  const [profile] = usePersisted<Profile>('profile', defaultProfile)
  const p = useProgram()
  const last = addDays(weekStart(today()), -7)
  const r = runs.filter(x => weekStart(x.date) === last)
  const s = sessions.filter(x => weekStart(x.date) === last)
  if (!r.length && !s.length) return null

  const n = p.meta.weeks
  const prevWeek = p.ongoing ? ((p.currentWeek - 2 + n) % n) + 1 : Math.max(1, p.currentWeek - 1)
  const prevPlan = p.plan(prevWeek)
  const km = r.reduce((a, x) => a + x.km, 0)
  const kmGoal = p.kmTarget(prevWeek)
  const strGoal = prevPlan.filter(d => d.type === 'strength').length
  const foodDays = Array.from({ length: 7 }, (_, i) => food[addDays(last, i)]).filter(d => d?.length)
  const protein = foodDays.length ? foodDays.reduce((a, d) => a + d.reduce((b, i) => b + i.protein, 0), 0) / foodDays.length : null
  const proteinGoal = targets(profile, p.isRace).protein
  const longest = r.reduce((a, x) => Math.max(a, x.km), 0)

  const rows = [
    // โปรแกรมไม่มีแผนวิ่ง: แสดงระยะเฉย ๆ ไม่นับเป็นเป้า
    ...(kmGoal ? [{ label: 'วิ่ง', value: `${km.toFixed(1)} / ${kmGoal} กม.`, ok: km >= kmGoal * 0.9 }] : []),
    { label: 'เวท', value: `${s.length} / ${strGoal} ครั้ง`, ok: s.length >= strGoal },
    ...(protein !== null ? [{ label: `โปรตีนเฉลี่ย (${foodDays.length} วันที่บันทึก)`, value: `${Math.round(protein)} / ${proteinGoal} ก.`, ok: protein >= proteinGoal * 0.9 }] : []),
  ]
  const hit = rows.filter(x => x.ok).length
  const thisPlan = p.plan()
  const quality = thisPlan.find(d => d.runKind === 'tempo' || d.runKind === 'interval')
  const long = thisPlan.find(d => d.runKind === 'long' || d.runKind === 'race')

  return (
    <Disclosure title={<span className="flex items-center gap-2"><CalendarRange size={17} className="text-accent" /> สรุปสัปดาห์ที่แล้ว</span>}
      summary={`${shortDate(last)}–${shortDate(addDays(last, 6))} · ถึงเป้า ${hit}/${rows.length} อย่าง`}>
      <ul className="space-y-1.5 text-sm">
        {rows.map(x => (
          <li key={x.label} className="flex items-center justify-between gap-2">
            <span className="text-muted">{x.label}</span>
            <span className={cx('font-semibold tabular-nums', x.ok ? 'text-good' : 'text-warn')}>{x.value}</span>
          </li>
        ))}
        {longest > 0 && <li className="flex justify-between gap-2"><span className="text-muted">วิ่งไกลสุด</span><span className="font-semibold tabular-nums">{longest.toFixed(1)} กม.</span></li>}
      </ul>
      <div className="mt-3 rounded-xl bg-raised px-3 py-2 text-sm">
        <div className="text-xs text-muted">สัปดาห์นี้</div>
        <div>{p.kmTarget() ? `วิ่งรวม ${p.kmTarget()} กม. · ` : ''}เวท {thisPlan.filter(d => d.type === 'strength').length} วัน</div>
        {(quality || long) && <div className="text-xs text-muted">{[quality && `${quality.day}: ${quality.title}`, long && `${long.day}: ${long.title} ${long.targetKm} กม.`].filter(Boolean).join(' · ')}</div>}
      </div>
    </Disclosure>
  )
}
