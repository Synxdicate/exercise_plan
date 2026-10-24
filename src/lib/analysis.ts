import { haversine, type Point } from './geo'
import type { Run, Session } from './log'
import { addDays, daysBetween } from './date'

// ---------- Pace analysis ----------

// ระยะสะสม (เมตร) ของแต่ละจุดบนเส้นทาง
export function cumulative(route: Point[]) {
  const d = [0]
  for (let i = 1; i < route.length; i++) d.push(d[i - 1] + haversine(route[i - 1], route[i]))
  return d
}

const FASTEST_PLAUSIBLE = 150 // วินาที/กม. (2:30) — เร็วกว่านี้ถือว่า GPS กระโดด

// เพซตามระยะทาง เฉลี่ยแบบเลื่อนหน้าต่าง ~250 ม. ให้เส้นไม่หยักจาก GPS
export function paceSeries(route: Point[], times: number[], windowM = 250) {
  if (route.length < 2 || times.length !== route.length) return []
  const d = cumulative(route)
  const out: { km: number; pace: number }[] = []
  let j = 0
  for (let i = 1; i < d.length; i++) {
    while (d[i] - d[j + 1] >= windowM) j++
    const dd = d[i] - d[j]
    const dt = times[i] - times[j]
    if (dd < windowM * 0.6 || dt <= 0) continue
    const pace = dt / (dd / 1000)
    if (pace >= FASTEST_PLAUSIBLE && pace < 1200) out.push({ km: d[i] / 1000, pace })
  }
  return out
}

export type SplitAnalysis = { kind: 'negative' | 'even' | 'positive'; diffPct: number; cv: number; fastest: number; slowest: number }

// เทียบครึ่งแรก/ครึ่งหลัง และความสม่ำเสมอ (CV ของเพซรายกิโล)
export function splitAnalysis(splits: number[] | undefined): SplitAnalysis | null {
  if (!splits || splits.length < 2) return null
  const half = Math.floor(splits.length / 2)
  const avg = (a: number[]) => a.reduce((s, v) => s + v, 0) / a.length
  const first = avg(splits.slice(0, half))
  const second = avg(splits.slice(splits.length - half))
  const diffPct = ((second - first) / first) * 100
  const mean = avg(splits)
  const cv = (Math.sqrt(avg(splits.map(s => (s - mean) ** 2))) / mean) * 100
  return {
    kind: diffPct < -1 ? 'negative' : diffPct > 1 ? 'positive' : 'even',
    diffPct,
    cv,
    fastest: splits.indexOf(Math.min(...splits)),
    slowest: splits.indexOf(Math.max(...splits)),
  }
}

// ---------- Best efforts ----------

export const EFFORTS = [
  { km: 1, label: '1K' },
  { km: 5, label: '5K' },
  { km: 10, label: '10K' },
  { km: 21.0975, label: 'ฮาล์ฟ' },
  { km: 42.195, label: 'ฟูล' },
] as const

// เวลาเร็วที่สุดที่วิ่งระยะ D ต่อเนื่องได้ ณ ช่วงใดก็ได้ในการวิ่งครั้งนี้ (two-pointer + interpolate)
export function bestEffort(route: Point[], times: number[], km: number): number | null {
  if (route.length < 2 || times.length !== route.length) return null
  const d = cumulative(route)
  const D = km * 1000
  if (d.at(-1)! < D) return null
  let best = Infinity
  let i = 0
  for (let j = 1; j < d.length; j++) {
    while (i + 1 < j && d[j] - d[i + 1] >= D) i++
    if (d[j] - d[i] < D) continue
    // เลื่อนจุดเริ่มเข้ามาให้ได้ระยะพอดี D
    const over = d[j] - d[i] - D
    const segD = d[i + 1] - d[i]
    const frac = segD > 0 ? Math.min(1, over / segD) : 0
    const tStart = times[i] + frac * (times[i + 1] - times[i])
    const t = times[j] - tStart
    if (t > 0 && t / km >= FASTEST_PLAUSIBLE) best = Math.min(best, t)
  }
  return Number.isFinite(best) ? Math.round(best) : null
}

