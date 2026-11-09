import { FootPaths } from './Logo'

// ไอคอนแท็บด้านล่างที่วาดเอง ชุดเดียวกันทั้งหมด: เส้นมนหนาเท่ากัน แท็บที่เลือกเติมสีจาง ๆ ด้านใน (duotone)
// แท็บวิ่งใช้รอยเท้าจากโลโก้ของแอป
export type NavIconName = 'home' | 'plan' | 'runs' | 'food' | 'progress'

const shapes: Record<Exclude<NavIconName, 'runs'>, { fill: string; line?: string }> = {
  home: { fill: 'M4 10.6 12 4l8 6.6v8.4a1.5 1.5 0 0 1-1.5 1.5H15v-5.2a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v5.2H5.5A1.5 1.5 0 0 1 4 19z' },
  plan: {
    fill: 'M5.3 7h1.9a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H5.3a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1zM16.8 7h1.9a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1h-1.9a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1z',
    line: 'M8.2 12h7.6M2.5 10v4M21.5 10v4',
  },
  food: { fill: 'M3.5 11.5h17a8.5 8 0 0 1-17 0z', line: 'M9 20.5h6M13.5 3.5l-2.5 7M18.5 4.5l-4 6' },
  progress: { fill: 'M4.5 15.5 9 11l3.5 3 7-7.5v12.5h-15z', line: 'M4.5 15.5 9 11l3.5 3 7-7.5M4 20h16' },
}

export function NavIcon({ name, active, size = 22 }: { name: NavIconName; active: boolean; size?: number }) {
  if (name === 'runs')
    return (
      <svg viewBox="-330 -330 660 660" width={size} height={size} aria-hidden fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={active ? 0 : 42} strokeLinejoin="round">
        <FootPaths />
      </svg>
    )
  const s = shapes[name]
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.9} strokeLinecap="round" strokeLinejoin="round">
      <path d={s.fill} fill={active ? 'currentColor' : 'none'} fillOpacity={0.22} />
      {s.line && <path d={s.line} />}
    </svg>
  )
}
