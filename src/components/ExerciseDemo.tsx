import { useEffect, useState } from 'react'
import { demoImages } from '../data/demos'
import { stickDemos, type Pose, type StickDemo } from '../data/stickDemos'
import { cx } from '../lib/cx'
import { trNow } from '../lib/i18n'

/** รูปสาธิตท่า: สลับท่าเริ่ม ↔ ท่าจบ ให้เห็นการเคลื่อนไหว (ผู้ใช้ที่ลดแอนิเมชันเห็นสองรูปคู่กัน) */
export function ExerciseDemo({ name, className }: { name: string; className?: string }) {
  const imgs = demoImages(name)
  const stick = imgs ? null : stickDemos[name]
  const [frame, setFrame] = useState(0)
  const reduce = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches
  const has = !!imgs || !!stick
  useEffect(() => {
    if (!has || reduce) return
    const id = setInterval(() => setFrame(f => 1 - f), 1200)
    return () => clearInterval(id)
  }, [has, reduce])
  if (stick) return <StickFigure demo={stick} frame={reduce ? 1 : frame} name={name} className={className} />
  if (!imgs) return null
  if (reduce)
    return (
      <div className={cx('grid grid-cols-2 gap-1 overflow-hidden rounded-xl', className)}>
        {imgs.map((src, i) => <img key={src} src={src} alt={`${name} ${i ? trNow('ท่าจบ', 'end') : trNow('ท่าเริ่ม', 'start')}`} loading="lazy" className="w-full" />)}
      </div>
    )
  return (
    <figure className={className}>
      <div className="relative overflow-hidden rounded-xl bg-raised" style={{ aspectRatio: '3 / 2' }}>
        {imgs.map((src, i) => (
          <img key={src} src={src} alt={`${name} ${i ? trNow('ท่าจบ', 'end') : trNow('ท่าเริ่ม', 'start')}`} loading="lazy"
            className={cx('absolute inset-0 size-full object-cover transition-opacity duration-500', frame === i ? 'opacity-100' : 'opacity-0')} />
        ))}
        <span className="absolute bottom-1.5 left-1.5 rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-semibold text-white">{frame ? trNow('ท่าจบ', 'End') : trNow('ท่าเริ่ม', 'Start')}</span>
      </div>
      <figcaption className="mt-1 text-[10px] text-muted">{trNow('ภาพตัวอย่าง อุปกรณ์อาจต่างจากที่คุณใช้', 'Example photo — your equipment may differ')}</figcaption>
    </figure>
  )
}

/** ภาพลายเส้น 2 ท่วงท่า สลับไปมาเหมือนรูปถ่าย */
function StickFigure({ demo, frame, name, className }: { demo: StickDemo; frame: number; name: string; className?: string }) {
  const p: Pose = demo.poses[frame]
  const line = (a: [number, number], b: [number, number]) => <line x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} style={{ transition: 'all .6s ease-in-out' }} />
  return (
    <figure className={className}>
      <div className="relative overflow-hidden rounded-xl bg-raised" style={{ aspectRatio: '3 / 2' }}>
        <svg viewBox="0 0 120 80" className="size-full" role="img" aria-label={`${name} ${trNow('ภาพลายเส้น', 'drawing,')} ${frame ? trNow('ท่าจบ', 'end') : trNow('ท่าเริ่ม', 'start')}`}>
          {demo.props.map((pr, i) => pr.kind === 'floor'
            ? <line key={i} x1={0} y1={72.5} x2={120} y2={72.5} className="stroke-line" strokeWidth={1.5} />
            : pr.kind === 'bench'
              ? <g key={i} className="fill-line"><rect x={pr.x} y={pr.y + 1.6} width={pr.w} height={4} rx={1.5} /><rect x={pr.x + 2} y={pr.y + 5} width={3} height={67.5 - pr.y} /><rect x={pr.x + pr.w - 5} y={pr.y + 5} width={3} height={67.5 - pr.y} /></g>
              : <rect key={i} x={pr.x - 4} y={0} width={4} height={72} className="fill-line" />)}
          {(p.knee2 || p.elbow2) && (
            <g className="stroke-muted" strokeWidth={3.2} strokeLinecap="round" fill="none" opacity={0.6}>
              {p.elbow2 && <>{line(p.shoulder, p.elbow2)}{p.hand2 && line(p.elbow2, p.hand2)}</>}
              {p.knee2 && <>{line(p.hip, p.knee2)}{p.foot2 && line(p.knee2, p.foot2)}</>}
            </g>
          )}
          <g className="stroke-ink" strokeWidth={3.2} strokeLinecap="round" fill="none">
            {line(p.shoulder, p.hip)}
            {line(p.shoulder, p.elbow)}
            {line(p.elbow, p.hand)}
            {line(p.hip, p.knee)}
            {line(p.knee, p.foot)}
          </g>
          <circle cx={p.head[0]} cy={p.head[1]} r={4.5} className="fill-ink" style={{ transition: 'all .6s ease-in-out' }} />
        </svg>
        <span className="absolute bottom-1.5 left-1.5 rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-semibold text-white">{frame ? trNow('ท่าจบ', 'End') : trNow('ท่าเริ่ม', 'Start')}</span>
      </div>
      <figcaption className="mt-1 text-[10px] text-muted">{trNow('ภาพลายเส้นแสดงตำแหน่งคร่าว ๆ ดูท่าละเอียดในคลิป YouTube', 'Rough line drawing — see YouTube for detailed form')}</figcaption>
    </figure>
  )
}
