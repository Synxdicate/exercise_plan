// ความชัน เนิน และ GAP (เพซเทียบทางราบ) จากโปรไฟล์ความสูงที่สุ่มเท่า ๆ กันตามระยะ (pure, tested)
// พลังงานที่ใช้วิ่งต่อเมตรตามความชัน: Minetti et al. 2002 (J Appl Physiol) สมการเดียวกับที่ GAP ของ Strava ตั้งต้น
// แผนที่ความสูงละเอียด ~90 ม. จึงคิดความชันเป็นช่วงอย่างน้อย ~200 ม. (ช่วงสั้นกว่านี้คือสัญญาณรบกวน)

/** J/kg/m ที่ความชัน g (สัดส่วน เช่น 0.05 = 5%) ใช้ได้ในช่วง −45%…+45% */
export function runCost(g: number) {
  const x = Math.max(-0.45, Math.min(0.45, g))
  return 155.4 * x ** 5 - 30.4 * x ** 4 - 43.3 * x ** 3 + 46.3 * x ** 2 + 19.5 * x + 3.6
}
/** ตัวคูณระยะเทียบทางราบ (ขึ้นเนิน >1, ลงเนินเล็กน้อย <1) */
export const gradeFactor = (g: number) => runCost(g) / 3.6

/** ความสูงที่ปรับให้เรียบด้วยค่าเฉลี่ยเคลื่อนที่ (หน้าต่าง ~win เมตร) */
export function smoothProfile(profile: number[], km: number, win = 200) {
  const n = profile.length
  if (n < 3 || km <= 0) return profile.slice()
  const step = (km * 1000) / (n - 1)
  const half = Math.max(1, Math.round(win / step / 2))
  return profile.map((_, i) => {
    const a = Math.max(0, i - half), b = Math.min(n - 1, i + half)
    let s = 0
    for (let k = a; k <= b; k++) s += profile[k]
    return s / (b - a + 1)
  })
}

/** ความชันของแต่ละช่วงระหว่างจุด (สัดส่วน) จากโปรไฟล์ที่เรียบแล้ว */
export function grades(profile: number[], km: number) {
  const n = profile.length
  if (n < 2 || km <= 0) return []
  const step = (km * 1000) / (n - 1)
  const s = smoothProfile(profile, km)
  return s.slice(1).map((h, i) => (h - s[i]) / step)
}

export type Climb = { fromKm: number; toKm: number; gain: number; avg: number; max: number }

/** เนินขึ้นที่ชัดเจน: ขึ้นต่อเนื่อง ≥ minGain ม. ชันเฉลี่ย ≥ 2% (ลงแทรกไม่เกิน 3 ม. ยังนับเป็นเนินเดียว) */
export function findClimbs(profile: number[], km: number, minGain = 8): Climb[] {
  const n = profile.length
  if (n < 3 || km <= 0) return []
  const step = km / (n - 1)
  const s = smoothProfile(profile, km)
  const g = grades(profile, km)
  const out: Climb[] = []
  let start = 0, peak = s[0], peakAt = 0
  const close = () => {
    const gain = peak - s[start]
    const len = (peakAt - start) * step
    if (gain >= minGain && len > 0 && gain / (len * 1000) >= 0.02) {
      const seg = g.slice(start, peakAt)
      out.push({ fromKm: +(start * step).toFixed(2), toKm: +(peakAt * step).toFixed(2), gain: Math.round(gain), avg: +(gain / (len * 10)).toFixed(1), max: +(Math.max(...seg) * 100).toFixed(1) })
    }
  }
  for (let i = 1; i < n; i++) {
    if (s[i] > peak) { peak = s[i]; peakAt = i }
    if (peak - s[i] > 3) { // ลงจากยอดเกิน 3 ม. → ปิดเนิน เริ่มหาใหม่จากจุดต่ำ
      close()
      start = i; peak = s[i]; peakAt = i
    } else if (peak - s[start] < 1 && s[i] <= s[start] + 0.3) { start = i; peak = s[i]; peakAt = i } // ยังไม่เริ่มขึ้น: เลื่อนจุดเริ่มเนินมาใกล้ตีนเนิน
  }
  close()
  return out
}

/** เพซเทียบทางราบรายกิโล (วินาที/กม.) — split หารด้วยระยะที่ถ่วงตามความชันของกิโลนั้น */
export function gapSplits(splits: number[], profile: number[], km: number) {
  const n = profile.length
  if (n < 3 || km <= 0) return splits.map(() => null)
  const g = grades(profile, km)
  const step = km / (n - 1)
  return splits.map((sec, k) => {
    let eff = 0, len = 0
    g.forEach((gr, i) => {
      const a = i * step, b = (i + 1) * step
      const ov = Math.min(b, k + 1) - Math.max(a, k)
      if (ov > 0) { eff += ov * gradeFactor(gr); len += ov }
    })
    return len >= 0.5 ? sec / (eff / len) : null
  })
}

/** ความสูง/ความชันที่ระยะ d กม. (สำหรับแตะดูบนกราฟ) */
export function atKm(profile: number[], km: number, d: number) {
  const n = profile.length
  const i = Math.max(0, Math.min(n - 1, Math.round((d / km) * (n - 1))))
  const g = grades(profile, km)
  return { elev: profile[i], grade: g[Math.min(i, g.length - 1)] ?? 0 }
}

/** เพซเฉลี่ยเทียบทางราบทั้งรอบ (วินาที/กม.) */
export function gapPace(seconds: number, profile: number[], km: number) {
  const g = grades(profile, km)
  if (!g.length) return null
  const eff = g.reduce((a, gr) => a + gradeFactor(gr), 0) / g.length * km
  return eff > 0 ? seconds / eff : null
}
