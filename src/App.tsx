import { useEffect, useState, useSyncExternalStore } from 'react'
import type { Session } from '@supabase/supabase-js'
import { Bell, BookOpen, Bug, Cloud, CloudOff, Download, Dumbbell, Footprints, House, LogIn, LogOut, Monitor, Moon, RefreshCw, SlidersHorizontal, Smartphone, Sun, TrendingUp, Upload, Utensils } from 'lucide-react'
import { AuthGate } from './components/AuthGate'
import { DialogHost } from './components/DialogHost'
import { ask, notify } from './lib/dialog'
import { Onboarding } from './components/Onboarding'
import { ProgramSheet } from './components/ProgramSheet'
import { useTheme, type Theme } from './lib/theme'
import { useReminderSchedule, useReminderSetting } from './lib/reminders'
import { useBadgeWatcher } from './lib/useGoals'
import { useCompactRuns, useRuns, useSessions } from './lib/log'
import { isNative } from './lib/native'
import { APP_VERSION, downloadUpdate, useUpdateAvailable } from './lib/update'
import { useBackButton, useBackClose } from './lib/back'
import { supabase } from './lib/supabase'
import { getSyncStatus, stopSync, subscribeSyncStatus } from './lib/sync'
import { restoreBackup, saveBackup } from './lib/backup'
import type { ErrorEntry } from './lib/errors'
import { ErrorLogSheet } from './components/ErrorLogSheet'
import * as idb from './lib/idb'
import { isLocalPhoto, syncPhotos, type Photo } from './lib/photos'
import { readStored, usePersisted } from './lib/storage'
import { lastBackup, setLocalMode } from './lib/localMode'
import { daysBetween, today } from './lib/date'
import { Overview } from './components/Overview'
import { Plan } from './components/Plan'
import { Nutrition } from './components/Nutrition'
import { Progress } from './components/Progress'
import { Runs } from './components/Runs'
import { Sources } from './components/Sources'
import { cx } from './lib/cx'
import { defaultProfile, type Profile } from './lib/calc'
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
  return (
    <>
      <AuthGate>{session => <Main session={session} />}</AuthGate>
      <DialogHost />
    </>
  )
}

