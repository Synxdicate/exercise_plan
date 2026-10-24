import { useEffect, useState, useSyncExternalStore } from 'react'
import type { Session } from '@supabase/supabase-js'
import { BookOpen, Cloud, CloudOff, Download, Dumbbell, Footprints, House, LogOut, Monitor, Moon, RefreshCw, SlidersHorizontal, Sun, TrendingUp, Upload, Utensils } from 'lucide-react'
import { AuthGate } from './components/AuthGate'
import { Onboarding } from './components/Onboarding'
import { ProgramSheet } from './components/ProgramSheet'
import { useTheme, type Theme } from './lib/theme'
import { supabase } from './lib/supabase'
import { exportData, getSyncStatus, importData, stopSync, subscribeSyncStatus } from './lib/sync'
import { today } from './lib/date'
import { Overview } from './components/Overview'
import { Plan } from './components/Plan'
import { Nutrition } from './components/Nutrition'
import { Progress } from './components/Progress'
import { Runs } from './components/Runs'
import { Sources } from './components/Sources'
import { cx } from './lib/cx'
import { defaultProfile, type Profile } from './lib/calc'
import { usePersisted } from './lib/storage'
import { NavContext } from './lib/nav'

// 5 แท็บล่างแบบแอปมือถือ — "แหล่งข้อมูล" อยู่ในเมนูโปรไฟล์
const tabs = [
  { id: 'overview', label: 'หน้าหลัก', title: 'ภาพรวม', icon: House },
  { id: 'plan', label: 'ฝึก', title: 'ตารางฝึก', icon: Dumbbell },
  { id: 'runs', label: 'วิ่ง', title: 'วิ่ง', icon: Footprints },
  { id: 'food', label: 'อาหาร', title: 'อาหาร', icon: Utensils },
  { id: 'progress', label: 'บันทึก', title: 'บันทึก', icon: TrendingUp },
] as const

type Tab = (typeof tabs)[number]['id'] | 'sources'

export default function App() {
  useTheme()
  return <AuthGate>{session => <Main session={session} />}</AuthGate>
}

function Main({ session }: { session: Session }) {
  const [tab, setTab] = usePersisted<Tab>('tab', 'overview')
  const [profile, setProfile] = usePersisted<Profile>('profile', defaultProfile)
  const [onboarded, setOnboarded] = usePersisted('onboarded', false)

  // ลิงก์ตรงไปแท็บได้ เช่น /#runs
  useEffect(() => {
    const h = location.hash.slice(1)
    if (h === 'sources' || tabs.some(t => t.id === h)) setTab(h as Tab)
  }, [setTab])

  const go = (id: Tab) => {
    setTab(id)
    history.replaceState(null, '', `#${id}`)
    window.scrollTo({ top: 0 })
  }

  if (!onboarded) return <Onboarding onDone={() => setOnboarded(true)} />

  const title = tab === 'sources' ? 'แหล่งข้อมูล' : tabs.find(t => t.id === tab)?.title

  return (
    <NavContext.Provider value={go}>
    <div className="mx-auto min-h-dvh max-w-lg">
      <header className="sticky top-0 z-30 flex items-center justify-between gap-3 bg-bg/85 px-4 pb-3 pt-[calc(env(safe-area-inset-top)+0.75rem)] backdrop-blur">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-accent text-white"><Dumbbell size={18} /></div>
          <div className="min-w-0">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-accent">Exercise-Plan</div>
            <h1 className="truncate text-lg font-bold leading-tight">{title}</h1>
          </div>
        </div>
        <UserMenu session={session} onSources={() => go('sources')} />
      </header>

      <main key={tab} className="animate-fade-up space-y-3 px-4 pt-1 pb-[calc(env(safe-area-inset-bottom)+6rem)]">
        {tab === 'overview' && <Overview profile={profile} setProfile={setProfile} />}
        {tab === 'plan' && <Plan />}
        {tab === 'runs' && <Runs />}
        {tab === 'food' && <Nutrition profile={profile} />}
        {tab === 'progress' && <Progress />}
        {tab === 'sources' && <Sources />}
        <p className="pt-2 text-center text-xs text-muted">ข้อมูลเพื่อการศึกษา ไม่ใช่คำแนะนำทางการแพทย์</p>
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-lg border-t border-line bg-card/95 px-2 pb-[calc(env(safe-area-inset-bottom)+0.25rem)] pt-1.5 backdrop-blur sm:bottom-4 sm:rounded-3xl sm:border sm:shadow-lg">
        <div className="grid grid-cols-5">
          {tabs.map(t => {
            const on = tab === t.id
            return (
              <button key={t.id} onClick={() => go(t.id)} aria-current={on ? 'page' : undefined}
                className={cx('flex flex-col items-center gap-0.5 rounded-2xl py-1.5 text-[11px] font-semibold transition', on ? 'text-accent' : 'text-muted')}>
                <span className={cx('grid h-7 w-12 place-items-center rounded-full transition-all duration-300', on ? 'scale-100 bg-accent-soft' : 'scale-90')}>
                  <t.icon size={20} strokeWidth={on ? 2.5 : 2} aria-hidden />
                </span>
                {t.label}
              </button>
            )
          })}
        </div>
      </nav>
    </div>
    </NavContext.Provider>
  )
}

