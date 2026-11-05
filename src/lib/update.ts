import { useEffect, useState } from 'react'
import { Browser } from '@capacitor/browser'
import { isNative } from './native'
import { newerVersion } from './semver'

declare const __APP_VERSION__: string

export const APP_VERSION = __APP_VERSION__

const REPO = 'Synxdicate/exercise_plan'
/** ไฟล์ APK ชื่อคงที่ของ release ล่าสุด (scripts/release-android.sh) */
export const LATEST_APK = `https://github.com/${REPO}/releases/latest/download/exercise-plan.apk`

// แอป Android: เช็ก GitHub Release ล่าสุดที่มีไฟล์ APK — ใหม่กว่าเวอร์ชันในเครื่อง → ให้กดดาวน์โหลดอัปเดตได้เอง
// เว็บ: แท็บที่เปิดค้างไว้ไม่โหลดเวอร์ชันใหม่เอง (SPA) — เช็ก /version.json ตอนกลับมาที่แท็บและทุก 30 นาที แล้วให้กดโหลดใหม่
// (เคยเจอ error จากแท็บเว็บ v2.39 ที่ค้างอยู่ขณะข้อมูลถูกเวอร์ชันใหม่แก้)
export function useUpdateAvailable() {
  const [remote, setRemote] = useState<string | null>(null)
  useEffect(() => {
    if (!isNative) {
      if (!import.meta.env.PROD) return
      const check = () => {
        if (document.visibilityState !== 'visible') return
        fetch('/version.json', { cache: 'no-store' })
          .then(r => (r.ok ? r.json() : null))
          .then((d: { version?: string } | null) => { if (d?.version && newerVersion(d.version, APP_VERSION)) setRemote(d.version) })
          .catch(() => {})
      }
      check()
      const id = setInterval(check, 30 * 60_000)
      document.addEventListener('visibilitychange', check)
      return () => { clearInterval(id); document.removeEventListener('visibilitychange', check) }
    }
    fetch(`https://api.github.com/repos/${REPO}/releases/latest`, { headers: { Accept: 'application/vnd.github+json' } })
      .then(r => (r.ok ? r.json() : null))
      .then((d: { tag_name?: string; assets?: { name: string }[] } | null) => {
        const v = d?.tag_name?.replace(/^v/, '')
        if (v && d?.assets?.some(a => a.name === 'exercise-plan.apk') && newerVersion(v, APP_VERSION)) setRemote(v)
      })
      .catch(() => {})
  }, [])
  return remote
}

/** เปิดลิงก์ดาวน์โหลด APK ในเบราว์เซอร์ (Android จะถามติดตั้งเมื่อดาวน์โหลดเสร็จ) */
export const downloadUpdate = () => (isNative ? Browser.open({ url: LATEST_APK }) : Promise.resolve(location.reload()))

/**
 * ไฟล์ส่วนย่อยของเวอร์ชันเก่าหายไปหลัง deploy ใหม่ (แท็บเปิดค้าง) → import ล้ม → โหลดหน้าใหม่ครั้งเดียว
 * (กันวนซ้ำด้วย sessionStorage — ถ้าโหลดใหม่แล้วยังล้ม ให้ ErrorBoundary แสดงตามปกติ)
 */
export function reloadOnChunkError() {
  const KEY = 'chunkReloadAt'
  window.addEventListener('vite:preloadError', e => {
    let last = 0
    try { last = Number(sessionStorage.getItem(KEY)) || 0 } catch { /* ignore */ }
    if (Date.now() - last < 60_000) return
    try { sessionStorage.setItem(KEY, String(Date.now())) } catch { /* ignore */ }
    e.preventDefault()
    location.reload()
  })
}
