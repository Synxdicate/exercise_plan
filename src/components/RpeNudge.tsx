import { Gauge } from 'lucide-react'
import { runsMissingRpe } from '../lib/rpeNudge'
import { niceDate, today } from '../lib/date'
import { formatPace, runKinds, runKindsEn, useRuns } from '../lib/log'
import { useT } from '../lib/i18n'
import { RpePicker } from './RpePicker'

/** หน้าหลัก: การวิ่งล่าสุดที่ยังไม่ได้ให้คะแนนความเหนื่อย (≤7 วัน) ให้คะแนนในแตะเดียว แล้วเลื่อนไปครั้งถัดไปเอง */
export function RpeNudgeCard() {
  const [runs, setRuns] = useRuns()
  const t = useT()
  const missing = runsMissingRpe(runs, today())
  const r = missing[0]
  if (!r) return null
  const kind = t(runKinds[r.kind], runKindsEn[r.kind])
  return (
    <section className="animate-fade-up rounded-2xl bg-card p-3.5 shadow-sm ring-1 ring-line">
      <div className="mb-2 flex items-center gap-2 text-sm">
        <Gauge size={18} className="shrink-0 text-run" />
        <span className="min-w-0 flex-1">
          <b>{t(`${kind} ${r.km.toFixed(2)} กม.`, `${kind} ${r.km.toFixed(2)} km`)}</b>
          <span className="text-muted"> · {niceDate(r.date)}{r.seconds && r.km ? ` · ${formatPace(r.seconds, r.km)} ${t('/กม.', '/km')}` : ''}</span>
        </span>
        {missing.length > 1 && <span className="shrink-0 text-xs text-muted">{t(`ค้าง ${missing.length} ครั้ง`, `${missing.length} to rate`)}</span>}
      </div>
      <RpePicker onPick={rpe => setRuns(prev => prev.map(x => (x.id === r.id ? { ...x, rpe } : x)))} />
    </section>
  )
}
