import { Directory, Filesystem } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'
import { exportData, importData } from './sync'
import { readStored } from './storage'
import * as idb from './idb'
import { isNative } from './native'
import { today } from './date'
import { markBackedUp } from './localMode'
import type { Photo } from './photos'

// ไฟล์สำรอง = ข้อมูลทุก key + รูปที่ยังอยู่แค่ในเครื่อง (path 'local:…') เป็น base64
// รูปที่อัปโหลดขึ้นบัญชีแล้วไม่ต้องใส่ เพราะอยู่บน server อยู่แล้ว

const toBase64 = (b: Blob) => new Promise<string>((resolve, reject) => {
  const r = new FileReader()
  r.onload = () => resolve(String(r.result).split(',')[1])
  r.onerror = () => reject(r.error)
  r.readAsDataURL(b)
})

export async function buildBackup() {
  const data = exportData()
  const photos = ((readStored('photos') as Photo[] | undefined) ?? []).filter(p => p.path.startsWith('local:'))
  const photoBlobs: Record<string, string> = {}
  for (const p of photos) {
    const b = await idb.get<Blob>('blobs', p.id).catch(() => undefined)
    if (b) photoBlobs[p.id] = await toBase64(b)
  }
  return { ...data, photoBlobs }
}

/** บันทึกไฟล์สำรอง: แอปเปิดหน้าต่างแชร์ (เลือกเก็บลง Drive/ไฟล์ได้), เว็บดาวน์โหลด */
export async function saveBackup() {
  const json = JSON.stringify(await buildBackup())
  const name = `kao-backup-${today()}.json`
  if (isNative) {
    const { uri } = await Filesystem.writeFile({ path: name, data: btoa(unescape(encodeURIComponent(json))), directory: Directory.Cache })
    await Share.share({ files: [uri], dialogTitle: 'เก็บไฟล์สำรองข้อมูล' })
  } else {
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([json], { type: 'application/json' }))
    a.download = name
    a.click()
    URL.revokeObjectURL(a.href)
  }
  markBackedUp(today())
}

export async function restoreBackup(json: unknown) {
  importData(json)
  const blobs = (json as { photoBlobs?: Record<string, string> }).photoBlobs ?? {}
  for (const [id, b64] of Object.entries(blobs)) {
    const bin = Uint8Array.from(atob(b64), c => c.charCodeAt(0))
    await idb.put('blobs', id, new Blob([bin], { type: 'image/jpeg' }))
  }
}
