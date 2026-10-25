import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import { usePersisted } from './storage'
import { uid } from './log'
import { today } from './date'

// รูปเก็บใน Supabase Storage (bucket ส่วนตัว 'photos', โฟลเดอร์ = user id) — ต้องต่อเน็ตตอนอัปโหลด/ดู
// รายการรูป (วันที่ แนบกับอะไร) อยู่ใน key 'photos' ที่ซิงก์เหมือนข้อมูลอื่น
export type Photo = { id: string; date: string; path: string; kind: 'progress' | 'run' | 'workout'; refId?: string }

export const usePhotos = () => usePersisted<Photo[]>('photos', [])

const MAX_SIDE = 1440

/** ย่อรูปเป็น JPEG ด้านยาวไม่เกิน 1440 px (รูปมือถือ 3–8 MB → ~200–400 KB) */
async function compress(file: File): Promise<Blob> {
  const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' })
  const s = Math.min(1, MAX_SIDE / Math.max(bmp.width, bmp.height))
  const c = document.createElement('canvas')
  c.width = Math.round(bmp.width * s)
  c.height = Math.round(bmp.height * s)
  c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height)
  bmp.close()
  const blob = await new Promise<Blob | null>(r => c.toBlob(r, 'image/jpeg', 0.82))
  if (!blob) throw new Error('อ่านรูปไม่ได้')
  return blob
}

export async function uploadPhoto(file: File, meta: Omit<Photo, 'id' | 'path' | 'date'> & { date?: string }): Promise<Photo> {
  const { data } = await supabase.auth.getSession()
  const user = data.session?.user.id
  if (!user) throw new Error('ยังไม่ได้เข้าสู่ระบบ')
  const id = uid()
  const path = `${user}/${id}.jpg`
  const { error } = await supabase.storage.from('photos').upload(path, await compress(file), { contentType: 'image/jpeg' })
  if (error) throw new Error(navigator.onLine ? `อัปโหลดไม่สำเร็จ: ${error.message}` : 'ต้องต่อเน็ตเพื่ออัปโหลดรูป')
  return { id, path, date: meta.date ?? today(), kind: meta.kind, refId: meta.refId }
}

export async function deletePhotoFile(p: Photo) {
  const { error } = await supabase.storage.from('photos').remove([p.path])
  if (error) throw new Error(error.message)
}

// URL ชั่วคราว (1 ชม.) — แคชไว้ในหน่วยความจำ ไม่ขอซ้ำทุกครั้งที่ render
const cache = new Map<string, { url: string; exp: number }>()
const TTL_S = 3600

export async function signedUrl(path: string) {
  const hit = cache.get(path)
  if (hit && hit.exp > Date.now() + 60_000) return hit.url
  const { data, error } = await supabase.storage.from('photos').createSignedUrl(path, TTL_S)
  if (error || !data) throw new Error(error?.message ?? 'โหลดรูปไม่ได้')
  cache.set(path, { url: data.signedUrl, exp: Date.now() + TTL_S * 1000 })
  return data.signedUrl
}

export function usePhotoUrl(path: string) {
  const [url, setUrl] = useState<string | null>(() => cache.get(path)?.url ?? null)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    let alive = true
    signedUrl(path).then(u => alive && setUrl(u), () => alive && setFailed(true))
    return () => { alive = false }
  }, [path])
  return { url, failed }
}
