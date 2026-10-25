import { useEffect, useState } from 'react'
import { demoImages } from '../data/demos'
import { cx } from '../lib/cx'

/** รูปสาธิตท่า: สลับท่าเริ่ม ↔ ท่าจบ ให้เห็นการเคลื่อนไหว (ผู้ใช้ที่ลดแอนิเมชันเห็นสองรูปคู่กัน) */
export function ExerciseDemo({ name, className }: { name: string; className?: string }) {
  const imgs = demoImages(name)
  const [frame, setFrame] = useState(0)
  const reduce = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches
  const has = !!imgs
  useEffect(() => {
    if (!has || reduce) return
    const id = setInterval(() => setFrame(f => 1 - f), 1200)
    return () => clearInterval(id)
  }, [has, reduce])
  if (!imgs) return null
  if (reduce)
    return (
      <div className={cx('grid grid-cols-2 gap-1 overflow-hidden rounded-xl', className)}>
        {imgs.map((src, i) => <img key={src} src={src} alt={`${name} ${i ? 'ท่าจบ' : 'ท่าเริ่ม'}`} loading="lazy" className="w-full" />)}
      </div>
    )
  return (
    <figure className={className}>
      <div className="relative overflow-hidden rounded-xl bg-raised" style={{ aspectRatio: '3 / 2' }}>
        {imgs.map((src, i) => (
          <img key={src} src={src} alt={`${name} ${i ? 'ท่าจบ' : 'ท่าเริ่ม'}`} loading="lazy"
            className={cx('absolute inset-0 size-full object-cover transition-opacity duration-500', frame === i ? 'opacity-100' : 'opacity-0')} />
        ))}
        <span className="absolute bottom-1.5 left-1.5 rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-semibold text-white">{frame ? 'ท่าจบ' : 'ท่าเริ่ม'}</span>
      </div>
      <figcaption className="mt-1 text-[10px] text-muted">ภาพตัวอย่าง — อุปกรณ์อาจต่างจากที่คุณใช้</figcaption>
    </figure>
  )
}
