import { useEffect, useRef, useState } from 'react'
import { Footprints, Music, Square } from 'lucide-react'
import { cadenceTarget, MEASURE_SEC, spmFromCount } from '../lib/cadence'
import { useAddCadence, useCadenceGoal } from '../lib/useCadence'
import { measureCadence, metronomeSupported, motionSupported, startMetronome, stopMetronome } from '../lib/metronome'
import { usePersisted } from '../lib/storage'
import { useProgram } from '../lib/program'
import { speak } from '../lib/voice'
import { useT } from '../lib/i18n'
import { cx } from '../lib/cx'
import { Button, Disclosure } from './ui'
import { NumberInput } from './Form'

/** หน้าเริ่มวิ่ง: รอบขาตอนนี้ เป้า +5% และจังหวะเสียงให้ก้าวตาม (เปิดเองเมื่อเพิ่งเจ็บเข่า) */
export function CadenceCard() {
  const t = useT()
  const { painKnee } = useProgram()
  const { last, goal, custom, setGoal } = useCadenceGoal()
  const add = useAddCadence()
  const [count, setCount] = useState('')
  const [beatOn, setBeatOn] = usePersisted('metronome', false)
  const [preview, setPreview] = useState(false)
  useEffect(() => {
    if (!preview || !goal) return
    startMetronome(goal)
    const id = setTimeout(() => setPreview(false), 6000)
    return () => { clearTimeout(id); stopMetronome() }
  }, [preview, goal])
  const n = parseInt(count, 10)
  const counted = n >= 30 && n <= 60 ? spmFromCount(n) : null
  return (
    <Disclosure defaultOpen={painKnee}
      title={<><Footprints size={18} /> {t('รอบขา (ก้าวถี่ขึ้นช่วยเข่า)', 'Cadence (quicker steps ease the knee)')}</>}
      summary={last ? t(`ล่าสุด ${last.spm} ก้าว/นาที · เป้า ${goal}`, `Latest ${last.spm} spm · goal ${goal}`) : t('ยังไม่ได้วัด', 'Not measured yet')}>
      <div className="space-y-3 px-3.5 pb-3.5 text-sm">
        <p className="text-muted">{t(
          'ก้าวถี่ขึ้น 5–10% ที่ความเร็วเดิม (ก้าวสั้นลง เท้าลงใกล้ใต้ลำตัว) ลดแรงที่เข่าและสะโพกต่อก้าว เหมาะกับคนที่เจ็บเข่าหรือข้างเข่า เริ่มที่ +5% ก่อน ไม่ต้องไล่ให้ถึง 180 ทุกคน รอบขาที่เหมาะขึ้นกับส่วนสูงและความเร็ว',
          'Stepping 5–10% quicker at the same speed (shorter steps landing closer under you) lowers knee and hip load per step, useful for knee pain. Start at +5%; there’s no universal 180, it depends on height and speed.')}</p>
        {painKnee && <p className="rounded-xl bg-warn/10 px-3 py-2 text-warn">{t('เพิ่งเจ็บเข่า: ลองวิ่งเบาตามจังหวะเป้าวันละช่วงสั้น ๆ ก่อน แล้วค่อยยืดเป็นทั้งรอบ', 'Recent knee pain: try the goal rhythm for short stretches of easy runs first, then the whole run')}</p>}
        <div className="grid grid-cols-2 gap-2 text-center">
          <div className="rounded-xl bg-raised p-2"><div className="text-xs text-muted">{t('ตอนนี้', 'Now')}</div><b className="text-lg tabular-nums">{last?.spm ?? '–'}</b></div>
          <div className="rounded-xl bg-raised p-2"><div className="text-xs text-muted">{t('เป้า', 'Goal')}{custom ? t(' (ตั้งเอง)', ' (custom)') : ''}</div><b className="text-lg tabular-nums">{goal ?? '–'}</b></div>
        </div>
        <div className="space-y-2 rounded-xl ring-1 ring-line p-3">
          <div className="font-semibold">{t('วัดรอบขา', 'Measure cadence')}</div>
          <p className="text-muted">{motionSupported()
            ? t(`ระหว่างวิ่งเบา กด "วัดรอบขา" บนหน้าวิ่ง ถือมือถือหรือใส่กระเป๋าวิ่งต่อ ${MEASURE_SEC} วินาที หรือนับเอง: นับเท้าขวาที่แตะพื้นใน 30 วินาที`, `During an easy run, tap "Measure cadence" on the run screen and keep running ${MEASURE_SEC} s with the phone in hand or pocket. Or count: right-foot landings in 30 s.`)
            : t('นับเท้าขวาที่แตะพื้นใน 30 วินาทีระหว่างวิ่งเบา', 'Count right-foot landings in 30 s during an easy run')}</p>
          <div className="flex items-end gap-2">
            <div className="flex-1"><NumberInput label={t('เท้าขวา 30 วิ', 'Right foot, 30 s')} unit={t('ครั้ง', 'steps')} value={count} onChange={setCount} placeholder="80" /></div>
            <Button size="sm" disabled={!counted} onClick={() => { add(counted!, 'count'); setCount('') }}>{t('บันทึกรอบขา', 'Save cadence')}</Button>
          </div>
          {count && !counted && <p className="text-xs text-bad">{t('ใส่ 30–60 ครั้ง (×4 = ก้าว/นาที)', 'Enter 30–60 (×4 = steps/min)')}</p>}
          {counted && <p className="text-xs text-muted">{t(`= ${counted} ก้าว/นาที`, `= ${counted} spm`)}</p>}
        </div>
        {goal && metronomeSupported() && (
          <div className="space-y-2">
            <label className="flex items-center gap-2 rounded-xl bg-raised px-3 py-2">
              <input type="checkbox" className="size-4 accent-accent" checked={beatOn} onChange={e => setBeatOn(e.target.checked)} />
              <span className="flex-1">{t(`เปิดเสียงจังหวะ ${goal} ครั้ง/นาทีระหว่างวิ่ง (เท้าแตะพื้นตามเสียง)`, `Play a ${goal}/min beat while running (land on the click)`)}</span>
            </label>
            <div className="flex gap-2">
              <Button size="sm" variant="soft" onClick={() => setPreview(p => !p)}>{preview ? <Square size={14} /> : <Music size={14} />} {preview ? t('หยุด', 'Stop') : t('ลองฟัง', 'Preview')}</Button>
              <div className="flex-1"><NumberInput label={t('ตั้งเป้าเอง', 'Custom goal')} unit={t('ก้าว/นาที', 'spm')} value={custom ? goal : ''} placeholder={last ? String(cadenceTarget(last.spm)) : ''}
                onChange={v => { const x = parseInt(v, 10); setGoal(x >= 140 && x <= 200 ? x : null) }} /></div>
            </div>
          </div>
        )}
      </div>
    </Disclosure>
  )
}

