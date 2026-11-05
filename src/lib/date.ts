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

// จำนวนวันจาก a ถึง b
export const daysBetween = (a: string, b: string) => Math.round((parse(b).getTime() - parse(a).getTime()) / 86400000)

export const shortDate = (s: string) => {
  const d = parse(s)
  return `${d.getDate()}/${d.getMonth() + 1}`
}

export const WEEKDAYS_TH = ['จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์', 'อาทิตย์']
export const WEEKDAYS_EN = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

const TH_DAYS = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.']
const TH_MONTHS_SHORT = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']
const TH_MONTHS = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม']

/** วันที่อ่านง่าย: "วันนี้", "เมื่อวาน", "จ. 18 ส.ค." (ปีอื่นต่อท้ายด้วยปี พ.ศ.) */
// ภาษาของวันที่ — useLang() ตั้งค่าให้ (date.ts เป็นโมดูลบริสุทธิ์ ไม่อ่าน storage เอง)
let dateLang: 'th' | 'en' = 'th'
export const setDateLang = (l: 'th' | 'en') => { dateLang = l }
const EN_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const EN_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

export function niceDate(s: string, now = today()) {
  const diff = daysBetween(s, now)
  const en = dateLang === 'en'
  if (diff === 0) return en ? 'Today' : 'วันนี้'
  if (diff === 1) return en ? 'Yesterday' : 'เมื่อวาน'
  const d = parse(s)
  if (en) {
    const base = `${EN_DAYS[d.getDay()]} ${d.getDate()} ${EN_MONTHS[d.getMonth()].slice(0, 3)}`
    return s.slice(0, 4) === now.slice(0, 4) ? base : `${base} ${d.getFullYear()}`
  }
  const base = `${TH_DAYS[d.getDay()]} ${d.getDate()} ${TH_MONTHS_SHORT[d.getMonth()]}`
  return s.slice(0, 4) === now.slice(0, 4) ? base : `${base} ${d.getFullYear() + 543}`
}

/** "2026-10" → "ตุลาคม 2569" */
export const monthLabel = (ym: string) => dateLang === 'en' ? `${EN_MONTHS[+ym.slice(5, 7) - 1]} ${ym.slice(0, 4)}` : `${TH_MONTHS[+ym.slice(5, 7) - 1]} ${+ym.slice(0, 4) + 543}`
