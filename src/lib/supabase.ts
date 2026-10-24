import { createClient } from '@supabase/supabase-js'
import { isNative } from './native'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

if (!url || !key) {
  throw new Error('ไม่พบ VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY — ตั้งค่าใน .env.local หรือ Environment Variables ของ Vercel')
}

// แอป Android ใช้ PKCE (แลก code ที่ได้จาก deep link) — บนเว็บคงแบบเดิม เพื่อให้ลิงก์ยืนยันอีเมลเปิดจากเบราว์เซอร์ไหนก็ได้
export const supabase = createClient(url, key, { auth: { flowType: isNative ? 'pkce' : 'implicit' } })
