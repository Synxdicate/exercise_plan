import { createContext, useContext } from 'react'

/** กรอบการ์ด (พื้น ขอบ เงา) ใช้ร่วมกันทุกการ์ด */
export const CARD = 'rounded-2xl bg-card shadow-sm ring-1 ring-line'
export const GroupCtx = createContext(false)
/** อยู่ใน CardGroup: การ์ดลูกไม่วาดกรอบของตัวเอง กลายเป็นแถวในการ์ดเดียวกัน */
export const useInGroup = () => useContext(GroupCtx)
