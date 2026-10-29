import type { Run } from './log'
import { bestEffort } from './analysis'
import { addDays, today } from './date'

// เวลาคาดการณ์ (คล้าย Performance Predictions ของ Strava) จากผลวิ่งที่ดีที่สุดช่วงล่าสุด
// - 5K–ฮาล์ฟ: Riegel T2 = T1 × (D2/D1)^1.07 — Vickers & Vertosick 2016 พบว่าแม่นพอถึงฮาล์ฟ
// - ฟูล: Riegel เร็วเกินจริง (≥10 นาทีในครึ่งหนึ่งของนักวิ่ง) จึงใช้ Model 1 ของงานเดียวกัน
//   ที่ปรับด้วยระยะซ้อมต่อสัปดาห์ (สูตรจาก Additional file 1 ของบทความ)
// เป็นค่าประมาณ — ใช้เป็นแนวทาง ไม่ใช่ตัวเลขตายตัว
const K = 1.07
const riegel = (sec: number, km: number, toKm: number) => sec * (toKm / km) ** K
const WINDOW_DAYS = 60 // ใช้ผลช่วง 2 เดือนล่าสุด (ความฟิตเปลี่ยนตามเวลา) ถ้าไม่มีจึงย้อนไปทั้งหมด
const MILES = 1.609344

/** Vickers & Vertosick 2016, Model 1: ความเร็วมาราธอน (m/s) จากผล 1 รายการ + ระยะซ้อม (ไมล์/สัปดาห์) */
export function vickersMarathon(sec: number, km: number, milesPerWeek: number) {
  const vRiegel = 42195 / (sec * (42.195 / km) ** K)
  const v = 0.16018617 + 0.83076202 * vRiegel + 0.06423826 * (milesPerWeek / 10)
  return 42195 / v
}

type Source = { km: number; seconds: number; date: string; runId: string; segment: boolean; easy: boolean }

/** ผลที่ใช้คำนวณ: ทั้งการวิ่ง (≥3 กม.) และช่วงที่เร็วที่สุดภายในการวิ่ง (5K/10K/ฮาล์ฟ) — เลือกอันที่เทียบเป็น 5K ได้เร็วที่สุด */
// ช้ากว่า 10:00/กม. คือเดินเร็ว/เดินสลับวิ่ง ไม่ใช่การวิ่งเต็มที่ — ใช้เป็นตัวอ้างอิงความฟิตไม่ได้
// (เคยทำให้เพซ 5K อ้างอิงช้ามาก แล้วเพซเดิน 13–16 นาที/กม. ถูกจัดเป็นโซน Speed)
export const MAX_SOURCE_PACE = 600

function bestSource(runs: Run[]): Source | null {
  let best: Source | null = null
  const consider = (c: Source) => { if (c.seconds / c.km > MAX_SOURCE_PACE) return; if (!best || riegel(c.seconds, c.km, 5) < riegel(best.seconds, best.km, 5)) best = c }
  for (const r of runs) {
    // วิ่งเบาที่มีชุดซ้อม (วิ่งสลับเดิน / strides / เนิน) มีช่วงเดินหรือพักอยู่ข้างใน ไม่ใช่การวิ่งต่อเนื่อง — ไม่ใช้เลย
    if (r.kind === 'easy' && r.guide) continue
    // วิ่งเบา/วิ่งยาวไม่ใช่การวิ่งเต็มที่ ใช้ได้แต่ต้องรู้ว่าเวลาคาดการณ์จะช้ากว่าความจริง
    const easy = r.kind === 'easy' || r.kind === 'long' || r.kind === 'other'
    if (r.km >= 3 && r.seconds > 0) consider({ km: r.km, seconds: r.seconds, date: r.date, runId: r.id, segment: false, easy })
    if (r.route && r.times && r.times.length === r.route.length)
      for (const km of [5, 10, 21.0975]) {
        if (r.km < km) break
        const t = bestEffort(r.route, r.times, km)
        if (t) consider({ km, seconds: t, date: r.date, runId: r.id, segment: true, easy })
      }
  }
  return best
}

export function estimate(runs: Run[], asOf = today()) {
  const past = runs.filter(r => r.date <= asOf)
  const from = addDays(asOf, -WINDOW_DAYS)
  const recent = past.filter(r => r.date > from)
  const src = bestSource(recent) ?? bestSource(past)
  if (!src) return null
  const stale = src.date <= from
  // ระยะซ้อมเฉลี่ย 4 สัปดาห์ล่าสุด
  const weeklyKm = past.filter(r => r.date > addDays(asOf, -28)).reduce((a, r) => a + r.km, 0) / 4
  const t5 = riegel(src.seconds, src.km, 5)
  const p5 = t5 / 5 // วินาที/กม. ที่เพซ 5K
  const tenK = riegel(src.seconds, src.km, 10)
  const half = riegel(src.seconds, src.km, 21.0975)
  const full = vickersMarathon(src.seconds, src.km, weeklyKm / MILES)
  return {
    from: { km: +src.km.toFixed(2), date: src.date, id: src.runId, segment: src.segment, easy: src.easy },
    stale,
    weeklyKm,
    // ฟูลยังไม่น่าเชื่อถือถ้าซ้อมน้อยหรือยังไม่เคยวิ่งไกล (ระยะยาวสุดที่ใช้คำนวณ < 10 กม.)
    fullReliable: weeklyKm >= 30 && src.km >= 10,
    fiveK: t5,
    tenK,
    half,
    full,
    paces: {
      easy: [p5 * 1.25, p5 * 1.4] as const,
      long: [p5 * 1.25, p5 * 1.4] as const,
      tempo: p5 * 1.08,
      interval: p5,
      tenK: tenK / 10,
      half: half / 21.0975,
      marathon: full / 42.195,
    },
  }
}

