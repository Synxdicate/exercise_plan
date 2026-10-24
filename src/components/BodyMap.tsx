import { useState } from 'react'
import { muscleNames, type Muscle } from '../data/muscles'
import { heat } from '../lib/heat'

// ทุก path วาดเฉพาะซีกซ้าย (x ≤ 100) แล้ว mirror ด้วย transform — ยกเว้น center: true
type Shape = { m: Muscle; d: string; center?: boolean }

// โครงร่างครึ่งตัว ปิดตามเส้นกลางลำตัว (เมื่อ mirror แล้วจะต่อเป็นชิ้นเดียว)
const SILHOUETTE =
  'M100 12 C89 12 82 21 82 33 C82 45 88 53 95 56 L95 62 C88 64 79 66 70 68 C59 70 52 77 50 88 ' +
  'C48 102 46 116 45 130 C43 144 40 158 38 172 C37 182 36 190 36 198 C34 205 34 213 37 218 ' +
  'C40 222 44 220 45 214 C46 206 47 199 48 193 C51 177 54 161 56 147 C58 137 60 127 62 118 L64 108 ' +
  'C65 124 66 140 68 156 C67 166 66 176 66 186 C64 206 64 226 66 246 C67 262 68 272 70 282 ' +
  'C68 300 68 320 71 340 C72 352 73 362 74 372 C70 378 70 384 76 387 L93 387 C96 383 94 377 92 372 ' +
  'C93 356 94 340 94 324 C94 306 93 292 94 282 C95 262 96 236 97 214 C98 206 99 200 100 198 Z'

const FRONT: Shape[] = [
  { m: 'traps', d: 'M95 62 C88 64 80 66 73 68 C80 70 88 70 96 69 Z' },
  { m: 'sideDelts', d: 'M66 69 C57 70 51 77 50 88 C49 96 51 104 54 109 C56 100 57 92 57 84 C58 77 61 72 66 69 Z' },
  { m: 'frontDelts', d: 'M73 70 C65 70 59 75 58 84 C58 92 60 98 64 101 C66 92 68 84 75 76 Z' },
  { m: 'chest', d: 'M98 74 C88 72 79 74 74 78 C69 84 67 92 68 100 C74 108 86 110 98 106 Z' },
  { m: 'biceps', d: 'M58 105 C54 113 52 125 54 137 C56 141 60 141 62 137 C64 127 64 115 62 107 Z' },
  { m: 'forearms', d: 'M52 143 C48 155 44 169 43 183 C45 189 49 189 51 185 C54 171 57 157 58 145 Z' },
  { m: 'obliques', d: 'M86 113 C80 113 74 117 70 125 C70 141 72 157 76 171 C80 177 84 179 87 179 Z' },
  { m: 'abs', d: 'M89 112 h10 v14 h-10 Z' },
  { m: 'abs', d: 'M89 128 h10 v14 h-10 Z' },
  { m: 'abs', d: 'M89 144 h10 v14 h-10 Z' },
  { m: 'abs', d: 'M89 160 L99 160 L99 184 C95 182 91 174 89 168 Z' },
  { m: 'quads', d: 'M70 197 C66 215 66 237 70 257 C73 267 78 273 84 275 C88 267 90 251 89 233 C88 217 84 205 78 197 Z' },
  { m: 'quads', d: 'M87 207 C92 217 95 233 95 251 C94 263 92 273 88 279 C86 271 88 259 90 247 C91 231 90 219 87 207 Z' },
  { m: 'calves', d: 'M72 292 C70 304 70 318 72 330 C74 336 77 336 79 330 C80 316 79 302 76 292 Z' },
  { m: 'calves', d: 'M90 292 C93 304 93 318 91 330 C89 334 87 332 86 326 C86 312 87 300 90 292 Z' },
]

