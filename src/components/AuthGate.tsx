import { useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { startSync } from '../lib/sync'
import { Login, NewPassword } from './Login'
import { setLocalMode, useLocalMode } from '../lib/localMode'

type State =
  | { kind: 'loading' }
  | { kind: 'signedOut' }
  | { kind: 'recovery' }
  | { kind: 'syncing'; session: Session }
  | { kind: 'ready'; session: Session }
  | { kind: 'error'; message: string; session: Session }

export function AuthGate({ children }: { children: (session: Session | null) => ReactNode }) {
  const [state, setState] = useState<State>({ kind: 'loading' })
  const local = useLocalMode()

  useEffect(() => {
    let syncedFor: string | null = null

    const enter = async (session: Session) => {
      if (syncedFor === session.user.id) return setState(s => (s.kind === 'ready' ? { kind: 'ready', session } : s))
      syncedFor = session.user.id
      setState({ kind: 'syncing', session })
      try {
        await startSync(session.user.id)
        setState({ kind: 'ready', session })
      } catch (e) {
        syncedFor = null
        setState({ kind: 'error', message: e instanceof Error ? e.message : String(e), session })
      }
    }

    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') return setState({ kind: 'recovery' })
      if (!session) {
        syncedFor = null
        return setState({ kind: 'signedOut' })
      }
      // ห้าม await งาน supabase ใน callback นี้โดยตรง (จะ deadlock) — เลื่อนออกไป
      setLocalMode(false)
      setTimeout(() => void enter(session), 0)
    })
    return () => data.subscription.unsubscribe()
  }, [])

  switch (state.kind) {
    case 'loading':
    case 'syncing':
      return <div className="min-h-dvh flex flex-col items-center justify-center gap-3 p-4"><div className="size-8 animate-spin rounded-full border-4 border-line border-t-accent" aria-label="กำลังโหลด" /><p className="text-sm text-muted">{state.kind === 'syncing' ? 'กำลังซิงก์ข้อมูล…' : ''}</p></div>
    case 'signedOut':
      // โหมดไม่ล็อกอิน: ใช้ข้อมูลในเครื่องได้เลย (ไม่ซิงก์)
      return local ? <>{children(null)}</> : <Login />
    case 'recovery':
      return <NewPassword onDone={() => location.replace(location.origin)} />
    case 'error':
      return (
        <div className="min-h-dvh flex flex-col items-center justify-center gap-3 p-4">
          <div className="w-full max-w-sm rounded-3xl bg-card p-6 shadow-sm ring-1 ring-line flex flex-col gap-3 text-center">
            <h1 className="text-xl font-bold">ซิงก์ข้อมูลไม่สำเร็จ</h1>
            <p className="text-sm text-bad">{state.message}</p>
            <button className="inline-flex items-center justify-center gap-2 rounded-full bg-accent px-4 py-3 font-semibold text-white disabled:opacity-50 active:scale-[.98]" onClick={() => location.reload()}>ลองใหม่</button>
            <button className="p-1 text-run" onClick={() => supabase.auth.signOut()}>ออกจากระบบ</button>
          </div>
        </div>
      )
    case 'ready':
      return <>{children(state.session)}</>
  }
}
