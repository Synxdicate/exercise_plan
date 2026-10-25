import './index.css'
import { initStorage } from './lib/storage'
import { isNative } from './lib/native'

// โหลดข้อมูลจาก IndexedDB ให้เสร็จก่อน แล้วค่อยโหลดแอป (โมดูลอย่าง sync.ts อ่านค่าตอน import)
async function start() {
  await initStorage()
  const [{ StrictMode, createElement }, { createRoot }, { default: App }, { listenForAuthRedirect }, { ErrorBoundary }, { installErrorHandlers }] = await Promise.all([
    import('react'), import('react-dom/client'), import('./App.tsx'), import('./lib/nativeAuth'), import('./components/ErrorBoundary'), import('./lib/errors'),
  ])
  installErrorHandlers()
  createRoot(document.getElementById('root')!).render(createElement(StrictMode, null, createElement(ErrorBoundary, null, createElement(App))))
  listenForAuthRedirect()
}
void start()

// ใช้งานออฟไลน์ได้ (เฉพาะ production — dev server ไม่ต้องมี cache)
if (import.meta.env.PROD && 'serviceWorker' in navigator && !isNative) {
  window.addEventListener('load', () => void navigator.serviceWorker.register('/sw.js').catch(() => {}))
}
