import { useEffect } from 'react'
import { CircleMarker, MapContainer, Polyline, TileLayer, useMap } from 'react-leaflet'
import { latLngBounds, type Polyline as LPolyline } from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { Point } from '../lib/gps'

type Props = {
  route: Point[]
  position?: Point | null
  follow?: boolean // live: เลื่อนแผนที่ตามตำแหน่ง / history: ซูมให้เห็นทั้งเส้น
  className?: string
  interactive?: boolean
}

const BANGKOK: Point = [13.7563, 100.5018]

function Camera({ route, position, follow }: Pick<Props, 'route' | 'position' | 'follow'>) {
  const map = useMap()
  useEffect(() => {
    if (follow && position) map.setView(position, Math.max(map.getZoom(), 16), { animate: true })
  }, [map, follow, position])
  useEffect(() => {
    if (!follow && route.length > 1) map.fitBounds(latLngBounds(route), { padding: [24, 24], animate: false })
  }, [map, follow, route])
  return null
}

export default function RunMap({ route, position, follow = false, className = 'h-64', interactive = true }: Props) {
  const center = position ?? route.at(-1) ?? BANGKOK
  const style = getComputedStyle(document.documentElement)
  const accent = style.getPropertyValue('--c-accent').trim() || '#e11d48'
  const run = style.getPropertyValue('--c-run').trim() || '#2563eb'

  // ไม่ใช้แอนิเมชันซูม: ปิดแผนที่ระหว่างซูม Leaflet ยังเรียก _onZoomTransitionEnd หลังถูกถอดแล้ว error (_leaflet_pos)
  // (เรียก map.stop() ตอนถอดก็ไม่ได้ — ตอนนั้นแผนที่ถูกลบไปแล้ว พังเหมือนกัน)
  return (
    <MapContainer center={center} zoom={position || route.length ? 16 : 11} zoomControl={false} zoomAnimation={false} markerZoomAnimation={false}
      dragging={interactive} scrollWheelZoom={interactive} touchZoom={interactive} doubleClickZoom={interactive}
      attributionControl className={`w-full overflow-hidden rounded-2xl ${className}`}>
      <TileLayer url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" maxZoom={19}
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' />
      {/* การวิ่งที่จบแล้ว: เส้นทางค่อย ๆ ลากจากจุดเริ่มถึงจุดจบ (pathLength=1 ให้ dash ใช้สัดส่วนของเส้น) */}
      {route.length > 1 && <Polyline positions={route} pathOptions={{ color: accent, weight: 5, opacity: 0.9, lineCap: 'round', lineJoin: 'round', className: position ? undefined : 'route-draw' }}
        eventHandlers={{ add: e => (e.target as LPolyline).getElement()?.setAttribute('pathLength', '1') }} />}
      {route.length > 0 && !position && <CircleMarker center={route[0]} radius={6} pathOptions={{ color: '#fff', weight: 2, fillColor: '#10b981', fillOpacity: 1 }} />}
      {route.length > 1 && !position && <CircleMarker center={route.at(-1)!} radius={6} pathOptions={{ color: '#fff', weight: 2, fillColor: accent, fillOpacity: 1 }} />}
      {position && <CircleMarker center={position} radius={8} pathOptions={{ color: '#fff', weight: 3, fillColor: run, fillOpacity: 1 }} />}
      <Camera route={route} position={position} follow={follow} />
    </MapContainer>
  )
}
