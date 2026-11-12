import { Footprints } from 'lucide-react'
import { remeasure } from '../lib/analysis'
import { niceDate } from '../lib/date'
import { formatPace, useRuns } from '../lib/log'
import { usePersisted } from '../lib/storage'
import { looksLikeWalk } from '../lib/walk'
import { useT } from '../lib/i18n'

/**
 * ประวัติวิ่ง: รอบที่บันทึกเป็นวิ่งแต่เพซเฉลี่ยช้ากว่า 12:00/กม. (น่าจะเดิน) รวมไว้ที่เดียว ตอบทีละรอบ
 * เดิมถามเฉพาะในหน้ารายละเอียด รอบเดินจึงถูกนับเป็นระยะวิ่ง สถิติ และเหรียญ โดยไม่รู้ตัว
 * รอบที่ระยะขาดจากแอปเก่า (remeasure) ไม่ถาม: เพซช้าเพราะระยะขาด ไม่ใช่เดิน ให้แก้ระยะในรายละเอียดก่อน
 * ตอบ "วิ่งจริง" เก็บ id ในคีย์เครื่อง walkReviewed ไม่ถามซ้ำ
 */
export function WalkReview() {
  const [runs, setRuns] = useRuns()
  const [kept, setKept] = usePersisted<string[]>('walkReviewed', [])
  const t = useT()
  const list = runs.filter(r => looksLikeWalk(r) && !kept.includes(r.id) && !remeasure(r)).sort((a, b) => b.date.localeCompare(a.date))
  if (!list.length) return null
  return (
    <section className="rounded-2xl bg-warn/10 p-3.5 ring-1 ring-warn/30">
      <div className="flex items-center gap-2 text-sm font-bold text-warn">
        <Footprints size={18} className="shrink-0" /> {t(`${list.length} รอบที่น่าจะเป็นการเดิน`, `${list.length} ${list.length > 1 ? 'entries look' : 'entry looks'} like walking`)}
      </div>
      <p className="mt-1 text-xs text-muted">{t('เพซเฉลี่ยช้ากว่า 12:00 /กม. ถ้าเป็นการเดิน บันทึกเป็นเดินจะไม่นับเป็นระยะวิ่ง สถิติ และเหรียญ (ยังนับเป็นวันที่ได้ออกกำลังกาย)', 'Average pace slower than 12:00 /km. Marking walks keeps them out of running distance, stats and badges (they still count as active days).')}</p>
      <ul className="mt-2 space-y-1.5">
        {list.slice(0, 5).map(r => (
          <li key={r.id} className="flex items-center gap-2 rounded-xl bg-card p-2 text-sm ring-1 ring-line">
            <span className="min-w-0 flex-1">
              <b>{niceDate(r.date)}</b> <span className="text-muted">· {r.km.toFixed(2)} {t('กม.', 'km')} · {formatPace(r.seconds, r.km)} {t('/กม.', '/km')}</span>
            </span>
            <button onClick={() => setKept(prev => [...prev, r.id])} className="shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold text-muted ring-1 ring-line">{t('วิ่งจริง', 'It was a run')}</button>
            <button onClick={() => setRuns(prev => prev.map(x => (x.id === r.id ? { ...x, kind: 'walk' } : x)))} className="shrink-0 rounded-full bg-warn/15 px-2.5 py-1 text-xs font-semibold text-warn">{t('เป็นเดิน', 'Walk')}</button>
          </li>
        ))}
      </ul>
    </section>
  )
}
