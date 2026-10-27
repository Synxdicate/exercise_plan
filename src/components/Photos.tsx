import { useRef, useState } from 'react'
import { ImageOff, ImagePlus, Loader2, Trash2 } from 'lucide-react'
import { addPhoto, deletePhotoFile, syncPhotos, usePhotos, usePhotoUrl, type Photo } from '../lib/photos'
import { ask, notify } from '../lib/dialog'
import { shortDate } from '../lib/date'
import { cx } from '../lib/cx'
import { Sheet } from './ui'

function Thumb({ p, onClick, className }: { p: Photo; onClick?: () => void; className?: string }) {
  const { url, failed } = usePhotoUrl(p)
  return (
    <button onClick={onClick} className={cx('relative shrink-0 overflow-hidden rounded-xl bg-raised ring-1 ring-line', className)}>
      {url ? <img src={url} alt={`รูปวันที่ ${p.date}`} loading="lazy" className="size-full object-cover" />
        : <span className="grid size-full place-items-center text-muted">{failed ? <ImageOff size={18} /> : <Loader2 size={18} className="animate-spin" />}</span>}
    </button>
  )
}

function Viewer({ p, onClose }: { p: Photo; onClose: () => void }) {
  const [, setPhotos] = usePhotos()
  const { url } = usePhotoUrl(p)
  const remove = async () => {
    if (!(await ask('ลบรูปนี้ถาวร?', { title: 'ลบรูป', ok: 'ลบ', danger: true }))) return
    try {
      await deletePhotoFile(p)
      setPhotos(prev => prev.filter(x => x.id !== p.id))
      onClose()
    } catch (e) {
      notify(e instanceof Error ? e.message : 'ลบไม่สำเร็จ', 'bad')
    }
  }
  return (
    <Sheet onClose={onClose} title={shortDate(p.date)}>
      {url ? <img src={url} alt="" className="w-full rounded-2xl" /> : <div className="aspect-[3/4] animate-pulse rounded-2xl bg-raised" />}
      <button onClick={remove} className="mt-3 flex items-center gap-1.5 text-sm font-semibold text-bad"><Trash2 size={15} /> ลบรูป</button>
    </Sheet>
  )
}

/** แถบรูปแนบ + ปุ่มเพิ่ม (กล้องหรือคลังรูป) */
export function PhotoStrip({ kind, refId, date, label = 'รูป' }: { kind: Photo['kind']; refId?: string; date?: string; label?: string }) {
  const [photos, setPhotos] = usePhotos()
  const [busy, setBusy] = useState(false)
  const [open, setOpen] = useState<Photo | null>(null)
  const input = useRef<HTMLInputElement>(null)
  const list = photos.filter(p => p.kind === kind && (refId ? p.refId === refId : true)).sort((a, b) => b.date.localeCompare(a.date))

  const add = async (files: FileList | null) => {
    if (!files?.length) return
    setBusy(true)
    try {
      for (const f of [...files].slice(0, 6)) {
        const p = await addPhoto(f, { kind, refId, date })
        setPhotos(prev => [...prev, p])
      }
      void syncPhotos()
    } catch (e) {
      notify(e instanceof Error ? e.message : 'อัปโหลดไม่สำเร็จ', 'bad')
    } finally {
      setBusy(false)
      if (input.current) input.current.value = ''
    }
  }

  return (
    <div>
      <div className="mb-1.5 text-xs text-muted">{label}</div>
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none]">
        <button onClick={() => input.current?.click()} disabled={busy} aria-label="เพิ่มรูป"
          className="grid size-20 shrink-0 place-items-center rounded-xl border-2 border-dashed border-line text-muted disabled:opacity-60">
          {busy ? <Loader2 size={20} className="animate-spin" /> : <ImagePlus size={20} />}
        </button>
        {list.map(p => <Thumb key={p.id} p={p} onClick={() => setOpen(p)} className="size-20" />)}
      </div>
      <input ref={input} type="file" accept="image/*" multiple hidden onChange={e => void add(e.target.files)} />
      {open && <Viewer p={open} onClose={() => setOpen(null)} />}
    </div>
  )
}

/** รูปความคืบหน้า: เทียบรูปแรกกับล่าสุด + ทั้งหมด */
export function ProgressPhotos() {
  const [photos] = usePhotos()
  const list = photos.filter(p => p.kind === 'progress').sort((a, b) => a.date.localeCompare(b.date))
  const [open, setOpen] = useState<Photo | null>(null)
  const first = list[0]
  const last = list.at(-1)
  return (
    <div>
      {first && last && first.id !== last.id && (
        <div className="mb-3 grid grid-cols-2 gap-2">
          {[first, last].map((p, i) => (
            <div key={p.id}>
              <Thumb p={p} onClick={() => setOpen(p)} className="aspect-[3/4] w-full" />
              <div className="mt-1 text-center text-xs text-muted">{i ? 'ล่าสุด' : 'เริ่มต้น'} · {shortDate(p.date)}</div>
            </div>
          ))}
        </div>
      )}
      <PhotoStrip kind="progress" label="ถ่ายมุมเดิม แสงเดิม ทุก 2–4 สัปดาห์" />
      {open && <Viewer p={open} onClose={() => setOpen(null)} />}
    </div>
  )
}
