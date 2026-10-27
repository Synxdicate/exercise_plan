import { useEffect } from 'react'
import { scheduleReminders, type Reminder } from './notify'
import { useProgram } from './program'
import { usePersisted } from './storage'
import { isNative } from './native'

export type ReminderSetting = { on: boolean; time: string } // time = 'HH:MM'

// ค่าของแต่ละเครื่อง (ไม่ sync) — เตือนเฉพาะในแอป Android
export const useReminderSetting = () => usePersisted<ReminderSetting>('reminder', { on: true, time: '06:00' })

/** ตั้งเตือน 14 วันข้างหน้าตามแผน — เรียกใหม่ทุกครั้งที่เปิดแอปหรือแผนเปลี่ยน */
export function useReminderSchedule() {
  const p = useProgram()
  const [setting] = useReminderSetting()
  const key = `${p.program}|${p.location}|${p.currentWeek}|${p.raceDate}|${setting.on}|${setting.time}`

  useEffect(() => {
    if (!isNative) return
    if (!setting.on) return void scheduleReminders([])
    const [hh, mm] = setting.time.split(':').map(Number)
    const now = new Date()
    const todayIdx = (now.getDay() + 6) % 7 // 0 = จันทร์
    const list: Reminder[] = []
    for (let d = 0; d < 14; d++) {
      const at = new Date(now.getFullYear(), now.getMonth(), now.getDate() + d, hh, mm)
      const offset = todayIdx + d
      const ahead = p.currentWeek + Math.floor(offset / 7)
      const week = p.ongoing ? ((ahead - 1) % p.meta.weeks) + 1 : Math.min(p.meta.weeks, ahead)
      const day = p.plan(week)[offset % 7]
      if (!day) continue
      list.push(day.type === 'rest'
        ? { at, title: 'วันนี้วันพัก', body: 'เดินเบา ๆ ยืดเหยียด นอนให้พอ' }
        : {
          at,
          title: day.type === 'run' ? `วันนี้วิ่ง: ${day.title}` : `วันนี้ฝึก: ${day.title}`,
          body: day.type === 'run'
            ? `${day.targetKm ? `${day.targetKm} กม.` : day.duration} — ${day.exercises[0]?.cue ?? ''}`
            : `${day.location === 'park' ? 'ที่สวน' : 'ที่ยิม'} · ${day.duration} · ${day.exercises.length} ท่า`,
        })
    }
    void scheduleReminders(list)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
}
