import { programs, variants, weekKm, weekPlan, type LocationPref, type Mode, type ProgramId } from '../data/programs'
import type { Day } from '../data/workouts'
import { addDays, daysBetween, today, weekStart } from './date'
import { usePersisted } from './storage'

// สถานะโปรแกรมปัจจุบัน — ใช้ร่วมกันทุกหน้า
export function useProgram() {
  const [program, setProgramRaw] = usePersisted<ProgramId>('program', 'physique')
  const [location, setLocationPref] = usePersisted<LocationPref>('mode', 'gym')
  const [overrides, setOverrides] = usePersisted<Record<string, Mode>>('dayLocation', {})
  const [manualWeek, setManualWeek] = usePersisted('week', 1)
  const [raceDate, setRaceDate] = usePersisted('raceDate', '')

  const meta = programs[program]
  const isRace = program !== 'physique'

  // มีวันแข่ง: นับสัปดาห์ถอยหลังจากวันแข่ง ให้สัปดาห์สุดท้ายตรงกับสัปดาห์แข่ง
  let currentWeek = manualWeek
  let weeksUntilStart = 0
  let daysToRace: number | null = null
  if (isRace && raceDate) {
    const start = addDays(weekStart(raceDate), -7 * (meta.weeks - 1))
    const w = Math.floor(daysBetween(start, weekStart(today())) / 7) + 1
    weeksUntilStart = Math.max(0, 1 - w)
    currentWeek = Math.min(Math.max(w, 1), meta.weeks)
    daysToRace = daysBetween(today(), raceDate)
  }

  // id ของช่องวัน (i = 0 จันทร์ … 6 อาทิตย์) — ไม่ผูกกับยิม/สวน สลับสถานที่แล้วสถานะไม่หาย
  const slotId = (week: number, i: number) => `${program}-w${week}-d${i}`

  const locationFor = (week: number, i: number): Mode => {
    const o = overrides[slotId(week, i)]
    if (o) return o
    if (location !== 'mix') return location
    const strengthDays = variants(program, week).gym.flatMap((d, j) => (d.type === 'strength' ? [j] : []))
    return i === strengthDays.at(-1) ? 'park' : 'gym'
  }

  return {
    program,
    meta,
    isRace,
    location,
    setLocationPref,
    raceDate,
    setRaceDate,
    currentWeek,
    weeksUntilStart,
    daysToRace,
    autoWeek: isRace && !!raceDate,
    setWeek: setManualWeek,
    setProgram(p: ProgramId) {
      setProgramRaw(p)
      setManualWeek(1)
    },
    plan: (week = currentWeek) => weekPlan(program, week, i => locationFor(week, i)),
    kmTarget: (week = currentWeek) => weekKm(program, week),
    setDayLocation: (week: number, i: number, m: Mode) => setOverrides(prev => ({ ...prev, [slotId(week, i)]: m })),
    doneId: slotId,
    // รองรับ id แบบเก่า (ผูกกับ mode + key ของวัน) ที่เคยติ๊กไว้ก่อนหน้า
    isDone(done: Record<string, boolean>, week: number, i: number) {
      const id = slotId(week, i)
      if (id in done) return done[id]
      const v = variants(program, week)
      return (['gym', 'park'] as Mode[]).some(m => {
        const key = v[m][i]?.key
        return done[program === 'physique' ? `${m}-w${week}-${key}` : `${program}-${m}-w${week}-${key}`]
      })
    },
  }
}

export type DayRef = { day: Day; i: number }
