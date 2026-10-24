import { useCallback, useEffect, useRef, useState } from 'react'
import { BackgroundGeolocation, isNative } from './native'

export type Point = [lat: number, lon: number]

const R = 6371e3
export function haversine([lat1, lon1]: Point, [lat2, lon2]: Point) {
  const rad = Math.PI / 180
  const dLat = (lat2 - lat1) * rad
  const dLon = (lon2 - lon1) * rad
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}

// Kalman filter แบบง่ายสำหรับ lat/lon: ใช้ accuracy ของ GPS เป็น noise ของการวัด
// ช่วยลดเส้นทางหยัก ๆ และระยะที่งอกจาก GPS สั่น (แนวเดียวกับที่แอปวิ่งทั่วไปใช้)
class Kalman {
  private variance = -1
  private lat = 0
  private lon = 0
  private t = 0
  private q = 3 // m/s ที่ยอมให้ตำแหน่งจริงเปลี่ยน

  process(lat: number, lon: number, acc: number, t: number): Point {
    acc = Math.max(acc, 1)
    if (this.variance < 0) {
      Object.assign(this, { lat, lon, t, variance: acc * acc })
    } else {
      const dt = (t - this.t) / 1000
      if (dt > 0) this.variance += dt * this.q * this.q
      this.t = t
      const k = this.variance / (this.variance + acc * acc)
      this.lat += k * (lat - this.lat)
      this.lon += k * (lon - this.lon)
      this.variance *= 1 - k
    }
    return [this.lat, this.lon]
  }
  reset() { this.variance = -1 }
}

const MAX_ACCURACY_M = 30 // ทิ้งจุดที่ GPS ไม่แม่น
export const GOOD_ACCURACY_M = 15
const MIN_STEP_M = 3 // กันระยะงอกตอนยืนนิ่ง
const MAX_SPEED_MS = 10 // ~36 กม./ชม. เกินนี้ถือว่าจุดกระโดด
const MOVING_SPEED_MS = 0.8 // ช้ากว่านี้ถือว่าหยุด
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
  splits: number[] // วินาทีต่อกม.
  lastMoveAt: number
  gapSeconds?: number // เวลารวมที่จอปิด/สลับแอประหว่างวิ่ง (GPS ไม่ได้บันทึก)
}

const empty = (): Live => ({ status: 'idle', startedAt: 0, activeMs: 0, segStart: null, meters: 0, route: [], splits: [], lastMoveAt: 0 })

function loadSaved(): Live {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return empty()
    const s = JSON.parse(raw) as Live
    // หน้าถูกปิดกลางทาง: กู้กลับมาเป็น "พัก" โดยนับเวลาถึงจุดสุดท้ายที่ขยับ
    if (s.segStart !== null) s.activeMs += Math.max(0, s.lastMoveAt - s.segStart)
    return { ...s, status: 'paused', segStart: null }
  } catch {
    return empty()
  }
}

export const movingMs = (l: Live, now = Date.now()) => l.activeMs + (l.segStart !== null ? now - l.segStart : 0)

export type FinishedRun = { km: number; seconds: number; elapsedSeconds: number; route: Point[]; splits: number[]; gapSeconds?: number }

export function useRunTracker() {
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
  const kalman = useRef(new Kalman())
  const last = useRef<{ p: Point; t: number } | null>(null)
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
    }, 1000)
    return () => clearInterval(id)
  }, [live.status, autoPause, update])

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

  type Fix = { coords: { latitude: number; longitude: number; accuracy: number }; timestamp: number }
  const onPosition = useCallback((pos: Fix) => {
    const acc = pos.coords.accuracy
    setAccuracy(acc)
    setError(null)
    const t = pos.timestamp
    const raw: Point = [pos.coords.latitude, pos.coords.longitude]
    if (acc > MAX_ACCURACY_M) {
      setPosition(prev => prev ?? raw)
      return
    }
    const p = kalman.current.process(raw[0], raw[1], acc, t)
    setPosition(p)

    const l = liveRef.current
    if (l.status !== 'running' && l.status !== 'autopaused') return

    const prev = last.current
    if (!prev) {
      last.current = { p, t }
      update(x => ({ ...x, route: [...x.route, p], lastMoveAt: Date.now() }))
      return
    }
    const d = haversine(prev.p, p)
    const dt = (t - prev.t) / 1000
    if (d < MIN_STEP_M) return
    if (dt > 0 && d / dt > MAX_SPEED_MS) return
    last.current = { p, t }
    const moving = dt <= 0 || d / dt >= MOVING_SPEED_MS

    update(x => {
      const n = Date.now()
      let next: Live = { ...x, meters: x.meters + d, route: [...x.route, p] }
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
    const win = [...recent.current.filter(r => t - r.t < PACE_WINDOW_MS), { t, m: liveRef.current.meters }]
    recent.current = win
    const dm = win.at(-1)!.m - win[0].m
    // เพซปัจจุบัน (วินาที/กม.) จาก 30 วินาทีล่าสุด
    setCurrentPace(win.length > 1 && dm > 20 ? (win.at(-1)!.t - win[0].t) / 1000 / (dm / 1000) : null)
  }, [update])

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
              if (confirm('แอปต้องใช้ตำแหน่งเพื่อบันทึกการวิ่ง เปิดการตั้งค่าเลยไหม?')) void BackgroundGeolocation.openSettings()
            }
            return
          }
          if (loc) onPosition({ coords: { latitude: loc.latitude, longitude: loc.longitude, accuracy: loc.accuracy }, timestamp: loc.time ?? Date.now() })
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

  const resetSegment = () => {
    last.current = null
    kalman.current.reset()
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
      const l = liveRef.current
      const n = Date.now()
      const result = {
        km: +(l.meters / 1000).toFixed(2),
        seconds: Math.round(movingMs(l, n) / 1000),
        elapsedSeconds: Math.round((n - l.startedAt) / 1000),
        route: l.route,
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
