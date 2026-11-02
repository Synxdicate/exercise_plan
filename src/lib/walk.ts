import type { Run } from './log'

// เดินนับเป็นวันที่ได้ออกกำลังกาย (ภาระการฝึก, ปฏิทิน, รองเท้า) แต่ไม่นับเป็นระยะวิ่ง —
// ไม่ให้ระยะสัปดาห์/เดือน ความพร้อมของโปรแกรม หรือเวลาคาดการณ์ดูมากกว่าที่วิ่งจริง
export const isWalk = (r: Pick<Run, 'kind'>) => r.kind === 'walk'
export const runsOnly = <T extends Pick<Run, 'kind'>>(runs: T[]) => runs.filter(r => !isWalk(r))
/** บันทึกเป็นวิ่งแต่เพซเฉลี่ยช้ากว่า 12 นาที/กม. ทั้งรอบ = น่าจะเดิน (วิ่งสลับเดินของมือใหม่ยังเร็วกว่านี้) */
export const looksLikeWalk = (r: Pick<Run, 'kind' | 'km' | 'seconds'>) => !isWalk(r) && r.km >= 0.5 && r.seconds / r.km > 12 * 60
