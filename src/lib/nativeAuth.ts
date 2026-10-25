import { App } from '@capacitor/app'
import { Browser } from '@capacitor/browser'
import { supabase } from './supabase'
import { isNative } from './native'
import { notify } from './dialog'

// Google ไม่อนุญาตให้ login ใน WebView — ในแอปจึงเปิดหน้า login ใน Chrome Custom Tab
// แล้วให้ Supabase เด้งกลับเข้าแอปทาง deep link นี้ (ต้องใส่ไว้ใน Redirect URLs ของ Supabase)
export const NATIVE_REDIRECT = 'com.synxdicate.exerciseplan://login-callback'

export async function nativeGoogleSignIn() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: NATIVE_REDIRECT, skipBrowserRedirect: true },
  })
  if (error) return { error }
  await Browser.open({ url: data.url, windowName: '_self' })
  return { error: null }
}

// รับ deep link กลับจากหน้า login แล้วแลก code เป็น session (PKCE)
export function listenForAuthRedirect() {
  if (!isNative) return
  void App.addListener('appUrlOpen', async ({ url }) => {
    if (!url.startsWith(NATIVE_REDIRECT)) return
    await Browser.close().catch(() => {})
    const params = new URL(url).searchParams
    const code = params.get('code')
    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code)
      if (error) notify(`เข้าสู่ระบบไม่สำเร็จ: ${error.message}`, 'bad')
    } else if (params.get('error_description')) {
      notify(`เข้าสู่ระบบไม่สำเร็จ: ${params.get('error_description')}`, 'bad')
    }
  })
}
