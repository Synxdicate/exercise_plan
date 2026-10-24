import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, type Plugin } from 'vite'

// เวลา build — ฝังในแอป และเขียนเป็น /version.json ให้แอป Android เช็กว่ามีเวอร์ชันใหม่บนเว็บไหม
const BUILD = new Date().toISOString()

const versionFile = (): Plugin => ({
  name: 'version-file',
  generateBundle() {
    this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify({ build: BUILD }) })
  },
})

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), versionFile()],
  define: { __BUILD__: JSON.stringify(BUILD) },
})
