import { CalendarRange } from 'lucide-react'
import { defaultProfile, targets, type Profile } from '../lib/calc'
import { useRuns, useSessions } from '../lib/log'
import { runsOnly } from '../lib/walk'
import { useProgram } from '../lib/program'
import { usePersisted } from '../lib/storage'
import { addDays, shortDate, today, weekStart } from '../lib/date'
import { cx } from '../lib/cx'
import { useT } from '../lib/i18n'
import { useDayText } from '../lib/dayText'
import { Disclosure } from './ui'

type FoodLog = Record<string, { protein: number }[]>

/** สรุปสัปดาห์ที่แล้ว (เทียบเป้าของสัปดาห์นั้น) + สิ่งที่รอในสัปดาห์นี้ */
export function WeekSummary() {
  const [runs] = useRuns()
  const [sessions] = useSessions()
  const [food] = usePersisted<FoodLog>('foodLog', {})
  const [profile] = usePersisted<Profile>('profile', defaultProfile)
  const p = useProgram()
  const t = useT()
  const dt = useDayText()
  const last = addDays(weekStart(today()), -7)
  const r = runs.filter(x => weekStart(x.date) === last)
  const s = sessions.filter(x => weekStart(x.date) === last)
  if (!r.length && !s.length) return null

  // สัปดาห์ของโปรแกรมตามวันที่จริง (ช่วงเตรียมตัว/สัปดาห์ที่ทำซ้ำ/รอบวน) — เดิมเดาเป็นสัปดาห์นี้ − 1
  const prevWeek = p.weekOf(last) ?? Math.max(1, p.currentWeek - 1)
  const prevPlan = p.plan(prevWeek)
  const km = runsOnly(r).reduce((a, x) => a + x.km, 0)
  const kmGoal = p.kmTarget(prevWeek)
  const strGoal = prevPlan.filter(d => d.type === 'strength').length
  const foodDays = Array.from({ length: 7 }, (_, i) => food[addDays(last, i)]).filter(d => d?.length)
  const protein = foodDays.length ? foodDays.reduce((a, d) => a + d.reduce((b, i) => b + i.protein, 0), 0) / foodDays.length : null
  const proteinGoal = targets(profile, p.isRace).protein
  const longest = runsOnly(r).reduce((a, x) => Math.max(a, x.km), 0)

  const rows = [
    // โปรแกรมไม่มีแผนวิ่ง: แสดงระยะเฉย ๆ ไม่นับเป็นเป้า
    ...(kmGoal ? [{ label: t('วิ่ง', 'Run'), value: `${km.toFixed(1)} / ${kmGoal} ${t('กม.', 'km')}`, ok: km >= kmGoal * 0.9 }] : []),
    { label: t('เวท', 'Strength'), value: `${s.length} / ${strGoal}${t(' ครั้ง', '')}`, ok: s.length >= strGoal },
    ...(protein !== null ? [{ label: t(`โปรตีนเฉลี่ย (${foodDays.length} วันที่บันทึก)`, `Avg protein (${foodDays.length} logged days)`), value: `${Math.round(protein)} / ${proteinGoal} ${t('ก.', 'g')}`, ok: protein >= proteinGoal * 0.9 }] : []),
  ]
  const hit = rows.filter(x => x.ok).length
  const thisPlan = p.plan()
  const quality = thisPlan.find(d => d.runKind === 'tempo' || d.runKind === 'interval')
  const long = thisPlan.find(d => d.runKind === 'long' || d.runKind === 'race')

  return (
    <Disclosure title={<span className="flex items-center gap-2"><CalendarRange size={17} className="text-accent" /> {t('สรุปสัปดาห์ที่แล้ว', 'Last week')}</span>}
      summary={`${shortDate(last)}–${shortDate(addDays(last, 6))} · ${t(`ถึงเป้า ${hit}/${rows.length} อย่าง`, `${hit}/${rows.length} goals met`)}`}>
      <ul className="space-y-1.5 text-sm">
        {rows.map(x => (
          <li key={x.label} className="flex items-center justify-between gap-2">
            <span className="text-muted">{x.label}</span>
            <span className={cx('font-semibold tabular-nums', x.ok ? 'text-good' : 'text-warn')}>{x.value}</span>
          </li>
        ))}
        {longest > 0 && <li className="flex justify-between gap-2"><span className="text-muted">{t('วิ่งไกลสุด', 'Longest run')}</span><span className="font-semibold tabular-nums">{longest.toFixed(1)} {t('กม.', 'km')}</span></li>}
      </ul>
      <div className="mt-3 rounded-xl bg-raised px-3 py-2 text-sm">
        <div className="text-xs text-muted">{t('สัปดาห์นี้', 'This week')}</div>
        <div>{p.kmTarget() ? t(`วิ่งรวม ${p.kmTarget()} กม. · `, `Run ${p.kmTarget()} km · `) : ''}{t(`เวท ${thisPlan.filter(d => d.type === 'strength').length} วัน`, `${thisPlan.filter(d => d.type === 'strength').length} strength days`)}</div>
        {(quality || long) && <div className="text-xs text-muted">{[quality && `${dt.weekday(quality)}: ${dt.title(quality)}`, long && `${dt.weekday(long)}: ${dt.title(long)}${long.title.includes('กม') ? '' : ` ${long.targetKm} ${t('กม.', 'km')}`}`].filter(Boolean).join(' · ')}</div>}
      </div>
    </Disclosure>
  )
}
