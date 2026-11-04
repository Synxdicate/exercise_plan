import { useEffect } from 'react'
import { scheduleReminders, type Reminder } from './notify'
import { useProgram } from './program'
import { usePersisted } from './storage'
import { isNative } from './native'
import { addDays, daysBetween, toDateStr, weekStart } from './date'

export type ReminderSetting = { on: boolean; time: string } // time = 'HH:MM'

// ค่าของแต่ละเครื่อง (ไม่ sync) — เตือนเฉพาะในแอป Android
export const useReminderSetting = () => usePersisted<ReminderSetting>('reminder', { on: true, time: '06:00' })

/** ตั้งเตือน 14 วันข้างหน้าตามแผน — เรียกใหม่ทุกครั้งที่เปิดแอปหรือแผนเปลี่ยน */
export function useReminderSchedule() {
  const p = useProgram()
  const [setting] = useReminderSetting()
  const key = `${p.program}|${p.location}|${p.currentWeek}|${p.raceDate}|${p.programStart}|${p.raceKm}|${setting.on}|${setting.time}`

  useEffect(() => {
    if (!isNative) return
    if (!setting.on) return void scheduleReminders([])
    const [hh, mm] = setting.time.split(':').map(Number)
    const now = new Date()
    const list: Reminder[] = []
    for (let d = 0; d < 14; d++) {
      const at = new Date(now.getFullYear(), now.getMonth(), now.getDate() + d, hh, mm)
      // สัปดาห์ของโปรแกรมตามวันที่จริง (ช่วงเตรียมตัว/สัปดาห์ที่ทำซ้ำ/หลังจบโปรแกรม) — เดิมบวกเลขสัปดาห์ไปเรื่อย ๆ
      const date = addDays(toDateStr(now), d)
      const week = p.weekOf(weekStart(date))
      if (week === null) continue
      const day = p.plan(week)[daysBetween(weekStart(date), date)]
      if (!day) continue
      list.push(day.type === 'rest'
        ? { at, title: 'วันนี้วันพัก', body: 'เดินเบา ๆ ยืดเหยียด นอนให้พอ' }
        : {
          at,
          title: day.type === 'run' ? `วันนี้วิ่ง: ${day.title}` : `วันนี้ฝึก: ${day.title}`,
          body: day.type === 'run'
            ? `${day.targetKm ? `${day.targetKm} กม.` : day.duration} — ${day.exercises[0]?.cue ?? ''}`
            : `${day.location === 'park' ? 'ที่สวน' : day.location === 'home' ? 'ที่บ้าน' : 'ที่ยิม'} · ${day.duration} · ${day.exercises.length} ท่า`,
        })
    }
    void scheduleReminders(list)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
}
