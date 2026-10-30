import { useCallback, useEffect } from 'react'
import { usePersisted } from './storage'

export type Lang = 'th' | 'en'

// ภาษาเป็นค่าของแต่ละเครื่อง (เหมือนธีม) — ข้อความเขียนเป็นคู่ t('ไทย', 'English') ไว้ข้างกัน
// ส่วนที่ยังไม่ได้แปลก็ยังเป็นภาษาไทยตามเดิม แปลเพิ่มทีละหน้าได้
export function useLang() {
  const [lang, setLang] = usePersisted<Lang>('lang', 'th')
  useEffect(() => { document.documentElement.lang = lang }, [lang])
  return [lang, setLang] as const
}

export function useT() {
  const [lang] = useLang()
  return useCallback((th: string, en: string) => (lang === 'en' ? en : th), [lang])
}
