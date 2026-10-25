import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { readFileSync } from 'node:fs'
import { defineConfig, type Plugin } from 'vite'

// เวลา build — ฝังในแอป และเขียนเป็น /version.json ให้แอป Android เช็กว่ามีเวอร์ชันใหม่บนเว็บไหม
const BUILD = new Date().toISOString()
// เลขเวอร์ชัน x.y.z จาก package.json (ดู CHANGELOG.md) — แสดงในเมนูบัญชี และใช้เป็น versionName ของแอป Android
const VERSION = (JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string }).version

const versionFile = (): Plugin => ({
  name: 'version-file',
  generateBundle() {
    this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify({ build: BUILD, version: VERSION }) })
  },
})

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), versionFile()],
  define: { __BUILD__: JSON.stringify(BUILD), __APP_VERSION__: JSON.stringify(VERSION) },
})