function Main({ session }: { session: Session | null }) {
  const [tab, setTab] = usePersisted<Tab>('tab', 'overview')
  const [profile, setProfile] = usePersisted<Profile>('profile', defaultProfile)
  const [onboarded, setOnboarded] = usePersisted('onboarded', false)
  useReminderSchedule()
  useBadgeWatcher()
  useCompactRuns()
  const update = useUpdateAvailable()
  const [dismissed, setDismissed] = usePersisted('updateDismissed', '')

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
  // ปุ่มย้อนกลับ Android: ไม่มีอะไรเปิดซ้อน → กลับหน้าหลักก่อน แล้วค่อยย่อแอป
  useBackButton(() => {
    if (tab === 'overview') return false
    go('overview')
    return true
  })

  if (!onboarded) return <Onboarding onDone={() => setOnboarded(true)} />

  const title = tab === 'sources' ? 'แหล่งข้อมูล' : tabs.find(t => t.id === tab)?.title

  return (
    <NavContext.Provider value={go}>
    <div className="mx-auto min-h-dvh max-w-lg">
      <header className="sticky top-0 z-30 flex items-center justify-between gap-3 bg-bg/85 px-4 pb-3 pt-[calc(var(--sat)+0.75rem)] backdrop-blur">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-accent text-white"><Footprints size={18} /></div>
          <div className="min-w-0">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-accent">Kao</div>
            <h1 className="truncate text-lg font-bold leading-tight">{title}</h1>
          </div>
        </div>
        <UserMenu session={session} onSources={() => go('sources')} />
      </header>

      {update && dismissed !== update && (
        <div className="mx-4 mb-2 flex animate-fade-up items-center gap-2 rounded-2xl bg-run/10 px-3.5 py-2.5 text-sm text-run ring-1 ring-run/30">
          <Download size={16} className="shrink-0" />
          <span className="flex-1">มีแอปเวอร์ชันใหม่ v{update}</span>
          <button onClick={() => void downloadUpdate()} className="shrink-0 rounded-full bg-run px-3 py-1 text-xs font-semibold text-white">ดาวน์โหลด</button>
          <button onClick={() => setDismissed(update)} aria-label="ปิด" className="shrink-0 text-xs font-semibold">ปิด</button>
        </div>
      )}

      {!session && <BackupReminder />}

      <main key={tab} className="animate-fade-up space-y-3 px-4 pt-1 pb-[calc(var(--sab)+6rem)]">
        {tab === 'overview' && <Overview />}
        {tab === 'plan' && <Plan />}
        {tab === 'runs' && <Runs />}
        {tab === 'food' && <Nutrition profile={profile} setProfile={setProfile} />}
        {tab === 'progress' && <Progress />}
        {tab === 'sources' && <Sources />}
        <p className="pt-2 text-center text-xs text-muted">ข้อมูลเพื่อการศึกษา ไม่ใช่คำแนะนำทางการแพทย์</p>
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-lg border-t border-line bg-card/95 px-2 pb-[calc(var(--sab)+0.25rem)] pt-1.5 backdrop-blur sm:bottom-4 sm:rounded-3xl sm:border sm:shadow-lg">
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

function UserMenu({ session, onSources }: { session: Session | null; onSources: () => void }) {
  const status = useSyncExternalStore(subscribeSyncStatus, getSyncStatus)
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [programOpen, setProgramOpen] = useState(false)
  const [errorsOpen, setErrorsOpen] = useState(false)
  const [errors] = usePersisted<ErrorEntry[]>('errorLog', [])
  const errorCount = errors.length
  useBackClose(() => setOpen(false), open)
  const [theme, setTheme] = useTheme()
  const [reminder, setReminder] = useReminderSetting()
  const meta = session?.user.user_metadata as { full_name?: string; avatar_url?: string } | undefined
  const name = meta?.full_name ?? session?.user.email ?? 'ไม่ได้ล็อกอิน'

  const logout = async () => {
    setBusy(true)
    await syncPhotos().catch(() => {})
    const unsent = ((readStored('photos') as Photo[] | undefined) ?? []).filter(isLocalPhoto).length
    if (unsent && !(await ask(`มีรูป ${unsent} รูปที่ยังไม่ได้อัปโหลด (อาจออฟไลน์อยู่) ถ้าออกจากระบบตอนนี้ รูปเหล่านั้นจะหาย`, { title: 'ออกจากระบบ?', ok: 'ออกต่อ', danger: true }))) return setBusy(false)
    let ok = await stopSync()
    if (!ok) ok = (await ask('ยังมีข้อมูลที่ส่งขึ้น server ไม่ได้ (อาจออฟไลน์อยู่) ถ้าออกจากระบบตอนนี้ ข้อมูลส่วนนั้นจะหาย', { title: 'ออกจากระบบ?', ok: 'ออกต่อ', danger: true })) && (await stopSync(true))
    if (ok) {
      // รูปในเครื่องเป็นของบัญชีนี้ — ลบออกด้วย (ฉบับบน server ยังอยู่)
      await idb.clear('blobs').catch(() => {})
      await supabase.auth.signOut()
    }
    setBusy(false)
  }

  const download = async () => {
    setOpen(false)
    try {
      await saveBackup()
    } catch (e) {
      notify(e instanceof Error ? e.message : 'สำรองข้อมูลไม่สำเร็จ', 'bad')
    }
  }

  const restore = async (file: File) => {
    try {
      const json = JSON.parse(await file.text())
      if (!(await ask('ข้อมูลปัจจุบันจะถูกแทนที่ด้วยข้อมูลในไฟล์สำรอง', { title: 'กู้คืนข้อมูล?', ok: 'กู้คืน', danger: true }))) return
      await restoreBackup(json)
      setOpen(false)
      notify('กู้คืนข้อมูลเรียบร้อย', 'good')
    } catch (e) {
      notify(e instanceof Error ? e.message : 'อ่านไฟล์ไม่ได้', 'bad')
    }
  }

  const StatusIcon = !session ? Smartphone : status === 'offline' ? CloudOff : status === 'saving' ? RefreshCw : Cloud
  const statusText = !session ? 'เก็บในเครื่องนี้ (ไม่ซิงก์)' : status === 'offline' ? 'ยังไม่ได้ซิงก์ (ออฟไลน์)' : status === 'saving' ? 'กำลังบันทึก…' : 'ซิงก์แล้ว'
  const statusColor = !session ? 'text-muted' : status === 'offline' ? 'text-warn' : status === 'saving' ? 'text-muted' : 'text-good'

  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} aria-label="เมนูบัญชี" className="relative">
        {meta?.avatar_url
          ? <img src={meta.avatar_url} alt="" className="size-9 rounded-full ring-2 ring-line" referrerPolicy="no-referrer" />
          : session
            ? <span className="grid size-9 place-items-center rounded-full bg-raised font-bold uppercase ring-2 ring-line">{name.charAt(0)}</span>
            : <span className="grid size-9 place-items-center rounded-full bg-raised text-muted ring-2 ring-line"><Smartphone size={17} /></span>}
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
            {isNative && (
              <div className="mx-1 mb-1 flex items-center gap-2 rounded-xl px-2 py-1.5">
                <Bell size={16} className="shrink-0" />
                <span className="flex-1 text-sm">เตือนการฝึกทุกวัน</span>
                <input type="time" value={reminder.time} disabled={!reminder.on} onChange={e => setReminder({ ...reminder, time: e.target.value })}
                  className="bare w-20 rounded-lg bg-raised px-1.5 py-1 text-sm disabled:opacity-40" />
                <button role="switch" aria-checked={reminder.on} aria-label="เปิด/ปิดเตือนรายวัน" onClick={() => setReminder({ ...reminder, on: !reminder.on })}
                  className={cx('relative h-6 w-10 shrink-0 rounded-full transition-colors', reminder.on ? 'bg-good' : 'bg-body')}>
                  <span className={cx('absolute top-0.5 size-5 rounded-full bg-white shadow transition-all', reminder.on ? 'left-[18px]' : 'left-0.5')} />
                </button>
              </div>
            )}
            <div className="my-1 h-px bg-line" />
            <button onClick={() => { setOpen(false); onSources() }} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left hover:bg-raised">
              <BookOpen size={16} /> แหล่งข้อมูลและช่อง YouTube
            </button>
            <button onClick={() => { setOpen(false); setErrorsOpen(true) }} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left hover:bg-raised">
              <Bug size={16} /> ปัญหาที่พบ{errorCount ? ` (${errorCount})` : ''}
            </button>
            <button onClick={download} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left hover:bg-raised">
              <Download size={16} /> สำรองข้อมูล (ไฟล์ JSON)
            </button>
            <label className="flex w-full cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-left hover:bg-raised">
              <Upload size={16} /> กู้คืนจากไฟล์สำรอง
              <input type="file" accept="application/json,.json" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) void restore(f); e.target.value = '' }} />
            </label>
            {session ? (
              <button onClick={logout} disabled={busy} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-bad hover:bg-raised">
                <LogOut size={16} /> ออกจากระบบ
              </button>
            ) : (
              <button onClick={() => setLocalMode(false)} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-run hover:bg-raised">
                <LogIn size={16} /> ล็อกอินเพื่อซิงก์และสำรองข้อมูล
              </button>
            )}
            <div className="px-3 pb-1 pt-2 text-[11px] text-muted">Kao v{APP_VERSION}</div>
          </div>
        </>
      )}
      {programOpen && <ProgramSheet onClose={() => setProgramOpen(false)} />}
      {errorsOpen && <ErrorLogSheet onClose={() => setErrorsOpen(false)} />}
    </div>
  )
}

