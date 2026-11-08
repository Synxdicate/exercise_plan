import { useEffect } from 'react'
import { programs, variants, withHills, weekKm, weekPlan, type LocationPref, type Mode, type ProgramId } from '../data/programs'
import { addDays, daysBetween, today, weekStart } from './date'
import { usePersisted } from './storage'
import { homeUsable, libEx, needsSpotter } from '../data/library'
import type { Day, Exercise } from '../data/workouts'
import { applyMoves, type DayMoves } from './moves'

// สลับท่า: ใช้ช่วงครั้ง/เซ็ต/พักของท่าเดิม (โปรแกรมยังสมดุล) ยกเว้นหน่วยต่างกัน (ครั้ง ↔ วินาที) ใช้ค่าของท่าใหม่
export function swapExercise(e: Exercise, to: string): Exercise {
  const lib = libEx(to)
  if (!lib) return e
  const timed = (r: string) => /วิ/.test(r)
  return { ...e, name: lib.name, th: lib.th, cue: lib.cue, video: lib.video, easier: undefined, harder: undefined,
    reps: timed(e.reps) === timed(lib.reps) ? e.reps : lib.reps, swappedFrom: e.swappedFrom ?? e.name }
}

/**
 * สัปดาห์แข่ง: ย้ายวันแข่งไปวันจริงตามวันแข่งที่ตั้งไว้ (ตารางวางวันแข่งไว้วันอาทิตย์)
 * วันหลังวันแข่งเป็นวันพัก และวันก่อนแข่งไม่มีเวท
 */
export function placeRaceDay(days: Day[], raceIdx: number): Day[] {
  const from = days.findIndex(d => d.runKind === 'race')
  if (from < 0 || from === raceIdx || raceIdx < 0 || raceIdx > 6) return days
  const rest = (d: Day, note: string): Day => ({ key: d.key, day: d.day, title: 'พัก / เดินเบา ๆ', type: 'rest', duration: '-', note, exercises: [] })
  return days.map((d, i) => {
    if (i === raceIdx) return { ...days[from], key: d.key, day: d.day }
    if (i > raceIdx) return rest(d, 'หลังวันแข่ง: พัก เดินเบา ๆ ให้ร่างกายฟื้น')
    if (i === raceIdx - 1 && d.type === 'strength') return rest(d, 'พรุ่งนี้แข่ง งดเวท')
    return d
  })
}

/** วันแข่งใช้ระยะงานจริง (เช่น มินิขอนแก่น 11.55 กม.) แทนระยะมาตรฐานของโปรแกรม */
export function withRaceKm(days: Day[], km: number): Day[] {
  return days.map(d => d.runKind !== 'race' || !d.targetKm || d.targetKm === km ? d : {
    ...d,
    targetKm: km,
    duration: `${km} กม.`,
    title: d.title.replace(/[\d.]+ กม\./, `${km} กม.`),
    exercises: d.exercises.map(e => ({ ...e, reps: `${km} กม.` })),
  })
}

export const extrasKey = (program: string, d: Day) => `${program}:${d.key}:${d.location ?? 'gym'}`

/** ใส่ท่าที่ผู้ใช้สลับ (ทุกวันที่มีท่านั้น) และท่าที่เพิ่มเอง (ต่อวัน+สถานที่) ลงในแผน */
/** เรียก f ถ้า throw ให้ใช้ fallback และรายงาน error (นำเข้าแบบ dynamic เพื่อไม่ดึง Supabase เข้าเทสต์) */
export function safeLayer<T>(layer: string, f: () => T, fallback: () => T, report: (e: unknown, ctx: string) => void = reportLater): T {
  try { return f() } catch (e) { report(e, `plan:${layer}`); return fallback() }
}
const reportLater = (e: unknown, ctx: string) => queueMicrotask(() => { void import('./errors').then(m => m.captureError(e, ctx)).catch(() => {}) })

