import { lazy, Suspense, useState } from 'react'
import { FileDown, ListChecks, Pencil, Share2, Trash2, X } from 'lucide-react'
import { type Point } from '../lib/gps'
import { formatDuration, formatPace, runKinds, runKindsEn, type Run } from '../lib/log'
import { trNow, useT } from '../lib/i18n'
import { looksLikeWalk } from '../lib/walk'
import { saveGpx } from '../lib/gpxFile'
import { useShoes } from '../lib/shoes'
import { paceSeries, remeasure, splitAnalysis } from '../lib/analysis'
import { easyTooFast } from '../lib/recovery'
import { PaceChart, ZoneBar } from './Charts'
import { zoneInfo, zoneOf } from '../lib/zones'
import { RpePicker } from './RpePicker'
import { useBackClose } from '../lib/back'
import { ShareRunSheet } from './ShareRun'
import { PhotoStrip } from './Photos'
import { niceDate } from '../lib/date'
import { Button, Collapse, Portal, Stat } from './ui'
import { MatchedRuns } from './Matched'
import { useCountUp } from '../lib/useCountUp'
import { DateInput, NumberInput, SelectInput } from './Form'
import { cx } from '../lib/cx'
import { ask, notify } from '../lib/dialog'
import { ErrorBoundary } from './ErrorBoundary'
import { ElevationCard, RunAchievements } from './RunExtras'

const RunMap = lazy(() => import('./RunMap'))

// รายละเอียดรอบวิ่ง (แยกจาก Runs.tsx): แผนที่ เพซ ความสำเร็จ ความสูง แก้ไข แชร์
export function Map(props: { route: Point[]; position?: Point | null; follow?: boolean; className?: string; interactive?: boolean }) {
  return (
    <ErrorBoundary fallback={<div className={cx('grid w-full place-items-center rounded-2xl bg-raised text-sm text-muted', props.className ?? 'h-64')}>{trNow('แสดงแผนที่ไม่ได้', 'Couldn’t show the map')}</div>}>
      <Suspense fallback={<div className={cx('w-full animate-pulse rounded-2xl bg-raised', props.className ?? 'h-64')} />}>
        <RunMap {...props} />
      </Suspense>
    </ErrorBoundary>
  )
}