/** โหมดไม่ล็อกอินไม่มีสำเนาบน server — เตือนให้สำรองทุก 14 วันเมื่อมีข้อมูลแล้ว */
function BackupReminder() {
  const [runs] = useRuns()
  const [sessions] = useSessions()
  const [, force] = useState(0)
  const last = lastBackup()
  const days = last ? daysBetween(last, today()) : null
  if (!runs.length && !sessions.length) return null
  if (days !== null && days < 14) return null
  const save = async () => {
    try {
      await saveBackup()
      force(n => n + 1)
      notify('สำรองข้อมูลแล้ว', 'good')
    } catch (e) {
      notify(e instanceof Error ? e.message : 'สำรองข้อมูลไม่สำเร็จ', 'bad')
    }
  }
  return (
    <div className="mx-4 mb-2 flex animate-fade-up items-center gap-2 rounded-2xl bg-warn/10 px-3.5 py-2.5 text-sm text-warn ring-1 ring-warn/30">
      <Smartphone size={16} className="shrink-0" />
      <span className="flex-1">{days === null ? 'ยังไม่เคยสำรองข้อมูล' : `สำรองข้อมูลล่าสุด ${days} วันก่อน`} — ข้อมูลอยู่ในเครื่องนี้อย่างเดียว</span>
      <button onClick={save} className="shrink-0 text-xs font-semibold">สำรองเลย</button>
    </div>
  )
}
