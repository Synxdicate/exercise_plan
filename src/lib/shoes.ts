import { usePersisted } from './storage'
import type { Run } from './log'

export type Shoe = { id: string; name: string; startKm: number; limitKm: number; retired?: boolean; isDefault?: boolean }

// ระยะเปลี่ยนรองเท้า ~500–800 กม. เป็นแนวทางของผู้ผลิต/โค้ช — ยังไม่มีงานวิจัยยืนยันตัวเลขที่แน่นอน
export const DEFAULT_LIMIT_KM = 700

export const useShoes = () => usePersisted<Shoe[]>('shoes', [])

export const shoeKm = (shoe: Shoe, runs: Run[]) =>
  shoe.startKm + runs.reduce((s, r) => s + (r.shoeId === shoe.id ? r.km : 0), 0)

export const defaultShoe = (shoes: Shoe[]) => shoes.find(s => s.isDefault && !s.retired) ?? shoes.find(s => !s.retired)

export function shoeStatus(km: number, limit: number) {
  const pct = km / limit
  return pct >= 1 ? 'bad' as const : pct >= 0.8 ? 'warn' as const : 'good' as const
}
