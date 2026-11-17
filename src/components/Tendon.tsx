import { Footprints, Stethoscope } from 'lucide-react'
import type { Run } from '../lib/log'
import type { Readiness } from '../lib/readiness'
import { TENDON_LIMIT, TENDON_TEXT, tendonCheckDue, tendonStatus, type TendonLog } from '../lib/tendon'
import { usePersisted } from '../lib/storage'
import { useToday } from '../lib/useToday'
import { useT } from '../lib/i18n'
import { cx } from '../lib/cx'
import { Button } from './ui'

/** หน้าหลัก: เช้าหลังวันวิ่ง (เมื่อเคยปวดขาช่วงล่างใน 28 วัน) ถามปวดตอนก้าวแรก 0–10 แล้วบอกว่าวันนี้ทำอะไรได้ (tendon.ts) */
export function TendonCheckCard() {
  const t = useT()
  const now = useToday()
  const [runs] = usePersisted<Run[]>('runs', [])
  const [readiness] = usePersisted<Record<string, Readiness>>('readiness', {})
  const [log, setLog] = usePersisted<TendonLog>('tendonLog', {})
  const [seen, setSeen] = usePersisted('tendonSeen', '')
  const status = tendonStatus(log, now)
  const due = tendonCheckDue(runs, readiness, log, now)
  if (!due && (!status || seen === now)) return null
  const pick = (n: number) => setLog(prev => ({ ...prev, [now]: n }))
  return (
    <section className="animate-fade-up rounded-2xl bg-card p-3.5 shadow-sm ring-1 ring-line">
      <div className="flex items-start gap-3">
        <Footprints size={18} className="mt-0.5 shrink-0 text-run" />
        <div className="min-w-0 flex-1 text-sm">
          <div className="font-bold">{t('เช็กขาเช้านี้', 'Morning leg check')}</div>
          <p className="text-muted">{t('ก้าวแรกหลังตื่นนอนหรือตอนเดินลงบันได จุดที่เคยเจ็บ (เอ็นร้อยหวาย น่อง ฝ่าเท้า หน้าแข้ง หรือเข่า) เจ็บหรือตึงกี่คะแนน (0 = ไม่เจ็บ 10 = เจ็บมากที่สุด) อาการเช้าหลังวันวิ่งบอกได้ดีกว่าตอนวิ่งว่าขารับไหวไหม', 'First steps after waking or walking down stairs: how much does the spot that hurt before (Achilles, calf, sole, shin or knee) hurt or feel stiff (0 = none, 10 = worst)? The morning after a run tells you more than pain during it.')}</p>
        </div>
      </div>
      <div className="mt-2.5 grid grid-cols-11 gap-1">
        {Array.from({ length: 11 }, (_, n) => (
          <button key={n} onClick={() => pick(n)} aria-pressed={status?.score === n}
            className={cx('rounded-lg py-2 text-sm font-bold tabular-nums transition-colors',
              status?.score === n ? 'bg-accent-fill text-white' : n === 0 ? 'bg-good/15 text-good' : n <= TENDON_LIMIT ? 'bg-warn/15 text-warn' : 'bg-bad/15 text-bad')}>
            {n}<span className="sr-only">{t(' จาก 10', ' of 10')}</span>
          </button>
        ))}
      </div>
      {status && (
        <div className="mt-2.5 space-y-2 text-sm" role="status">
          <p className={cx('rounded-xl p-2.5', status.level === 'high' ? 'bg-bad/15' : status.level === 'worse' ? 'bg-warn/10' : 'bg-good/10')}>
            {status.prev !== null && <span className="text-muted">{t(`ครั้งก่อน ${status.prev} จาก 10 `, `Last time ${status.prev}/10. `)}</span>}
            {t(...TENDON_TEXT[status.level])}
          </p>
          {status.physio && (
            <p className="flex items-start gap-2 rounded-xl bg-raised p-2.5">
              <Stethoscope size={16} className="mt-0.5 shrink-0 text-bad" />
              <span>{t(`เจ็บต่อเนื่องมา ${status.painDays} วันแล้ว ควรให้นักกายภาพหรือแพทย์ตรวจ การฝึกรับน้ำหนักที่ออกแบบเฉพาะช่วยได้มากกว่าการพักอย่างเดียว`, `Pain for ${status.painDays} days now: see a physio or doctor. A tailored loading program helps more than rest alone.`)}</span>
            </p>
          )}
          <p className="text-xs text-muted">{t('บวม คลำเป็นก้อน เดินกะเผลก หรือเจ็บแปลบทันทีเหมือนโดนเตะที่ส้นเท้า ควรพบแพทย์', 'Swelling, a lump, limping, or a sudden kicked-in-the-heel pain: see a doctor.')}</p>
          <Button size="sm" variant="soft" onClick={() => setSeen(now)}>{t('รับทราบ', 'Got it')}</Button>
        </div>
      )}
    </section>
  )
}
