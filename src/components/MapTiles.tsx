import { TileLayer } from 'react-leaflet'
import { useIsDark } from '../lib/theme'

// แผนที่พื้นหลัง CARTO (ข้อมูล OpenStreetMap) สีเรียบกว่า OSM มาตรฐาน เส้นทางวิ่งเด่นขึ้น และมีแบบมืดตามธีม
// ฟรี ไม่ต้องใช้คีย์ สำหรับการใช้งานไม่เชิงพาณิชย์ ต้องแสดงเครดิต OSM + CARTO
const URL = { light: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', dark: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png' }
const ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'

export function MapTiles() {
  const dark = useIsDark()
  return <TileLayer key={dark ? 'd' : 'l'} url={dark ? URL.dark : URL.light} subdomains="abcd" maxZoom={20} attribution={ATTRIBUTION} />
}
