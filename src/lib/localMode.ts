import { useSyncExternalStore } from 'react'

// โหมดไม่ล็อกอิน: ข้อมูลอยู่ในเครื่องนี้อย่างเดียว (ไม่ซิงก์) — ค่าของเครื่อง เก็บใน localStorage
const KEY = 'localMode'
const listeners = new Set<() => void>()

export function isLocalMode() {
  try {
    return localStorage.getItem(KEY) === '1'
  } catch {
    return false
  }
}

export function setLocalMode(on: boolean) {
  try {
    if (on) localStorage.setItem(KEY, '1')
    else localStorage.removeItem(KEY)
  } catch {
    /* ignore */
  }
  listeners.forEach(l => l())
}

export const useLocalMode = () => useSyncExternalStore(cb => { listeners.add(cb); return () => void listeners.delete(cb) }, isLocalMode)

// ---- เตือนสำรองข้อมูล (โหมดไม่ล็อกอินไม่มีสำเนาบน server) ----
const BACKUP_KEY = 'lastBackup'
export const lastBackup = () => { try { return localStorage.getItem(BACKUP_KEY) } catch { return null } }
export const markBackedUp = (date: string) => { try { localStorage.setItem(BACKUP_KEY, date) } catch { /* ignore */ } }
