import { useCallback } from 'react'
import type { Day } from '../data/workouts'
import { programs, type ProgramId } from '../data/programs'
import { WEEKDAYS_EN, WEEKDAYS_TH } from './date'
import { useLang } from './i18n'
import { cueToEn, noteToEn } from '../data/contentEn'
import { muscleNames, muscleNamesEn, type Muscle } from '../data/muscles'

// ชื่อวันฝึกในแผนสร้างจากรูปแบบไม่กี่แบบ (programs.ts) — แปลด้วยวลีตามลำดับ แล้วค่อยแปลหน่วย
const TITLE_EN: [RegExp, string][] = [
  [/^Upper A — เน้นแรง \(ช่วงบน\)$/, 'Upper A — strength focus'],
  [/^Upper B — เน้นสร้างกล้าม \(ช่วงบน\)$/, 'Upper B — hypertrophy'],
  [/^Lower \+ Core \(ช่วงล่าง\)$/, 'Lower + Core'],
  [/^Lower B — สะโพก\/ต้นขาหลัง$/, 'Lower B — hips/hamstrings'],
  [/^Calisthenics — ขา \+ Core$/, 'Calisthenics — legs + core'],
  [/^ขา B — ขาเดียวและต้นขาหลัง \(สวน\)$/, 'Legs B — single-leg & hamstrings (park)'],
  [/^เวท ([AB]) — ทั้งตัว$/, 'Strength $1 — full body'],
  [/^เซอร์กิตแกนกลาง\/สะโพก$/, 'Core/hip circuit'],
  [/^พัก \/ เดินเบา ๆ$/, 'Rest / easy walk'],
  [/^พัก$/, 'Rest'],
  [/^วิ่ง Easy$/, 'Easy run'],
  [/^วิ่ง Interval$/, 'Interval run'],
  [/^วิ่งยาว \(Long run\)$/, 'Long run'],
  [/^วิ่งสลับเดิน \(วิ่งรวม ([\d.]+) นาที\)$/, 'Run-walk ($1 min running)'],
  [/^วิ่งต่อเนื่อง/, 'Continuous run'],
  [/^วิ่งยาวสลับเดิน/, 'Long run-walk'],
  [/^วิ่งสลับเดิน/, 'Run-walk'],
  [/^วันแข่ง มินิมาราธอน/, 'Race day: mini marathon'],
  [/^วันแข่ง/, 'Race day'],
  [/^เพซฮาล์ฟ/, 'Half-marathon pace'],
  [/^เพซมาราธอน/, 'Marathon pace'],
  [/^เพซ ([\d.]+K)/, '$1 pace'],
  [/เนินสั้น/, 'short hills'],
  [/จ็อก/g, 'jog'],
  [/กม\./g, 'km'],
  [/นาที/g, 'min'],
  [/(\d) ม\./g, '$1 m'],
]
export const titleEn = (title: string) => TITLE_EN.reduce((s, [re, to]) => s.replace(re, to), title)
export const durationEn = (d: string) => d.replace(/นาที/g, 'min').replace(/กม\./g, 'km')
/** หน่วยใน reps/rest ของท่า เช่น "8 / ข้าง", "30–45 วิ", "12–15 ก้าว" */
export const repsEn = (s: string) => s.replace(/ข้าง/g, 'side').replace(/ก้าว/g, 'steps').replace(/วิ/g, 's').replace(/นาที/g, 'min').replace(/ครั้ง/g, 'reps').replace(/รอบ/g, 'rounds')
export const weekdayEn = (th: string) => WEEKDAYS_EN[WEEKDAYS_TH.indexOf(th)] ?? th

const PROGRAMS_EN: Record<ProgramId, { name: string; short: string; summary: string }> = {
  physique: { name: 'Lean "Tom Holland" physique', short: 'Physique', summary: '3 strength + 2 run days — build muscle, lose fat' },
  start: { name: 'Start running (run-walk)', short: 'Start', summary: '3 run-walk + 2 light strength days until you can run 30 min non-stop' },
  mini: { name: 'Mini marathon 10.5 km (beginner)', short: 'Mini', summary: 'Run-walk → continuous running, 3 days + 2 light strength (~11 → 17 km/week); set a race date' },
  base: { name: 'Keep running (no race)', short: 'Base', summary: '3 runs + 2 strength days to stay fit (~12–16 km/week)' },
  strength: { name: 'Strength only', short: 'Strength', summary: '4 strength days, no running; week 4 of each cycle is lighter' },
  five: { name: '5K speed', short: '5K', summary: '3–4 runs with intervals to get faster at 5K (~12 → 18 km/week)' },
  ten: { name: '10K', short: '10K', summary: '3 → 4 runs + 2 strength days until you can run 10 km (~11 → 22 km/week)' },
  half: { name: 'Half marathon 21.1 km', short: 'Half', summary: '4 runs + 2 strength days (~16 → 34 km/week)' },
  full: { name: 'Marathon 42.2 km', short: 'Full', summary: '4 runs + 2 strength days (~36 → 60 km/week)' },
}

/** ข้อความของแผน (ชื่อวันฝึก, วันในสัปดาห์, เวลา, ชื่อโปรแกรม) ตามภาษาที่เลือก — คำอธิบาย/คิวยังเป็นไทย */
export function useDayText() {
  const [lang] = useLang()
  const en = lang === 'en'
  return {
    title: useCallback((d: Pick<Day, 'title'>) => (en ? titleEn(d.title) : d.title), [en]),
    weekday: useCallback((d: Pick<Day, 'day'>) => (en ? weekdayEn(d.day) : d.day), [en]),
    duration: useCallback((d: Pick<Day, 'duration'>) => (en ? durationEn(d.duration) : d.duration), [en]),
    program: useCallback((id: ProgramId) => (en ? PROGRAMS_EN[id] : programs[id]), [en]),
    reps: useCallback((s: string) => (en ? repsEn(s) : s), [en]),
    /** โน้ตของวัน/สัปดาห์ และคำอธิบายท่า/ชุดซ้อม (src/data/contentEn.ts) */
    note: useCallback((s: string) => (en ? noteToEn(s) : s), [en]),
    cue: useCallback((s: string) => (en ? cueToEn(s) ?? s : s), [en]),
    muscle: useCallback((m: Muscle) => (en ? muscleNamesEn : muscleNames)[m], [en]),
    en,
  }
}
