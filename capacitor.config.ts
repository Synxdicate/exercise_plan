import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.synxdicate.exerciseplan',
  appName: 'Exercise-Plan',
  webDir: 'dist',
  android: {
    // ปลั๊กอิน GPS เบื้องหลัง: กันไม่ให้ตำแหน่งหยุดส่งหลังอยู่เบื้องหลัง 5 นาที
    useLegacyBridge: true,
  },
}

export default config
