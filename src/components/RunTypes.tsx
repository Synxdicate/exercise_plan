import { useId, useState } from 'react'
import { ChevronDown, Heart, MessageCircle, Target } from 'lucide-react'
import type { Run } from '../lib/log'
import { cx } from '../lib/cx'

type Info = {
  name: string
  // จุดของกราฟ [เวลา 0–1, ความหนัก 0–1]
  profile: [number, number][]
  rpe: [number, number]
  talk: string
  why: string
  share?: string
  beat: number // วินาทีต่อการเต้นของหัวใจในแอนิเมชัน (เร็ว = หนัก)
  lap: number // วินาทีที่จุดวิ่งครบเส้น
}

const flat = (y: number, from = 0, to = 1, n = 6): [number, number][] =>
  Array.from({ length: n }, (_, i) => [from + ((to - from) * i) / (n - 1), y])

const intervals = (() => {
  const pts: [number, number][] = [[0, 0.25], [0.14, 0.32]]
  for (let i = 0; i < 6; i++) {
    const x = 0.16 + i * 0.12
    pts.push([x, 0.34], [x + 0.015, 0.9], [x + 0.045, 0.9], [x + 0.06, 0.34])
  }
  pts.push([0.9, 0.3], [1, 0.22])
  return pts
})()

const runTypeInfo: Partial<Record<Run['kind'], Info>> = {
  easy: {
    name: 'Easy run',
    profile: flat(0.32),
    rpe: [3, 4],
    talk: 'พูดเป็นประโยคยาว ๆ ได้สบาย',
    why: 'สร้างฐานแอโรบิก หัวใจแข็งแรง ฟื้นตัวจากวันหนัก ข้อต่อปรับตัวกับการวิ่ง',
    share: '~80% ของการวิ่งทั้งสัปดาห์ควรเป็นแบบนี้',
    beat: 1.1,
    lap: 7,
  },
  tempo: {
    name: 'Tempo run',
    profile: [[0, 0.25], [0.18, 0.32], [0.26, 0.68], [0.78, 0.7], [0.85, 0.32], [1, 0.25]],
    rpe: [6, 7],
    talk: 'พูดได้ทีละคำสองคำ',
    why: 'ยกระดับ "threshold" ให้วิ่งเร็วได้นานขึ้นโดยไม่หมดแรง เหมาะกับเตรียมฮาล์ฟ/ฟูล',
    beat: 0.75,
    lap: 5.5,
  },
  interval: {
    name: 'Interval',
    profile: intervals,
    rpe: [8, 9],
    talk: 'พูดไม่ได้ช่วงเร็ว — หายใจหอบ',
    why: 'เพิ่ม VO₂max และความเร็ว ช่วงเร็วสั้น ๆ สลับจ็อกพักให้หายเหนื่อย',
    beat: 0.5,
    lap: 5,
  },
  long: {
    name: 'วิ่งยาว (Long run)',
    profile: [[0, 0.28], [0.15, 0.33], [0.5, 0.35], [0.85, 0.4], [1, 0.42]],
    rpe: [3, 5],
    talk: 'พูดคุยได้เกือบตลอด ช่วงท้ายอาจเหนื่อยขึ้น',
    why: 'ความอึด ขาทนทาน ร่างกายเก็บไกลโคเจนเก่งขึ้น และเป็นวันซ้อมกินน้ำ/เจลก่อนแข่ง',
    beat: 1,
    lap: 10,
  },
  race: {
    name: 'วันแข่ง',
    profile: [[0, 0.62], [0.2, 0.7], [0.8, 0.74], [0.92, 0.8], [1, 0.95]],
    rpe: [7, 9],
    talk: 'ออกตัวช้ากว่าเป้านิดหน่อย แล้วค่อยเร่งช่วงท้าย',
    why: 'ใช้ทุกอย่างที่ซ้อมมา — คุมเพซ ดื่มน้ำทุกจุด',
    beat: 0.6,
    lap: 6,
  },
}

const W = 300, H = 110, PAD = 8
const px = ([t, e]: [number, number]) => [PAD + t * (W - PAD * 2), H - PAD - e * (H - PAD * 2)] as const

// เส้นโค้งนุ่ม (Catmull-Rom → Bézier)
function smooth(points: [number, number][]) {
  const p = points.map(px)
  let d = `M${p[0][0]} ${p[0][1]}`
  for (let i = 0; i < p.length - 1; i++) {
    const p0 = p[i - 1] ?? p[i], p1 = p[i], p2 = p[i + 1], p3 = p[i + 2] ?? p2
    const k = points === intervals ? 0 : 1 / 6 // interval ใช้เส้นตรง ให้เห็นเป็นขั้น ๆ
    d += ` C${p1[0] + (p2[0] - p0[0]) * k} ${p1[1] + (p2[1] - p0[1]) * k} ${p2[0] - (p3[0] - p1[0]) * k} ${p2[1] - (p3[1] - p1[1]) * k} ${p2[0]} ${p2[1]}`
  }
  return d
}

const reduceMotion = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches

