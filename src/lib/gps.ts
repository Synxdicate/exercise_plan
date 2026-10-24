import { useEffect, useRef, useState } from 'react'

export type Point = [lat: number, lon: number]

const R = 6371e3
export function haversine([lat1, lon1]: Point, [lat2, lon2]: Point) {
  const rad = Math.PI / 180
  const dLat = (lat2 - lat1) * rad
  const dLon = (lon2 - lon1) * rad
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}

const MAX_ACCURACY_M = 25 // ทิ้งจุดที่ GPS ไม่แม่น
const MIN_STEP_M = 4 // กันระยะงอกจาก GPS สั่นตอนยืนนิ่ง
const MAX_SPEED_MS = 9 // ~32 กม./ชม. เกินนี้ถือว่าจุดกระโดด

type Status = 'idle' | 'running' | 'paused'

export function useRunTracker() {
  const [status, setStatus] = useState<Status>('idle')
  const [meters, setMeters] = useState(0)
  const [elapsed, setElapsed] = useState(0)
  const [route, setRoute] = useState<Point[]>([])
  const [accuracy, setAccuracy] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const watchId = useRef<number | null>(null)
  const last = useRef<{ p: Point; t: number } | null>(null)
  const startedAt = useRef(0)
  const banked = useRef(0)
  const wakeLock = useRef<WakeLockSentinel | null>(null)

  useEffect(() => {
    if (status !== 'running') return
    const id = setInterval(() => setElapsed(banked.current + (Date.now() - startedAt.current) / 1000), 1000)
    return () => clearInterval(id)
  }, [status])

  useEffect(() => () => stopWatching(), [])

  function stopWatching() {
    if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current)
    watchId.current = null
    wakeLock.current?.release().catch(() => {})
    wakeLock.current = null
  }

  async function startWatching() {
    if (!('geolocation' in navigator)) {
      setError('เบราว์เซอร์นี้ไม่รองรับ GPS')
      return false
    }
    setError(null)
    last.current = null
    watchId.current = navigator.geolocation.watchPosition(
      pos => {
        setAccuracy(pos.coords.accuracy)
        if (pos.coords.accuracy > MAX_ACCURACY_M) return
        const p: Point = [pos.coords.latitude, pos.coords.longitude]
        const prev = last.current
        if (!prev) {
          last.current = { p, t: pos.timestamp }
          setRoute(r => [...r, p])
          return
        }
        const d = haversine(prev.p, p)
        const dt = (pos.timestamp - prev.t) / 1000
        if (d < MIN_STEP_M || (dt > 0 && d / dt > MAX_SPEED_MS)) return
        last.current = { p, t: pos.timestamp }
        setMeters(m => m + d)
        setRoute(r => [...r, p])
      },
      err => setError(err.code === err.PERMISSION_DENIED ? 'ไม่ได้อนุญาตให้ใช้ตำแหน่ง — เปิดสิทธิ์ Location ในการตั้งค่าเบราว์เซอร์' : `GPS: ${err.message}`),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 },
    )
    try {
      wakeLock.current = await navigator.wakeLock?.request('screen')
    } catch {
      /* บางเบราว์เซอร์ไม่รองรับ */
    }
    return true
  }

  return {
    status, meters, elapsed, route, accuracy, error,
    async start() {
      if (!(await startWatching())) return
      startedAt.current = Date.now()
      setStatus('running')
    },
    pause() {
      banked.current += (Date.now() - startedAt.current) / 1000
      setElapsed(banked.current)
      stopWatching()
      setStatus('paused')
    },
    async resume() {
      if (!(await startWatching())) return
      startedAt.current = Date.now()
      setStatus('running')
    },
    reset() {
      stopWatching()
      banked.current = 0
      setStatus('idle')
      setMeters(0)
      setElapsed(0)
      setRoute([])
      setAccuracy(null)
    },
  }
}
