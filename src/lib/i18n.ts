import { useCallback, useEffect } from 'react'
import { readStored, usePersisted } from './storage'
import { setDateLang } from './date'

export type Lang = 'th' | 'en'

// ภาษาเป็นค่าของแต่ละเครื่อง (เหมือนธีม) — ข้อความเขียนเป็นคู่ t('ไทย', 'English') ไว้ข้างกัน
// ส่วนที่ยังไม่ได้แปลก็ยังเป็นภาษาไทยตามเดิม แปลเพิ่มทีละหน้าได้
export function useLang() {
  const [lang, setLang] = usePersisted<Lang>('lang', 'th')
  setDateLang(lang)
  useEffect(() => { document.documentElement.lang = lang }, [lang])
  return [lang, setLang] as const
}

export function useT() {
  const [lang] = useLang()
  return useCallback((th: string, en: string) => (lang === 'en' ? en : th), [lang])
}

/** สำหรับที่ใช้ hook ไม่ได้ (class component, toast จากฟังก์ชันธรรมดา) — อ่านค่าภาษาที่บันทึกไว้ตอนเรียก */
export const trNow = (th: string, en: string) => (readStored('lang') === 'en' ? en : th)
