import { usePersisted } from './storage'
import type { StopKind, StopsCache } from './stops'

/** สีจุดบนแผนที่ (สีคงที่เหมือนเส้นทาง เพราะอยู่บนแผนที่ ไม่เปลี่ยนตามธีม) */
export const STOP_COLOR: Record<StopKind, string> = { water: '#0284c7', shop: '#16a34a', toilet: '#d97706' }

export const useStopsCache = () => usePersisted<StopsCache>('routeStops', {})

/** จุดแวะของรอบนี้ (ถ้าเคยหาไว้) สำหรับวาดบนแผนที่ */
export function useStopMarks(id: string) {
  const [cache] = useStopsCache()
  return cache[id]?.stops.map(s => ({ at: s.at, color: STOP_COLOR[s.kind] }))
}
