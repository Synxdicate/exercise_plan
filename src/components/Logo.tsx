// โลโก้ "ก้าว": รอยเท้าซ้าย-ขวาวางเหลื่อมกันเป็นจังหวะก้าว (ออกแบบเอง ต้นฉบับ assets/logo.svg → scripts/make-icons.py)
const Foot = () => (
  <>
      <path d="M6 -150 C66 -150 92 -96 88 -34 C85 22 66 62 56 96 C50 118 -18 118 -24 96 C-28 70 -12 40 -30 6 C-48 -26 -70 -50 -66 -92 C-62 -132 -36 -150 6 -150 Z" />
      <path d="M-20 140 C-22 124 54 118 58 136 C64 170 44 206 16 206 C-12 206 -22 170 -20 140 Z" />
      <circle cx="-42" cy="-184" r="26" />
      <circle cx="8" cy="-200" r="19" />
      <circle cx="46" cy="-190" r="16" />
      <circle cx="76" cy="-166" r="13" />
  </>
)

export function LogoMark({ size = 24, className }: { size?: number; className?: string }) {
  return (
    <svg viewBox="-330 -330 660 660" width={size} height={size} className={className} fill="currentColor" aria-hidden>
      <g transform="translate(-120 96) rotate(-10) scale(-1 1)"><Foot /></g>
      <g transform="translate(120 -84) rotate(10)"><Foot /></g>
    </svg>
  )
}
