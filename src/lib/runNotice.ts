import { registerPlugin } from '@capacitor/core'
import { isNative } from './native'
import type { NoticeAction } from './runNoticeText'

export { noticeText, stepNow } from './runNoticeText'

// แจ้งเตือนสดระหว่างวิ่ง (แอป Android): เขียนทับแจ้งเตือนของบริการ GPS ด้วยช่วงที่กำลังทำ เพซตอนนี้/เฉลี่ย ระยะ เวลา
// ปุ่มหยุดชั่วคราว/วิ่งต่อ/ข้ามช่วง ส่งกลับมาทาง event 'action' (native: RunNoticePlugin.java)

type Plugin = {
  update(o: { title: string; body: string; actions: NoticeAction[] }): Promise<{ shown: boolean }>
  addListener(e: 'action', f: (d: { id: NoticeAction['id'] }) => void): Promise<{ remove: () => Promise<void> }>
}
const RunNotice = registerPlugin<Plugin>('RunNotice')

export function updateRunNotice(n: { title: string; body: string; actions: NoticeAction[] }) {
  if (!isNative) return
  void RunNotice.update(n).catch(() => {})
}

export function onRunNoticeAction(f: (id: NoticeAction['id']) => void): () => void {
  if (!isNative) return () => {}
  const sub = RunNotice.addListener('action', d => f(d.id))
  return () => { void sub.then(s => s.remove()) }
}
