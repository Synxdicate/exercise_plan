import { Capacitor, registerPlugin } from '@capacitor/core'
import type { BackgroundGeolocationPlugin } from '@capacitor-community/background-geolocation'

// อยู่ในแอป Android (Capacitor) หรือบนเว็บ
export const isNative = Capacitor.isNativePlatform()

// ลิงก์ในอีเมล (ยืนยัน/ตั้งรหัสผ่าน) ต้องชี้ไปเว็บจริง — ในแอป origin เป็น https://localhost
export const SITE_URL = isNative ? 'https://exercise-plan-pi.vercel.app' : window.location.origin

// GPS เบื้องหลัง: ทำงานต่อได้ตอนปิดจอ โดยมีแจ้งเตือนค้างไว้ (foreground service)
export const BackgroundGeolocation = registerPlugin<BackgroundGeolocationPlugin>('BackgroundGeolocation')
