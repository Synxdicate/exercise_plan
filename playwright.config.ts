import { defineConfig, devices } from '@playwright/test'
import { existsSync } from 'node:fs'

// E2E: รันกับ build จริง (vite preview) ในโหมดไม่ล็อกอิน จึงไม่ต้องมีบัญชี Supabase
// ไฟล์ทดสอบชื่อ *.e2e.ts (ไม่ใช้ .spec/.test เพราะ vitest จะหยิบไปรันด้วย)
const localChrome = '/opt/google/chrome/chrome'

export default defineConfig({
  testDir: 'e2e',
  testMatch: '**/*.e2e.ts',
  timeout: 60_000,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    ...devices['Pixel 7'],
    viewport: { width: 390, height: 844 },
    baseURL: 'http://localhost:4173',
    locale: 'th-TH',
    timezoneId: 'Asia/Bangkok',
    // เครื่องที่มี Google Chrome อยู่แล้วใช้ตัวนั้น (ไม่ต้องดาวน์โหลด), CI ใช้ chromium ของ Playwright
    ...(!process.env.CI && existsSync(localChrome) ? { channel: 'chrome' } : {}),
  },
  webServer: {
    command: 'npx vite build --mode e2e && npx vite preview --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    // build ต้องมีค่า Supabase (แอปเช็กตอนเริ่ม) — โหมดไม่ล็อกอินไม่ได้เรียก server จริง
    env: {
      VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL ?? 'https://e2e.invalid',
      VITE_SUPABASE_PUBLISHABLE_KEY: process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? 'e2e',
    },
  },
})
