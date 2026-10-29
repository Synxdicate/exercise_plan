import { Component, type ErrorInfo, type ReactNode } from 'react'
import { captureError } from '../lib/errors'

// จับ error ระหว่าง render ไม่ให้จอขาวทั้งแอป — บันทึกรายงานแล้วให้กดโหลดใหม่ได้
// fallback: แสดงแทนเฉพาะส่วนที่พัง (เช่น แผนที่) ไม่ให้ทั้งแอปขึ้นหน้า error
export class ErrorBoundary extends Component<{ children: ReactNode; fallback?: ReactNode }, { error: Error | null }> {
  state: { error: Error | null } = { error: null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    captureError(error, info.componentStack?.split('\n').slice(0, 4).join(' ').trim())
  }

  render() {
    if (!this.state.error) return this.props.children
    if (this.props.fallback !== undefined) return this.props.fallback
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-3 p-6 text-center">
        <h1 className="text-xl font-bold">มีบางอย่างผิดพลาด</h1>
        <p className="max-w-sm text-sm text-muted">บันทึกรายงานปัญหาไว้แล้ว ข้อมูลของคุณไม่หาย ลองโหลดใหม่อีกครั้ง</p>
        <code className="max-w-sm break-all rounded-xl bg-raised p-2 text-xs text-muted">{this.state.error.message}</code>
        <button onClick={() => location.reload()} className="rounded-full bg-accent px-5 py-2.5 font-semibold text-white">โหลดใหม่</button>
      </div>
    )
  }
}