export function applyCustom(days: Day[], program: string, swaps: Record<string, string>, extras: Record<string, Exercise[]>, solo = false): Day[] {
  return days.map(d => {
    if (d.type !== 'strength') return d
    // ผู้ใช้สลับเองมาก่อน ไม่งั้นถ้าฝึกคนเดียวและท่าต้องมีคนช่วย → ท่าทดแทนที่ปลอดภัย
    // ท่าที่สลับไปเป็นท่าของยิม (ต้องใช้เครื่อง/อุปกรณ์) ใช้เฉพาะวันยิม — วันสวนกลับเป็นท่าเดิม
    const usable = (to: string) => d.location === 'home' ? homeUsable(to) : d.location !== 'park' || libEx(to)?.where !== 'gym'
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
  const [stored, setProgramRaw] = usePersisted<ProgramId>('program', 'physique')
  // โปรแกรมที่แอปเวอร์ชันนี้ไม่รู้จัก (ซิงก์มาจากเครื่องที่อัปเดตแล้ว) — ใช้โปรแกรมหุ่นแทนการพังทั้งแอป
  const program: ProgramId = stored in programs ? stored : 'physique'
  const [location, setLocationPref] = usePersisted<LocationPref>('mode', 'gym')
  const [overrides, setOverrides] = usePersisted<Record<string, Mode>>('dayLocation', {})
  const [manualWeek, setManualWeek] = usePersisted('week', 1)
  // วันจันทร์ที่เริ่มโปรแกรม (ไม่มีวันแข่ง) — สัปดาห์ปัจจุบันเดินเองตามปฏิทิน; ข้อมูลเก่าที่มีแค่เลขสัปดาห์คิดย้อนจากสัปดาห์นี้
  const [programStart, setProgramStart] = usePersisted('programStart', '')
  const [repeats, setRepeats] = usePersisted<string[]>('repeatWeeks', [])
  const [raceDate, setRaceDate] = usePersisted('raceDate', '')
  // ระยะงานจริง (กม.) — งานแต่ละงานยาวไม่เท่ากัน โดยเฉพาะมินิมาราธอน (10–12 กม.)
  const [raceKmOverride, setRaceKm] = usePersisted<number | null>('raceKm', null)
  // เวลาตัดตัว (นาที) ของงานจริง — เทียบกับเวลาจบโดยประมาณ
  const [raceCutoff, setRaceCutoff] = usePersisted<number | null>('raceCutoff', null)
  // เส้นทางแข่งมีเนิน (เช่น เนินซึมยาว) — เพิ่มการซ้อมเนินในแผน (withHills)
  const [raceHills, setRaceHills] = usePersisted('raceHills', false)
  const [swaps, setSwaps] = usePersisted<Record<string, string>>('exerciseSwaps', {})
  const [extras, setExtras] = usePersisted<Record<string, Exercise[]>>('extraExercises', {})
  const [solo, setSolo] = usePersisted('soloMode', false)
  const [moves, setMoves] = usePersisted<DayMoves>('dayMoves', {})

  const meta = programs[program]
  const isRace = !!meta.raceKm
  const ongoing = !!meta.ongoing
  const thisMonday = weekStart(today())

  // มีวันแข่ง: นับสัปดาห์ถอยหลังจากวันแข่ง ให้สัปดาห์สุดท้ายตรงกับสัปดาห์แข่ง
  const start = programStart || addDays(thisMonday, -7 * (manualWeek - 1))
  let currentWeek = weekAt(start, repeats, thisMonday, meta.weeks)
  let weeksUntilStart = 0
  let daysToRace: number | null = null
  // วันจันทร์ของสัปดาห์ 1 เมื่อนับถอยจากวันแข่ง
  const raceStart = isRace && raceDate ? addDays(weekStart(raceDate), -7 * (meta.weeks - 1)) : null
  if (raceStart) {
    const w = Math.floor(daysBetween(raceStart, weekStart(today())) / 7) + 1
    weeksUntilStart = Math.max(0, 1 - w)
    currentWeek = Math.min(Math.max(w, 1), meta.weeks)
    daysToRace = daysBetween(today(), raceDate)
  }
  // โปรแกรมต่อเนื่อง: สัปดาห์ในรอบมาจากปฏิทิน (ทุกคนใช้จุดอ้างอิงเดียวกัน ไม่ต้องเก็บวันเริ่ม)
  if (ongoing) currentWeek = (Math.floor(daysBetween(CYCLE_EPOCH, thisMonday) / 7) % meta.weeks) + 1

  // id ของช่องวัน (i = 0 จันทร์ … 6 อาทิตย์) — ไม่ผูกกับยิม/สวน สลับสถานที่แล้วสถานะไม่หาย
  // โปรแกรมต่อเนื่องวนเลขสัปดาห์ซ้ำ จึงผูก id กับวันจันทร์ของสัปดาห์จริงแทน (ไม่งั้นรอบใหม่จะติ๊กค้างจากรอบก่อน)
  const manual = !ongoing && !(isRace && raceDate)
  // วันจันทร์ของสัปดาห์ `week` — มีวันแข่ง: นับจากสัปดาห์ 1 ที่คิดจากวันแข่ง (สัปดาห์ ≤ 0 = ช่วงเตรียมตัวที่ผ่านมา)
  // ระหว่างเตรียมตัว หน้าจอใช้ "สัปดาห์ 1" แทนสัปดาห์นี้ จึงชี้ไปวันจันทร์นี้
  const mondayOf = (week: number) => raceStart
    ? (weeksUntilStart > 0 && week === 1 ? thisMonday : addDays(raceStart, 7 * (week - 1)))
    : addDays(thisMonday, 7 * (week - currentWeek))
  // ช่วงเตรียมตัวที่ผ่านมาแล้ว (เริ่มโปรแกรมก่อนสัปดาห์ 1 จริง) — ดูย้อนหลังได้เป็นสัปดาห์ 0, -1, …
  const firstPrepWeek = raceStart && programStart && programStart < raceStart
    ? 1 - Math.ceil(daysBetween(weekStart(programStart), raceStart) / 7) : 1
  const prepWeeks = Array.from({ length: Math.max(0, 1 - firstPrepWeek) }, (_, k) => firstPrepWeek + k).filter(w => mondayOf(w) < thisMonday)
  const slotId = (week: number, i: number) => {
    // ช่วงเตรียมตัวก่อนสัปดาห์ 1 ใช้แผนสัปดาห์ 1 — ต้องแยก id ตามวันจันทร์ ไม่งั้นติ๊กไว้แล้วจะค้างไปถึงสัปดาห์ 1 จริง
    if (raceStart && (week < 1 || (weeksUntilStart > 0 && week === 1))) return `${program}-pre${mondayOf(week)}-d${i}`
    if (ongoing) return `${program}-${addDays(thisMonday, 7 * (week - currentWeek))}-d${i}`
    const n = manual ? attemptOf(start, repeats, week, thisMonday, meta.weeks) : 0
    return `${program}-w${week}${n ? `x${n}` : ''}-d${i}`
  }

  const locationFor = (week: number, i: number): Mode => {
    const o = overrides[slotId(week, i)]
    if (o) return o
    if (location !== 'mix') return location
    const strengthDays = variants(program, Math.max(1, week)).gym.flatMap((d, j) => (d.type === 'strength' ? [j] : []))
    return i === strengthDays.at(-1) ? 'park' : 'gym'
  }

  return {
    program,
    meta,
    isRace,
    location,
    setLocationPref,
    raceDate,
    raceKm: raceKmOverride ?? meta.raceKm,
    setRaceKm,
    raceCutoff,
    setRaceCutoff,
    raceHills,
    setRaceHills,
    setRaceDate,
    currentWeek,
    weeksUntilStart,
    raceStart,
    /** ผ่านวันแข่งแล้ว — ไม่มีแผน "วันนี้" อีก (เดิมยังโชว์สัปดาห์แข่งและวันแข่งซ้ำ) */
    finished: !!(isRace && raceDate && today() > raceDate),
    mondayOf,
    /** สัปดาห์เตรียมตัวที่ผ่านมา (เลข ≤ 0) */
    prepWeeks,
    /** synced programStart (ว่าง = ข้อมูลเก่า) */
    storedStart: programStart,
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
      setRaceKm(null)
    },
    /** สัปดาห์ของโปรแกรม ณ วันจันทร์ monday (null = อยู่นอกช่วงโปรแกรม) — ใช้กับปฏิทิน ให้ตรงกับวันแข่ง/การทำซ้ำ */
    weekOf(monday: string): number | null {
      if (ongoing) return (((Math.floor(daysBetween(CYCLE_EPOCH, monday) / 7) % meta.weeks) + meta.weeks) % meta.weeks) + 1
      if (isRace && raceDate) {
        const w = Math.floor(daysBetween(addDays(weekStart(raceDate), -7 * (meta.weeks - 1)), monday) / 7) + 1
        // ก่อนเริ่มโปรแกรม แอปใช้แผนสัปดาห์ 1 (เหมือนหน้าฝึก) — ก่อนสัปดาห์นี้ไม่มีแผน
        return w > meta.weeks ? null : w >= 1 ? w : monday >= thisMonday ? 1 : prepWeeks.includes(w) ? w : null
      }
      const raw = Math.floor(daysBetween(start, monday) / 7) + 1
      return raw < 1 ? null : raw - repeats.filter(r => r > start && r <= monday).length > meta.weeks ? null : weekAt(start, repeats, monday, meta.weeks)
    },
    plan: (week = currentWeek) => {
      // แต่ละชั้นที่อ่านข้อมูลซิงก์ (สถานที่ สลับท่า เนิน สลับวัน) ถ้าพังจากข้อมูลแปลก ๆ ให้ข้ามชั้นนั้น ไม่ให้ทั้งแอปแครช
      const w = Math.max(1, week)
      const raw = safeLayer('location', () => weekPlan(program, w, i => locationFor(week, i)), () => weekPlan(program, w, () => 'gym'))
      const base = safeLayer('custom', () => applyCustom(raw, program, swaps, extras, solo), () => raw)
      const days = raceHills ? safeLayer('hills', () => withHills(base, program, w), () => base) : base
      const mv = moves[mondayOf(week)]
      const moved = (d: Day[]) => safeLayer('moves', () => applyMoves(d, mv), () => d)
      if (!isRace || week !== meta.weeks) return moved(days)
      const sized = raceKmOverride ? safeLayer('raceKm', () => withRaceKm(days, raceKmOverride), () => days) : days
      return moved(raceDate ? safeLayer('raceDay', () => placeRaceDay(sized, (new Date(`${raceDate}T00:00:00`).getDay() + 6) % 7), () => sized) : sized)
    },
    /** สลับเนื้อหาวัน a กับ b ในสัปดาห์ `week` (เช่น ทำแผนวันอังคารวันนี้) */
    moveDay: (week: number, a: number, b: number) => setMoves(prev => ({ ...prev, [mondayOf(week)]: [...(prev[mondayOf(week)] ?? []), [a, b]] })),
    hasMoves: (week: number) => !!moves[mondayOf(week)]?.length,
    clearMoves: (week: number) => setMoves(prev => {
      const next = { ...prev }
      delete next[mondayOf(week)]
      return next
    }),
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
    kmTarget: (week = currentWeek) => weekKm(program, Math.max(1, week)),
    /** i = ลำดับวันก่อนสลับวัน (ส่ง day.movedFrom ถ้าวันนั้นถูกสลับมา) */
    setDayLocation: (week: number, i: number, m: Mode) => setOverrides(prev => ({ ...prev, [slotId(week, i)]: m })),
    doneId: slotId,
    // รองรับ id แบบเก่า (ผูกกับ mode + key ของวัน) ที่เคยติ๊กไว้ก่อนหน้า
    isDone(done: Record<string, boolean>, week: number, i: number) {
      const id = slotId(week, i)
      if (id in done) return done[id]
      if (week < 1) return false
      const v = variants(program, week)
      return (['gym', 'park'] as Mode[]).some(m => {
        const key = v[m][i]?.key
        return done[program === 'physique' ? `${m}-w${week}-${key}` : `${program}-${m}-w${week}-${key}`]
      })
    },
  }
}


/**
 * ก่อน v2.37 ช่วงเตรียมตัว (ก่อนสัปดาห์ 1 ที่นับถอยจากวันแข่ง) ใช้ id ช่องวันเดียวกับสัปดาห์ 1 —
 * ติ๊ก/ยกเลิกติ๊กตอนเตรียมตัวจึงค้างมาที่สัปดาห์ 1 จริง: ล้างของวันที่ยังมาไม่ถึงในสัปดาห์ 1 ครั้งเดียว
 * (วันที่ยังไม่ถึงไม่ควรมีค่าติ๊กอยู่แล้ว) — เฉพาะเมื่อเริ่มโปรแกรมก่อนสัปดาห์ 1 จริง
 */
export function usePreStartCleanup() {
  const p = useProgram()
  const [, setDone] = usePersisted<Record<string, boolean>>('done', {})
  const [cleared, setCleared] = usePersisted('preStartCleared', '')
  const key = p.raceStart ? `${p.program}:${p.raceStart}` : ''
  const due = !!key && cleared !== key && p.currentWeek === 1 && p.weeksUntilStart === 0
    && !!p.storedStart && p.storedStart < p.raceStart! && weekStart(today()) === p.raceStart
  useEffect(() => {
    if (!due) return
    const todayIdx = daysBetween(p.raceStart!, today())
    setDone(prev => Object.fromEntries(Object.entries(prev).filter(([id]) => {
      const m = id.match(new RegExp(`^${p.program}-w1-d(\\d)$`))
      return !m || +m[1] <= todayIdx
    })))
    setCleared(key)
  }, [due, key, p.program, p.raceStart, setDone, setCleared])
}
