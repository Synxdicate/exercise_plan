import { useState } from 'react'
import { gymWeek, parkWeek } from '../data/workouts'
import { muscleNames, weeklySets, type Muscle } from '../data/muscles'
import { useRuns, useSessions, weeklyKmTarget } from '../lib/log'
import { usePersisted } from '../lib/storage'
import { addDays, today, weekStart } from '../lib/date'
import { BodyMap } from './BodyMap'

const TARGET_SETS = 10

export function Dashboard() {
  const [runs] = useRuns()
  const [sessions] = useSessions()
  const [mode] = usePersisted<'gym' | 'park'>('mode', 'gym')
  const [week] = usePersisted('week', 1)

  const thisWeek = weekStart(today())
  const sessionsThisWeek = sessions.filter(s => weekStart(s.date) === thisWeek).length
  const kmThisWeek = runs.filter(r => weekStart(r.date) === thisWeek).reduce((s, r) => s + r.km, 0)
  const streak = weekStreak(sessions.map(s => s.date), runs.map(r => r.date))

  const sets = weeklySets(mode === 'gym' ? gymWeek : parkWeek)
  const intensity = Object.fromEntries(Object.entries(sets).map(([m, n]) => [m, Math.min(1, n! / TARGET_SETS)]))

  return (
    <>
      <section className="card">
        <h2>สัปดาห์นี้</h2>
        <div className="stats">
          <div className="stat accent"><span className="label">ฝึกเวทแล้ว</span><span className="value">{sessionsThisWeek}/3</span><span className="sub">ครั้ง</span></div>
          <div className="stat accent"><span className="label">วิ่งแล้ว</span><span className="value">{kmThisWeek.toFixed(1)}</span><span className="sub">จากเป้า {weeklyKmTarget(week)} กม.</span></div>
          <div className="stat"><span className="label">ต่อเนื่อง</span><span className="value">{streak}</span><span className="sub">สัปดาห์ติดที่ออกกำลัง ≥3 ครั้ง</span></div>
          <div className="stat"><span className="label">รวมทั้งหมด</span><span className="value">{sessions.length + runs.length}</span><span className="sub">ครั้ง (เวท + วิ่ง)</span></div>
        </div>
        <ActivityCalendar dates={[...sessions.map(s => s.date), ...runs.map(r => r.date)]} />
      </section>

      <section className="card">
        <h2>กล้ามเนื้อที่แผนนี้ฝึกต่อสัปดาห์ ({mode === 'gym' ? 'ยิม' : 'สวน'})</h2>
        <p className="muted small">สีเข้ม = ใกล้ {TARGET_SETS} เซ็ต/สัปดาห์ (นับกล้ามรองเป็นครึ่งเซ็ต)</p>
        <div className="map-row">
          <BodyMap intensity={intensity} label={m => `${muscleNames[m]}: ${(sets[m] ?? 0).toFixed(1).replace('.0', '')} เซ็ต/สัปดาห์`} />
          <ul className="set-list">
            {(Object.keys(muscleNames) as Muscle[])
              .sort((a, b) => (sets[b] ?? 0) - (sets[a] ?? 0))
              .map(m => (
                <li key={m}>
                  <span>{muscleNames[m]}</span>
                  <span className="mini-track"><span style={{ width: `${Math.min(100, ((sets[m] ?? 0) / TARGET_SETS) * 100)}%` }} /></span>
                  <span className="num">{(sets[m] ?? 0).toFixed(1).replace('.0', '')}</span>
                </li>
              ))}
          </ul>
        </div>
      </section>
    </>
  )
}

function ActivityCalendar({ dates }: { dates: string[] }) {
  const [hover, setHover] = useState<string | null>(null)
  const counts = new Map<string, number>()
  for (const d of dates) counts.set(d, (counts.get(d) ?? 0) + 1)
  const start = addDays(weekStart(today()), -7 * 11)
  const t = today()
  const days = ['จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส', 'อา']

  return (
    <div className="calendar">
      <div className="chart-head">
        <span className="muted small">12 สัปดาห์ล่าสุด</span>
        <span className="small">{hover ? `${hover}: ${counts.get(hover) ?? 0} กิจกรรม` : ''}</span>
      </div>
      <div className="cal-grid">
        {days.map(d => <span key={d} className="cal-label">{d}</span>)}
        {Array.from({ length: 12 }, (_, w) =>
          Array.from({ length: 7 }, (_, d) => {
            const date = addDays(start, w * 7 + d)
            const n = counts.get(date) ?? 0
            return (
              <span key={date} style={{ gridColumn: w + 2, gridRow: d + 1 }}
                className={`cal-cell l${Math.min(n, 2)}${date === t ? ' today' : ''}${date > t ? ' future' : ''}`}
                onMouseEnter={() => setHover(date)} onMouseLeave={() => setHover(null)} onClick={() => setHover(date)} />
            )
          }),
        )}
      </div>
    </div>
  )
}

function weekStreak(...lists: string[][]) {
  const perWeek = new Map<string, number>()
  for (const d of lists.flat()) perWeek.set(weekStart(d), (perWeek.get(weekStart(d)) ?? 0) + 1)
  let w = weekStart(today())
  // สัปดาห์ปัจจุบันยังไม่จบ — ไม่ตัด streak ถ้ายังไม่ครบ
  if ((perWeek.get(w) ?? 0) < 3) w = addDays(w, -7)
  let n = 0
  while ((perWeek.get(w) ?? 0) >= 3) {
    n++
    w = addDays(w, -7)
  }
  return n
}
