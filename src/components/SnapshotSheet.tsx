import { useEffect, useState } from 'react'
import { Upload } from 'lucide-react'
import { listSnapshots, missingNow, recover, type Snapshot } from '../lib/snapshots'
import { formatPace, runKinds, runKindsEn, type Run } from '../lib/log'
import { niceDate } from '../lib/date'
import { notify } from '../lib/dialog'
import { useT } from '../lib/i18n'
import { Button, Sheet } from './ui'

/** เมนูบัญชี → สำรองอัตโนมัติ: สำเนาในเครื่องวันละชุด 7 วัน เลือกวันแล้วเอาเฉพาะรายการที่หายกลับมา */
export function SnapshotSheet({ onClose }: { onClose: () => void }) {
  const t = useT()
  const [snaps, setSnaps] = useState<Snapshot[] | null>(null)
  const [, bump] = useState(0)
  const [file, setFile] = useState<{ name: string; data: Record<string, unknown> } | null>(null)
  useEffect(() => { listSnapshots().then(setSnaps, () => setSnaps([])) }, [])
  // ไฟล์สำรอง: เอาเฉพาะรายการที่หาย ไม่แทนที่ทั้งก้อนแบบ "กู้คืนจากไฟล์สำรอง" (ไฟล์เก่าจะลบรอบที่บันทึกหลังทำไฟล์)
  const openFile = async (f: File) => {
    try {
      const j = JSON.parse(await f.text()) as { app?: string; data?: Record<string, unknown> }
      if (j?.app !== 'exercise-plan' || !j.data) throw new Error()
      setFile({ name: f.name, data: j.data })
    } catch {
      notify(t('ไม่ใช่ไฟล์สำรองของ Kao', 'Not a Kao backup file'), 'bad')
    }
  }
  return (
    <Sheet onClose={onClose} title={t('เอารายการที่หายกลับมา', 'Recover missing items')}>
      <p className="text-sm text-muted">{t(`แอปเก็บสำเนาข้อมูลไว้ในเครื่องวันละชุด ${7} วันล่าสุด ถ้ารอบวิ่ง การฝึก หรือน้ำหนักที่บันทึกไว้หายไป เลือกวันที่ยังมีอยู่แล้วเอากลับมาได้ ข้อมูลอื่นไม่ถูกแตะ`, 'The app keeps one copy of your data per day for the last 7 days. If a run, workout or weigh-in goes missing, bring it back from a day that still has it — nothing else is changed.')}</p>
      <label className="mt-3 flex cursor-pointer items-center gap-2 rounded-xl bg-raised px-3 py-2.5 text-sm font-semibold">
        <Upload size={16} /> {t('เลือกจากไฟล์สำรอง (.json)', 'Pick a backup file (.json)')}
        <input type="file" accept="application/json,.json" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) void openFile(f); e.target.value = '' }} />
      </label>
      {file && <ul className="mt-2"><SnapItem label={file.name} data={file.data} onDone={() => bump(x => x + 1)} /></ul>}
      {snaps === null ? <p className="mt-3 text-sm text-muted">{t('กำลังโหลด…', 'Loading…')}</p>
        : !snaps.length ? <p className="mt-3 text-sm text-muted">{t('ยังไม่มีสำเนา แอปจะเริ่มเก็บวันนี้', 'No copies yet — the app starts keeping them today')}</p>
        : (
          <ul className="mt-3 space-y-2">
            {snaps.map(s => <SnapItem key={s.date} label={niceDate(s.date)} data={s.data} onDone={() => bump(x => x + 1)} />)}
          </ul>
        )}
    </Sheet>
  )
}

function SnapItem({ label, data, onDone }: { label: string; data: Record<string, unknown>; onDone: () => void }) {
  const t = useT()
  const m = missingNow(data)
  const n = m.runs.length + m.sessions.length + m.log.length
  return (
    <li className="rounded-xl bg-raised p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="min-w-0 truncate font-semibold">{label}</span>
        <span className="shrink-0 text-xs text-muted">{n ? t(`ไม่มีในตอนนี้ ${n} รายการ`, `${n} not in current data`) : t('ครบเหมือนตอนนี้', 'Nothing missing')}</span>
      </div>
      {n > 0 && (
        <>
          <ul className="mt-1.5 space-y-0.5 text-xs text-muted">
            {m.runs.map((r: Run) => <li key={r.id}>{t(runKinds[r.kind], runKindsEn[r.kind])} {r.km.toFixed(2)} {t('กม.', 'km')} · {niceDate(r.date)}{r.seconds ? ` · ${formatPace(r.seconds, r.km)}` : ''}</li>)}
            {m.sessions.map(x => <li key={x.id}>{x.title || t('การฝึก', 'Workout')} · {niceDate(x.date)}</li>)}
            {m.log.map(e => <li key={e.date}>{t('น้ำหนัก', 'Weight')} {e.weight} {t('กก.', 'kg')} · {niceDate(e.date)}</li>)}
          </ul>
          <p className="mt-1.5 text-[11px] text-muted">{t('รวมรายการที่คุณลบเองด้วย ถ้าลบเองตั้งใจไม่ต้องเอากลับมา', 'This includes anything you deleted on purpose')}</p>
          <Button size="sm" variant="soft" className="mt-2" onClick={() => { const k = recover(data); notify(t(`เอากลับมาแล้ว ${k} รายการ`, `Restored ${k} item${k === 1 ? '' : 's'}`), 'good'); onDone() }}>
            {t('เอากลับมา', 'Bring back')}
          </Button>
        </>
      )}
    </li>
  )
}