export function Splits({ splits, fiveK }: { splits: number[]; fiveK?: number }) {
  const tr = useT()
  const fastest = Math.min(...splits)
  const slowest = Math.max(...splits)
  return (
    <div className="rounded-2xl bg-raised p-3">
      <div className="mb-2 flex justify-between text-xs text-muted"><span>{tr('เพซรายกิโล', 'Pace per km')}</span><span>{tr('นาที/กม.', 'min/km')}</span></div>
      <ul className="space-y-1.5">
        {splits.map((s, i) => (
          <li key={i} className="grid grid-cols-[3rem_1fr_1.25rem_3rem] items-center gap-2 text-sm">
            <span className="text-muted">{tr('กม.', 'km')} {i + 1}</span>
            <span className="h-2.5 overflow-hidden rounded-full bg-body">
              {/* แท่งยาว = เร็ว, สี = โซนเพซ */}
              <span className={cx('block h-full rounded-full', !fiveK && (s === fastest ? 'bg-good-fill' : 'bg-run-fill'))}
                style={{ width: `${slowest === fastest ? 100 : 40 + 60 * ((slowest - s) / (slowest - fastest))}%`, background: fiveK ? zoneInfo(zoneOf(s, fiveK)).color : undefined }} />
            </span>
            <span className="text-center text-[10px] font-bold" style={{ color: fiveK ? zoneInfo(zoneOf(s, fiveK)).color : undefined }}>{fiveK ? zoneOf(s, fiveK) : ''}</span>
            <span className={cx('text-right tabular-nums', s === fastest && 'font-bold')}>{formatPace(s, 1)}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function RunDetail({ run, runs, fiveK, onClose, onDelete, onUpdate }: { run: Run; runs: Run[]; fiveK?: number; onClose: () => void; onDelete: () => void; onUpdate: (patch: Partial<Run>) => void }) {
  const tr = useT()
  const kmUp = useCountUp(run.km)
  const fix = remeasure(run)
  const secUp = useCountUp(run.seconds)
  const [editing, setEditing] = useState(false)
  const [sharing, setSharing] = useState(false)
  useBackClose(onClose)
  const series = run.route && run.times ? paceSeries(run.route, run.times) : []
  const sa = splitAnalysis(run.splits)
  // "หลงความเร็ว" (ครูดิน): วิ่งเบาเร็วกว่าโซนเบา — เทียบเฉพาะเมื่อโซนคิดจากผลวิ่งเต็มที่ (fiveK มาจาก zoneRef)
  const tooFast = easyTooFast(run, fiveK ? fiveK * 1.2 : undefined)
  const saText = sa && {
    // เร็วขึ้นเกิน 10% มักแปลว่าช่วงแรกเดิน/วอร์มอัพ มากกว่าการคุมแรง
    negative: sa.diffPct < -10
      ? { t: tr('ครึ่งหลังเร็วขึ้นมาก', 'Much faster second half'), c: 'text-run', d: tr(`เร็วขึ้น ${Math.abs(sa.diffPct).toFixed(1)}% — ช่วงแรกน่าจะเป็นการวอร์มอัพหรือเดิน`, `${Math.abs(sa.diffPct).toFixed(1)}% faster — the start was probably a warm-up or walk`) }
      : { t: 'Negative split', c: 'text-good', d: tr(`ครึ่งหลังเร็วกว่าครึ่งแรก ${Math.abs(sa.diffPct).toFixed(1)}% — คุมแรงได้ดี`, `Second half ${Math.abs(sa.diffPct).toFixed(1)}% faster — well paced`) },
    even: { t: 'Even split', c: 'text-run', d: tr('สองครึ่งเพซใกล้กัน — สม่ำเสมอดี', 'Both halves at a similar pace — nicely even') },
    positive: { t: 'Positive split', c: 'text-warn', d: tr(`ครึ่งหลังช้าลง ${sa.diffPct.toFixed(1)}% — ลองออกตัวช้าลงอีกนิด`, `Second half ${sa.diffPct.toFixed(1)}% slower — try starting a bit easier`) },
  }[sa.kind]
  return (
    <Portal>
    <div className="fixed inset-0 z-50 flex animate-fade-in items-end justify-center bg-black/50 sm:items-center" onClick={onClose}>
      <div className="max-h-[92dvh] w-full max-w-lg animate-sheet-up overflow-y-auto rounded-t-3xl bg-card p-4 pb-[calc(var(--sab)+1rem)] sm:animate-fade-up sm:rounded-3xl" onClick={e => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <div className="font-bold">{tr(runKinds[run.kind], runKindsEn[run.kind])} · {niceDate(run.date)}</div>
            <div className="text-xs text-muted">{run.source === 'gps' ? tr('บันทึกด้วย GPS', 'Recorded with GPS') : run.source === 'gpx' ? tr('นำเข้าจากไฟล์ GPX', 'Imported from GPX') : tr('กรอกเอง', 'Entered manually')}</div>
          </div>
          <span className="flex gap-2">
            {run.route && run.route.length > 1 && (
              <button onClick={() => void saveGpx(run).catch(() => notify(tr('ส่งออกไม่สำเร็จ', 'Export failed'), 'bad'))} aria-label={tr('ส่งออก GPX (Strava)', 'Export GPX (Strava)')} title={tr('ส่งออก GPX (Strava)', 'Export GPX (Strava)')} className="grid size-9 place-items-center rounded-full bg-raised"><FileDown size={17} /></button>
            )}
            <button onClick={() => setSharing(true)} aria-label={tr('แชร์เป็นรูป', 'Share as image')} className="grid size-9 place-items-center rounded-full bg-raised"><Share2 size={17} /></button>
            <button onClick={onClose} aria-label={tr('ปิด', 'Close')} className="grid size-9 place-items-center rounded-full bg-raised"><X size={18} /></button>
          </span>
        </div>
        {sharing && <ShareRunSheet run={run} onClose={() => setSharing(false)} />}
        {run.route && run.route.length > 1 && <Map route={run.route} className="mb-3 h-56" />}
        <div className="mb-3 grid grid-cols-3 gap-2 text-center">
          <Stat label={tr('ระยะ', 'Distance')} value={kmUp.toFixed(2)} sub={tr('กม.', 'km')} accent />
          <Stat label={tr('เวลาเคลื่อนที่', 'Moving time')} value={formatDuration(secUp)} sub={run.elapsedSeconds ? `${tr('รวม', 'total')} ${formatDuration(run.elapsedSeconds)}` : undefined} />
          <Stat label={tr('เพซเฉลี่ย', 'Avg pace')} value={formatPace(run.seconds, run.km)} sub={tr('นาที/กม.', 'min/km')} />
        </div>
        {run.guide && (
          <p className={cx('mb-3 flex items-center gap-2 rounded-xl p-2.5 text-sm font-semibold', run.guide.finished ? 'bg-good/15 text-good' : 'bg-raised text-ink')}>
            <ListChecks size={16} className="shrink-0" />
            {run.guide.finished ? tr(`ทำครบตามแผน (วิ่ง ${run.guide.work} ช่วง)`, `Workout completed (${run.guide.work} reps)`) : tr(`ทำชุดซ้อมได้ ${run.guide.work}/${run.guide.total} ช่วง — ร่างกายไม่พร้อมก็หยุดได้ ไม่ต้องฝืน วันหลังยังมี`, `${run.guide.work}/${run.guide.total} reps done — stopping when your body says no is fine`)}
          </p>
        )}
        {tooFast && (
          <p className="mb-3 rounded-xl bg-warn/15 p-2.5 text-sm text-warn">{tr(`วิ่งเบาเร็วกว่าโซนเบา ~${tooFast} วิ/กม. — วันเบาควรเบาจริง วันวิ่งเร็วจะได้มีแรง ("หลงความเร็ว" เป็นสาเหตุเจ็บที่พบบ่อย)`, `Easy run ~${tooFast} s/km faster than the easy zone — keep easy days easy so fast days have quality (chasing pace is a common injury cause)`)}</p>
        )}
        {fix && (
          <div className="mb-3 rounded-xl bg-warn/15 p-3 text-sm text-warn">
            <p>{tr(`ระยะตามเส้นทางคือ ${fix.km.toFixed(2)} กม. แต่บันทึกไว้ ${run.km.toFixed(2)} กม. — แอปก่อน v2.26 นับช่วงเดินขาด`, `The route measures ${fix.km.toFixed(2)} km but ${run.km.toFixed(2)} km was saved — versions before v2.26 missed walking sections`)}</p>
            <Button size="sm" className="mt-2" onClick={() => onUpdate({ km: fix.km, splits: fix.splits })}>{tr('ใช้ระยะตามเส้นทาง', 'Use route distance')}</Button>
          </div>
        )}
        {/* วัดระยะใหม่ก่อน — ระยะที่ขาดทำให้เพซดูช้าเหมือนเดิน */}
        {!fix && looksLikeWalk(run) && (
          <div className="mb-3 rounded-xl bg-warn/15 p-3 text-sm text-warn">
            <p>{tr(`เพซเฉลี่ย ${formatPace(run.seconds, run.km)} /กม. ช้ากว่าการวิ่ง — ถ้ารอบนี้คือการเดิน บันทึกเป็น "เดิน" จะไม่นับรวมเป็นระยะวิ่ง (ยังนับเป็นวันที่ได้ออกกำลังกาย)`, `Average pace ${formatPace(run.seconds, run.km)} /km is slower than running — if this was a walk, mark it so it won't count as running distance (still an active day)`)}</p>
            <Button size="sm" className="mt-2" onClick={() => onUpdate({ kind: 'walk' })}>{tr('เปลี่ยนเป็นเดิน', 'Mark as walk')}</Button>
          </div>
        )}
        {run.gapSeconds ? <p className="mb-3 rounded-xl bg-warn/15 p-2 text-xs text-warn">{tr(`ปิดจอรวม ${formatDuration(run.gapSeconds)} — ระยะช่วงนั้นเป็นค่าประมาณ`, `Screen off for ${formatDuration(run.gapSeconds)} — distance there is estimated`)}</p> : null}
        <RunAchievements run={run} runs={runs} />
        {series.length > 2 && (
          <div className="mb-3 space-y-3 rounded-2xl bg-raised p-3">
            <PaceChart series={series} avg={run.seconds / run.km} fiveK={fiveK} />
            {fiveK && <ZoneBar series={series} fiveK={fiveK} />}
          </div>
        )}
        {sa && saText && (
          <div className="mb-3 grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-raised px-3 py-2">
              <div className={cx('text-sm font-bold', saText.c)}>{saText.t}</div>
              <div className="text-[11px] leading-snug text-muted">{saText.d}</div>
            </div>
            <div className="rounded-xl bg-raised px-3 py-2">
              <div className="text-sm font-bold">{tr('ความสม่ำเสมอ', 'Consistency')} {sa.cv < 3 ? tr('ดีมาก', 'great') : sa.cv < 6 ? tr('ดี', 'good') : tr('แกว่ง', 'uneven')}</div>
              <div className="text-[11px] leading-snug text-muted">{tr(`เพซรายกิโลต่างกันเฉลี่ย ${sa.cv.toFixed(1)}% · เร็วสุด กม. ${sa.fastest + 1}`, `Km paces vary ${sa.cv.toFixed(1)}% on average · fastest km ${sa.fastest + 1}`)}</div>
            </div>
          </div>
        )}
        {run.splits && run.splits.length > 0 && <Splits splits={run.splits} fiveK={fiveK} />}
        <div className="mt-3"><ElevationCard run={run} onUpdate={onUpdate} /></div>
        <MatchedRuns run={run} runs={runs} />
        <div className="mt-3 rounded-2xl bg-raised p-3"><RpePicker value={run.rpe} onPick={rpe => onUpdate({ rpe })} /></div>
        <div className="mt-3"><PhotoStrip kind="run" refId={run.id} date={run.date} label={tr('รูปการวิ่ง', 'Run photos')} /></div>
        <Collapse open={editing}>
          <EditRun run={run} onSave={patch => { onUpdate(patch); setEditing(false) }} />
        </Collapse>
        <div className="mt-3 flex gap-2">
          <Button variant="soft" size="sm" onClick={() => setEditing(!editing)}><Pencil size={14} /> {editing ? tr('ยกเลิกแก้ไข', 'Cancel edit') : tr('แก้ไข', 'Edit')}</Button>
          <Button variant="danger" size="sm" onClick={async () => (await ask(tr('ลบการวิ่งนี้ออกจากประวัติ?', 'Delete this run from history?'), { ok: tr('ลบ', 'Delete'), danger: true })) && onDelete()}><Trash2 size={14} /> {tr('ลบ', 'Delete')}</Button>
        </div>
      </div>
    </div>
    </Portal>
  )
}

// แก้ไขข้อมูลการวิ่ง — ระยะ/เวลาแก้ได้เฉพาะที่กรอกเอง (การวิ่งที่มีเส้นทางคำนวณจาก GPS อยู่แล้ว)
export function EditRun({ run, onSave }: { run: Run; onSave: (patch: Partial<Run>) => void }) {
  const tr = useT()
  const [date, setDate] = useState(run.date)
  const [kind, setKind] = useState(run.kind)
  const [km, setKm] = useState(String(run.km))
  const [min, setMin] = useState(String(Math.round((run.seconds / 60) * 10) / 10))
  const [shoes] = useShoes()
  const [shoeId, setShoeId] = useState(run.shoeId ?? '')
  const manual = run.source === 'manual'
  return (
    <div className="mt-3 grid grid-cols-2 gap-2 rounded-2xl bg-raised p-3">
      <DateInput label={tr('วันที่', 'Date')} value={date} onChange={setDate} />
      <SelectInput label={tr('ประเภท', 'Type')} value={kind} onChange={setKind} options={Object.entries(runKinds).map(([k, v]) => ({ value: k as Run['kind'], label: tr(v, runKindsEn[k as Run['kind']]) }))} />
      {manual && <NumberInput label={tr('ระยะ', 'Distance')} unit={tr('กม.', 'km')} step={0.1} value={km} onChange={setKm} />}
      {manual && <NumberInput label={tr('เวลา', 'Time')} unit={tr('นาที', 'min')} value={min} onChange={setMin} />}
      {shoes.length > 0 && (
        <SelectInput label={tr('รองเท้า', 'Shoes')} className="col-span-2" value={shoeId} onChange={setShoeId}
          options={[{ value: '', label: tr('ไม่ระบุ', 'None') }, ...shoes.map(s => ({ value: s.id, label: s.name + (s.retired ? tr(' (เลิกใช้)', ' (retired)') : '') }))]} />
      )}
      <Button className="col-span-2" onClick={() => onSave({
        date, kind, shoeId: shoeId || undefined,
        ...(manual && +km > 0 && +min > 0 ? { km: +km, seconds: Math.round(+min * 60) } : {}),
      })}>{tr('บันทึกการแก้ไข', 'Save changes')}</Button>
    </div>
  )
}
