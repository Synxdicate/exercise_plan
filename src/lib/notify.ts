import { LocalNotifications } from '@capacitor/local-notifications'
import { isNative } from './native'

// แจ้งเตือนของเครื่อง (เฉพาะแอป Android) — ทำงานแม้ปิดจอ/แอปอยู่เบื้องหลัง
const REST_ID = 9001
const REMINDER_IDS = Array.from({ length: 14 }, (_, i) => 1000 + i)

let ready: Promise<boolean> | null = null

export function ensureNotifications(): Promise<boolean> {
  if (!isNative) return Promise.resolve(false)
  ready ??= (async () => {
    try {
      let p = await LocalNotifications.checkPermissions()
      if (p.display !== 'granted') p = await LocalNotifications.requestPermissions()
      await LocalNotifications.createChannel({ id: 'workout', name: 'ระหว่างฝึก', importance: 5, vibration: true, visibility: 1 })
      await LocalNotifications.createChannel({ id: 'reminder', name: 'เตือนการฝึกรายวัน', importance: 3, vibration: true })
      return p.display === 'granted'
    } catch {
      return false
    }
  })()
  return ready
}

/** เตือนเมื่อหมดเวลาพัก — ใช้ตอนจอดับ (ตอนเปิดหน้าแอปอยู่ ตัวนับในแอปจะสั่นเองอยู่แล้ว) */
export async function scheduleRestEnd(at: Date, next?: string) {
  if (!(await ensureNotifications())) return
  await LocalNotifications.cancel({ notifications: [{ id: REST_ID }] }).catch(() => {})
  await LocalNotifications.schedule({
    notifications: [{ id: REST_ID, channelId: 'workout', title: 'หมดเวลาพัก 💪', body: next ? `ถัดไป: ${next}` : 'ได้เวลาเซ็ตถัดไป', schedule: { at, allowWhileIdle: true } }],
  }).catch(() => {})
}

export async function cancelRestEnd() {
  if (!isNative) return
  await LocalNotifications.cancel({ notifications: [{ id: REST_ID }] }).catch(() => {})
}

export type Reminder = { at: Date; title: string; body: string }

/** ตั้งเตือนรายวันล่วงหน้า (สูงสุด 14 วัน) — เรียกใหม่ทุกครั้งที่เปิดแอป/เปลี่ยนแผน */
export async function scheduleReminders(list: Reminder[]) {
  if (!isNative) return
  await LocalNotifications.cancel({ notifications: REMINDER_IDS.map(id => ({ id })) }).catch(() => {})
  const upcoming = list.filter(r => r.at.getTime() > Date.now()).slice(0, REMINDER_IDS.length)
  if (!upcoming.length || !(await ensureNotifications())) return
  await LocalNotifications.schedule({
    notifications: upcoming.map((r, i) => ({ id: REMINDER_IDS[i], channelId: 'reminder', title: r.title, body: r.body, schedule: { at: r.at, allowWhileIdle: true } })),
  }).catch(() => {})
}