/** อธิบายประเภทการวิ่งด้วยกราฟความหนักที่วาดขึ้นมา + หัวใจเต้นตามความหนัก */
export function RunTypeCard({ kind, compact, defaultOpen = false }: { kind: Run['kind']; compact?: boolean; defaultOpen?: boolean }) {
  const info = runTypeInfo[kind]
  const id = useId().replace(/:/g, '')
  const [open, setOpen] = useState(defaultOpen || !!compact)
  if (!info) return null
  const line = smooth(info.profile)
  const [x0] = px(info.profile[0])
  const [x1] = px(info.profile.at(-1)!)
  const area = `${line} L${x1} ${H - PAD} L${x0} ${H - PAD} Z`
  const motion = !reduceMotion()

  return (
    <div key={kind} className={cx('animate-fade-up', !compact && 'rounded-2xl bg-card p-3.5 shadow-sm ring-1 ring-line')}>
      {!compact && (
        <button onClick={() => setOpen(!open)} aria-expanded={open} className="flex w-full items-center gap-2 text-left active:scale-100">
          <span className="min-w-0 flex-1 text-[15px] font-bold">{info.name} คืออะไร?</span>
          <span className="flex items-center gap-1 text-xs font-semibold text-accent">
            <Heart size={16} fill="currentColor" style={motion ? { animation: `beat ${info.beat}s ease-in-out infinite` } : undefined} />
            RPE {info.rpe[0]}–{info.rpe[1]}
          </span>
          <ChevronDown size={18} className={cx('shrink-0 text-muted transition-transform duration-300', open && 'rotate-180')} />
        </button>
      )}
      {/* render ตอนเปิด เพื่อให้แอนิเมชันวาดกราฟเล่นทุกครั้งที่กดดู */}
      {open && <div className={cx('animate-fade-up', !compact && 'mt-2')}>

      <div className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} className="block w-full overflow-visible" role="img" aria-label={`กราฟความหนักของ ${info.name}`}>
          <defs>
            {/* สูง = หนัก (แดง), ต่ำ = เบา (ฟ้า) */}
            <linearGradient id={`g${id}`} gradientUnits="userSpaceOnUse" x1="0" y1={PAD} x2="0" y2={H - PAD}>
              <stop offset="0%" stopColor="var(--c-accent)" />
              <stop offset="35%" stopColor="var(--c-warn)" />
              <stop offset="62%" stopColor="var(--c-run)" />
              <stop offset="100%" stopColor="var(--c-run)" />
            </linearGradient>
            <clipPath id={`c${id}`}>
              <rect x="0" y="0" height={H} width={W} className={motion ? 'origin-left animate-[reveal_1.4s_cubic-bezier(.2,.8,.2,1)_both]' : ''} />
            </clipPath>
          </defs>
          {[0.33, 0.66].map(y => (
            <line key={y} x1={PAD} x2={W - PAD} y1={H - PAD - y * (H - PAD * 2)} y2={H - PAD - y * (H - PAD * 2)} className="stroke-line" strokeDasharray="3 4" />
          ))}
          <g clipPath={`url(#c${id})`}>
            <path d={area} fill={`url(#g${id})`} opacity={0.22} />
            <path d={line} fill="none" stroke={`url(#g${id})`} strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round" />
          </g>
          {motion && (
            <circle r={6} className="fill-card stroke-ink" strokeWidth={3}>
              <animateMotion dur={`${info.lap}s`} repeatCount="indefinite" path={line} begin="1.2s" />
            </circle>
          )}
          <text x={PAD} y={10} className="fill-muted text-[9px]">หนัก</text>
          <text x={PAD} y={H - 1} className="fill-muted text-[9px]">เบา</text>
          <text x={W - PAD} y={H - 1} textAnchor="end" className="fill-muted text-[9px]">เวลา →</text>
        </svg>
      </div>

      {/* ระดับความเหนื่อย 1–10 */}
      <div className="mt-2 flex gap-1" aria-label={`ความเหนื่อย ${info.rpe[0]}–${info.rpe[1]} จาก 10`}>
        {Array.from({ length: 10 }, (_, i) => (
          <span key={i} className={cx('h-1.5 flex-1 rounded-full', i < info.rpe[1] ? (i < 4 ? 'bg-run' : i < 7 ? 'bg-warn' : 'bg-accent') : 'bg-body')}
            style={motion ? { animation: `fade-in .3s ${0.4 + i * 0.06}s both` } : undefined} />
        ))}
      </div>

      {!compact && (
        <ul className="mt-3 space-y-1.5 text-sm">
          <li className="flex gap-2"><MessageCircle size={16} className="mt-0.5 shrink-0 text-run" /><span><b>Talk test:</b> {info.talk}</span></li>
          <li className="flex gap-2"><Target size={16} className="mt-0.5 shrink-0 text-accent" /><span>{info.why}</span></li>
          {info.share && <li className="pl-6 text-xs text-muted">{info.share}</li>}
        </ul>
      )}
      </div>}
    </div>
  )
}