const BACK: Shape[] = [
  { m: 'traps', center: true, d: 'M100 58 C92 60 84 64 72 69 C80 74 88 80 94 92 L100 118 L106 92 C112 80 120 74 128 69 C116 64 108 60 100 58 Z' },
  { m: 'rearDelts', d: 'M70 70 C60 70 53 77 52 88 C52 96 55 102 59 105 C62 94 66 84 74 76 Z' },
  { m: 'upperBack', d: 'M90 83 C84 79 77 78 73 81 C71 89 72 96 76 102 C82 104 89 104 95 100 C94 93 92 87 90 83 Z' },
  { m: 'lats', d: 'M71 106 C69 120 70 135 76 149 C80 157 86 163 91 167 L92 121 C86 113 79 108 71 106 Z' },
  { m: 'triceps', d: 'M58 104 C54 113 52 125 54 137 C57 141 61 140 62 135 C63 123 63 113 62 105 Z' },
  { m: 'forearms', d: 'M52 143 C48 155 44 169 43 183 C45 189 49 189 51 185 C54 171 57 157 58 145 Z' },
  { m: 'lowerBack', d: 'M93 128 L99 128 L99 182 C96 182 94 180 93 176 Z' },
  { m: 'glutes', d: 'M99 190 C90 186 78 188 72 196 C68 206 70 218 78 224 C86 228 94 226 99 222 Z' },
  { m: 'hamstrings', d: 'M71 230 C69 246 71 262 77 276 C80 279 83 279 84 275 C85 258 84 242 80 230 Z' },
  { m: 'hamstrings', d: 'M84 230 C90 242 94 256 93 272 C92 278 89 280 87 276 C88 260 87 244 84 230 Z' },
  { m: 'calves', d: 'M71 290 C68 302 68 316 72 328 C75 332 78 330 79 324 C80 310 79 298 77 290 Z' },
  { m: 'calves', d: 'M80 290 C88 296 93 308 92 322 C91 330 87 332 84 328 C82 316 81 302 80 290 Z' },
]

const MIRROR = 'translate(200 0) scale(-1 1)'

type Props = {
  intensity: Partial<Record<Muscle, number>> // 0–1
  label?: (m: Muscle) => string
  size?: 'sm' | 'md'
}

export function BodyMap({ intensity, label = m => muscleNames[m], size = 'md' }: Props) {
  const [hover, setHover] = useState<Muscle | null>(null)

  const muscle = (s: Shape, key: string, transform?: string) => (
    <path key={key} d={s.d} transform={transform}
      fill={heat(intensity[s.m] ?? 0)}
      stroke={hover === s.m ? 'var(--c-ink)' : 'var(--c-body)'} strokeWidth={hover === s.m ? 1.6 : 1.2} strokeLinejoin="round"
      className="cursor-pointer transition-[fill] duration-500"
      onMouseEnter={() => setHover(s.m)} onMouseLeave={() => setHover(null)} onClick={() => setHover(s.m)}>
      <title>{label(s.m)}</title>
    </path>
  )

  const figure = (shapes: Shape[], name: string) => (
    <figure className={`m-0 flex-1 text-center ${size === 'sm' ? 'max-w-28' : 'max-w-40'}`}>
      <svg viewBox="30 6 140 386" role="img" aria-label={`กล้ามเนื้อ${name}`} className="block h-auto w-full">
        <path d={SILHOUETTE} fill="var(--c-body)" />
        <path d={SILHOUETTE} fill="var(--c-body)" transform={MIRROR} />
        {shapes.flatMap((s, i) => s.center ? [muscle(s, `${i}`)] : [muscle(s, `${i}l`), muscle(s, `${i}r`, MIRROR)])}
      </svg>
      <figcaption className="text-xs text-muted">{name}</figcaption>
    </figure>
  )

  return (
    <div>
      <div className="flex justify-center gap-4">
        {figure(FRONT, 'ด้านหน้า')}
        {figure(BACK, 'ด้านหลัง')}
      </div>
      <p className="mt-1 min-h-5 text-center text-sm font-semibold">{hover ? label(hover) : <span className="font-normal text-muted">แตะที่กล้ามเนื้อเพื่อดูรายละเอียด</span>}</p>
      {size === 'md' && (
        <div className="mx-auto mt-2 flex max-w-60 items-center gap-2 text-[11px] text-muted">
          <span>น้อย</span>
          <span className="h-2 flex-1 rounded-full" style={{ background: `linear-gradient(to right, ${heat(0)}, ${heat(0.01)}, ${heat(0.5)}, ${heat(1)})` }} />
          <span>ครบเป้า</span>
        </div>
      )}
    </div>
  )
}
