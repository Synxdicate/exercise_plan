const pad = (n: number) => String(n).padStart(2, '0')

// วันที่ตามเวลาท้องถิ่น (toISOString เป็น UTC จะได้วันก่อนหน้าช่วงตี 0–7 ในไทย)
export const toDateStr = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

export const today = () => toDateStr(new Date())

const parse = (s: string) => {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

// วันจันทร์ของสัปดาห์นั้น
export function weekStart(s: string) {
  const d = parse(s)
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  return toDateStr(d)
}

export function addDays(s: string, n: number) {
  const d = parse(s)
  d.setDate(d.getDate() + n)
  return toDateStr(d)
}

export const shortDate = (s: string) => {
  const d = parse(s)
  return `${d.getDate()}/${d.getMonth() + 1}`
}
