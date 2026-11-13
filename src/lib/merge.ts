type WithId = { id?: string; date?: string }

const OBJECT_KEYS = ['done', 'dayLocation', 'readiness', 'foodLog', 'routes', 'dayMoves', 'raceChecklist', 'weekCheck']

/**
 * ค่าที่แก้ในเครื่อง (ยังไม่ได้ส่ง) ชนกับค่าบน server ที่เปลี่ยนไปหลังจากเครื่องนี้เห็นครั้งล่าสุด (อีกเครื่องเขียนมา)
 * รายการ (วิ่ง เวท น้ำหนัก) และ object ที่รวมได้: รวม 3 ทางกับ id ที่เห็นล่าสุด (base) ค่าในเครื่องชนะเมื่อ id ซ้ำ
 * ไม่มี base (ข้อมูลจากเวอร์ชันก่อน 2.73.2): รวมทุก id
 * ค่าเดี่ยว (โปรแกรม วันแข่ง ฯลฯ): ใช้ค่าในเครื่อง เพราะเป็นสิ่งที่ผู้ใช้เพิ่งแก้
 * เคยส่งทับทั้งก้อน: เปิดแอปจากข้อมูลเก่าในเครื่อง ระบบคิดขึ้นสะสมใหม่แล้วส่ง runs เก่าทับ รอบวิ่งจากอีกเครื่องหาย
 */
export function mergeConflict(key: string, local: unknown, server: unknown, base?: string[]): unknown {
  const arrays = Array.isArray(local) && Array.isArray(server)
  const objects = !arrays && isObj(local) && isObj(server) && OBJECT_KEYS.includes(key)
  if (!arrays && !objects) return local
  // ไม่รู้ว่าครั้งล่าสุดเห็นอะไร (ข้อมูลจากเวอร์ชันก่อน): รวมทั้งหมด
  if (!base) return mergeValues(key, local, server)
  // รวมแบบ 3 ทาง: id ที่เคยเห็นแล้วแต่หายไปจากฝั่งหนึ่ง = ฝั่งนั้นลบ ไม่เอากลับมา; id ที่ไม่เคยเห็น = ฝั่งนั้นเพิ่มใหม่ เก็บไว้
  const seen = new Set(base)
  if (arrays) {
    const idOf = idFor(key)
    const l = local as WithId[], sv = server as WithId[]
    const lIds = new Set(l.map(idOf)), sIds = new Set(sv.map(idOf))
    const out = new Map<string, WithId>()
    for (const x of sv) if (lIds.has(idOf(x)) || !seen.has(idOf(x))) out.set(idOf(x), x)
    for (const x of l) if (sIds.has(idOf(x)) || !seen.has(idOf(x))) out.set(idOf(x), x)
    return [...out.values()].sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''))
  }
  const l = local as Record<string, unknown>, sv = server as Record<string, unknown>
  const out: Record<string, unknown> = {}
  for (const k of Object.keys(sv)) if (k in l || !seen.has(k)) out[k] = sv[k]
  for (const k of Object.keys(l)) if (k in sv || !seen.has(k)) out[k] = l[k]
  return out
}

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v)
// sessions/runs ใช้ id, log น้ำหนักใช้ date
const idFor = (key: string) => (x: WithId) => (key === 'log' ? x.date : x.id) ?? JSON.stringify(x)

/** id ของรายการ/คีย์ของ object ที่รวมได้ เก็บไว้เป็นฐานของการรวม 3 ทาง (undefined = ค่าเดี่ยว ไม่ต้องเก็บ) */
export function idsOf(key: string, value: unknown): string[] | undefined {
  if (Array.isArray(value)) return (value as WithId[]).map(idFor(key))
  if (isObj(value) && OBJECT_KEYS.includes(key)) return Object.keys(value)
  return undefined
}

// รวมข้อมูลในเครื่องกับ server ตอน login ครั้งแรกบนเครื่องที่มีข้อมูลอยู่แล้ว
export function mergeValues(key: string, local: unknown, server: unknown): unknown {
  if (Array.isArray(local) && Array.isArray(server)) {
    // sessions/runs ใช้ id, log น้ำหนักใช้ date
    const idOf = idFor(key)
    const byId = new Map<string, WithId>()
    for (const x of [...server, ...local] as WithId[]) byId.set(idOf(x), x)
    return [...byId.values()].sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''))
  }
  if (local && server && typeof local === 'object' && typeof server === 'object' && !Array.isArray(local)) {
    // done / dayLocation / readiness / foodLog: รวม object (ค่าในเครื่องชนะ)
    // routes: เส้นทางตาม id รอบวิ่ง ไม่รวมแล้วเส้นทางของรอบที่วิ่งในเครื่อง (โหมดออฟไลน์) จะหายตอนล็อกอินครั้งแรก
    if (OBJECT_KEYS.includes(key)) return { ...(server as object), ...(local as object) }
  }
  return server
}
