import type { RaceKey } from './goals'
import { raceKm } from './goals'

// แผนเพซวันแข่ง: ออกตัวช้ากว่าเพซเป้าเล็กน้อยช่วง 2 กม. แรก แล้วถือเพซเป้า ที่เหลือค่อยเร่งถ้ายังไหว
// นักวิ่งสมัครเล่นมักช้าลงมากในครึ่งหลัง (Deaner 2015: ผู้ชายช้าลงเฉลี่ย ~16%) และสถิติโลกมาราธอนวิ่งแบบเพซคงที่/ครึ่งหลังเร็วกว่า (Díaz 2018)
export const START_SLOWER_S = 8 // วินาที/กม. ช่วงออกตัว
const START_KM = 2

/** goalSec = เวลาเป้า/คาดการณ์ของระยะมาตรฐาน (key) · km = ระยะงานจริงถ้าต่างจากมาตรฐาน (เช่น มินิ 11.55) — ปรับเวลาด้วย Riegel */
export function racePlan(key: RaceKey, standardSec: number, km = raceKm[key]) {
  const D = km
  const goalSec = km === raceKm[key] ? standardSec : standardSec * (km / raceKm[key]) ** 1.07
  const goalPace = goalSec / D
  // ชดเชยเวลาที่ช้าช่วงออกตัวด้วยเพซที่เร็วขึ้นเล็กน้อยช่วงที่เหลือ ให้รวมแล้วเท่าเป้า
  const restPace = (goalSec - START_KM * (goalPace + START_SLOWER_S)) / (D - START_KM)
  const at = (km: number) => (km <= START_KM ? km * (goalPace + START_SLOWER_S) : START_KM * (goalPace + START_SLOWER_S) + (km - START_KM) * restPace)
  const marks = (key === 'tenK' ? [2, 5, 8, 10] : key === 'fiveK' ? [1, 2, 3, 4, 5] : key === 'half' ? [2, 5, 10, 15, 20] : [2, 5, 10, 15, 20, 25, 30, 35, 40]).filter(m => m < D).concat(D)
  return {
    goalSec,
    goalPace,
    startPace: goalPace + START_SLOWER_S,
    restPace,
    splits: [...new Set(marks)].map(km => ({ km, at: at(km) })),
    // เจล/คาร์บระหว่างแข่งเมื่อเกิน ~1 ชม. (30–60 ก./ชม. — ISSN Kerksick 2017)
    fuel: goalSec > 3600 ? Math.floor((goalSec - 45 * 60) / (35 * 60)) + 1 : 0,
  }
}

/** ระยะของวันแข่ง → ประเภท (ใช้กับเป้าเวลา/เวลาคาดการณ์) */
export const raceKeyOf = (km?: number): RaceKey | null => (!km ? null : km >= 40 ? 'full' : km >= 20 ? 'half' : km >= 9 ? 'tenK' : km >= 4.5 ? 'fiveK' : null)
