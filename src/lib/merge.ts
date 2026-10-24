type WithId = { id?: string; date?: string }

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
    if (['done', 'dayLocation', 'readiness', 'foodLog'].includes(key)) return { ...(server as object), ...(local as object) }
  }
  return server
}
