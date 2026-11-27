import type { Exercise } from '../data/workouts'

// เวลาโดยประมาณของวันเวท: อบอุ่นร่างกาย 5 นาที + เวลาทำแต่ละเซ็ต + เวลาพัก (ซูเปอร์เซ็ตพักหลังครบรอบเท่านั้น) (pure, tested)

const WARMUP = 300
const SWITCH = 15 // เปลี่ยนท่าในซูเปอร์เซ็ต
const NEXT = 60 // เปลี่ยนไปท่าถัดไป (จัดอุปกรณ์)

/** เวลาทำหนึ่งเซ็ต (วินาที): ท่าค้างใช้เวลาจริง ท่านับครั้ง ~3 วิ/ครั้ง ทำทีละข้างคูณสอง */
export function setSeconds(e: Exercise) {
  const nums = e.reps.match(/\d+/g)?.map(Number) ?? [10]
  const n = nums.length > 1 ? (nums[0] + nums[1]) / 2 : nums[0]
  const sides = /ข้าง/.test(e.reps) ? 2 : 1
  return (/วิ/.test(e.reps) ? n : n * 3 + 10) * sides
}

const sets = (e: Exercise) => parseInt(e.sets, 10) || 1

/** นาที ปัดเป็นทีละ 5 */
export function sessionMinutes(list: Exercise[]) {
  let sec = WARMUP
  for (let i = 0; i < list.length;) {
    const tag = list[i].pair
    let j = i + 1
    while (tag && j < list.length && list[j].pair === tag) j++
    const group = list.slice(i, j)
    const rounds = Math.max(...group.map(sets))
    for (let r = 0; r < rounds; r++) {
      const inRound = group.filter(e => sets(e) > r)
      sec += inRound.reduce((t, e) => t + setSeconds(e), 0) + SWITCH * (inRound.length - 1)
      if (r < rounds - 1) sec += restSeconds(inRound.at(-1)!.rest)
    }
    sec += NEXT
    i = j
  }
  return Math.max(5, Math.round(sec / 300) * 5)
}

// เวลาพักจากข้อความในแผน: "2–3 นาที" → 150, "90 วิ" → 90
export function restSeconds(rest: string) {
  const nums = rest.match(/\d+/g)?.map(Number)
  if (!nums?.length) return 60
  const avg = nums.reduce((s, n) => s + n, 0) / nums.length
  return Math.round(rest.includes('นาที') ? avg * 60 : avg)
}

/**
 * หลังทำเซ็ต i ของท่า idx: ไปท่าไหนต่อ พักกี่วินาที (pure)
 * ซูเปอร์เซ็ต (pair เดียวกัน): ไปท่าถัดไปในชุดที่ยังเหลือเซ็ต พักสั้น 15 วิ ครบรอบแล้วกลับท่าแรกพักเต็ม
 * ท่าปกติ: เหลือเซ็ตอยู่ท่าเดิม ครบแล้วไปท่าถัดไป
 */
export function afterSet(list: Exercise[], rows: Record<string, { done: boolean }[]>, idx: number, i: number) {
  const tag = list[idx].pair
  const group = tag ? list.map((e, j) => [e, j] as const).filter(([e]) => e.pair === tag).map(([, j]) => j) : [idx]
  const left = (j: number) => rows[list[j].name].filter((x, k) => !x.done && !(j === idx && k === i)).length
  const at = group.indexOf(idx)
  const order = [...group.slice(at + 1), ...group.slice(0, at + 1)]
  const next = order.find(j => left(j) > 0)
  const full = restSeconds(list[idx].rest)
  if (next !== undefined) return { target: next, sec: next > idx ? 15 : full }
  const after = Math.max(...group) + 1
  return { target: after < list.length ? after : idx, sec: full }
}