function UserMenu({ session, onSources }: { session: Session; onSources: () => void }) {
  const status = useSyncExternalStore(subscribeSyncStatus, getSyncStatus)
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [programOpen, setProgramOpen] = useState(false)
  const [theme, setTheme] = useTheme()
  const meta = session.user.user_metadata as { full_name?: string; avatar_url?: string } | undefined
  const name = meta?.full_name ?? session.user.email ?? ''

  const logout = async () => {
    setBusy(true)
    let ok = await stopSync()
    if (!ok) ok = confirm('ยังมีข้อมูลที่ส่งขึ้น server ไม่ได้ (อาจออฟไลน์อยู่) ถ้าออกจากระบบตอนนี้ ข้อมูลส่วนนั้นจะหาย ต้องการออกต่อไหม?') && (await stopSync(true))
    if (ok) await supabase.auth.signOut()
    setBusy(false)
  }

  const download = () => {
    const blob = new Blob([JSON.stringify(exportData(), null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `exercise-plan-backup-${today()}.json`
    a.click()
    URL.revokeObjectURL(a.href)
    setOpen(false)
  }

  const restore = async (file: File) => {
    try {
      const json = JSON.parse(await file.text())
      if (!confirm('กู้คืนจะแทนที่ข้อมูลปัจจุบันด้วยข้อมูลในไฟล์ ต้องการทำต่อไหม?')) return
      importData(json)
      setOpen(false)
      alert('กู้คืนข้อมูลเรียบร้อย')
    } catch (e) {
      alert(e instanceof Error ? e.message : 'อ่านไฟล์ไม่ได้')
    }
  }

  const StatusIcon = status === 'offline' ? CloudOff : status === 'saving' ? RefreshCw : Cloud
  const statusText = status === 'offline' ? 'ยังไม่ได้ซิงก์ (ออฟไลน์)' : status === 'saving' ? 'กำลังบันทึก…' : 'ซิงก์แล้ว'
  const statusColor = status === 'offline' ? 'text-warn' : status === 'saving' ? 'text-muted' : 'text-good'

  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} aria-label="เมนูบัญชี" className="relative">
        {meta?.avatar_url
          ? <img src={meta.avatar_url} alt="" className="size-9 rounded-full ring-2 ring-line" referrerPolicy="no-referrer" />
          : <span className="grid size-9 place-items-center rounded-full bg-raised font-bold uppercase ring-2 ring-line">{name.charAt(0)}</span>}
        <span className={cx('absolute -bottom-0.5 -right-0.5 grid size-4 place-items-center rounded-full bg-card', statusColor)}>
          <StatusIcon size={11} className={status === 'saving' ? 'animate-spin' : ''} />
        </span>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-50 mt-2 w-64 origin-top-right animate-fade-up rounded-2xl bg-card p-2 shadow-xl ring-1 ring-line">
            <div className="px-3 py-2">
              <div className="truncate font-semibold">{name}</div>
              <div className={cx('flex items-center gap-1 text-xs', statusColor)}><StatusIcon size={12} /> {statusText}</div>
            </div>
            <button onClick={() => { setOpen(false); setProgramOpen(true) }} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left hover:bg-raised">
              <SlidersHorizontal size={16} /> ตั้งค่าโปรแกรมและเป้าหมาย
            </button>
            <div className="px-3 pb-1 pt-2 text-xs text-muted">ธีม</div>
            <div className="mx-1 mb-1 grid grid-cols-3 gap-1 rounded-xl bg-raised p-1">
              {([['light', Sun, 'สว่าง'], ['dark', Moon, 'มืด'], ['system', Monitor, 'ตามระบบ']] as [Theme, typeof Sun, string][]).map(([v, Icon, label]) => (
                <button key={v} onClick={() => setTheme(v)}
                  className={cx('flex flex-col items-center gap-0.5 rounded-lg py-1.5 text-[11px] font-semibold transition', theme === v ? 'bg-card text-accent shadow-sm' : 'text-muted')}>
                  <Icon size={16} /> {label}
                </button>
              ))}
            </div>
            <div className="my-1 h-px bg-line" />
            <button onClick={() => { setOpen(false); onSources() }} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left hover:bg-raised">
              <BookOpen size={16} /> แหล่งข้อมูลและช่อง YouTube
            </button>
            <button onClick={download} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left hover:bg-raised">
              <Download size={16} /> สำรองข้อมูล (ไฟล์ JSON)
            </button>
            <label className="flex w-full cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-left hover:bg-raised">
              <Upload size={16} /> กู้คืนจากไฟล์สำรอง
              <input type="file" accept="application/json,.json" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) void restore(f); e.target.value = '' }} />
            </label>
            <button onClick={logout} disabled={busy} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-bad hover:bg-raised">
              <LogOut size={16} /> ออกจากระบบ
            </button>
          </div>
        </>
      )}
      {programOpen && <ProgramSheet onClose={() => setProgramOpen(false)} />}
    </div>
  )
}
