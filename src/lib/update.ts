import { useEffect, useState } from 'react'
import { isNative, SITE_URL } from './native'

declare const __BUILD__: string

// แอป Android ใช้ไฟล์ที่ฝังมาตอน build — เช็กกับเว็บว่ามีเวอร์ชันที่ใหม่กว่าไหม
export function useUpdateAvailable() {
  const [remote, setRemote] = useState<string | null>(null)
  useEffect(() => {
    if (!isNative) return
    fetch(`${SITE_URL}/version.json`, { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : null))
      .then((d: { build?: string } | null) => { if (d?.build && d.build > __BUILD__) setRemote(d.build) })
      .catch(() => {})
  }, [])
  return remote
}
