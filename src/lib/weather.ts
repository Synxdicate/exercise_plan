import { useEffect, useState } from 'react'

// อุณหภูมิกระเปาะเปียกจากอุณหภูมิ + ความชื้นสัมพัทธ์ (Stull 2011, ใช้ได้ที่ RH 5–99%)
export function wetBulb(t: number, rh: number) {
  return t * Math.atan(0.151977 * Math.sqrt(rh + 8.313659)) + Math.atan(t + rh) - Math.atan(rh - 1.676331)
    + 0.00391838 * rh ** 1.5 * Math.atan(0.023101 * rh) - 4.686035
}

// WBGT ในที่ร่ม = 0.7 × กระเปาะเปียก + 0.3 × อุณหภูมิ (ไม่มีข้อมูลแดด/globe temperature)
// กลางแดดจริงค่าจะสูงกว่านี้ราว 2–3 °C — สูตรย่อแบบ 0.567T + 0.393e + 3.94 ให้ค่าสูงเกินจริงในอากาศชื้นแบบไทย จึงไม่ใช้
export function wbgtApprox(tempC: number, rh: number) {
  return 0.7 * wetBulb(tempC, rh) + 0.3 * tempC
}

export type HeatLevel = 'ok' | 'warm' | 'hot' | 'danger'

// ระดับสำหรับปรับความหนัก อิงช่วง WBGT ของ ACSM (Armstrong 2007) แบบระมัดระวัง
// ACSM 2023 แนะนำให้ปรับตามภูมิภาค — คนที่ชินอากาศร้อนทนได้มากกว่า แต่ใช้ค่าเดียวกันเพื่อความปลอดภัย
export function heatLevel(wbgt: number): HeatLevel {
  if (wbgt < 23) return 'ok'
  if (wbgt < 28) return 'warm'
  if (wbgt < 31) return 'hot'
  return 'danger'
}

export const heatAdvice: Record<HeatLevel, { label: string; text: string }> = {
  ok: { label: 'เหมาะกับการวิ่ง', text: 'วิ่งตามแผนได้ ดื่มน้ำตามปกติ' },
  warm: { label: 'ร้อน', text: 'วิ่งช้าลง 10–20 วิ/กม. ดื่มน้ำเพิ่ม ถ้ามีวิ่งหนักให้เลือกช่วงที่เย็นที่สุด' },
  hot: { label: 'ร้อนจัด', text: 'เลี่ยงวิ่งหนักและวิ่งยาว ถ้าจะวิ่งให้สั้นและเบา พกน้ำ + เกลือแร่' },
  danger: { label: 'อันตราย', text: 'งดวิ่งกลางแจ้งช่วงนี้ — เสี่ยง heat stroke เลื่อนไปช่วงเช้ามืด/ค่ำ หรือวิ่งในร่ม' },
}

export type Hour = { time: string; hour: number; temp: number; rh: number; wbgt: number }

const BANGKOK = { lat: 13.75, lon: 100.5 }
const CACHE_KEY = 'heatCache'
const TTL = 60 * 60 * 1000

async function locate(): Promise<{ lat: number; lon: number }> {
  return new Promise(resolve => {
    if (!('geolocation' in navigator)) return resolve(BANGKOK)
    navigator.geolocation.getCurrentPosition(
      p => resolve({ lat: +p.coords.latitude.toFixed(2), lon: +p.coords.longitude.toFixed(2) }), // ความละเอียด ~1 กม. พอสำหรับพยากรณ์
      () => resolve(BANGKOK),
      { enableHighAccuracy: false, maximumAge: 6 * 60 * 60 * 1000, timeout: 5000 },
    )
  })
}

export async function fetchHours(): Promise<Hour[]> {
  try {
    const c = JSON.parse(localStorage.getItem(CACHE_KEY) ?? 'null') as { at: number; hours: Hour[] } | null
    if (c && Date.now() - c.at < TTL) return c.hours
  } catch {
    /* ignore */
  }
  const { lat, lon } = await locate()
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,relative_humidity_2m&timezone=auto&forecast_days=2`
  const res = await fetch(url)
  if (!res.ok) throw new Error('weather')
  const d = await res.json() as { hourly: { time: string[]; temperature_2m: number[]; relative_humidity_2m: number[] } }
  const hours = d.hourly.time.map((time, i) => {
    const temp = d.hourly.temperature_2m[i]
    const rh = d.hourly.relative_humidity_2m[i]
    return { time, hour: +time.slice(11, 13), temp, rh, wbgt: +wbgtApprox(temp, rh).toFixed(1) }
  })
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), hours }))
  } catch {
    /* ignore */
  }
  return hours
}

// ช่วงเวลาที่เย็นที่สุดจากนี้ไปจนถึงพรุ่งนี้เช้า (05:00–21:00)
export function bestHour(hours: Hour[], nowIso: string) {
  const upcoming = hours.filter(h => h.time >= nowIso.slice(0, 13) && h.hour >= 5 && h.hour <= 21).slice(0, 24)
  return upcoming.reduce<Hour | null>((b, h) => (!b || h.wbgt < b.wbgt ? h : b), null)
}

export function useHeat() {
  const [hours, setHours] = useState<Hour[] | null>(null)
  const [error, setError] = useState(false)
  useEffect(() => {
    let alive = true
    fetchHours().then(h => alive && setHours(h)).catch(() => alive && setError(true))
    return () => { alive = false }
  }, [])
  return { hours, error }
}
