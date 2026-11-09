import type { Run } from './log'
import { runsOnly } from './walk'
import { cumulative } from './analysis'
import { zoneOf } from './zones'
import { addDays } from './date'

// สัดส่วนวิ่งเบา : วิ่งหนัก (หลัก ~80/20: นักวิ่งส่วนใหญ่วิ่งเบาราว 80% ของเวลา Seiler 2010, Muñoz 2014) (pure, tested)
// มีเพซ 5K ที่เชื่อถือได้ = นับเวลาจริงในแต่ละโซนจากเส้นทาง (ช่วงละจุด GPS), ไม่งั้นนับตามชนิดการวิ่งทั้งรอบ

export type Intensity = { easySec: number; hardSec: number; easyPct: number; by: 'pace' | 'kind'; runs: number }

const HARD_KINDS = new Set<Run['kind']>(['tempo', 'interval', 'race'])

export function intensitySplit(runs: Run[], today: string, fiveKPace: number | null, days = 28): Intensity | null {
  const from = addDays(today, -days + 1)
  const list = runsOnly(runs).filter(r => r.date >= from && r.date <= today && r.seconds > 0)
  if (!list.length) return null
  let easy = 0, hard = 0
  for (const r of list) {
    if (fiveKPace && r.route && r.times && r.times.length === r.route.length && r.route.length > 2) {
      // เพซเฉลี่ยย้อนหลัง ~200 ม. ของแต่ละจุด (GPS จุดต่อจุดแกว่งเกินไป) แล้วนับเวลาของช่วงนั้นเข้าโซน
      const d = cumulative(r.route), t = r.times
      let j = 0
      for (let i = 1; i < d.length; i++) {
        const dt = t[i] - t[i - 1]
        if (dt <= 0 || dt > 60) continue // ช่วงหยุด/สัญญาณหาย ไม่นับ
        while (j < i - 1 && d[i] - d[j + 1] >= 200) j++
        const dm = d[i] - d[j], tt = t[i] - t[j]
        const z = dm >= 50 && tt > 0 ? zoneOf(tt / (dm / 1000), fiveKPace) : 'E'
        if (z === 'E') easy += dt
        else hard += dt
      }
    } else if (HARD_KINDS.has(r.kind)) hard += r.seconds
    else easy += r.seconds
  }
  const total = easy + hard
  if (!total) return null
  return { easySec: Math.round(easy), hardSec: Math.round(hard), easyPct: Math.round((easy / total) * 100), by: fiveKPace ? 'pace' : 'kind', runs: list.length }
}
