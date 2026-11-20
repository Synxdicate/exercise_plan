import { heatSlowdown, wbgtApprox } from './weather'

// อากาศวันแข่ง "ตามปกติ" (ไม่ใช่พยากรณ์): ค่าเฉลี่ยชั่วโมงที่แข่งของวันเดียวกัน ±2 วัน ใน 5 ปีก่อน จาก Open-Meteo Archive (ERA5)
// รู้ได้ตั้งแต่หลายเดือนก่อนแข่ง (พยากรณ์ทำได้แค่ 3 วัน) ใช้ตั้งเวลาเป้าและแผนดื่ม (แนวคิดจาก FrontRunnr) (pure, tested)
// ปรับเวลาด้วย heatSlowdown (Ely 2007) จาก WBGT ในร่มโดยประมาณ (Stull 2011)

export const CLIMATE_YEARS = 5
export const CLIMATE_SPAN = 2

export type Climate = { temp: number; rh: number; wbgt: number; slowdown: number; years: number }

/** ช่วงวันที่ที่ต้องดึงของแต่ละปี: [start, end] (YYYY-MM-DD) */
export function climateRanges(raceDate: string, years = CLIMATE_YEARS): [string, string][] {
  const [y, m, d] = raceDate.split('-').map(Number)
  const iso = (dt: Date) => `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(dt.getUTCDate()).padStart(2, '0')}`
  return Array.from({ length: years }, (_, k) => {
    const c = Date.UTC(y - k - 1, m - 1, d)
    return [iso(new Date(c - CLIMATE_SPAN * 864e5)), iso(new Date(c + CLIMATE_SPAN * 864e5))]
  })
}

/** ชั่วโมงที่วิ่ง (เริ่ม ถึงก่อนเวลาจบ) จากเวลาปล่อยตัว "HH:MM" และนาทีที่คาดว่าใช้ */
export function raceHours(start: string, minutes: number): number[] {
  const [h, m] = start.split(':').map(Number)
  const from = h + (m || 0) / 60
  const to = from + Math.max(minutes, 30) / 60
  const out: number[] = []
  for (let x = Math.floor(from); x < to; x++) out.push(x % 24)
  return out
}

type Hourly = { time: string[]; temperature_2m: (number | null)[]; relative_humidity_2m: (number | null)[] }

/** เฉลี่ยอุณหภูมิ/ความชื้นของชั่วโมงที่แข่งจากข้อมูลรายชั่วโมงหลายปี (เวลาท้องถิ่น) */
export function climateFrom(series: Hourly[], hours: number[]): Climate | null {
  let t = 0
  let rh = 0
  let n = 0
  let years = 0
  for (const s of series) {
    let got = false
    s.time.forEach((iso, i) => {
      const hr = Number(iso.slice(11, 13))
      const tv = s.temperature_2m[i]
      const rv = s.relative_humidity_2m[i]
      if (hours.includes(hr) && tv != null && rv != null) { t += tv; rh += rv; n++; got = true }
    })
    if (got) years++
  }
  if (!n) return null
  const temp = Math.round((t / n) * 10) / 10
  const hum = Math.round(rh / n)
  const wbgt = Math.round(wbgtApprox(temp, hum) * 10) / 10
  return { temp, rh: hum, wbgt, slowdown: heatSlowdown(wbgt), years }
}

export async function fetchClimate(lat: number, lon: number, raceDate: string, hours: number[]): Promise<Climate | null> {
  const all = await Promise.all(climateRanges(raceDate).map(async ([a, b]) => {
    const r = await fetch(`https://archive-api.open-meteo.com/v1/archive?latitude=${lat.toFixed(2)}&longitude=${lon.toFixed(2)}&start_date=${a}&end_date=${b}&hourly=temperature_2m,relative_humidity_2m&timezone=auto`, { signal: AbortSignal.timeout(15_000) })
    if (!r.ok) throw new Error(`archive ${r.status}`)
    return ((await r.json()) as { hourly: Hourly }).hourly
  }))
  return climateFrom(all, hours)
}
