import { useEffect, useState } from 'react'
import { Copy, Download, Share2 } from 'lucide-react'
import type { Run } from '../lib/log'
import { layoutFits, renderRunCard, saveImage, shareRunImage, SHARE_LAYOUTS, type CardStyle, type ShareLayout } from '../lib/shareImage'
import { usePersisted } from '../lib/storage'
import { isNative } from '../lib/native'
import { notify } from '../lib/dialog'
import { cx } from '../lib/cx'
import { Button, Segmented, Sheet } from './ui'
import { useT } from '../lib/i18n'

// ตารางหมากรุกบอกว่าพื้นหลังโปร่ง (เหมือนโปรแกรมแต่งรูป)
const checker = { backgroundImage: 'repeating-conic-gradient(#9ca3af 0% 25%, #e5e7eb 0% 50%)', backgroundSize: '20px 20px' }

/** เลือกแบบรูปจากตารางพรีวิว (แบบ Strava) แล้วแชร์/บันทึก/คัดลอก การ์ดสี หรือสติกเกอร์ PNG พื้นหลังโปร่ง */
type Choice = 'card' | ShareLayout
const LABELS: Record<Choice, [string, string]> = {
  card: ['การ์ดสี', 'Color card'], stats: ['ตัวเลข + เส้นทาง', 'Stats + route'], row: ['เส้นทาง + แถวตัวเลข', 'Route + row'],
  route: ['เส้นทางอย่างเดียว', 'Route only'], splits: ['เพซรายกิโล', 'KM splits'], ticket: ['ตั๋ววันวิ่ง', 'Run ticket'],
  big: ['ระยะตัวใหญ่', 'Big distance'], circle: ['ป้ายวงกลม', 'Circle badge'], pace: ['กราฟเพซ', 'Pace graph'], bottom: ['แถบล่าง (เว้นที่ให้รูป)', 'Bottom bar'],
}

export function ShareRunSheet({ run, onClose }: { run: Run; onClose: () => void }) {
  const tr = useT()
  // จำแบบที่เลือกล่าสุด เริ่มที่สติกเกอร์โปร่งใสสีขาว (วางบนรูปตัวเองในโซเชียล)
  const [style, setStyle] = usePersisted<CardStyle>('shareStyle', 'white')
  const [layout, setLayout] = usePersisted<ShareLayout>('shareLayout', 'stats')
  const ink: 'white' | 'black' = style === 'black' ? 'black' : 'white'
  const choices: Choice[] = ['card', ...SHARE_LAYOUTS.filter(l => layoutFits(run, l))]
  const picked: Choice = style === 'card' ? 'card' : choices.includes(layout) ? layout : 'stats'
  const [previews, setPreviews] = useState<Partial<Record<Choice, { canvas: HTMLCanvasElement; url: string }>>>({})
  const [busy, setBusy] = useState(false)
  const key = choices.join()
  useEffect(() => {
    let alive = true
    setPreviews({})
    void (async () => {
      for (const c of choices) {
        const canvas = await renderRunCard(run, c === 'card' ? 'card' : ink, c === 'card' ? 'stats' : c)
        if (!alive) return
        setPreviews(prev => ({ ...prev, [c]: { canvas, url: canvas.toDataURL('image/png') } }))
      }
    })()
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run, ink, key])
  const ready = previews[picked] ?? null
  const fileStyle: CardStyle = picked === 'card' ? 'card' : ink
  const pick = (c: Choice) => {
    if (c === 'card') setStyle('card')
    else { setLayout(c); if (style === 'card') setStyle(ink) }
  }

  const save = async () => {
    if (!ready) return
    setBusy(true)
    try {
      await saveImage(run, ready.canvas, fileStyle)
      if (isNative) notify(tr('บันทึกลงแกลเลอรีแล้ว (อัลบั้ม Kao)', 'Saved to gallery (Kao album)'), 'good')
    } catch (e) {
      notify(e instanceof Error ? e.message : tr('บันทึกรูปไม่สำเร็จ', 'Couldn’t save the image'), 'bad')
    } finally {
      setBusy(false)
    }
  }

  const share = async () => {
    if (!ready) return
    setBusy(true)
    try {
      await shareRunImage(run, ready.canvas, fileStyle)
    } catch (e) {
      notify(e instanceof Error ? e.message : tr('แชร์ไม่สำเร็จ', 'Share failed'), 'bad')
    } finally {
      setBusy(false)
    }
  }

  // คัดลอกรูปไปวางในแชต/สตอรี่ (เบราว์เซอร์ที่รองรับรูปในคลิปบอร์ด)
  const canCopy = !isNative && typeof ClipboardItem !== 'undefined' && !!navigator.clipboard?.write
  const copy = async () => {
    if (!ready) return
    try {
      const blob = await new Promise<Blob | null>(r => ready.canvas.toBlob(r, 'image/png'))
      if (!blob) throw new Error()
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
      notify(tr('คัดลอกรูปแล้ว', 'Image copied'), 'good')
    } catch {
      notify(tr('คัดลอกรูปไม่ได้ในเบราว์เซอร์นี้', 'Can’t copy images in this browser'), 'bad')
    }
  }

  return (
    <Sheet onClose={onClose} title={tr('แชร์การวิ่ง', 'Share run')}>
      {picked !== 'card' && (
        <Segmented value={ink} onChange={setStyle} options={[
          { value: 'white', label: tr('ตัวอักษรขาว', 'White') },
          { value: 'black', label: tr('ตัวอักษรดำ', 'Black') },
        ]} />
      )}
      <div className="mt-3 grid grid-cols-3 gap-2" role="radiogroup" aria-label={tr('แบบรูป', 'Layout')}>
        {choices.map(c => (
          <button key={c} role="radio" aria-checked={picked === c} onClick={() => pick(c)}
            className={cx('overflow-hidden rounded-xl text-left ring-2 transition-colors', picked === c ? 'ring-accent' : 'ring-transparent')}>
            <span className="block aspect-[4/5] w-full" style={c === 'card' ? undefined : checker}>
              {previews[c] && <img src={previews[c]!.url} alt="" className="size-full animate-fade-in" />}
            </span>
            <span className="block truncate px-1 py-1 text-[11px] font-semibold">{tr(...LABELS[c])}</span>
          </button>
        ))}
      </div>
      {picked !== 'card' && <p className="mt-2 text-center text-xs text-muted">{tr('PNG พื้นหลังโปร่งใส ใช้เป็นสติกเกอร์ใน IG Story ได้', 'Transparent PNG — use it as a sticker in an IG Story')}</p>}
      <div className="mt-3 flex gap-2">
        <Button variant="soft" className="flex-1" disabled={!ready || busy} onClick={save}><Download size={16} /> {tr('บันทึกรูป', 'Save image')}</Button>
        {canCopy && <Button variant="soft" className="flex-1" disabled={!ready || busy} onClick={copy}><Copy size={16} /> {tr('คัดลอก', 'Copy')}</Button>}
        <Button className="flex-1" disabled={!ready || busy} onClick={share}><Share2 size={16} /> {tr('แชร์', 'Share')}</Button>
      </div>
    </Sheet>
  )
}
