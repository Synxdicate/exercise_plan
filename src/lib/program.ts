import { programs, variants, weekKm, weekPlan, type LocationPref, type Mode, type ProgramId } from '../data/programs'
import { addDays, daysBetween, today, weekStart } from './date'
import { usePersisted } from './storage'
import { libEx, needsSpotter } from '../data/library'
import type { Day, Exercise } from '../data/workouts'

// สลับท่า: ใช้ช่วงครั้ง/เซ็ต/พักของท่าเดิม (โปรแกรมยังสมดุล) ยกเว้นหน่วยต่างกัน (ครั้ง ↔ วินาที) ใช้ค่าของท่าใหม่
export function swapExercise(e: Exercise, to: string): Exercise {
  const lib = libEx(to)
  if (!lib) return e
  const timed = (r: string) => /วิ/.test(r)
  return { ...e, name: lib.name, th: lib.th, cue: lib.cue, video: lib.video, easier: undefined, harder: undefined,
    reps: timed(e.reps) === timed(lib.reps) ? e.reps : lib.reps, swappedFrom: e.swappedFrom ?? e.name }
}

export const extrasKey = (program: string, d: Day) => `${program}:${d.key}:${d.location ?? 'gym'}`

/** ใส่ท่าที่ผู้ใช้สลับ (ทุกวันที่มีท่านั้น) และท่าที่เพิ่มเอง (ต่อวัน+สถานที่) ลงในแผน */
export function applyCustom(days: Day[], program: string, swaps: Record<string, string>, extras: Record<string, Exercise[]>, solo = false): Day[] {
  return days.map(d => {
    if (d.type !== 'strength') return d
    // ผู้ใช้สลับเองมาก่อน ไม่งั้นถ้าฝึกคนเดียวและท่าต้องมีคนช่วย → ท่าทดแทนที่ปลอดภัย
    // ท่าที่สลับไปเป็นท่าของยิม (ต้องใช้เครื่อง/อุปกรณ์) ใช้เฉพาะวันยิม — วันสวนกลับเป็นท่าเดิม
    const usable = (to: string) => d.location !== 'park' || libEx(to)?.where !== 'gym'
    const list = d.exercises.map(e => (swaps[e.name] && usable(swaps[e.name]) ? swapExercise(e, swaps[e.name])
      : solo && needsSpotter[e.name] ? { ...swapExercise(e, needsSpotter[e.name].alt), solo: true } : e))
    return { ...d, exercises: [...list, ...(extras[extrasKey(program, d)] ?? []).map(e => ({ ...e, added: true }))] }
  })
}

const CYCLE_EPOCH = '2024-01-01' // วันจันทร์

/**
 * เลขสัปดาห์ของโปรแกรม ณ วันจันทร์ monday: นับจากวันเริ่ม ลบสัปดาห์ที่ "ทำซ้ำ" (repeats = วันจันทร์ที่เลขสัปดาห์ไม่เดิน)
 * ทำซ้ำมีผลตั้งแต่วันจันทร์ถัดไป สัปดาห์ที่กดยังเป็นเลขเดิม
 */
export function weekAt(start: string, repeats: string[], monday: string, weeks: number) {
  const raw = Math.floor(daysBetween(start, monday) / 7) + 1
  const held = repeats.filter(r => r > start && r <= monday).length
  return Math.min(Math.max(raw - held, 1), weeks)
}

/** รอบที่เท่าไรของสัปดาห์ week (0 = รอบแรก) — ใช้แยกติ๊กของรอบทำซ้ำ */
export const attemptOf = (start: string, repeats: string[], week: number, monday: string, weeks: number) =>
  repeats.filter(r => r > start && r <= monday && weekAt(start, repeats, r, weeks) === week).length

