import { useMemo, useRef, useState } from 'react'
import { FileUp, Map as MapIcon, Trash2 } from 'lucide-react'
import { parseGpx } from '../lib/gpx'
import { elevStats, fetchElevation, sampleRoute, samplesFor } from '../lib/elevation'
import { coursePacePlan, findClimbs } from '../lib/grade'
import { estimate } from '../lib/pace'
import { racePlan, raceKeyOf } from '../lib/racePlan'
import { useRaceGoals } from '../lib/useGoals'
import { formatDuration, formatPace, useRuns } from '../lib/log'
import { useProgram } from '../lib/program'
import { useRaceCourse, type RaceCourse } from '../lib/course'
import { useT } from '../lib/i18n'
import { notify } from '../lib/dialog'
import { cx } from '../lib/cx'
import { Button, Disclosure } from './ui'
import { Map } from './RunDetail'
import { ProfileChart } from './RunExtras'


/** แผนเพซรายกิโลตามเนินของสนาม — ใช้ทั้งในการ์ดเส้นทางสนามและแผนวันแข่ง */
export function CoursePacePlan({ course, km }: { course: RaceCourse; km: number }) {
  const t = useT()
  const [runs] = useRuns()
  const [goals] = useRaceGoals()
  const key = raceKeyOf(km)
  const est = useMemo(() => (key ? estimate(runs) : null), [key, runs])
  const goal = key ? goals[key] ?? est?.[key] : undefined
  const goalSec = key && goal ? racePlan(key, goal, km).goalSec : null
  const rows = useMemo(() => (goalSec ? coursePacePlan(goalSec, km, course.profile) : []), [goalSec, km, course.profile])
  if (!goalSec) return <p className="mt-2 text-xs text-muted">{t('วิ่งให้ได้ ≥3 กม. สักครั้ง หรือตั้งเวลาเป้าหมาย แล้วแอปจะคำนวณเพซรายกิโลตามเนินของสนามให้', 'Run ≥3 km once or set a goal time to get a per-km pace plan for this course')}</p>
  return (
    <div className="mt-3">
      <div className="mb-1 flex justify-between text-xs text-muted">
        <span>{t('เพซรายกิโลตามเนิน', 'Per-km pace for the hills')} · {formatDuration(goalSec)}</span>
        <span>{t('เวลาสะสม', 'Elapsed')}</span>
      </div>
      <ul className="divide-y divide-line text-sm">
        {rows.map((r, k) => (
          <li key={k} className="grid grid-cols-[4.2rem_1fr_3.2rem_3.6rem] items-center gap-2 py-1">
            <span className="text-muted">{t('กม.', 'km')} {r.km % 1 ? +r.km.toFixed(2) : r.km}</span>
            <span className={cx('text-xs', r.up >= 8 ? 'font-semibold text-warn' : 'text-muted')}>
              {r.up >= 3 ? t(`ขึ้น ${r.up} ม.`, `+${r.up} m`) : ''}{r.up >= 3 && r.down >= 3 ? ' · ' : ''}{r.down >= 3 ? t(`ลง ${r.down} ม.`, `−${r.down} m`) : ''}
            </span>
            <b className="text-right tabular-nums">{formatPace(r.pace, 1)}</b>
            <span className="text-right text-xs tabular-nums text-muted">{formatDuration(r.at)}</span>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-[11px] text-muted">{t('ใช้แรงเท่า ๆ กันทั้งสนาม: ขึ้นเนินช้าลง ลงเนินเร็วขึ้นเล็กน้อย (ไม่ปล่อยเต็มที่) 2 กม. แรกช้ากว่าเล็กน้อย รวมแล้วเท่าเวลาเป้า (Minetti 2002)', 'Even effort across the course: slower uphill, a little faster downhill (not all-out), easier first 2 km, adding up to the goal time (Minetti 2002)')}</p>
    </div>
  )
}

/** การ์ดเส้นทางสนาม (หน้าฝึก โปรแกรมแข่ง): นำเข้า GPX ของสนาม → กราฟความสูง เนิน และแผนเพซรายกิโล */
export function CourseCard() {
  const p = useProgram()
  const t = useT()
  const [course, setCourse] = useRaceCourse()
  const [busy, setBusy] = useState(false)
  const file = useRef<HTMLInputElement>(null)
  const climbs = useMemo(() => (course ? findClimbs(course.profile, course.km) : []), [course])
  if (!p.isRace || p.finished) return null
  const km = p.raceKm ?? course?.km ?? 0

  const load = async (f: File) => {
    setBusy(true)
    try {
      const g = parseGpx(await f.text())
      const pts = sampleRoute(g.route, Math.min(samplesFor(g.km), g.route.length))
      const profile = await fetchElevation(pts)
      const e = elevStats(profile)
      setCourse({ name: f.name.replace(/\.gpx$/i, ''), km: g.km, route: sampleRoute(g.route, 300), profile, gain: e.gain, loss: e.loss })
      notify(t('นำเข้าเส้นทางสนามแล้ว', 'Course imported'), 'good')
    } catch (e) {
      notify(e instanceof Error ? e.message : t('นำเข้าไม่สำเร็จ (ต้องต่อเน็ตเพื่อดึงความสูง)', 'Import failed (needs internet for elevation)'), 'bad')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Disclosure title={<span className="flex items-center gap-2"><MapIcon size={17} className="text-run" /> {t('เส้นทางสนามแข่ง', 'Race course')}</span>}
      summary={course ? t(`${course.km.toFixed(2)} กม. · ขึ้นสะสม ${course.gain} ม. · ${climbs.length} เนิน`, `${course.km.toFixed(2)} km · ${course.gain} m gain · ${climbs.length} climbs`) : t('นำเข้า GPX ของสนาม แล้วได้เพซรายกิโลตามเนินจริง', 'Import the course GPX for a per-km plan for the real hills')}>
      <input ref={file} type="file" accept=".gpx,application/gpx+xml" className="hidden" onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; if (f) void load(f) }} />
      {!course ? (
        <>
          <p className="text-sm text-muted">{t('หาไฟล์ GPX ได้จากหน้างาน/เพจผู้จัด หรือเส้นทางของคนที่เคยวิ่งงานนี้ใน Strava (กด ⋯ → Export GPX) ต้องต่อเน็ตตอนนำเข้า', 'Get a GPX from the race page or a past runner’s Strava activity (⋯ → Export GPX). Needs internet while importing.')}</p>
          <Button className="mt-2" size="sm" disabled={busy} onClick={() => file.current?.click()}><FileUp size={14} /> {busy ? t('กำลังนำเข้า…', 'Importing…') : t('นำเข้า GPX ของสนาม', 'Import course GPX')}</Button>
        </>
      ) : (
        <>
          <div className="mb-2 text-sm font-semibold">{course.name}</div>
          <Map route={course.route} className="h-44" />
          <div className="mt-2 grid grid-cols-3 gap-1 text-center">
            <div><div className="text-[11px] text-muted">{t('ระยะ', 'Distance')}</div><div className="font-bold tabular-nums">{course.km.toFixed(2)}</div></div>
            <div><div className="text-[11px] text-muted">{t('ขึ้นสะสม', 'Gain')}</div><div className="font-bold tabular-nums">{course.gain} {t('ม.', 'm')}</div></div>
            <div><div className="text-[11px] text-muted">{t('ลงสะสม', 'Loss')}</div><div className="font-bold tabular-nums">{course.loss} {t('ม.', 'm')}</div></div>
          </div>
          {Math.abs(course.km - km) > 0.3 && <p className="mt-2 rounded-xl bg-warn/15 p-2 text-xs text-warn">{t(`ไฟล์ยาว ${course.km.toFixed(2)} กม. แต่ระยะงานคือ ${km} กม. แอปยืดเนินตามสัดส่วนให้`, `The file is ${course.km.toFixed(2)} km but the race is ${km} km; hills are scaled to fit`)}</p>}
          <ProfileChart profile={course.profile} km={km} />
          {climbs.length > 0 && (
            <ul className="mt-2 space-y-1 text-sm">
              {climbs.slice(0, 5).map((c, i) => (
                <li key={i} className="flex items-center gap-2">
                  <span className={cx('grid size-6 shrink-0 place-items-center rounded-full text-[11px] font-bold', c.avg >= 5 ? 'bg-bad/20 text-bad' : 'bg-warn/20 text-warn')}>{i + 1}</span>
                  <span className="flex-1">{t(`เนิน กม. ${(c.fromKm * km / course.km).toFixed(1)}–${(c.toKm * km / course.km).toFixed(1)}`, `Climb km ${(c.fromKm * km / course.km).toFixed(1)}–${(c.toKm * km / course.km).toFixed(1)}`)}</span>
                  <span className="tabular-nums text-muted">+{c.gain} {t('ม.', 'm')} · {c.avg}%</span>
                </li>
              ))}
            </ul>
          )}
          <CoursePacePlan course={course} km={km} />
          <div className="mt-3 flex gap-2">
            <Button size="sm" variant="soft" disabled={busy} onClick={() => file.current?.click()}><FileUp size={14} /> {t('เปลี่ยนไฟล์', 'Replace')}</Button>
            <Button size="sm" variant="danger" onClick={() => setCourse(null)}><Trash2 size={14} /> {t('ลบ', 'Remove')}</Button>
          </div>
        </>
      )}
    </Disclosure>
  )
}
