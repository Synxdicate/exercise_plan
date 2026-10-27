import { Filesystem, Directory, Encoding } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'
import { isNative } from './native'
import { toGpx } from './gpx'
import { runKinds, type Run } from './log'

/** ส่งออกการวิ่งเป็น GPX: แอปเปิดหน้าต่างแชร์ (เลือก Strava/Drive ได้), เว็บดาวน์โหลดไฟล์ */
export async function saveGpx(run: Run) {
  const xml = toGpx(run, `${runKinds[run.kind]} ${run.km.toFixed(2)} กม.`)
  const name = `kao-${run.date}-${run.id}.gpx`
  if (isNative) {
    const { uri } = await Filesystem.writeFile({ path: name, data: xml, directory: Directory.Cache, encoding: Encoding.UTF8 })
    await Share.share({ files: [uri], dialogTitle: 'ส่งออก GPX' })
  } else {
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([xml], { type: 'application/gpx+xml' }))
    a.download = name
    a.click()
    URL.revokeObjectURL(a.href)
  }
}
