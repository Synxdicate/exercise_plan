import { useEffect, useState } from 'react'
import { Download, Share2 } from 'lucide-react'
import type { Run } from '../lib/log'
import { downloadImage, renderRunCard, shareRunImage } from '../lib/shareImage'
import { isNative } from '../lib/native'
import { notify } from '../lib/dialog'
import { Button, Sheet } from './ui'

/** พรีวิวรูปการวิ่ง แล้วแชร์/บันทึก */
export function ShareRunSheet({ run, onClose }: { run: Run; onClose: () => void }) {
  const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null)
  const [busy, setBusy] = useState(false)
  useEffect(() => { void renderRunCard(run).then(setCanvas) }, [run])

  const share = async () => {
    if (!canvas) return
    setBusy(true)
    try {
      await shareRunImage(run, canvas)
    } catch (e) {
      notify(e instanceof Error ? e.message : 'แชร์ไม่สำเร็จ', 'bad')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Sheet onClose={onClose} title="แชร์การวิ่ง">
      <div className="mx-auto aspect-[4/5] w-full max-w-xs overflow-hidden rounded-2xl bg-raised ring-1 ring-line">
        {canvas && <img src={canvas.toDataURL('image/png')} alt="รูปสรุปการวิ่ง" className="size-full animate-fade-in" />}
      </div>
      <div className="mt-4 flex gap-2">
        {!isNative && <Button variant="soft" className="flex-1" disabled={!canvas} onClick={() => canvas && downloadImage(run, canvas)}><Download size={16} /> บันทึกรูป</Button>}
        <Button className="flex-1" disabled={!canvas || busy} onClick={share}><Share2 size={16} /> แชร์</Button>
      </div>
    </Sheet>
  )
}
