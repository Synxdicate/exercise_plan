import { createElement, useState } from 'react'
import { muscleNames, type Muscle } from '../data/muscles'

type Shape = { m?: Muscle; el: 'ellipse' | 'path' | 'rect' | 'circle'; p: Record<string, number | string>; center?: boolean }

// วาดเฉพาะซีกซ้าย แล้ว mirror ด้วย transform (ยกเว้น center: true)
const silhouette: Shape[] = [
  { el: 'circle', p: { cx: 100, cy: 30, r: 17 }, center: true },
  { el: 'rect', p: { x: 93, y: 45, width: 14, height: 14 }, center: true },
  { el: 'path', p: { d: 'M70 62 Q100 54 130 62 L136 92 L128 168 Q100 180 72 168 L64 92 Z' }, center: true },
  { el: 'path', p: { d: 'M72 166 Q100 178 128 166 L132 198 Q100 206 68 198 Z' }, center: true },
  { el: 'rect', p: { x: 45, y: 66, width: 22, height: 72, rx: 11 } },
  { el: 'rect', p: { x: 39, y: 134, width: 19, height: 68, rx: 9 } },
  { el: 'circle', p: { cx: 48, cy: 210, r: 8 } },
  { el: 'rect', p: { x: 68, y: 186, width: 30, height: 84, rx: 13 } },
  { el: 'rect', p: { x: 72, y: 266, width: 23, height: 80, rx: 10 } },
  { el: 'ellipse', p: { cx: 82, cy: 350, rx: 12, ry: 6 } },
]

const front: Shape[] = [
  { m: 'traps', el: 'path', p: { d: 'M93 56 L74 64 L93 62 Z' } },
  { m: 'frontDelts', el: 'ellipse', p: { cx: 63, cy: 76, rx: 10, ry: 11 } },
  { m: 'sideDelts', el: 'ellipse', p: { cx: 51, cy: 79, rx: 6, ry: 11 } },
  { m: 'chest', el: 'path', p: { d: 'M98 68 C84 66 72 72 70 84 C70 98 84 106 98 102 Z' } },
  { m: 'biceps', el: 'ellipse', p: { cx: 57, cy: 110, rx: 8, ry: 21 } },
  { m: 'forearms', el: 'ellipse', p: { cx: 48, cy: 166, rx: 7, ry: 26 } },
  { m: 'abs', el: 'rect', p: { x: 87, y: 106, width: 26, height: 58, rx: 6 }, center: true },
  { m: 'obliques', el: 'path', p: { d: 'M85 108 L72 104 L71 150 L85 164 Z' } },
  { m: 'quads', el: 'path', p: { d: 'M71 196 Q68 236 79 266 L93 266 Q100 232 96 194 Z' } },
  { m: 'calves', el: 'ellipse', p: { cx: 83, cy: 302, rx: 8, ry: 24 } },
]

const back: Shape[] = [
  { m: 'traps', el: 'path', p: { d: 'M100 50 L74 66 L88 76 L100 100 L112 76 L126 66 Z' }, center: true },
  { m: 'rearDelts', el: 'ellipse', p: { cx: 60, cy: 77, rx: 11, ry: 11 } },
  { m: 'upperBack', el: 'path', p: { d: 'M88 79 L74 74 L72 94 L92 108 L99 101 Z' } },
  { m: 'lats', el: 'path', p: { d: 'M72 99 C70 124 80 150 96 160 L98 113 L92 111 Z' } },
  { m: 'triceps', el: 'ellipse', p: { cx: 56, cy: 110, rx: 8, ry: 21 } },
  { m: 'forearms', el: 'ellipse', p: { cx: 48, cy: 166, rx: 7, ry: 26 } },
  { m: 'lowerBack', el: 'rect', p: { x: 88, y: 134, width: 24, height: 32, rx: 6 }, center: true },
  { m: 'glutes', el: 'ellipse', p: { cx: 86, cy: 190, rx: 15, ry: 15 } },
  { m: 'hamstrings', el: 'path', p: { d: 'M71 208 Q70 240 79 266 L93 266 Q100 236 96 208 Z' } },
  { m: 'calves', el: 'ellipse', p: { cx: 83, cy: 300, rx: 10, ry: 26 } },
]

type Props = {
  intensity: Partial<Record<Muscle, number>> // 0–1
  label?: (m: Muscle) => string
  size?: 'sm' | 'md'
}

export function BodyMap({ intensity, label = m => muscleNames[m], size = 'md' }: Props) {
  const [hover, setHover] = useState<Muscle | null>(null)

  const render = (shapes: Shape[], prefix: string) =>
    shapes.flatMap((s, i) => {
      const v = s.m ? intensity[s.m] ?? 0 : 0
      const props = {
        ...s.p,
        className: s.m ? `muscle${v > 0 ? ' on' : ''}${hover === s.m ? ' hover' : ''}` : 'sil',
        style: s.m && v > 0 ? { fillOpacity: 0.2 + 0.8 * v } : undefined,
        onMouseEnter: s.m ? () => setHover(s.m!) : undefined,
        onMouseLeave: s.m ? () => setHover(null) : undefined,
        onClick: s.m ? () => setHover(s.m!) : undefined,
      }
      const left = createElement(s.el, { key: `${prefix}${i}`, ...props }, s.m ? createElement('title', null, label(s.m)) : null)
      if (s.center) return [left]
      const right = createElement('g', { key: `${prefix}${i}r`, transform: 'translate(200 0) scale(-1 1)' },
        createElement(s.el, props, s.m ? createElement('title', null, label(s.m)) : null))
      return [left, right]
    })

  return (
    <div className={`bodymap ${size}`}>
      <div className="figures">
        {[{ name: 'ด้านหน้า', shapes: front }, { name: 'ด้านหลัง', shapes: back }].map(f => (
          <figure key={f.name}>
            <svg viewBox="0 0 200 360" role="img" aria-label={`กล้ามเนื้อ${f.name}`}>
              {render(silhouette, `s${f.name}`)}
              {render(f.shapes, f.name)}
            </svg>
            <figcaption>{f.name}</figcaption>
          </figure>
        ))}
      </div>
      <p className="hover-label">{hover ? label(hover) : 'แตะหรือชี้ที่กล้ามเนื้อเพื่อดูรายละเอียด'}</p>
    </div>
  )
}
