import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

if (!url || !key) {
  throw new Error('ไม่พบ VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY — ตั้งค่าใน .env.local หรือ Environment Variables ของ Vercel')
}

export const supabase = createClient(url, key)
