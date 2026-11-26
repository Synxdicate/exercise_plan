import { Check, Flag, TrendingUp } from 'lucide-react'
import { longRunLadder } from '../lib/ladder'
import { useRuns } from '../lib/log'
import { useProgram } from '../lib/program'
import { useToday } from '../lib/useToday'
import { addDays, shortDate } from '../lib/date'
import { useT } from '../lib/i18n'
import { cx } from '../lib/cx'
import { Disclosure } from './ui'

/** หน้าฝึก (โปรแกรมแข่ง): วิ่งยาวแต่ละสัปดาห์ถึงวันแข่ง ภายในเพดาน 110% และบอกว่าทันระยะในแผนไหม */
export function LadderCard() {
  const t = useT()
  const p = useProgram()
  const [runs] = useRuns()
  const today = useToday()
  const weeks: { monday: string; plan: number }[] = []
  if (p.isRace && p.raceDate && !p.finished && p.weeksUntilStart === 0)
    for (let w = p.currentWeek; w < p.meta.weeks; w++) weeks.push({ monday: p.mondayOf(w), plan: p.plan(w).find(d => d.runKind === 'long')?.targetKm ?? 0 })
  const km = p.raceKm ?? 0
  const l = longRunLadder(runs, today, weeks, km)
  if (!l || !l.peakPlan) return null
  const gap = +(km - l.peakReach).toFixed(1)
  return (
    <Disclosure
      title={<span className="flex items-center gap-2"><TrendingUp size={17} className="text-run" /> {t('ทางไปวันแข่ง (วิ่งยาว)', 'Road to race day (long runs)')}</span>}
      summary={l.onTrack
        ? t(`ทันแผน วิ่งยาวไกลสุดก่อนแข่ง ${l.peakReach} กม.`, `On track: longest run before the race ${l.peakReach} km`)
        : t(`ไกลสุดก่อนแข่งได้ ~${l.peakReach} กม. (แผน ${l.peakPlan})`, `Longest before the race ~${l.peakReach} km (plan ${l.peakPlan})`)}>
      <div className="space-y-3 text-sm">
        <p className="text-muted">{t(
          `วิ่งยาวแต่ละครั้งเพิ่มได้ไม่เกิน 10% ของครั้งที่ไกลที่สุดใน 30 วัน ตอนนี้ไกลสุด ${l.longest.toFixed(1)} กม. ถ้าวิ่งยาวได้ทุกสัปดาห์ จะไปได้ตามนี้`,
          `Each long run can grow at most 10% over your longest in 30 days. Your longest now is ${l.longest.toFixed(1)} km; running the long run every week gets you here:`)}</p>
        <ol className="divide-y divide-line rounded-xl ring-1 ring-line">
          {l.steps.filter(s => s.plan).map(s => (
            <li key={s.monday} className="flex items-center gap-2 px-3 py-2">
              <span className="w-20 shrink-0 text-muted">{shortDate(addDays(s.monday, 6))}</span>
              <span className="flex-1">
                <b className="tabular-nums">{s.reach} {t('กม.', 'km')}</b>
                {s.capped && <span className="text-xs text-muted"> {t(`(แผน ${s.plan} เกินเพดาน)`, `(plan ${s.plan}, over the cap)`)}</span>}
              </span>
              {s.done && <Check size={16} className="text-good" aria-label={t('วิ่งแล้ว', 'Done')} />}
            </li>
          ))}
          <li className="flex items-center gap-2 px-3 py-2 font-semibold">
            <span className="w-20 shrink-0 text-muted">{p.raceDate && shortDate(p.raceDate)}</span>
            <span className="flex-1">{t(`วันแข่ง ${km} กม.`, `Race ${km} km`)}</span>
            <Flag size={16} className="text-run" />
          </li>
        </ol>
        <p className={cx('rounded-xl p-2.5', l.onTrack ? 'bg-good/10' : 'bg-warn/10')}>{l.onTrack
          ? t('ระยะในแผนอยู่ในเพดานทุกสัปดาห์ วิ่งยาวให้ครบทุกสัปดาห์ก็ทัน', 'Every planned long run fits the cap; just get each one done.')
          : t(`ระยะในแผนบางสัปดาห์เกินเพดาน แอปจะให้วิ่งเท่าที่ปลอดภัยแทน อย่าวิ่งเกินเพื่อไล่ให้ทัน การพลาดวิ่งยาวสัปดาห์ไหนจะทำให้ระยะไกลสุดก่อนแข่งลดลงอีก`,
              `Some planned long runs exceed the cap; the app gives you the safe distance instead. Don’t push past it to catch up. Missing a long run lowers your peak further.`)}</p>
        {gap > 0 && (
          <p className="rounded-xl bg-raised p-2.5">{t(
            `งานแข่งยาวกว่าวิ่งยาวที่ไกลที่สุดประมาณ ${gap} กม. ช่วงท้ายจึงเป็นระยะที่ยังไม่เคยวิ่ง ถ้าเหนื่อยเกินให้สลับเดิน 1 นาทีทุก 1–2 กม. ได้ งานวิจัยพบว่าสลับเดินแล้วเวลาจบใกล้เคียงกับวิ่งตลอด และขาล้าน้อยกว่า`,
            `The race is about ${gap} km longer than your longest run, so the last part is new distance. If it gets too hard, walk 1 minute every 1–2 km: run-walk finishes in similar times with less leg fatigue.`)}</p>
        )}
      </div>
    </Disclosure>
  )
}
