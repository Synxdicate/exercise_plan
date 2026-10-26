import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { readFileSync } from 'node:fs'
import { defineConfig, type Plugin } from 'vite'

// เวลา build — เขียนเป็น /version.json ไว้เช็กว่าเว็บบน Vercel deploy เวอร์ชันไหนอยู่ (แอป Android เช็กอัปเดตจาก GitHub Releases แทนแล้ว)
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
  define: { __APP_VERSION__: JSON.stringify(VERSION) },
})
