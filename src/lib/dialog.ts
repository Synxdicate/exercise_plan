// กล่องยืนยัน/แจ้งเตือนของแอป (แทน confirm/alert ของเบราว์เซอร์ที่ดูไม่เข้ากับแอป)
// เรียกจากที่ไหนก็ได้: `if (await ask('ลบไหม?', { danger: true })) …` · `notify('บันทึกแล้ว')`

export type AskOptions = { title?: string; ok?: string; cancel?: string; danger?: boolean }
type Pending = { message: string; opts: AskOptions; resolve: (v: boolean) => void }
type Toast = { id: number; message: string; tone: 'good' | 'bad' | 'info' }

let pending: Pending | null = null
let toasts: Toast[] = []
const listeners = new Set<() => void>()
const emit = () => listeners.forEach(l => l())

export const subscribeDialogs = (l: () => void) => {
  listeners.add(l)
  return () => void listeners.delete(l)
}
export const getAsk = () => pending
export const getToasts = () => toasts

export function ask(message: string, opts: AskOptions = {}): Promise<boolean> {
  pending?.resolve(false)
  return new Promise(resolve => {
    pending = { message, opts, resolve }
    emit()
  })
}

export function answer(v: boolean) {
  pending?.resolve(v)
  pending = null
  emit()
}

let nextId = 1
export function notify(message: string, tone: Toast['tone'] = 'info') {
  const id = nextId++
  toasts = [...toasts, { id, message, tone }]
  emit()
  setTimeout(() => {
    toasts = toasts.filter(t => t.id !== id)
    emit()
  }, 3000)
}