/** แนวโน้ม: เวลาคาดการณ์ ณ สิ้นแต่ละสัปดาห์ย้อนหลัง (ใช้วาดกราฟและบอกว่าดีขึ้นแค่ไหน) */
export function predictionTrend(runs: Run[], weeks = 12, asOf = today()) {
  return Array.from({ length: weeks }, (_, i) => {
    const date = addDays(asOf, -7 * (weeks - 1 - i))
    const e = estimate(runs, date)
    return { date, fiveK: e?.fiveK ?? null, tenK: e?.tenK ?? null, half: e?.half ?? null, full: e?.full ?? null }
  })
}

export type Estimate = NonNullable<ReturnType<typeof estimate>>

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`

// ข้อความเพซแนะนำของวันวิ่งตามชนิด
export function paceHint(e: Estimate | null, kind?: string, title = '') {
  // โปรแกรมเริ่มวิ่ง (วิ่งสลับเดิน/วิ่งต่อเนื่อง N นาที) ไม่มีเป้าเพซ — แค่ให้พูดเป็นประโยคได้
  if (!e || /วิ่งสลับเดิน|วิ่งต่อเนื่อง \d+ นาที/.test(title)) return null
  if (/10K/.test(title)) return `เพซ 10K ~${fmt(e.paces.tenK)} /กม.`
  if (/5K/.test(title)) return `เพซ 5K ~${fmt(e.paces.interval)} /กม.`
  if (/ฮาล์ฟ/.test(title)) return `เพซฮาล์ฟ ~${fmt(e.paces.half)} /กม.`
  if (/มาราธอน/.test(title)) return `เพซมาราธอน ~${fmt(e.paces.marathon)} /กม.`
  switch (kind) {
    case 'tempo': return `Tempo ~${fmt(e.paces.tempo)} /กม.`
    case 'interval': return `ช่วงเร็ว ~${fmt(e.paces.interval)} /กม.`
    case 'race': return null
    default: return `เบา ${fmt(e.paces.easy[0])}–${fmt(e.paces.easy[1])} /กม.`
  }
}

// ---- Critical speed (CS) ----
// Smyth & Muniz-Pumares 2020: ระยะ–เวลาของช่วงที่เร็วที่สุด (400 ม.–5 กม.) ในข้อมูลซ้อมเป็นเส้นตรง
// ความชัน = CS (ความเร็วสูงสุดที่ร่างกายยังคงที่ได้ ≈ เพดานแอโรบิก) ใช้คาดการณ์มาราธอนและคุมเพซ
// นักวิ่งที่วิ่งครึ่งแรกของมาราธอนเร็วกว่า ~94% CS มีแนวโน้มช้าลงมากในครึ่งหลัง
const CS_DISTANCES = [0.4, 0.8, 1, 1.5, 3, 5]
const CS_WINDOW_DAYS = 90

export function criticalSpeed(runs: Run[], asOf = today()) {
  const recent = runs.filter(r => r.date <= asOf && r.date > addDays(asOf, -CS_WINDOW_DAYS) && r.route && r.times && r.times.length === r.route.length)
  const pts: { m: number; s: number }[] = []
  for (const km of CS_DISTANCES) {
    let best = Infinity
    for (const r of recent) {
      if (r.km < km) continue
      const t = bestEffort(r.route!, r.times!, km)
      if (t && t < best) best = t
    }
    if (best < Infinity) pts.push({ m: km * 1000, s: best })
  }
  // ต้องมีอย่างน้อย 3 ระยะ และมีระยะยาว ≥3 กม. (ไม่งั้นความชันเพี้ยนจากช่วงสั้น ๆ)
  if (pts.length < 3 || !pts.some(p => p.m >= 3000)) return null
  const n = pts.length
  const mt = pts.reduce((a, p) => a + p.s, 0) / n
  const md = pts.reduce((a, p) => a + p.m, 0) / n
  const slope = pts.reduce((a, p) => a + (p.s - mt) * (p.m - md), 0) / pts.reduce((a, p) => a + (p.s - mt) ** 2, 0)
  const dPrime = md - slope * mt // ระยะ "สำรอง" เหนือ CS (เมตร)
  if (!(slope > 1.5 && slope < 7)) return null // นอกช่วงที่เป็นไปได้ของคน (กันข้อมูลเพี้ยน)
  return { cs: slope, pace: 1000 / slope, dPrime, points: pts.length, marathonFirstHalfPace: 1000 / (slope * 0.94) }
}
