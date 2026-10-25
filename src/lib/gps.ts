import { useCallback, useEffect, useRef, useState } from 'react'
import { BackgroundGeolocation, isNative } from './native'

import { haversine, roundPoint, type Point } from './geo'
import { TrackFilter } from './track'
import { ask } from './dialog'

export { haversine, type Point }

export const GOOD_ACCURACY_M = 15
const AUTOPAUSE_AFTER_MS = 8000
const PACE_WINDOW_MS = 30000
const STORAGE_KEY = 'activeRun'

export type Status = 'idle' | 'acquiring' | 'running' | 'paused' | 'autopaused'

type Live = {
  status: Status
  startedAt: number // เวลาเริ่ม (wall clock)
  activeMs: number // เวลาเคลื่อนที่สะสมของช่วงที่จบแล้ว
  segStart: number | null // เริ่มช่วงที่กำลังนับ
  meters: number
  route: Point[]
  times: number[] // เวลาเคลื่อนที่สะสม (วินาที) ของแต่ละจุดใน route — ใช้วิเคราะห์เพซ
  splits: number[] // วินาทีต่อกม.
  lastMoveAt: number
  gapSeconds?: number // เวลารวมที่จอปิด/สลับแอประหว่างวิ่ง (GPS ไม่ได้บันทึก)
}

const empty = (): Live => ({ status: 'idle', startedAt: 0, activeMs: 0, segStart: null, meters: 0, route: [], times: [], splits: [], lastMoveAt: 0 })

function loadSaved(): Live {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return empty()
    const s = JSON.parse(raw) as Live
    s.times ??= [] // การวิ่งที่ค้างไว้จากเวอร์ชันก่อน
    // หน้าถูกปิดกลางทาง: กู้กลับมาเป็น "พัก" โดยนับเวลาถึงจุดสุดท้ายที่ขยับ
    if (s.segStart !== null) s.activeMs += Math.max(0, s.lastMoveAt - s.segStart)
    return { ...s, status: 'paused', segStart: null }
  } catch {
    return empty()
  }
}

export const movingMs = (l: Live, now = Date.now()) => l.activeMs + (l.segStart !== null ? now - l.segStart : 0)

export type FinishedRun = { km: number; seconds: number; elapsedSeconds: number; route: Point[]; times: number[]; splits: number[]; gapSeconds?: number }

type Opts = {
  onSplit?: (km: number, splitSec: number, totalSec: number) => void
  /** ทุกวินาที + ทุกจุด GPS ระหว่างวิ่ง (ใช้กับเสียงนำ — callback ของ GPS ทำงานแม้ปิดจอ) */
  onTick?: (meters: number, active: boolean) => void
}

