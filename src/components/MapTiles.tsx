import { TileLayer } from 'react-leaflet'

// แผนที่พื้นหลัง OpenStreetMap มาตรฐาน: ฟรี ไม่ต้องใช้คีย์ (ใช้ปริมาณน้อยตามนโยบาย tile.openstreetmap.org ต้องแสดงเครดิต)
// ธีมมืดกลับสีภาพด้วย CSS (.leaflet-tile-pane ใน index.css)
// เคยใช้ CARTO ใน v2.64–v2.68 แต่ CARTO เริ่มบังคับคีย์ (ได้ภาพ "KEY REQUIRED" แทนแผนที่) และแบบมืดของมันโดน filter กลับสีซ้ำจนสว่าง
const URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
const ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'

export function MapTiles() {
  return <TileLayer url={URL} maxZoom={19} attribution={ATTRIBUTION} />
}
