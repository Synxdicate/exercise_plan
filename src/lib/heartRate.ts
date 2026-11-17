import { useSyncExternalStore } from 'react'
import { registerPlugin } from '@capacitor/core'
import { isNative } from './native'
import { parseHeartRate } from './hrLog'

// สายวัดชีพจรบลูทูธ (มาตรฐาน Heart Rate Service ใช้ได้ทุกยี่ห้อที่ส่งชีพจรแบบ BLE)
// เว็บ: Web Bluetooth (Chrome บน Android/คอมพิวเตอร์) · แอป Android: HeartRatePlugin.java (WebView ไม่มี Web Bluetooth)
// ค่าเก็บไว้ในโมดูล อ่านจาก callback ของ GPS ได้ด้วย hrNow() (ตอนจอดับ React state ไม่อัปเดต)

export type HrStatus = 'off' | 'connecting' | 'on' | 'lost'
type State = { status: HrStatus; bpm: number | null; at: number; name: string; error: string }

let state: State = { status: 'off', bpm: null, at: 0, name: '', error: '' }
const subs = new Set<() => void>()
const set = (p: Partial<State>) => { state = { ...state, ...p }; subs.forEach(f => f()) }
const subscribe = (f: () => void) => { subs.add(f); return () => { subs.delete(f) } }

export const useHeartRate = () => useSyncExternalStore(subscribe, () => state, () => state)

/** ชีพจรล่าสุดถ้ายังสด (≤5 วิ) */
export const hrNow = () => (state.status === 'on' && state.bpm && Date.now() - state.at <= 5000 ? state.bpm : null)

type BtChar = EventTarget & { value?: DataView; startNotifications(): Promise<unknown> }
type BtDevice = EventTarget & { name?: string; gatt?: { connected: boolean; connect(): Promise<{ getPrimaryService(s: string): Promise<{ getCharacteristic(c: string): Promise<BtChar> }> }>; disconnect(): void } }
type Bt = { requestDevice(o: { filters: { services: string[] }[] }): Promise<BtDevice> }
const bt = () => (typeof navigator !== 'undefined' ? (navigator as Navigator & { bluetooth?: Bt }).bluetooth : undefined)

export const hrSupported = () => isNative || !!bt()

type Native = {
  connect(): Promise<{ name: string }>
  disconnect(): Promise<void>
  addListener(e: 'hr', f: (d: { bpm: number }) => void): Promise<{ remove: () => Promise<void> }>
  addListener(e: 'state', f: (d: { state: 'connected' | 'lost' | 'off' }) => void): Promise<{ remove: () => Promise<void> }>
}
const HeartRate = registerPlugin<Native>('HeartRate')
let nativeSubs: Promise<{ remove: () => Promise<void> }>[] = []
let webDevice: BtDevice | null = null

const onBpm = (bpm: number | null) => { if (bpm) set({ bpm, at: Date.now(), status: 'on' }) }

export async function connectHr(): Promise<void> {
  if (state.status === 'connecting' || state.status === 'on') return
  set({ status: 'connecting', error: '' })
  try {
    if (isNative) {
      if (!nativeSubs.length) nativeSubs = [
        HeartRate.addListener('hr', d => onBpm(d.bpm)),
        HeartRate.addListener('state', d => set({ status: d.state === 'connected' ? 'on' : d.state === 'lost' ? 'lost' : 'off', ...(d.state === 'off' && { bpm: null }) })),
      ]
      const r = await HeartRate.connect()
      set({ name: r.name, status: 'on' })
      return
    }
    const b = bt()
    if (!b) throw new Error('unsupported')
    const dev = await b.requestDevice({ filters: [{ services: ['heart_rate'] }] })
    webDevice = dev
    dev.addEventListener('gattserverdisconnected', () => { if (webDevice === dev) set({ status: 'lost' }) })
    const server = await dev.gatt!.connect()
    const ch = await (await server.getPrimaryService('heart_rate')).getCharacteristic('heart_rate_measurement')
    ch.addEventListener('characteristicvaluechanged', () => {
      const v = ch.value
      if (v) onBpm(parseHeartRate(new Uint8Array(v.buffer, v.byteOffset, v.byteLength)))
    })
    await ch.startNotifications()
    set({ name: dev.name ?? '', status: 'on' })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    // ผู้ใช้ปิดหน้าต่างเลือกอุปกรณ์เอง ไม่ต้องแสดงเป็นข้อผิดพลาด
    set({ status: 'off', bpm: null, error: /cancel|chosen|NotFoundError/i.test(msg) ? '' : msg })
  }
}

export function disconnectHr() {
  if (isNative) void HeartRate.disconnect().catch(() => {})
  else { const d = webDevice; webDevice = null; d?.gatt?.disconnect() }
  set({ status: 'off', bpm: null, name: '' })
}
