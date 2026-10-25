import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import { readStored, setStored, usePersisted } from './storage'
import { uid } from './log'
import { today } from './date'
import * as idb from './idb'

// รูปเก็บในเครื่องก่อนเสมอ (IndexedDB 'blobs') — แนบได้แม้ไม่มีเน็ต/ไม่ล็อกอิน
// ถ้าล็อกอินอยู่ ค่อยอัปโหลดขึ้น Supabase Storage (bucket ส่วนตัว 'photos', โฟลเดอร์ = user id) ทีหลัง
// path: 'local:<id>' = ยังอยู่ในเครื่องอย่างเดียว, '<user>/<id>.jpg' = อยู่บน server แล้ว
// รายการรูป (วันที่ แนบกับอะไร) อยู่ใน key 'photos' ที่ซิงก์เหมือนข้อมูลอื่น
export type Photo = { id: string; date: string; path: string; kind: 'progress' | 'run' | 'workout'; refId?: string }

export const usePhotos = () => usePersisted<Photo[]>('photos', [])
export const isLocalPhoto = (p: Photo) => p.path.startsWith('local:')

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

/** เก็บรูปลงเครื่อง แล้วลองอัปโหลด (ถ้าล็อกอินและมีเน็ต) */
export async function addPhoto(file: File, meta: Omit<Photo, 'id' | 'path' | 'date'> & { date?: string }): Promise<Photo> {
  const id = uid()
  await idb.put('blobs', id, await compress(file))
  return { id, path: `local:${id}`, date: meta.date ?? today(), kind: meta.kind, refId: meta.refId }
}

let syncing: Promise<void> | null = null

/** อัปโหลดรูปที่ยังอยู่แค่ในเครื่อง — เรียกหลังเพิ่มรูป, หลังล็อกอิน และตอนกลับมาออนไลน์ */
export function syncPhotos(): Promise<void> {
  syncing ??= (async () => {
    const { data } = await supabase.auth.getSession()
    const user = data.session?.user.id
    if (!user) return
    const pending = ((readStored('photos') as Photo[] | undefined) ?? []).filter(isLocalPhoto)
    for (const p of pending) {
      const blob = await idb.get<Blob>('blobs', p.id).catch(() => undefined)
      if (!blob) continue
      const path = `${user}/${p.id}.jpg`
      const { error } = await supabase.storage.from('photos').upload(path, blob, { contentType: 'image/jpeg', upsert: true })
      if (error) return // ออฟไลน์/เน็ตหลุด — ไว้รอบหน้า
      const now = (readStored('photos') as Photo[] | undefined) ?? []
      setStored('photos', now.map(x => (x.id === p.id ? { ...x, path } : x)))
    }
  })().finally(() => { syncing = null })
  return syncing
}

export async function deletePhotoFile(p: Photo) {
  await idb.del('blobs', p.id).catch(() => {})
  if (isLocalPhoto(p)) return
  const { error } = await supabase.storage.from('photos').remove([p.path])
  if (error) throw new Error(error.message)
}

// URL ชั่วคราว (1 ชม.) — แคชไว้ในหน่วยความจำ ไม่ขอซ้ำทุกครั้งที่ render
const signed = new Map<string, { url: string; exp: number }>()
const TTL_S = 3600

async function signedUrl(path: string) {
  const hit = signed.get(path)
  if (hit && hit.exp > Date.now() + 60_000) return hit.url
  const { data, error } = await supabase.storage.from('photos').createSignedUrl(path, TTL_S)
  if (error || !data) throw new Error(error?.message ?? 'โหลดรูปไม่ได้')
  signed.set(path, { url: data.signedUrl, exp: Date.now() + TTL_S * 1000 })
  return data.signedUrl
}

/** รูปจากเครื่องก่อน ถ้าไม่มี (เช่น ถ่ายจากอีกเครื่อง) ดึงจาก server แล้วเก็บไว้ดูตอนออฟไลน์ */
async function photoBlob(p: Photo): Promise<Blob> {
  const local = await idb.get<Blob>('blobs', p.id).catch(() => undefined)
  if (local) return local
  if (isLocalPhoto(p)) throw new Error('ไม่พบรูปในเครื่อง')
  const res = await fetch(await signedUrl(p.path))
  if (!res.ok) throw new Error('โหลดรูปไม่ได้')
  const blob = await res.blob()
  void idb.put('blobs', p.id, blob).catch(() => {})
  return blob
}

export function usePhotoUrl(p: Photo) {
  const [state, setState] = useState<{ id: string; url: string | null; failed: boolean }>({ id: p.id, url: null, failed: false })
  useEffect(() => {
    let alive = true
    let url: string | null = null
    photoBlob(p).then(
      b => { url = URL.createObjectURL(b); if (alive) setState({ id: p.id, url, failed: false }) },
      () => alive && setState({ id: p.id, url: null, failed: true }),
    )
    return () => { alive = false; if (url) URL.revokeObjectURL(url) }
    // path เปลี่ยน (อัปโหลดเสร็จ) ไม่ต้องโหลดใหม่ — ยังเป็นรูปเดิม
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.id])
  return state.id === p.id ? state : { url: null, failed: false }
}

/** ลบรูปที่แนบกับการวิ่ง/การฝึกที่ถูกลบ — ลบไฟล์แบบพยายาม (ออฟไลน์ก็ลบรายการออกก่อน) */
export function useRemovePhotosFor() {
  const [photos, setPhotos] = usePhotos()
  return (refId: string) => {
    const gone = photos.filter(p => p.refId === refId)
    if (!gone.length) return
    for (const p of gone) void deletePhotoFile(p).catch(() => {})
    setPhotos(prev => prev.filter(p => p.refId !== refId))
  }
}