// สถานะโปรแกรมปัจจุบัน — ใช้ร่วมกันทุกหน้า
export function useProgram() {
  const [program, setProgramRaw] = usePersisted<ProgramId>('program', 'physique')
  const [location, setLocationPref] = usePersisted<LocationPref>('mode', 'gym')
  const [overrides, setOverrides] = usePersisted<Record<string, Mode>>('dayLocation', {})
  const [manualWeek, setManualWeek] = usePersisted('week', 1)
  // วันจันทร์ที่เริ่มโปรแกรม (ไม่มีวันแข่ง) — สัปดาห์ปัจจุบันเดินเองตามปฏิทิน; ข้อมูลเก่าที่มีแค่เลขสัปดาห์คิดย้อนจากสัปดาห์นี้
  const [programStart, setProgramStart] = usePersisted('programStart', '')
  const [repeats, setRepeats] = usePersisted<string[]>('repeatWeeks', [])
  const [raceDate, setRaceDate] = usePersisted('raceDate', '')
  const [swaps, setSwaps] = usePersisted<Record<string, string>>('exerciseSwaps', {})
  const [extras, setExtras] = usePersisted<Record<string, Exercise[]>>('extraExercises', {})
  const [solo, setSolo] = usePersisted('soloMode', false)

  const meta = programs[program]
  const isRace = !!meta.raceKm
  const ongoing = !!meta.ongoing
  const thisMonday = weekStart(today())

  // มีวันแข่ง: นับสัปดาห์ถอยหลังจากวันแข่ง ให้สัปดาห์สุดท้ายตรงกับสัปดาห์แข่ง
  const start = programStart || addDays(thisMonday, -7 * (manualWeek - 1))
  let currentWeek = weekAt(start, repeats, thisMonday, meta.weeks)
  let weeksUntilStart = 0
  let daysToRace: number | null = null
  if (isRace && raceDate) {
    const start = addDays(weekStart(raceDate), -7 * (meta.weeks - 1))
    const w = Math.floor(daysBetween(start, weekStart(today())) / 7) + 1
    weeksUntilStart = Math.max(0, 1 - w)
    currentWeek = Math.min(Math.max(w, 1), meta.weeks)
    daysToRace = daysBetween(today(), raceDate)
  }
  // โปรแกรมต่อเนื่อง: สัปดาห์ในรอบมาจากปฏิทิน (ทุกคนใช้จุดอ้างอิงเดียวกัน ไม่ต้องเก็บวันเริ่ม)
  if (ongoing) currentWeek = (Math.floor(daysBetween(CYCLE_EPOCH, thisMonday) / 7) % meta.weeks) + 1

  // id ของช่องวัน (i = 0 จันทร์ … 6 อาทิตย์) — ไม่ผูกกับยิม/สวน สลับสถานที่แล้วสถานะไม่หาย
  // โปรแกรมต่อเนื่องวนเลขสัปดาห์ซ้ำ จึงผูก id กับวันจันทร์ของสัปดาห์จริงแทน (ไม่งั้นรอบใหม่จะติ๊กค้างจากรอบก่อน)
  const manual = !ongoing && !(isRace && raceDate)
  const slotId = (week: number, i: number) => {
    if (ongoing) return `${program}-${addDays(thisMonday, 7 * (week - currentWeek))}-d${i}`
    const n = manual ? attemptOf(start, repeats, week, thisMonday, meta.weeks) : 0
    return `${program}-w${week}${n ? `x${n}` : ''}-d${i}`
  }

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
    autoWeek: (isRace && !!raceDate) || ongoing,
    ongoing,
    programStart: start,
    /** ตั้งให้สัปดาห์นี้เป็นสัปดาห์ที่ w (ทำสัปดาห์เดิมซ้ำ/ข้าม) — สัปดาห์ถัดไปเดินเองต่อจากนี้ */
    setWeek(w: number) {
      setManualWeek(w)
      setProgramStart(addDays(thisMonday, -7 * (w - 1)))
      setRepeats([])
    },
    /** สัปดาห์หน้ายังเป็นสัปดาห์เดิม (เลื่อนวันเริ่มโปรแกรมไป 7 วัน) — ใช้เมื่อสัปดาห์นี้หนักเกิน */
    repeatWeek() {
      const next = addDays(thisMonday, 7)
      if (!programStart) setProgramStart(start)
      setRepeats(r => (r.includes(next) ? r : [...r, next]))
    },
    setProgram(p: ProgramId) {
      setProgramRaw(p)
      setManualWeek(1)
      setProgramStart(thisMonday)
      setRepeats([])
    },
    plan: (week = currentWeek) => applyCustom(weekPlan(program, week, i => locationFor(week, i)), program, swaps, extras, solo),
    solo,
    setSolo,
    /** สลับท่า from → to ทุกวันที่มีท่านี้ (to = undefined คือกลับเป็นท่าเดิม) */
    swap: (from: string, to?: string) => setSwaps(prev => {
      const next = { ...prev }
      if (to && to !== from) next[from] = to
      else delete next[from]
      return next
    }),
    addExercise: (d: Day, e: Exercise) => setExtras(prev => ({ ...prev, [extrasKey(program, d)]: [...(prev[extrasKey(program, d)] ?? []), e] })),
    removeExercise: (d: Day, name: string) => setExtras(prev => ({ ...prev, [extrasKey(program, d)]: (prev[extrasKey(program, d)] ?? []).filter(e => e.name !== name) })),
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

