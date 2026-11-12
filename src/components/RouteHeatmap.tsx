import { useEffect, useMemo, useRef } from 'react'
import { MapContainer, Polyline, useMap } from 'react-leaflet'
import { MapTiles } from './MapTiles'
import { latLngBounds } from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { thinRoute, type Point } from '../lib/geo'

// แผนที่รวมทุกการวิ่ง (heatmap แบบเส้น): เส้นโปร่งแสงซ้อนกัน ทางที่วิ่งบ่อยจะเข้มขึ้นเอง
// โหลดแบบ lazy เหมือน RunMap (Leaflet แยก chunk)
// ครั้งแรกเปิดที่ขอบเขตพอดีเลย (MapContainer bounds) ไม่ต้องวาดที่ซูม 14 ก่อนแล้วคำนวณทุกเส้นใหม่อีกรอบ
// Fit ใช้เฉพาะตอนเส้นทางเปลี่ยนภายหลัง
const boundsOf = (routes: Point[][]) => {
  const pts = routes.flat()
  return pts.length > 1 ? latLngBounds(pts) : null
}
function Fit({ routes }: { routes: Point[][] }) {
  const map = useMap()
  const first = useRef(true)
  useEffect(() => {
    if (first.current) { first.current = false; return }
    const b = boundsOf(routes)
    if (b) map.fitBounds(b, { padding: [16, 16] })
  }, [map, routes])
  return null
}

export default function RouteHeatmap({ routes: full, className = 'h-72' }: { routes: Point[][]; className?: string }) {
  const routes = useMemo(() => full.map(r => thinRoute(r)), [full])
  const bounds = useMemo(() => boundsOf(routes), [routes])
  const color = getComputedStyle(document.documentElement).getPropertyValue('--c-accent').trim() || '#e11d48'
  return (
    <MapContainer {...(bounds ? { bounds, boundsOptions: { padding: [16, 16] as [number, number] } } : { center: routes[0]?.[0] ?? [13.7563, 100.5018], zoom: 14 })} zoomControl={false} preferCanvas
      attributionControl className={`w-full overflow-hidden rounded-2xl ${className}`}>
      <MapTiles />
      {routes.map((r, i) => (
        <Polyline key={i} positions={r} pathOptions={{ color, weight: 4, opacity: 0.28, lineCap: 'round', lineJoin: 'round' }} />
      ))}
      <Fit routes={routes} />
    </MapContainer>
  )
}
