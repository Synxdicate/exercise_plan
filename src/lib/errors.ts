import { supabase } from './supabase'
import { readStored, setStored } from './storage'
import { isNative } from './native'
import { APP_VERSION } from './update'

// รายงาน error (แทน Sentry): เก็บ 30 รายการล่าสุดในเครื่อง (key 'errorLog', ไม่ซิงก์)
// ถ้าล็อกอินอยู่ ส่งขึ้นตาราง public.app_errors (RLS: เห็น/เขียนได้เฉพาะของตัวเอง) — ดูรายการได้ที่เมนูบัญชี
export type ErrorEntry = { at: string; message: string; stack?: string; context?: string; version: string; platform: string; sent?: boolean }

const KEY = 'errorLog'
const MAX = 30
let lastMessage = ''

export const errorLog = () => (readStored(KEY) as ErrorEntry[] | undefined) ?? []

export function captureError(err: unknown, context?: string) {
  const e = err instanceof Error ? err : new Error(typeof err === 'string' ? err : JSON.stringify(err))
  const message = (e.message || String(err)).slice(0, 500)
  // กันวนซ้ำ (error เดิมรัว ๆ ใน render loop) และ error ที่ไม่ใช่ของแอป
  if (message === lastMessage || /ResizeObserver loop|Script error\.?$/.test(message)) return
  lastMessage = message
  const entry: ErrorEntry = {
    at: new Date().toISOString(), message, stack: e.stack?.slice(0, 4000), context: context?.slice(0, 500),
    version: APP_VERSION, platform: isNative ? 'android' : 'web',
  }
  setStored(KEY, [...errorLog(), entry].slice(-MAX))
  void sendErrors()
}

let sending = false
/** ส่งรายการที่ยังไม่ส่ง (เรียกตอนเกิด error และหลังซิงก์) */
export async function sendErrors() {
  if (sending) return
  const pending = errorLog().filter(e => !e.sent)
  if (!pending.length) return
  sending = true
  try {
    const { data } = await supabase.auth.getSession()
    if (!data.session) return
    const { error } = await supabase.from('app_errors').insert(pending.map(({ sent: _sent, ...e }) => e))
    if (!error) setStored(KEY, errorLog().map(e => (pending.some(p => p.at === e.at) ? { ...e, sent: true } : e)))
  } catch {
    /* ออฟไลน์ — รอบหน้า */
  } finally {
    sending = false
  }
}

export function installErrorHandlers() {
  window.addEventListener('error', e => captureError(e.error ?? e.message, 'window.onerror'))
  window.addEventListener('unhandledrejection', e => captureError(e.reason, 'unhandledrejection'))
}
