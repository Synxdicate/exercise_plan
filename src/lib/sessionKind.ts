import type { Session } from './log'

// เซสชันในคีย์ sessions มีทั้งเวทจริงและเซอร์กิตแกนกลาง/สะโพก (dayKey 'circuit') — เซอร์กิตเป็นกิจกรรม แต่ไม่ใช่วันเวท
export const isStrength = (s: Pick<Session, 'dayKey'>) => s.dayKey !== 'circuit' && s.dayKey !== 'cross'
export const strengthOnly = <T extends Pick<Session, 'dayKey'>>(sessions: T[]) => sessions.filter(isStrength)
