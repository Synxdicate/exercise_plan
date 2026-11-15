import { useEffect, useMemo, useState } from 'react'
import { ArchiveRestore } from 'lucide-react'
import { listSnapshots, lostKeys, lostNow, markDeleted, recover, ignoredNow } from '../lib/snapshots'
import { formatPace, runKinds, runKindsEn, type Run, type Session } from '../lib/log'
import { niceDate, today } from '../lib/date'
import { usePersisted } from '../lib/storage'
import { notify } from '../lib/dialog'
import { useT } from '../lib/i18n'
import { Button } from './ui'

type Lost = ReturnType<typeof lostNow>
type Data = Record<string, unknown>
// สำเนาในเครื่องโหลดครั้งเดียวต่อวัน (7 ชุด อาจมีเส้นทางวิ่งทั้งหมด) ไม่โหลดซ้ำทุกครั้งที่กลับมาหน้าหลัก
let cache: { day: string; snaps: Data[] } | null = null

/**
 * หน้าหลัก: สำเนาอัตโนมัติในเครื่องมีรอบวิ่ง/การฝึก/น้ำหนักที่ตอนนี้ไม่มีแล้ว (และผู้ใช้ไม่ได้ลบเอง) → บอกและเอากลับมาในแตะเดียว
 * เดิมต้องรู้เองว่าข้อมูลหายแล้วเข้าเมนู "เอารายการที่หายกลับมา" (รอบวิ่ง 10 พ.ย. หายจากบั๊กซิงก์โดยไม่มีใครรู้)
 */
export function LostItemsCard() {
  const t = useT()
  const [runs] = usePersisted<Run[]>('runs', [])
  const [sessions] = usePersisted<Session[]>('sessions', [])
  const [log] = usePersisted<unknown[]>('log', [])
  const [ignored] = usePersisted<string[]>('lostIgnored', [])
  const [snaps, setSnaps] = useState<Data[] | null>(cache?.day === today() ? cache.snaps : null)
  useEffect(() => {
    if (snaps) return
    // หลังเปิดแอป ไม่แย่งเวลากับการแสดงหน้าแรก
    const id = setTimeout(() => {
      listSnapshots().then(s => { cache = { day: today(), snaps: s.map(x => x.data) }; setSnaps(cache.snaps) }, () => {})
    }, 3000)
    return () => clearTimeout(id)
  }, [snaps])
  // ข้อมูลเปลี่ยน (เพิ่ม/ลบ/กู้คืน/ซิงก์) คิดใหม่: lostNow อ่านจาก store ค่าเหล่านี้เป็นตัวบอกว่าเปลี่ยน
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const lost: Lost | null = useMemo(() => (snaps ? lostNow(snaps) : null), [snaps, runs, sessions, log, ignored])
  if (!snaps || !lost) return null
  const n = lost.runs.length + lost.sessions.length + lost.log.length
  if (!n) return null
  const bring = () => {
    const skip = ignoredNow()
    const k = snaps.reduce((a, s) => a + recover(s, skip), 0)
    notify(t(`เอากลับมาแล้ว ${k} รายการ`, `Restored ${k} item${k === 1 ? '' : 's'}`), 'good')
  }
  return (
    <section className="animate-fade-up rounded-2xl bg-card p-3.5 shadow-sm ring-1 ring-line">
      <div className="flex items-start gap-3 text-sm">
        <ArchiveRestore size={18} className="mt-0.5 shrink-0 text-run" />
        <div className="min-w-0 flex-1">
          <div className="font-bold">{t(`พบ ${n} รายการที่เคยบันทึกแต่ตอนนี้หายไป`, `${n} saved item${n === 1 ? '' : 's'} went missing`)}</div>
          <ul className="mt-1 space-y-0.5 text-xs text-muted">
            {lost.runs.map(r => <li key={r.id}>{t(runKinds[r.kind], runKindsEn[r.kind])} {r.km.toFixed(2)} {t('กม.', 'km')} · {niceDate(r.date)}{r.seconds ? ` · ${formatPace(r.seconds, r.km)}` : ''}</li>)}
            {lost.sessions.map(x => <li key={x.id}>{x.title || t('การฝึก', 'Workout')} · {niceDate(x.date)}</li>)}
            {lost.log.map(e => <li key={e.date}>{t('น้ำหนัก', 'Weight')} {e.weight} {t('กก.', 'kg')} · {niceDate(e.date)}</li>)}
          </ul>
          <p className="mt-1 text-xs text-muted">{t('พบในสำเนาอัตโนมัติของเครื่องนี้ ถ้าลบไว้จากอีกเครื่องโดยตั้งใจ กด "ลบเองตั้งใจ"', 'Found in this device’s automatic copies. If you deleted them on another device on purpose, tap "Deleted on purpose".')}</p>
          <div className="mt-2 flex gap-2">
            <Button size="sm" onClick={bring}>{t('เอากลับมา', 'Bring back')}</Button>
            <Button size="sm" variant="soft" onClick={() => markDeleted(lostKeys(lost))}>{t('ลบเองตั้งใจ', 'Deleted on purpose')}</Button>
          </div>
        </div>
      </div>
    </section>
  )
}
