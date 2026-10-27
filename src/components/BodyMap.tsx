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

// กล้ามแต่ละมัดวาดให้เต็มพื้นที่ของส่วนนั้น เว้นร่องบาง ๆ (เส้นสีตัว) ระหว่างมัด
const FRONT: Shape[] = [
  { m: 'traps', d: 'M95 60 C90 63 82 66 74 68 C82 70 90 69 96 66 Z' },
  { m: 'sideDelts', d: 'M70 68 C59 69 51 77 50 89 C49 97 51 104 54 109 C55 98 56 88 60 80 C62 75 65 71 70 68 Z' },
  { m: 'frontDelts', d: 'M74 69 C66 71 61 77 59 85 C58 93 59 100 62 106 C66 97 70 89 76 80 C77 76 77 72 74 69 Z' },
  { m: 'chest', d: 'M98 72 C90 70 83 72 79 76 C75 82 72 90 71 100 C76 108 87 111 98 108 Z' },
  { m: 'biceps', d: 'M56 109 C51 117 48 127 49 137 C51 142 57 142 59 138 C61 128 62 118 61 110 Z' },
  { m: 'forearms', d: 'M50 143 C45 153 41 166 39 180 C39 190 46 192 49 186 C52 172 54 158 55.5 146 Z' },
  { m: 'obliques', d: 'M85 113 C78 113 72 115 68 120 C68 136 69 152 70 166 C72 176 78 184 86 187 Z' },
  { m: 'abs', d: 'M88.5 112 C92 111 96 111 99 111 L99 125 L88.5 125 Z' },
  { m: 'abs', d: 'M88.5 127 h10.5 v14 h-10.5 Z' },
  { m: 'abs', d: 'M88.5 143 h10.5 v14 h-10.5 Z' },
  { m: 'abs', d: 'M88.5 159 L99 159 L99 190 C95 188 91 180 89 172 Z' },
  // ต้นขาหน้า 3 มัด: ด้านนอก กลาง (rectus femoris) และหยดน้ำเหนือเข่าด้านใน
  { m: 'quads', d: 'M68 196 C64 214 64 238 68 258 C70 268 74 276 79 281 C80 262 79 238 77 216 C76 206 73 199 68 196 Z' },
  { m: 'quads', d: 'M80 200 C77 216 78 240 81 262 C82 270 84 276 86 279 C89 268 91 250 90 232 C89 216 86 205 80 200 Z' },
  { m: 'quads', d: 'M92 236 C95 248 95 262 93 274 C91 280 89 282 88 280 C89 268 90 252 92 236 Z' },
  { m: 'calves', d: 'M71 294 C68 308 69 322 72 334 C74 338 76 336 77 330 C77 316 76 304 74 294 Z' },
  { m: 'calves', d: 'M91 292 C94 306 94 320 92 332 C90 336 88 334 88 328 C88 314 89 302 91 292 Z' },
]

const BACK: Shape[] = [
  { m: 'traps', center: true, d: 'M100 58 C92 60 84 64 72 69 C80 74 88 80 94 92 L100 120 L106 92 C112 80 120 74 128 69 C116 64 108 60 100 58 Z' },
  { m: 'rearDelts', d: 'M70 69 C59 70 51 77 50 89 C49 97 51 104 55 109 C58 97 63 86 72 77 Z' },
  { m: 'upperBack', d: 'M90 85 C84 80 78 79 74 82 C72 90 72 98 75 104 C82 107 89 106 95 101 C94 95 92 89 90 85 Z' },
  { m: 'lats', d: 'M70 107 C68 123 70 139 76 153 C81 163 86 170 91 176 L92 124 C87 114 79 109 70 107 Z' },
  { m: 'triceps', d: 'M56 108 C51 117 48 127 49 137 C51 142 57 142 59 138 C61 128 62 118 61 109 Z' },
  { m: 'forearms', d: 'M50 143 C45 153 41 166 39 180 C39 190 46 192 49 186 C52 172 54 158 55.5 146 Z' },
  { m: 'lowerBack', d: 'M94 126 L99 128 L99 184 C96 184 94 181 93.5 177 Z' },
  { m: 'glutes', d: 'M99 188 C88 184 76 186 70 196 C66 208 69 220 77 226 C86 230 94 228 99 224 Z' },
  { m: 'hamstrings', d: 'M70 232 C67 248 69 264 75 278 C78 282 82 282 83 278 C84 262 83 246 80 232 Z' },
  { m: 'hamstrings', d: 'M83 232 C89 244 93 258 93 272 C92 280 88 282 86 278 C87 262 86 246 83 232 Z' },
  // น่อง (gastrocnemius) สองหัว ป่องช่วงบน
  { m: 'calves', d: 'M72 290 C67 300 67 314 71 326 C74 332 79 330 80 322 C81 310 80 298 78 290 Z' },
  { m: 'calves', d: 'M81 290 C89 296 94 308 93 322 C92 332 87 334 84 328 C82 316 81 302 81 290 Z' },
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
        {/* เงาขอบบาง ๆ ให้เห็นรูปร่างชัดบนพื้นการ์ด (วาดทั้งสองซีกในกลุ่มเดียว จะได้ไม่มีเส้นกลางลำตัว) */}
        <g style={{ filter: 'drop-shadow(0 0 0.6px var(--c-body-line)) drop-shadow(0 1.5px 1.5px rgb(0 0 0 / 0.06))' }}>
          <path d={SILHOUETTE} fill="var(--c-body)" />
          <path d={SILHOUETTE} fill="var(--c-body)" transform={MIRROR} />
        </g>
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
