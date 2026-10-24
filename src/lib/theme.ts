import { useEffect } from 'react'
import { usePersisted } from './storage'

export type Theme = 'system' | 'light' | 'dark'

// ธีมเป็นค่าของแต่ละเครื่อง (ไม่ sync) — index.html อ่านค่าเดียวกันตอนเปิดแอปเพื่อกันจอกะพริบ
export function useTheme() {
  const [theme, setTheme] = usePersisted<Theme>('theme', 'system')

  useEffect(() => {
    const root = document.documentElement
    root.classList.add('theme-fade')
    if (theme === 'system') delete root.dataset.theme
    else root.dataset.theme = theme
    const dark = theme === 'dark' || (theme === 'system' && matchMedia('(prefers-color-scheme: dark)').matches)
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#0a0c0f' : '#f3f4f6')
    const id = setTimeout(() => root.classList.remove('theme-fade'), 350)
    return () => clearTimeout(id)
  }, [theme])

  return [theme, setTheme] as const
}
