import { registerPlugin } from '@capacitor/core'
import { isNative } from './native'
import type { Notice, NoticeAction } from './runNoticeText'

export { noticeText, stepNow } from './runNoticeText'

// แจ้งเตือนสดระหว่างวิ่ง (แอป Android): เขียนทับแจ้งเตือนของบริการ GPS ด้วยช่วงที่กำลังทำ เพซตอนนี้/เฉลี่ย ระยะ เวลา
// ปุ่มหยุดชั่วคราว/วิ่งต่อ/ข้ามช่วง ส่งกลับมาทาง event 'action' (native: RunNoticePlugin.java)

type Plugin = {
  update(o: { title: string; body: string; text?: string; actions: NoticeAction[]; progress?: number; chronoAt?: number; chronoDown?: boolean }): Promise<{ shown: boolean }>
  addListener(e: 'action', f: (d: { id: NoticeAction['id'] }) => void): Promise<{ remove: () => Promise<void> }>
}
const RunNotice = registerPlugin<Plugin>('RunNotice')

export function updateRunNotice(n: Pick<Notice, 'title' | 'body' | 'actions'> & Partial<Notice>) {
  if (!isNative) return
  void RunNotice.update({
    title: n.title, body: n.body, text: n.text, actions: n.actions,
    progress: n.progress ?? -1, chronoAt: n.chrono?.at ?? 0, chronoDown: n.chrono?.down ?? false,
  }).catch(() => {})
}

export function onRunNoticeAction(f: (id: NoticeAction['id']) => void): () => void {
  if (!isNative) return () => {}
  const sub = RunNotice.addListener('action', d => f(d.id))
  return () => { void sub.then(s => s.remove()) }
}
