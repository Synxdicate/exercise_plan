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
// (เว็บไม่ต้องเช็ก โหลดหน้าใหม่ก็ได้เวอร์ชันล่าสุดแล้ว)
export function useUpdateAvailable() {
  const [remote, setRemote] = useState<string | null>(null)
  useEffect(() => {
    if (!isNative) return
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
export const downloadUpdate = () => Browser.open({ url: LATEST_APK })
