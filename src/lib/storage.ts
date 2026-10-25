import { useCallback, useSyncExternalStore } from 'react'
import { notify } from './dialog'

// เก็บค่าใน memory + localStorage และแจ้งทุก component ที่ใช้ key เดียวกัน
// localStorage อาจใช้ไม่ได้ (private mode) — แอปต้องทำงานต่อได้เสมอ
const cache = new Map<string, unknown>()
const listeners = new Map<string, Set<() => void>>()
const writeHooks = new Set<(key: string, value: unknown) => void>()

function read<T>(key: string, initial: T): T {
  if (cache.has(key)) return cache.get(key) as T
  let value = initial
  try {
    const raw = localStorage.getItem(key)
    if (raw) value = JSON.parse(raw) as T
  } catch {
    /* ignore */
  }
  cache.set(key, value)
  return value
}

let warnedFull = false

function store(key: string, value: unknown) {
  cache.set(key, value)
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (e) {
    // พื้นที่เต็ม: ข้อมูลยังอยู่ในหน่วยความจำและซิงก์ขึ้น server ได้ แต่ปิดแอปตอนออฟไลน์จะหาย — ต้องบอกผู้ใช้
    if (!warnedFull && e instanceof DOMException && /quota/i.test(e.name)) {
      warnedFull = true
      notify('พื้นที่เก็บข้อมูลในเครื่องเต็ม — ต่อเน็ตเพื่อให้ข้อมูลซิงก์ขึ้นระบบ และสำรองข้อมูลจากเมนูบัญชี', 'bad')
    }
  }
  listeners.get(key)?.forEach(l => l())
}

function write<T>(key: string, value: T) {
  store(key, value)
  writeHooks.forEach(h => h(key, value))
}

// ---- สำหรับ sync.ts ----

// ค่าที่ผู้ใช้เขียน (undefined = ยังไม่เคยมีค่า)
export function readStored(key: string): unknown {
  if (cache.has(key)) return cache.get(key)
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : undefined
  } catch {
    return undefined
  }
}

// ใส่ค่าที่ดึงมาจาก server โดยไม่ยิงกลับขึ้นไปซ้ำ
export const hydrate = store

export function clearKeys(keys: string[]) {
  for (const key of keys) {
    cache.delete(key)
    try {
      localStorage.removeItem(key)
    } catch {
      /* ignore */
    }
    listeners.get(key)?.forEach(l => l())
  }
}

export function onWrite(hook: (key: string, value: unknown) => void) {
  writeHooks.add(hook)
  return () => void writeHooks.delete(hook)
}

export function usePersisted<T>(key: string, initial: T) {
  const subscribe = useCallback((cb: () => void) => {
    if (!listeners.has(key)) listeners.set(key, new Set())
    listeners.get(key)!.add(cb)
    return () => listeners.get(key)!.delete(cb)
  }, [key])

  const value = useSyncExternalStore(subscribe, () => read(key, initial))

  const set = useCallback(
    (next: T | ((prev: T) => T)) =>
      write(key, typeof next === 'function' ? (next as (p: T) => T)(read(key, initial)) : next),
    // initial ใช้แค่ตอนยังไม่มีค่า จึงไม่ต้องอยู่ใน deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key],
  )

  return [value, set] as const
}

// cache/listeners ต้องเป็นชุดเดียวทั้งแอป — แก้ไฟล์นี้ระหว่าง dev ให้รีโหลดทั้งหน้า
if (import.meta.hot) import.meta.hot.accept(() => window.location.reload())