// สถิติดีที่สุดของแต่ละระยะจากทุกการวิ่ง — การวิ่งที่ไม่มีเส้นทาง (กรอกเอง) นับเฉพาะเมื่อระยะใกล้เคียง (±2%)
export function personalBests(runs: Run[]) {
  return EFFORTS.map(e => {
    let best: { seconds: number; date: string; id: string } | null = null
    for (const r of runs) {
      let t: number | null = null
      if (r.route && r.times && r.times.length === r.route.length) t = bestEffort(r.route, r.times, e.km)
      else if (r.seconds > 0 && Math.abs(r.km - e.km) / e.km <= 0.02) t = Math.round((r.seconds * e.km) / r.km)
      if (t && (!best || t < best.seconds)) best = { seconds: t, date: r.date, id: r.id }
    }
    return { ...e, best }
  })
}

// ---------- Training load: Fitness / Fatigue / Form ----------

// session-RPE (Foster 2001): ภาระ = ความเหนื่อย (0–10) × นาที — ถ้าไม่ได้ให้คะแนนไว้ ใช้ค่าประมาณตามชนิดการวิ่ง
const defaultRpe: Record<Run['kind'], number> = { easy: 3, long: 4, tempo: 6, interval: 8, race: 9, other: 4 }
export const runLoad = (r: Run) => (r.rpe ?? defaultRpe[r.kind]) * (r.seconds / 60)
export const sessionLoad = (s: Session) => (s.rpe ?? 6) * (s.minutes ?? 50)

export type LoadDay = { date: string; load: number; fitness: number; fatigue: number; form: number; day: number }

// ค่าเฉลี่ยถ่วงน้ำหนักแบบ exponential: fitness ~42 วัน, fatigue ~7 วัน (แนวคิดโมเดล Banister)
// form = fitness − fatigue ของเมื่อวาน — ใช้ดูแนวโน้ม ไม่ใช่ตัวทำนายการบาดเจ็บ
export function trainingLoad(runs: Run[], sessions: Session[], today: string, days = 84): LoadDay[] {
  const byDate = new Map<string, number>()
  for (const r of runs) byDate.set(r.date, (byDate.get(r.date) ?? 0) + runLoad(r))
  for (const s of sessions) byDate.set(s.date, (byDate.get(s.date) ?? 0) + sessionLoad(s))
  if (!byDate.size) return []
  const first = [...byDate.keys()].reduce((a, b) => (a < b ? a : b))
  const total = daysBetween(first, today)
  const kF = 1 - Math.exp(-1 / 42)
  const kA = 1 - Math.exp(-1 / 7)
  // เริ่มจากภาระเฉลี่ย 2 สัปดาห์แรก แทน 0 — ไม่อย่างนั้นช่วงแรกความฟิตต่ำกว่าจริงและฟอร์มติดลบเกิน
  const firstDays = Array.from({ length: Math.min(14, total + 1) }, (_, i) => byDate.get(addDays(first, i)) ?? 0)
  let fitness = firstDays.reduce((s, v) => s + v, 0) / firstDays.length
  let fatigue = fitness
  const out: LoadDay[] = []
  for (let i = 0; i <= total; i++) {
    const date = addDays(first, i)
    const load = byDate.get(date) ?? 0
    const form = fitness - fatigue
    fitness += kF * (load - fitness)
    fatigue += kA * (load - fatigue)
    out.push({ date, load, fitness, fatigue, form, day: i + 1 })
  }
  return out.slice(-days)
}

export function formLabel(form: number, fitness: number, historyDays = Infinity) {
  // ช่วงอิงสัดส่วนของ fitness (แนวทางโค้ช ไม่ใช่เกณฑ์จากงานวิจัย)
  const r = fitness > 0 ? form / fitness : 0
  if (fitness < 5 || historyDays < 28) return { label: 'เริ่มต้น', tone: 'muted' as const, text: 'ข้อมูลยังน้อย บันทึกต่อเนื่อง 2–3 สัปดาห์เพื่อเห็นแนวโน้ม' }
  if (r > 0.15) return { label: 'สดชื่น', tone: 'good' as const, text: 'พร้อมสำหรับวิ่งหนัก/แข่ง — ถ้าสดนานเกินไปความฟิตจะเริ่มลด' }
  if (r > -0.1) return { label: 'สมดุล', tone: 'run' as const, text: 'ฝึกตามแผนได้ตามปกติ' }
  if (r > -0.3) return { label: 'กำลังสร้างความฟิต', tone: 'warn' as const, text: 'ล้าจากการฝึก ซึ่งปกติในช่วงเพิ่มปริมาณ — นอนและกินให้พอ' }
  return { label: 'ล้าสะสมมาก', tone: 'bad' as const, text: 'ภาระสูงกว่าปกติมาก พิจารณาวันพักหรือสัปดาห์เบา' }
}
