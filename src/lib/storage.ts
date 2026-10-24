import { useCallback, useSyncExternalStore } from 'react'

// เก็บค่าใน memory + localStorage และแจ้งทุก component ที่ใช้ key เดียวกัน
// localStorage อาจใช้ไม่ได้ (private mode) — แอปต้องทำงานต่อได้เสมอ
const cache = new Map<string, unknown>()
const listeners = new Map<string, Set<() => void>>()

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

function write<T>(key: string, value: T) {
  cache.set(key, value)
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* ignore */
  }
  listeners.get(key)?.forEach(l => l())
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