export function useRunTracker(opts: Opts = {}) {
  const onSplitRef = useRef(opts.onSplit)
  const onTickRef = useRef(opts.onTick)
  useEffect(() => { onSplitRef.current = opts.onSplit; onTickRef.current = opts.onTick })
  const [live, setLive] = useState<Live>(loadSaved)
  const [now, setNow] = useState(() => Date.now())
  const [position, setPosition] = useState<Point | null>(null)
  const [accuracy, setAccuracy] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [lastGap, setLastGap] = useState<number | null>(null)
  const hiddenAt = useRef<number | null>(null)
  const [autoPause, setAutoPause] = useState(true)
  const [currentPace, setCurrentPace] = useState<number | null>(null)

  const liveRef = useRef(live)
  const watchId = useRef<number | null>(null)
  const nativeWatch = useRef<Promise<string> | null>(null)
  // กรอง noise + นับระยะ (ดู track.ts และการจำลองใน track.test.ts)
  const track = useRef(new TrackFilter())
  const recent = useRef<{ t: number; m: number }[]>([])
  const wakeLock = useRef<WakeLockSentinel | null>(null)

  const update = useCallback((fn: (l: Live) => Live) => {
    const next = fn(liveRef.current)
    liveRef.current = next
    setLive(next)
    try {
      if (next.status === 'idle') localStorage.removeItem(STORAGE_KEY)
      else if (next.status !== 'acquiring') localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    } catch {
      /* ignore */
    }
  }, [])

  const tick = useCallback(() => {
    const l = liveRef.current
    onTickRef.current?.(l.meters, l.status === 'running' || l.status === 'autopaused')
  }, [])

  const lockScreen = useCallback(async () => {
    try {
      wakeLock.current = await navigator.wakeLock?.request('screen')
    } catch {
      /* ไม่รองรับ / แบตต่ำ */
    }
  }, [])

  // นาฬิกา + auto-pause
  useEffect(() => {
    if (live.status === 'idle') return
    const id = setInterval(() => {
      const t = Date.now()
      setNow(t)
      const l = liveRef.current
      if (autoPause && l.status === 'running' && l.segStart !== null && t - l.lastMoveAt > AUTOPAUSE_AFTER_MS) {
        update(x => ({ ...x, status: 'autopaused', activeMs: x.activeMs + Math.max(0, x.lastMoveAt - x.segStart!), segStart: null }))
      }
      tick()
    }, 1000)
    return () => clearInterval(id)
  }, [live.status, autoPause, update, tick])

  // wake lock หลุดเมื่อสลับแอป — ขอใหม่เมื่อกลับมา
  useEffect(() => {
    const onVis = () => {
      const s = liveRef.current.status
      const tracking = s === 'running' || s === 'autopaused'
      if (document.visibilityState === 'hidden') {
        if (tracking && !isNative) hiddenAt.current = Date.now()
        return
      }
      if (tracking || s === 'acquiring') void lockScreen()
      // กลับมาจากปิดจอ: เบราว์เซอร์หยุด GPS ไปช่วงนั้น — จดไว้และแจ้งผู้ใช้
      if (hiddenAt.current && tracking) {
        const gap = (Date.now() - hiddenAt.current) / 1000
        if (gap > 15) {
          setLastGap(gap)
          update(x => ({ ...x, gapSeconds: (x.gapSeconds ?? 0) + gap }))
        }
      }
      hiddenAt.current = null
    }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [lockScreen, update])

  type Fix = { coords: { latitude: number; longitude: number; accuracy: number; speed?: number | null }; timestamp: number }

  // เพิ่มระยะ d เมตร + จุดบนเส้นทาง แล้วคำนวณเพซรายกิโล/เพซปัจจุบัน
  const addDistance = useCallback((d: number, p: Point, t: number, moving: boolean) => {
    const splitsBefore = liveRef.current.splits.length
    update(x => {
      const n = Date.now()
      let next: Live = { ...x, meters: x.meters + d, route: [...x.route, roundPoint(p)], times: [...x.times, Math.round(movingMs(x, n) / 1000)] }
      if (moving) {
        next.lastMoveAt = n
        if (x.status === 'autopaused') next = { ...next, status: 'running', segStart: n }
      }
      // เพซรายกิโล
      const moved = movingMs(next, n) / 1000
      while (next.meters >= (next.splits.length + 1) * 1000) {
        const done = next.splits.reduce((s, v) => s + v, 0)
        next = { ...next, splits: [...next.splits, Math.round(moved - done)] }
      }
      return next
    })
    // ครบกิโลใหม่ → แจ้ง (เสียงบอกเพซ) — เรียกจาก callback ของ GPS โดยตรง จึงทำงานแม้จอดับ
    const after = liveRef.current.splits
    for (let k = splitsBefore; k < after.length; k++) {
      onSplitRef.current?.(k + 1, after[k], after.slice(0, k + 1).reduce((s, v) => s + v, 0))
    }
    const win = [...recent.current.filter(r => t - r.t < PACE_WINDOW_MS), { t, m: liveRef.current.meters }]
    recent.current = win
    const dm = win.at(-1)!.m - win[0].m
    // เพซปัจจุบัน (วินาที/กม.) จาก 30 วินาทีล่าสุด
    setCurrentPace(win.length > 1 && dm > 20 ? (win.at(-1)!.t - win[0].t) / 1000 / (dm / 1000) : null)
  }, [update])

  const onPosition = useCallback((pos: Fix) => {
    const acc = pos.coords.accuracy
    setAccuracy(acc)
    setError(null)
    const t = pos.timestamp
    const raw: Point = [pos.coords.latitude, pos.coords.longitude]
    const r = track.current.process({ lat: raw[0], lon: raw[1], acc, t, speed: pos.coords.speed ?? null })
    if (r.p) setPosition(r.p)
    else setPosition(prev => prev ?? raw)

    const l = liveRef.current
    if (l.status !== 'running' && l.status !== 'autopaused') return
    if (r.kind === 'ignored') return
    if (r.kind === 'start') {
      update(x => ({ ...x, route: [...x.route, roundPoint(r.p)], times: [...x.times, Math.round(movingMs(x) / 1000)], lastMoveAt: Date.now() }))
      return
    }
    if (r.kind === 'hold') {
      // ยังไม่ถึงจุดยึดถัดไป แต่กำลังเคลื่อนที่ → นับว่าขยับ (ไม่ให้หยุดอัตโนมัติ / กลับมาจากหยุดอัตโนมัติ)
      if (r.moving) {
        const n = Date.now()
        update(x => (x.status === 'autopaused' ? { ...x, status: 'running', segStart: n, lastMoveAt: n } : { ...x, lastMoveAt: n }))
      }
      return
    }
    addDistance(r.d, r.p, t, true)
    tick()
  }, [update, addDistance, tick])

  const stopWatching = useCallback(() => {
    if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current)
    watchId.current = null
    nativeWatch.current?.then(id => BackgroundGeolocation.removeWatcher({ id })).catch(() => {})
    nativeWatch.current = null
    wakeLock.current?.release().catch(() => {})
    wakeLock.current = null
  }, [])

  const startWatching = useCallback(() => {
    if (isNative) {
      // แอป Android: ใช้ GPS เบื้องหลัง ปิดจอแล้วยังบันทึกต่อ
      if (nativeWatch.current) return true
      nativeWatch.current = BackgroundGeolocation.addWatcher(
        { backgroundTitle: 'Exercise-Plan กำลังบันทึกการวิ่ง', backgroundMessage: 'แตะเพื่อกลับเข้าแอป', requestPermissions: true, stale: false, distanceFilter: 0 },
        (loc, err) => {
          if (err) {
            if (err.code === 'NOT_AUTHORIZED') {
              setError('ไม่ได้อนุญาตให้ใช้ตำแหน่ง — แตะเพื่อเปิดการตั้งค่า แล้วเลือก "อนุญาตตลอดเวลา"')
              void ask('แอปต้องใช้ตำแหน่งเพื่อบันทึกการวิ่ง เลือก "อนุญาตตลอดเวลา" ในการตั้งค่า', { title: 'ต้องการสิทธิ์ตำแหน่ง', ok: 'เปิดการตั้งค่า' }).then(ok => { if (ok) void BackgroundGeolocation.openSettings() })
            }
            return
          }
          if (loc) onPosition({ coords: { latitude: loc.latitude, longitude: loc.longitude, accuracy: loc.accuracy, speed: loc.speed }, timestamp: loc.time ?? Date.now() })
        },
      )
      return true
    }
    if (!('geolocation' in navigator)) {
      setError('เบราว์เซอร์นี้ไม่รองรับ GPS')
      return false
    }
    if (watchId.current !== null) return true
    watchId.current = navigator.geolocation.watchPosition(
      onPosition,
      err => setError(err.code === err.PERMISSION_DENIED ? 'ไม่ได้อนุญาตให้ใช้ตำแหน่ง — เปิดสิทธิ์ Location ให้เว็บนี้ในการตั้งค่าเบราว์เซอร์' : 'กำลังรอสัญญาณ GPS…'),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 },
    )
    void lockScreen()
    return true
  }, [lockScreen, onPosition])

  useEffect(() => stopWatching, [stopWatching])

  // เก็บเศษระยะที่ยังไม่ถึงจุดยึดถัดไป ก่อนพัก/จบ
  const flushTail = () => {
    const d = track.current.flush()
    const p = liveRef.current.route.at(-1)
    if (d > 1 && p) addDistance(d, p, Date.now(), false)
  }

  const resetSegment = () => {
    track.current.reset()
    recent.current = []
    setCurrentPace(null)
  }

  const elapsed = movingMs(live, now) / 1000

  return {
    ...live,
    elapsed,
    currentPace: live.status === 'running' ? currentPace : null,
    lastGap,
    dismissGap: () => setLastGap(null),
    position,
    accuracy,
    error,
    autoPause,
    setAutoPause,
    /** เปิด GPS รอสัญญาณ (ยังไม่เริ่มจับเวลา) */
    acquire() {
      if (startWatching()) update(x => ({ ...x, status: 'acquiring' }))
    },
    begin() {
      if (!startWatching()) return
      resetSegment()
      const n = Date.now()
      update(x => ({ ...x, status: 'running', startedAt: n, segStart: n, lastMoveAt: n }))
    },
    pause() {
      flushTail()
      const n = Date.now()
      update(x => ({ ...x, status: 'paused', activeMs: movingMs(x, n), segStart: null }))
    },
    resume() {
      if (!startWatching()) return
      resetSegment()
      const n = Date.now()
      update(x => ({ ...x, status: 'running', segStart: n, lastMoveAt: n }))
    },
    finish(): FinishedRun {
      if (liveRef.current.status === 'running' || liveRef.current.status === 'autopaused') flushTail()
      const l = liveRef.current
      const n = Date.now()
      const result = {
        km: +(l.meters / 1000).toFixed(2),
        seconds: Math.round(movingMs(l, n) / 1000),
        elapsedSeconds: Math.round((n - l.startedAt) / 1000),
        route: l.route,
        times: l.times,
        splits: l.splits,
        gapSeconds: l.gapSeconds ? Math.round(l.gapSeconds) : undefined,
      }
      stopWatching()
      resetSegment()
      update(() => empty())
      return result
    },
    discard() {
      stopWatching()
      resetSegment()
      update(() => empty())
    },
  }
}
