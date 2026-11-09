import { useMemo } from 'react'
import { Trophy } from 'lucide-react'
import { programSummary } from '../lib/replay'
import { estimate } from '../lib/pace'
import { addDays, today } from '../lib/date'
import { useDayDone } from '../lib/dayDone'
import { formatDuration, formatPace, useRuns, useSessions } from '../lib/log'
import { useProgram } from '../lib/program'
import { usePersisted } from '../lib/storage'
import { useDayText } from '../lib/dayText'
import { useT } from '../lib/i18n'
import { Button, Disclosure } from './ui'

function useSummary() {
  const p = useProgram()
  const [runs] = useRuns()
  const [sessions] = useSessions()
  const dayDone = useDayDone()
  const from = p.storedStart || p.mondayOf(Math.min(1, ...p.prepWeeks))
  const to = p.finished && p.raceDate ? p.raceDate : today()
  const first = Math.min(1, ...p.prepWeeks)
  const last = Math.min(p.currentWeek, p.meta.weeks)
  let planned = 0, done = 0
  for (let w = first; w <= last; w++) {
    p.plan(w).forEach((d, i) => {
      if (d.type === 'rest' || addDays(p.mondayOf(w), i) > to) return
      planned++
      if (dayDone(w, i, d)) done++
    })
  }
  const before = useMemo(() => estimate(runs, from)?.fiveK ?? null, [runs, from])
  const now = useMemo(() => estimate(runs, to)?.fiveK ?? null, [runs, to])
  return { p, from, to, s: programSummary({ runs, sessions, from, to, planned, done, fiveKBefore: before, fiveKNow: now }) }
}

function Stats() {
  const t = useT()
  const { p, s } = useSummary()
  const cutoff = p.raceCutoff ? p.raceCutoff * 60 : null
  const cells: [string, string][] = [
    [t('วิ่ง', 'Runs'), `${s.runs} ${t('ครั้ง', '')}`],
    [t('ระยะรวม', 'Distance'), `${s.km} ${t('กม.', 'km')}`],
    [t('เวลาวิ่ง', 'Run time'), formatDuration(s.seconds)],
    [t('เวท', 'Strength'), `${s.lifts} ${t('ครั้ง', '')}`],
    [t('ทำตามแผน', 'Plan done'), s.adherence !== null ? `${s.adherence}%` : '-'],
    [t('ไกลสุด', 'Longest'), s.longest ? `${s.longest.km.toFixed(1)} ${t('กม.', 'km')}` : '-'],
  ]
  return (
    <>
      {s.race && (
        <div className="mb-3 rounded-xl bg-good/10 p-3 text-sm">
          <div className="font-bold">{t(`วันแข่ง ${s.race.km.toFixed(2)} กม. ใน ${formatDuration(s.race.seconds)}`, `Race day: ${s.race.km.toFixed(2)} km in ${formatDuration(s.race.seconds)}`)}</div>
          <div className="text-muted">{t('เพซเฉลี่ย', 'Avg pace')} {formatPace(s.race.seconds, s.race.km)} {t('/กม.', '/km')}{cutoff ? (s.race.seconds <= cutoff ? t(` · ทันเวลาตัด เหลือ ${formatDuration(cutoff - s.race.seconds)}`, ` · ${formatDuration(cutoff - s.race.seconds)} inside the cutoff`) : t(' · เกินเวลาตัด', ' · over the cutoff')) : ''}</div>
        </div>
      )}
      <div className="grid grid-cols-3 gap-2 text-center">
        {cells.map(([l, v]) => (
          <div key={l} className="rounded-xl bg-raised px-1 py-2">
            <div className="text-[11px] text-muted">{l}</div>
            <div className="font-bold tabular-nums">{v}</div>
          </div>
        ))}
      </div>
      {s.fiveKGain && <p className="mt-2 text-sm">{t(`เวลา 5K คาดการณ์เร็วขึ้น ${formatDuration(s.fiveKGain)} ตั้งแต่เริ่มโปรแกรม`, `Predicted 5K time improved by ${formatDuration(s.fiveKGain)} since the start`)}</p>}
    </>
  )
}

/** สรุปจนถึงตอนนี้ (หน้าฝึก โปรแกรมแข่งที่ยังไม่จบ) */
export function ReplaySoFar() {
  const p = useProgram()
  const t = useT()
  if (!p.isRace || p.finished || p.currentWeek < 2) return null
  return (
    <Disclosure title={<span className="flex items-center gap-2"><Trophy size={17} className="text-warn" /> {t('สรุปโปรแกรมจนถึงตอนนี้', 'Program so far')}</span>}
      summary={t(`สัปดาห์ที่ ${p.currentWeek} จาก ${p.meta.weeks}`, `Week ${p.currentWeek} of ${p.meta.weeks}`)}>
      <Stats />
    </Disclosure>
  )
}

/** หลังวันแข่ง (หน้าแรก): สรุปทั้งโปรแกรม แบบ Plan Replay — ปิดได้ */
export function ReplayCard() {
  const p = useProgram()
  const t = useT()
  const dt = useDayText()
  const [seen, setSeen] = usePersisted('replaySeen', '')
  if (!p.finished || !p.raceDate || seen === p.raceDate) return null
  return (
    <section className="animate-fade-up rounded-2xl bg-card p-3.5 shadow-sm ring-1 ring-line">
      <div className="mb-2 flex items-center gap-2 font-bold"><Trophy size={18} className="text-warn" /> {t(`จบโปรแกรม${dt.program(p.program).short}แล้ว`, `${dt.program(p.program).short} program complete`)}</div>
      <Stats />
      <p className="mt-2 text-xs text-muted">{t('พักฟื้นตามที่แอปแนะนำก่อน แล้วค่อยเลือกโปรแกรมถัดไปในหน้าฝึก', 'Recover as suggested first, then pick your next program in the plan tab')}</p>
      <Button size="sm" variant="soft" className="mt-2" onClick={() => setSeen(p.raceDate!)}>{t('ปิด', 'Close')}</Button>
    </section>
  )
}
