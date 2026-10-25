import { addDays, weekStart } from './date'

/** ตารางปฏิทินของเดือน (เริ่มวันจันทร์) 5–6 แถว × 7 วัน — วันนอกเดือนเป็น null */
export function monthGrid(ym: string): (string | null)[][] {
  const first = `${ym}-01`
  const start = weekStart(first)
  const rows: (string | null)[][] = []
  for (let d = start; ; d = addDays(d, 7)) {
    const row = Array.from({ length: 7 }, (_, i) => addDays(d, i)).map(x => (x.startsWith(ym) ? x : null))
    if (!row.some(Boolean)) break
    rows.push(row)
  }
  return rows
}

export const shiftMonth = (ym: string, n: number) => {
  const [y, m] = ym.split('-').map(Number)
  const t = new Date(y, m - 1 + n, 1)
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}`
}
