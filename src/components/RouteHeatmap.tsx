import { useEffect } from 'react'
import { MapContainer, Polyline, TileLayer, useMap } from 'react-leaflet'
import { latLngBounds } from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { Point } from '../lib/geo'

// แผนที่รวมทุกการวิ่ง (heatmap แบบเส้น): เส้นโปร่งแสงซ้อนกัน — ทางที่วิ่งบ่อยจะเข้มขึ้นเอง
// โหลดแบบ lazy เหมือน RunMap (Leaflet แยก chunk)
function Fit({ routes }: { routes: Point[][] }) {
  const map = useMap()
  useEffect(() => {
    const pts = routes.flat()
    if (pts.length > 1) map.fitBounds(latLngBounds(pts), { padding: [16, 16] })
  }, [map, routes])
  return null
}

export default function RouteHeatmap({ routes, className = 'h-72' }: { routes: Point[][]; className?: string }) {
  const color = getComputedStyle(document.documentElement).getPropertyValue('--c-accent').trim() || '#e11d48'
  return (
    <MapContainer center={routes[0]?.[0] ?? [13.7563, 100.5018]} zoom={14} zoomControl={false} preferCanvas
      attributionControl className={`w-full overflow-hidden rounded-2xl ${className}`}>
      <TileLayer url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" maxZoom={19}
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' />
      {routes.map((r, i) => (
        <Polyline key={i} positions={r} pathOptions={{ color, weight: 4, opacity: 0.28, lineCap: 'round', lineJoin: 'round' }} />
      ))}
      <Fit routes={routes} />
    </MapContainer>
  )
}
