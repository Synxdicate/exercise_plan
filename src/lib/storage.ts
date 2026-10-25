import { useCallback, useSyncExternalStore } from 'react'
import { notify } from './dialog'
import * as idb from './idb'

// เก็บค่าใน memory + ที่เก็บถาวร และแจ้งทุก component ที่ใช้ key เดียวกัน
// ที่เก็บถาวร: IndexedDB (จุได้มาก) — ถ้าใช้ไม่ได้ (private mode/ชุดทดสอบ) ถอยไปใช้ localStorage
// ต้องเรียก initStorage() ให้เสร็จก่อน import ส่วนอื่นของแอป (ดู main.tsx) เพราะการอ่านเป็นแบบ sync จาก cache
const cache = new Map<string, unknown>()
const listeners = new Map<string, Set<() => void>>()
const writeHooks = new Set<(key: string, value: unknown) => void>()
let backend: 'local' | 'idb' = 'local'

// key ที่ไม่ใช่ข้อมูลของ usePersisted (ใช้ localStorage ตรง ๆ หรือเป็นของ Supabase) — ไม่ย้าย
const LOCAL_ONLY = /^(sb-|activeRun$|activeGuide$|heatCache$|localMode$|lastBackup$)/
// ค่าที่ index.html อ่านก่อน React โหลด — เก็บใน localStorage คู่กันเสมอ
const MIRROR = new Set(['theme'])

export async function initStorage() {
  try {
    const all = await idb.getAll('kv')
    // ย้ายข้อมูลที่ยังค้างใน localStorage (ข้อมูลจากเวอร์ชันก่อน หรือช่วงที่ IndexedDB ใช้ไม่ได้)
    // ค่าใน IndexedDB ใหม่กว่าเสมอ จึงย้ายเฉพาะ key ที่ยังไม่มี แล้วลบออกจาก localStorage
    const moved: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)!
      if (LOCAL_ONLY.test(k)) continue
      if (!all.has(k)) {
        try { all.set(k, JSON.parse(localStorage.getItem(k)!)) } catch { continue /* ไม่ใช่ JSON */ }
        await idb.put('kv', k, all.get(k))
      }
      moved.push(k)
    }
    for (const k of moved) if (!MIRROR.has(k)) localStorage.removeItem(k)
    all.forEach((v, k) => cache.set(k, v))
    backend = 'idb'
  } catch {
    backend = 'local'
  }
}

function read<T>(key: string, initial: T): T {
  if (cache.has(key)) return cache.get(key) as T
  let value = initial
  if (backend === 'local') {
    try {
      const raw = localStorage.getItem(key)
      if (raw) value = JSON.parse(raw) as T
    } catch {
      /* ignore */
    }
  }
  cache.set(key, value)
  return value
}

let warnedFull = false
const warnFull = () => {
  if (warnedFull) return
  warnedFull = true
  notify('พื้นที่เก็บข้อมูลในเครื่องเต็ม — ต่อเน็ตเพื่อให้ข้อมูลซิงก์ขึ้นระบบ และสำรองข้อมูลจากเมนูบัญชี', 'bad')
}

function persist(key: string, value: unknown) {
  if (backend === 'idb') {
    // transaction แบบเขียนบน store เดียวกันทำงานตามลำดับที่สร้าง จึงไม่ต้องกลัวค่าเก่าทับค่าใหม่
    idb.put('kv', key, value).catch(e => { if (/quota/i.test(String((e as Error)?.name))) warnFull() })
    if (!MIRROR.has(key)) return
  }
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (e) {
    // พื้นที่เต็ม: ข้อมูลยังอยู่ในหน่วยความจำและซิงก์ขึ้น server ได้ แต่ปิดแอปตอนออฟไลน์จะหาย — ต้องบอกผู้ใช้
    if (e instanceof DOMException && /quota/i.test(e.name)) warnFull()
  }
}

function store(key: string, value: unknown) {
  cache.set(key, value)
  persist(key, value)
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
  if (backend === 'idb') return undefined
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : undefined
  } catch {
    return undefined
  }
}

// ใส่ค่าที่ดึงมาจาก server โดยไม่ยิงกลับขึ้นไปซ้ำ
export const hydrate = store

// เขียนค่าจากนอก React (เหมือนผู้ใช้แก้ — ส่งขึ้น server ด้วย)
export const setStored = write

export function clearKeys(keys: string[]) {
  for (const key of keys) {
    cache.delete(key)
    if (backend === 'idb') idb.del('kv', key).catch(() => {})
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
