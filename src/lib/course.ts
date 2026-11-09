import { usePersisted } from './storage'
import type { Point } from './geo'

/** เส้นทางสนามแข่ง (synced `raceCourse`): เส้นทางย่อ ≤300 จุด + ความสูงจากแผนที่ความสูงเท่า ๆ กันตามระยะ */
export type RaceCourse = { name: string; km: number; route: Point[]; profile: number[]; gain: number; loss: number }

export const useRaceCourse = () => usePersisted<RaceCourse | null>('raceCourse', null)
