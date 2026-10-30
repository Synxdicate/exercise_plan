import { useMemo, useState } from 'react'
import { Bike, Check, ChevronLeft, ChevronRight, Dumbbell, Footprints } from 'lucide-react'
import { monthGrid, shiftMonth } from '../lib/calendar'
import { crossKinds, useCross, useRuns, useSessions, formatDuration, runKinds } from '../lib/log'
import { useProgram } from '../lib/program'
import { programs } from '../data/programs'
import { daysBetween, monthLabel, niceDate, today, weekStart } from '../lib/date'
import type { Day } from '../data/workouts'
import { cx } from '../lib/cx'
import { usePersisted } from '../lib/storage'
import { Card } from './ui'

const DAYS = ['จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส', 'อา']

/** ปฏิทินรายเดือน: วันที่วิ่ง/เวทจริง เทียบกับแผน (วันที่ผ่านไปแล้วแต่ไม่ได้ทำตามแผน = วงเทา) */
export function TrainingCalendar() {
  const [runs] = useRuns()
  const [sessions] = useSessions()
  const [cross] = useCross()
  const [done] = usePersisted<Record<string, boolean>>('done', {})
  const p = useProgram()
  const now = today()
  const [ym, setYm] = useState(now.slice(0, 7))
  const [picked, setPicked] = useState<string | null>(null)

  const byDate = useMemo(() => {
    const m = new Map<string, { km: number; runs: typeof runs; sessions: typeof sessions; cross: typeof cross }>()
    const get = (d: string) => m.get(d) ?? (m.set(d, { km: 0, runs: [], sessions: [], cross: [] }), m.get(d)!)
    for (const r of runs) { const x = get(r.date); x.km += r.km; x.runs.push(r) }
    for (const s of sessions) get(s.date).sessions.push(s)
    for (const c of cross) get(c.date).cross.push(c)
    return m
  }, [runs, sessions, cross])

  const grid = monthGrid(ym)
  const monthDays = grid.flat().filter((d): d is string => !!d)
  // แผนของแต่ละวันในเดือนนี้: สัปดาห์ของโปรแกรมตามวันที่จริง (วันเริ่ม/วันแข่ง/สัปดาห์ที่ทำซ้ำ)
  const plans = useMemo(() => {
    const weeks = new Map<number, Day[]>()
    const out = new Map<string, Day | null>()
    const ticked = new Set<string>()
    for (const date of monthGrid(ym).flat()) {
      if (!date) continue
      const week = p.weekOf(weekStart(date))
      if (week === null) { out.set(date, null); continue }
      if (!weeks.has(week)) weeks.set(week, p.plan(week))
      const i = daysBetween(weekStart(date), date)
      out.set(date, weeks.get(week)![i] ?? null)
      if (p.isDone(done, week, i)) ticked.add(date)
    }
    return { out, ticked }
  }, [p, ym, done])
  const planFor = (date: string) => plans.out.get(date) ?? null
  // ติ๊ก "ทำแล้ว" ในตารางฝึก (โดยไม่ได้บันทึกระยะ/เซ็ต) ก็นับว่าได้ออกกำลังกายวันนั้น
  const tickedOn = (date: string) => plans.ticked.has(date)
  const totals = monthDays.reduce((a, d) => {
    const x = byDate.get(d)
    if (x) { a.km += x.km; a.runs += x.runs.length; a.sessions += x.sessions.length }
    if (x?.runs.length || x?.sessions.length || x?.cross.length || tickedOn(d)) a.active++
    return a
  }, { km: 0, runs: 0, sessions: 0, active: 0 })
  const sel = picked ? byDate.get(picked) : null
  // ดูล่วงหน้าได้ถึงเดือนวันแข่ง (หรือ 2 เดือนถ้าไม่มีวันแข่ง) เพื่อเห็นแผนที่เหลือ
  const lastYm = [shiftMonth(now.slice(0, 7), 2), p.raceDate.slice(0, 7)].sort().at(-1)!
  const selPlan = picked ? planFor(picked) : null

  return (
    <Card>
      <div className="mb-2 flex items-center justify-between">
        <button onClick={() => { setYm(shiftMonth(ym, -1)); setPicked(null) }} aria-label="เดือนก่อน" className="grid size-8 place-items-center rounded-full ring-1 ring-line"><ChevronLeft size={16} /></button>
        <div className="text-center">
          <div className="text-sm font-bold">{monthLabel(ym)}{ym !== now.slice(0, 7) && <button onClick={() => { setYm(now.slice(0, 7)); setPicked(null) }} className="ml-2 rounded-full bg-raised px-2 py-0.5 text-[11px] font-semibold text-run">เดือนนี้</button>}</div>
          <div className="text-[11px] tabular-nums text-muted">ออกกำลังกาย {totals.active} วัน · วิ่ง {totals.km.toFixed(1)} กม. · เวท {totals.sessions} ครั้ง</div>
        </div>
        <button onClick={() => { setYm(shiftMonth(ym, 1)); setPicked(null) }} disabled={ym >= lastYm} aria-label="เดือนถัดไป"
          className="grid size-8 place-items-center rounded-full ring-1 ring-line disabled:opacity-30"><ChevronRight size={16} /></button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-muted">{DAYS.map(d => <span key={d}>{d}</span>)}</div>
      <div className="mt-1 space-y-1">
        {grid.map((row, i) => (
          <div key={i} className="grid grid-cols-7 gap-1">
            {row.map((d, j) => {
              if (!d) return <span key={j} />
              const x = byDate.get(d)
              const plan = planFor(d)
              const ran = !!x?.runs.length, lifted = !!x?.sessions.length, carded = !!x?.cross.length
              const ticked = !ran && !lifted && !carded && tickedOn(d)
              const missed = d < now && !ran && !lifted && !carded && !ticked && (plan?.type === 'run' || plan?.type === 'strength')
              const future = d > now && (plan?.type === 'run' || plan?.type === 'strength')
              return (
                <button key={d} onClick={() => setPicked(picked === d ? null : d)} aria-label={niceDate(d)}
                  className={cx('relative flex aspect-square flex-col items-center justify-center rounded-xl text-xs transition-colors',
                    ran && lifted ? 'bg-gradient-to-br from-run/25 to-accent/25' : ran ? 'bg-run/20' : lifted ? 'bg-accent-soft' : ticked ? 'bg-good/15' : 'bg-raised',
                    missed && 'border border-dashed border-muted/60', d === now && 'ring-2 ring-ink', picked === d && 'ring-2 ring-run')}>
                  <span className={cx('font-semibold tabular-nums', !ran && !lifted && 'text-muted')}>{+d.slice(8)}</span>
                  {ran && <span className="text-[9px] font-bold tabular-nums text-run">{x!.km.toFixed(1)}</span>}
                  {!ran && lifted && <Dumbbell size={10} className="text-accent" />}
                  {!ran && !lifted && carded && <Bike size={10} className="text-run" />}
                  {ticked && <Check size={11} strokeWidth={3} className="text-good" />}
                  {future && <span className={cx('absolute bottom-1 size-1 rounded-full', plan!.type === 'run' ? 'bg-run' : 'bg-accent')} />}
                </button>
              )
            })}
          </div>
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-muted">
        <span className="flex items-center gap-1"><span className="size-2.5 rounded bg-run/30" /> วิ่ง (กม.)</span>
        <span className="flex items-center gap-1"><span className="size-2.5 rounded bg-accent-soft" /> เวท</span>
        <span className="flex items-center gap-1"><Check size={10} strokeWidth={3} className="text-good" /> ติ๊กทำแล้ว</span>
        <span className="flex items-center gap-1"><span className="size-2.5 rounded border border-dashed border-muted/60" /> ตามแผนแต่ไม่ได้ทำ</span>
        <span className="flex items-center gap-1"><span className="size-1.5 rounded-full bg-run" /> แผนวันข้างหน้า</span>
      </div>
      {picked && (
        <div className="mt-3 animate-fade-up rounded-xl bg-raised p-3 text-sm">
          <div className="font-bold">{niceDate(picked)}</div>
          {selPlan && selPlan.type !== 'rest' && <div className="text-xs text-muted">แผน ({programs[p.program].short}): {selPlan.title}{selPlan.targetKm ? ` · ${selPlan.targetKm} กม.` : ''}</div>}
          {picked && tickedOn(picked) && !sel?.runs.length && !sel?.sessions.length && <div className="mt-1 flex items-center gap-1.5 text-xs text-good"><Check size={13} /> ทำแล้ว</div>}
          {!sel?.runs.length && !sel?.sessions.length && !sel?.cross.length && !(picked && tickedOn(picked)) && <div className="mt-1 text-xs text-muted">ไม่มีบันทึก</div>}
          {sel?.cross.map(c => <div key={c.id} className="mt-1 flex items-center gap-1.5"><Bike size={13} className="text-run" /> {crossKinds[c.kind]} · {c.minutes} นาที</div>)}
          {sel?.runs.map(r => <div key={r.id} className="mt-1 flex items-center gap-1.5"><Footprints size={13} className="text-run" /> {runKinds[r.kind]} {r.km.toFixed(2)} กม. · {formatDuration(r.seconds)}</div>)}
          {sel?.sessions.map(s => <div key={s.id} className="mt-1 flex items-center gap-1.5"><Dumbbell size={13} className="text-accent" /> {s.title} · {s.entries.reduce((n, e) => n + e.sets.length, 0)} เซ็ต</div>)}
        </div>
      )}
    </Card>
  )
}
