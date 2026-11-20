import { useEffect, useMemo, useState } from 'react'
import { CloudSun, Droplets, TriangleAlert } from 'lucide-react'
import { aidPlan, longestAidGap, parseAid } from '../lib/aid'
import { fetchClimate, raceHours, CLIMATE_YEARS, type Climate } from '../lib/raceClimate'
import { heatAdvice, heatLevel } from '../lib/weather'
import { useRaceCourse } from '../lib/course'
import { useNeedMlph } from '../lib/sweat'
import { formatDuration } from '../lib/log'
import { niceDate } from '../lib/date'
import { useProgram } from '../lib/program'
import { usePersisted } from '../lib/storage'
import { useT } from '../lib/i18n'
import { cx } from '../lib/cx'
import { Disclosure } from './ui'
import { useRaceGoalSec } from '../lib/raceGoal'

const BANGKOK = { lat: 13.75, lon: 100.5 }
type ClimateCache = { key: string; data: Climate | null }

/** จุดให้น้ำ + ดื่มเท่าไรที่แต่ละจุด (ใช้ทั้งการ์ดวันแข่งในหน้าฝึกและแผนวันแข่ง) */
export function AidPlanList({ km, goalSec }: { km: number; goalSec: number | null }) {
  const t = useT()
  const [aid] = usePersisted<number[]>('raceAid', [])
  const need = useNeedMlph(goalSec ? goalSec / 60 : km * 7)
  if (!aid.length) return null
  const gap = longestAidGap(aid, km)
  const rows = goalSec && need !== null ? aidPlan(aid, km, goalSec, need) : null
  return (
    <div className="mt-2 space-y-2">
      {rows ? (
        <ul className="divide-y divide-line text-sm">
          {rows.map(r => (
            <li key={r.km} className="flex items-center gap-2 py-1">
              <Droplets size={14} className="shrink-0 text-run" />
              <span className="w-16 shrink-0 tabular-nums text-muted">{t('กม.', 'km')} {r.km}</span>
              <span className="flex-1">{r.ml ? t(`ดื่ม ~${r.ml} มล.`, `drink ~${r.ml} ml`) : t('จิบพอชุ่มคอ', 'a sip')}</span>
              <span className="text-xs text-muted">{t(`ถึง กม. ${r.untilKm}`, `to km ${r.untilKm}`)}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm">
          {t('จุดให้น้ำที่ กม. ', 'Aid stations at km ')}{aid.join(', ')}
          <span className="block text-xs text-muted">{t('ทำทดสอบเหงื่อ (หน้าวิ่ง → สถิติ) แล้วแอปจะบอกว่าดื่มเท่าไรที่แต่ละจุด', 'Do a sweat test (runs → stats) to see how much to drink at each one')}</span>
        </p>
      )}
      {gap.km >= 3 && (
        <p className="flex items-start gap-2 rounded-xl bg-warn/15 p-2 text-xs text-warn">
          <TriangleAlert size={14} className="mt-0.5 shrink-0" />
          {t(`ช่วง กม. ${gap.from}–${gap.to} (${gap.km} กม.) ไม่มีจุดให้น้ำ ดื่มที่จุดก่อนหน้าให้พอ หรือพกขวดเล็ก`, `km ${gap.from}–${gap.to} (${gap.km} km) has no aid station; drink enough at the one before or carry a small bottle`)}
        </p>
      )}
    </div>
  )
}

/** หน้าฝึก โปรแกรมแข่ง: อากาศเช้าวันแข่งตามปกติ (5 ปีก่อน) และจุดให้น้ำของงาน */
export function RaceDayCard() {
  const p = useProgram()
  const t = useT()
  const [course] = useRaceCourse()
  const [start, setStart] = usePersisted('raceStartTime', '')
  const [aid, setAid] = usePersisted<number[]>('raceAid', [])
  const [aidText, setAidText] = useState(aid.join(', '))
  const [cache, setCache] = usePersisted<ClimateCache | null>('raceClimate', null)
  const [status, setStatus] = useState<'idle' | 'busy' | 'error'>('idle')
  const km = p.raceKm ?? 0
  const goalSec = useRaceGoalSec(km)
  const loc = course?.route[0] ? { lat: course.route[0][0], lon: course.route[0][1] } : BANGKOK
  const hours = useMemo(() => (start ? raceHours(start, goalSec ? goalSec / 60 : km * 7) : []), [start, goalSec, km])
  const key = p.raceDate && start ? `${p.raceDate}|${loc.lat.toFixed(2)}|${loc.lon.toFixed(2)}|${hours.join(',')}` : ''
  const fresh = cache?.key === key
  useEffect(() => {
    if (!key || fresh) return
    let live = true
    const id = setTimeout(() => {
      setStatus('busy')
      fetchClimate(loc.lat, loc.lon, p.raceDate, hours)
        .then(data => { if (live) { setCache({ key, data }); setStatus('idle') } }, () => { if (live) setStatus('error') })
    }, 600)
    return () => { live = false; clearTimeout(id) }
  }, [key, fresh]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!p.isRace || p.finished || !km) return null
  const c = fresh ? cache!.data : null
  const extra = c && goalSec ? Math.round((goalSec * c.slowdown) / 100) : 0
  const saveAid = (v: string) => { setAidText(v); setAid(parseAid(v, km)) }

  return (
    <Disclosure title={<span className="flex items-center gap-2"><CloudSun size={17} className="text-run" /> {t('อากาศและจุดให้น้ำวันแข่ง', 'Race-day weather & aid stations')}</span>}
      summary={c ? t(`ปกติ ${c.temp}°C ความชื้น ${c.rh}%${aid.length ? ` · จุดให้น้ำ ${aid.length} จุด` : ''}`, `Usually ${c.temp}°C, ${c.rh}% humidity${aid.length ? ` · ${aid.length} aid stations` : ''}`) : t('ใส่เวลาปล่อยตัวและจุดให้น้ำ แล้วรู้อากาศตามปกติของวันแข่ง', 'Add the start time and aid stations to see the usual race-day weather')}>
      <div className="space-y-3 text-sm">
        <div className="grid grid-cols-2 gap-2">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-muted">{t('เวลาปล่อยตัว', 'Start time')}</span>
            <input type="time" value={start} onChange={e => setStart(e.target.value)} className="w-full" />
          </label>
          <div className="text-xs text-muted">
            <span className="mb-1 block font-semibold">{t('วันแข่ง', 'Race day')}</span>
            {p.raceDate ? niceDate(p.raceDate) : t('ยังไม่ได้ตั้งวันแข่ง (ตั้งในการ์ดโปรแกรม)', 'No race date yet (set it on the program card)')}
          </div>
        </div>

        {p.raceDate && start && (
          <div className="rounded-xl bg-raised p-3" role="status">
            {status === 'busy' && !c && <p className="text-muted">{t('กำลังดูอากาศย้อนหลัง…', 'Looking up past weather…')}</p>}
            {status === 'error' && !c && <p className="text-bad">{t('ดึงข้อมูลอากาศไม่สำเร็จ (ต้องต่อเน็ต) เปิดการ์ดนี้ใหม่ภายหลัง', 'Couldn’t get the weather (needs internet); open this card again later')}</p>}
            {c && (
              <>
                <p>{t(`ช่วงเวลาแข่งของวันนี้ใน ${c.years} ปีก่อน เฉลี่ย `, `In the last ${c.years} years at race time it averaged `)}<b>{c.temp}°C</b>{t(` ความชื้น ${c.rh}% (WBGT ในร่ม ~${c.wbgt}°)`, `, ${c.rh}% humidity (shade WBGT ~${c.wbgt}°)`)}</p>
                <p className={cx('mt-1', heatLevel(c.wbgt) === 'ok' ? 'text-good' : 'text-warn')}>{t(heatAdvice[heatLevel(c.wbgt)].label, heatAdvice[heatLevel(c.wbgt)].labelEn)}</p>
                {c.slowdown > 0
                  ? <p className="mt-1">{t(`อากาศแบบนี้เวลามักช้าลง ~${c.slowdown}%`, `Expect ~${c.slowdown}% slower in this weather`)}{goalSec ? t(` เผื่อ ~${formatDuration(extra)} จากเป้า ${formatDuration(goalSec)} เป็น ~${formatDuration(goalSec + extra)} ออกตัวตามแรง อย่าไล่เพซเป้าเดิม`, `: allow ~${formatDuration(extra)} on top of ${formatDuration(goalSec)}, so ~${formatDuration(goalSec + extra)}. Start by effort, don’t chase the old pace`) : ''}</p>
                  : <p className="mt-1 text-muted">{heatLevel(c.wbgt) === 'ok'
                    ? t('อากาศเย็นสบายสำหรับวิ่ง ไม่ต้องปรับเป้าเพราะความร้อน', 'Cool running weather; no heat adjustment needed')
                    : t('ใกล้เคียงอากาศเช้าที่คุณซ้อมอยู่แล้ว ผลต่อเวลาน้อยกว่า 1% ไม่ต้องปรับเป้า แต่ดื่มน้ำตามแผน', 'Close to the mornings you already train in; under 1% effect on time, so keep the goal but drink to plan')}</p>}
                <p className="mt-1 text-[11px] text-muted">{t(`ค่าเฉลี่ยจากข้อมูลอากาศย้อนหลัง ${CLIMATE_YEARS} ปี (±2 วัน) ที่${course ? 'จุดปล่อยตัวของสนาม' : 'กรุงเทพฯ (นำเข้าเส้นทางสนามเพื่อใช้พิกัดจริง)'} ไม่ใช่พยากรณ์ ช่วง 3 วันก่อนแข่งดูการ์ดอากาศหน้าหลัก`, `Average of ${CLIMATE_YEARS} years (±2 days) at ${course ? 'the course start' : 'Bangkok (import the course for the real spot)'}, not a forecast. In the last 3 days check the weather card on home`)}</p>
              </>
            )}
          </div>
        )}

        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-muted">{t('จุดให้น้ำ (กม.) ดูจากแผนที่เส้นทางของผู้จัด', 'Aid stations (km) from the organiser’s course map')}</span>
          <input value={aidText} onChange={e => saveAid(e.target.value)} placeholder="2.5, 5, 7.5" inputMode="decimal" className="w-full" />
        </label>
        <AidPlanList km={km} goalSec={goalSec} />
      </div>
    </Disclosure>
  )
}
