import { useEffect, useState } from 'react'
import { Download, Share2 } from 'lucide-react'
import type { Run } from '../lib/log'
import { downloadImage, renderRunCard, shareRunImage, type CardStyle } from '../lib/shareImage'
import { isNative } from '../lib/native'
import { notify } from '../lib/dialog'
import { cx } from '../lib/cx'
import { Button, Segmented, Sheet } from './ui'

// ตารางหมากรุกบอกว่าพื้นหลังโปร่ง (เหมือนโปรแกรมแต่งรูป)
const checker = { backgroundImage: 'repeating-conic-gradient(#9ca3af 0% 25%, #e5e7eb 0% 50%)', backgroundSize: '20px 20px' }

/** พรีวิวรูปการวิ่ง แล้วแชร์/บันทึก — การ์ดสี หรือสติกเกอร์ PNG พื้นหลังโปร่ง */
export function ShareRunSheet({ run, onClose }: { run: Run; onClose: () => void }) {
  const [style, setStyle] = useState<CardStyle>('card')
  const [result, setResult] = useState<{ style: CardStyle; canvas: HTMLCanvasElement; url: string } | null>(null)
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    let alive = true
    void renderRunCard(run, style).then(c => alive && setResult({ style, canvas: c, url: c.toDataURL('image/png') }))
    return () => { alive = false }
  }, [run, style])
  const ready = result?.style === style ? result : null

  const share = async () => {
    if (!ready) return
    setBusy(true)
    try {
      await shareRunImage(run, ready.canvas, style)
    } catch (e) {
      notify(e instanceof Error ? e.message : 'แชร์ไม่สำเร็จ', 'bad')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Sheet onClose={onClose} title="แชร์การวิ่ง">
      <Segmented value={style} onChange={setStyle} options={[
        { value: 'card', label: 'การ์ด' },
        { value: 'white', label: 'โปร่ง · ขาว' },
        { value: 'black', label: 'โปร่ง · ดำ' },
      ]} />
      <div className={cx('mx-auto mt-3 aspect-[4/5] w-full max-w-xs overflow-hidden rounded-2xl ring-1 ring-line', style === 'card' && 'bg-raised')}
        style={style === 'card' ? undefined : checker}>
        {ready && <img src={ready.url} alt="รูปสรุปการวิ่ง" className="size-full animate-fade-in" />}
      </div>
      {style !== 'card' && <p className="mt-2 text-center text-xs text-muted">PNG พื้นหลังโปร่ง — วางทับรูปของคุณใน IG Story / แอปแต่งรูป</p>}
      <div className="mt-4 flex gap-2">
        {!isNative && <Button variant="soft" className="flex-1" disabled={!ready} onClick={() => ready && downloadImage(run, ready.canvas, style)}><Download size={16} /> บันทึกรูป</Button>}
        <Button className="flex-1" disabled={!ready || busy} onClick={share}><Share2 size={16} /> แชร์</Button>
      </div>
    </Sheet>
  )
}
