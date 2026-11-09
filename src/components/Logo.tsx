import { useId } from 'react'
import { SHOE } from '../lib/shoeShape'

// โลโก้ Kao: รองเท้าวิ่งเอียงขึ้นเหมือนกำลังก้าว (ต้นฉบับ assets/logo.svg → scripts/make-icons.py)
// รายละเอียด (พื้นรองเท้า เชือก เส้นความเร็ว) เจาะทะลุด้วย mask จึงวางบนพื้นสีอะไรก็ได้

export function LogoMark({ size = 24, className }: { size?: number; className?: string }) {
  const id = useId()
  return (
    <svg viewBox="-512 -512 1024 1024" width={size} height={size} className={className} aria-hidden>
      <defs>
        <mask id={id} maskUnits="userSpaceOnUse" x="-512" y="-512" width="1024" height="1024">
          <rect x="-512" y="-512" width="1024" height="1024" fill="#000" />
          <g transform="rotate(-14) scale(8.6) translate(-53 -34)">
            <path fill="#fff" d={SHOE.silhouette} />
            <g fill="none" stroke="#000" strokeLinecap="round">
              <path strokeWidth={3} d={SHOE.midsole} />
              <path strokeWidth={2.6} d={`${SHOE.laces} ${SHOE.speed}`} />
            </g>
          </g>
        </mask>
      </defs>
      <rect x="-512" y="-512" width="1024" height="1024" fill="currentColor" mask={`url(#${id})`} />
    </svg>
  )
}
