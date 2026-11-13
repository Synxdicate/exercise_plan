type WithId = { id?: string; date?: string }

const OBJECT_KEYS = ['done', 'dayLocation', 'readiness', 'foodLog', 'routes', 'dayMoves', 'raceChecklist', 'weekCheck']

/**
 * ค่าที่แก้ในเครื่อง (ยังไม่ได้ส่ง) ชนกับค่าบน server ที่เปลี่ยนไปหลังจากเครื่องนี้เห็นครั้งล่าสุด (อีกเครื่องเขียนมา)
 * รายการ (วิ่ง เวท น้ำหนัก) และ object ที่รวมได้: รวมกัน ค่าในเครื่องชนะเมื่อ id ซ้ำ
 * ค่าเดี่ยว (โปรแกรม วันแข่ง ฯลฯ): ใช้ค่าในเครื่อง เพราะเป็นสิ่งที่ผู้ใช้เพิ่งแก้
 * เคยส่งทับทั้งก้อน: เปิดแอปจากข้อมูลเก่าในเครื่อง ระบบคิดขึ้นสะสมใหม่แล้วส่ง runs เก่าทับ รอบวิ่งจากอีกเครื่องหาย
 */
export function mergeConflict(key: string, local: unknown, server: unknown): unknown {
  if (Array.isArray(local) && Array.isArray(server)) return mergeValues(key, local, server)
  if (local && server && typeof local === 'object' && typeof server === 'object' && !Array.isArray(local) && !Array.isArray(server) && OBJECT_KEYS.includes(key))
    return mergeValues(key, local, server)
  return local
}

// รวมข้อมูลในเครื่องกับ server ตอน login ครั้งแรกบนเครื่องที่มีข้อมูลอยู่แล้ว
export function mergeValues(key: string, local: unknown, server: unknown): unknown {
  if (Array.isArray(local) && Array.isArray(server)) {
    // sessions/runs ใช้ id, log น้ำหนักใช้ date
    const idOf = (x: WithId) => (key === 'log' ? x.date : x.id) ?? JSON.stringify(x)
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