/** ระหว่างวิ่ง: ปุ่มวัดรอบขา 30 วิ และเสียงจังหวะ (เล่นเฉพาะตอนกำลังวิ่ง) */
export function LiveCadence({ running, voice }: { running: boolean; voice: boolean }) {
  const t = useT()
  const { goal } = useCadenceGoal()
  const add = useAddCadence()
  const [beatOn, setBeatOn] = usePersisted('metronome', false)
  const [left, setLeft] = useState<number | null>(null)
  const [result, setResult] = useState<number | 'fail' | null>(null)
  const abort = useRef<AbortController | null>(null)
  const playing = beatOn && running && !!goal
  useEffect(() => {
    if (!playing) return
    startMetronome(goal!)
    return stopMetronome
  }, [playing, goal])
  useEffect(() => () => abort.current?.abort(), [])
  const measure = async () => {
    abort.current = new AbortController()
    setResult(null)
    setLeft(MEASURE_SEC)
    const spm = await measureCadence(setLeft, abort.current.signal)
    setLeft(null)
    if (abort.current.signal.aborted) return
    setResult(spm ?? 'fail')
    if (spm) {
      add(spm, 'sensor')
      if (voice) void speak(`รอบขา ${spm} ก้าวต่อนาที`)
    }
  }
  const canMeasure = motionSupported()
  if (!canMeasure && !goal) return null
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-card p-2.5 text-sm ring-1 ring-line">
      <Footprints size={16} className="shrink-0 text-run" />
      <span className="min-w-0 flex-1" role="status">
        {left !== null ? t(`กำลังวัด วิ่งต่อไป ${left} วิ`, `Measuring, keep running ${left}s`)
          : result === 'fail' ? t('วัดไม่ได้ ลองถือมือถือแน่น ๆ หรือใส่กระเป๋าแล้ววัดใหม่', 'Couldn’t measure; hold the phone firmly or pocket it and retry')
          : result ? t(`รอบขา ${result} ก้าว/นาที${goal ? ` · เป้า ${goal}` : ''}`, `Cadence ${result} spm${goal ? ` · goal ${goal}` : ''}`)
          : t('รอบขา', 'Cadence')}
      </span>
      {canMeasure && running && left === null && <Button size="sm" variant="soft" onClick={() => void measure()}>{t('วัดรอบขา', 'Measure cadence')}</Button>}
      {left !== null && <Button size="sm" variant="soft" onClick={() => abort.current?.abort()}>{t('ยกเลิก', 'Cancel')}</Button>}
      {goal && metronomeSupported() && (
        <button onClick={() => setBeatOn(!beatOn)} aria-pressed={beatOn}
          className={cx('flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold', beatOn ? 'bg-run-fill text-white' : 'bg-raised')}>
          <Music size={13} /> {t(`จังหวะ ${goal}`, `Beat ${goal}`)}
        </button>
      )}
    </div>
  )
}
