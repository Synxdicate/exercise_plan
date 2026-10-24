import { useState, type FormEvent } from 'react'
import { Dumbbell, Lock, LogIn, Mail, UserPlus } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { isNative, SITE_URL } from '../lib/native'
import { nativeGoogleSignIn } from '../lib/nativeAuth'
import { TextInput } from './Form'

type Mode = 'signin' | 'signup' | 'reset'

const errorText = (msg: string) => {
  if (/invalid login credentials/i.test(msg)) return 'อีเมลหรือรหัสผ่านไม่ถูกต้อง'
  if (/email not confirmed/i.test(msg)) return 'ยังไม่ได้ยืนยันอีเมล — เปิดลิงก์ในอีเมลที่ส่งไปก่อน'
  if (/already registered/i.test(msg)) return 'อีเมลนี้สมัครไว้แล้ว — ลองเข้าสู่ระบบแทน'
  if (/at least 6 characters|weak/i.test(msg)) return 'รหัสผ่านสั้นหรือง่ายเกินไป (อย่างน้อย 6 ตัวอักษร)'
  if (/provider is not enabled/i.test(msg)) return 'ยังไม่ได้เปิด Google login ใน Supabase'
  return msg
}

export function Login() {
  const [mode, setMode] = useState<Mode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)

  const run = async (fn: () => Promise<{ error: { message: string } | null }>, ok?: string) => {
    setBusy(true)
    setError(null)
    setInfo(null)
    const { error } = await fn()
    setBusy(false)
    if (error) setError(errorText(error.message))
    else if (ok) setInfo(ok)
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const redirectTo = SITE_URL
    if (mode === 'signin') return run(() => supabase.auth.signInWithPassword({ email, password }))
    if (mode === 'signup')
      return run(() => supabase.auth.signUp({ email, password, options: { emailRedirectTo: redirectTo } }),
        'สมัครแล้ว — ตรวจอีเมลแล้วกดลิงก์ยืนยัน จากนั้นกลับมาเข้าสู่ระบบ')
    return run(() => supabase.auth.resetPasswordForEmail(email, { redirectTo }), 'ส่งลิงก์ตั้งรหัสผ่านใหม่ไปที่อีเมลแล้ว')
  }

  const google = () => run(() => (isNative ? nativeGoogleSignIn() : supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } })))

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center gap-3 p-4 pt-[calc(var(--sat)+1rem)] pb-[calc(var(--sab)+1rem)]">
      <div className="w-full max-w-sm rounded-3xl bg-card p-6 shadow-sm ring-1 ring-line flex flex-col gap-3 text-center">
        <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-accent text-white"><Dumbbell size={28} /></div>
        <h1 className="text-2xl font-extrabold text-accent">Exercise-Plan</h1>
        <p className="text-sm text-muted">เข้าสู่ระบบเพื่อบันทึกการฝึกและซิงก์ข้ามมือถือ/คอม</p>

        {mode !== 'reset' && (
          <>
            <button className="inline-flex items-center justify-center gap-2.5 rounded-full bg-card px-4 py-3 font-semibold ring-1 ring-line hover:ring-muted disabled:opacity-50" onClick={google} disabled={busy}>
              <GoogleIcon /> ดำเนินการต่อด้วย Google
            </button>
            <div className="flex items-center gap-3 text-xs text-muted before:h-px before:flex-1 before:bg-line after:h-px after:flex-1 after:bg-line"><span>หรือ</span></div>
          </>
        )}

        <form onSubmit={submit} className="flex flex-col gap-3 text-left">
          <TextInput label="อีเมล" type="email" autoComplete="email" required value={email} onChange={setEmail} placeholder="you@example.com" icon={<Mail size={18} />} />
          {mode !== 'reset' && (
            <TextInput label="รหัสผ่าน" type="password" autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} required minLength={6}
              value={password} onChange={setPassword} placeholder="อย่างน้อย 6 ตัวอักษร" icon={<Lock size={18} />} />
          )}
          <button className="inline-flex items-center justify-center gap-2 rounded-full bg-accent px-4 py-3 font-semibold text-white disabled:opacity-50 active:scale-[.98]" type="submit" disabled={busy}>
            {mode === 'signin' && <><LogIn size={16} /> เข้าสู่ระบบ</>}
            {mode === 'signup' && <><UserPlus size={16} /> สมัครสมาชิก</>}
            {mode === 'reset' && <><Mail size={16} /> ส่งลิงก์ตั้งรหัสผ่านใหม่</>}
          </button>
        </form>

        {error && <p className="text-sm text-bad">{error}</p>}
        {info && <p className="text-sm text-good">{info}</p>}

        <div className="flex justify-between gap-2 text-sm has-[>:only-child]:justify-center">
          {mode === 'signin' ? (
            <>
              <button className="p-1 text-run" onClick={() => setMode('signup')}>ยังไม่มีบัญชี? สมัคร</button>
              <button className="p-1 text-run" onClick={() => setMode('reset')}>ลืมรหัสผ่าน</button>
            </>
          ) : (
            <button className="p-1 text-run" onClick={() => setMode('signin')}>กลับไปเข้าสู่ระบบ</button>
          )}
        </div>
      </div>
    </div>
  )
}

export function NewPassword({ onDone }: { onDone: () => void }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    const { error } = await supabase.auth.updateUser({ password })
    setBusy(false)
    if (error) setError(errorText(error.message))
    else onDone()
  }

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center gap-3 p-4 pt-[calc(var(--sat)+1rem)] pb-[calc(var(--sab)+1rem)]">
      <form className="w-full max-w-sm rounded-3xl bg-card p-6 shadow-sm ring-1 ring-line flex flex-col gap-3 text-left" onSubmit={submit}>
        <h1 className="text-xl font-bold">ตั้งรหัสผ่านใหม่</h1>
        <TextInput label="รหัสผ่านใหม่" type="password" autoComplete="new-password" required minLength={6} value={password} onChange={setPassword} icon={<Lock size={18} />} />
        <button className="inline-flex items-center justify-center gap-2 rounded-full bg-accent px-4 py-3 font-semibold text-white disabled:opacity-50 active:scale-[.98]" type="submit" disabled={busy}>บันทึกรหัสผ่าน</button>
        {error && <p className="text-sm text-bad">{error}</p>}
      </form>
    </div>
  )
}

// โลโก้ Google ตามแบรนด์ (lucide ไม่มีไอคอนแบรนด์)
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.6-.4-3.9z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.6-.4-3.9z" />
    </svg>
  )
}
