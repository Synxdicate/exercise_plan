import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { isNative } from './lib/native'
import { listenForAuthRedirect } from './lib/nativeAuth'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

listenForAuthRedirect()

// ใช้งานออฟไลน์ได้ (เฉพาะ production — dev server ไม่ต้องมี cache)
if (import.meta.env.PROD && 'serviceWorker' in navigator && !isNative) {
  window.addEventListener('load', () => void navigator.serviceWorker.register('/sw.js').catch(() => {}))
}
