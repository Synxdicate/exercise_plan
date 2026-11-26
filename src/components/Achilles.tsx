import { useState, type ReactNode } from 'react'
import { Activity, ExternalLink } from 'lucide-react'
import { LAST, logRehab, rehabDue, rehabNext, rehabToday, settle, STAGE_DAYS, STAGE_SESSIONS, STAGES, startRehab, type Rehab } from '../lib/achilles'
import type { Readiness } from '../lib/readiness'
import type { TendonLog } from '../lib/tendon'
import { TENDON_LIMIT } from '../lib/tendon'
import { useLegTests } from '../lib/legTests'
import { usePersisted } from '../lib/storage'
import { useToday } from '../lib/useToday'
import { addDays } from '../lib/date'
import { useNav } from '../lib/nav'
import { ask } from '../lib/dialog'
import { yt } from '../data/workouts'
import { useT } from '../lib/i18n'
import { cx } from '../lib/cx'
import { Button } from './ui'

/** หน้าหลัก: เสนอโปรแกรมคืนสภาพเอ็นร้อยหวายเมื่อเจ็บซ้ำ แล้วพาทำทีละขั้น (achilles.ts) */
export function AchillesCard() {
  const t = useT()
  const today = useToday()
  const nav = useNav()
  const [rehab, setRehab] = usePersisted<Rehab | null>('achillesRehab', null)
  const [readiness] = usePersisted<Record<string, Readiness>>('readiness', {})
  const [tendon] = usePersisted<TendonLog>('tendonLog', {})
  const [tests] = useLegTests()
  // ไม่เริ่มตอนนี้: ซ่อน 14 วัน / จบโปรแกรมแล้ว: ซ่อนการ์ดแสดงผล
  const [later, setLater] = usePersisted('rehabLater', '')
  const [doneSeen, setDoneSeen] = usePersisted('rehabDoneSeen', '')
  const [, setProgressView] = usePersisted('progressView', 'workouts')
  const [logging, setLogging] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  const box = (children: ReactNode) => (
    <section className="animate-fade-up rounded-2xl bg-card p-3.5 shadow-sm ring-1 ring-line">
      <div className="flex items-start gap-3">
        <Activity size={18} className="mt-0.5 shrink-0 text-run" />
        <div className="min-w-0 flex-1 space-y-2 text-sm">{children}</div>
      </div>
    </section>
  )

  if (!rehab || rehab.off) {
    const offered = rehabDue(readiness, tendon, today) && !(later && today < addDays(later, 14)) && !(rehab?.off && today < addDays(rehab.off, 14))
    if (!offered) return null
    return box(<>
      <div className="font-bold">{t('เอ็นร้อยหวายเจ็บซ้ำ: เริ่มโปรแกรมคืนสภาพ', 'Achilles keeps hurting: start a rehab program')}</div>
      <p className="text-muted">{t(
        `แผนถนอมขาแค่ตัดของหนักออก แต่เอ็นจะแข็งแรงขึ้นจากการรับแรงเพิ่มทีละขั้น ${STAGES.length} ขั้น จากเขย่งค้างถึงกระโดดเขย่ง วันเว้นวัน ครั้งละ ~10 นาที ขยับขั้นเมื่อทำได้ไม่ปวดเกิน 3 จาก 10 และเช้าวันรุ่งขึ้นไม่แย่ลง ระหว่างนี้แผนจะงดท่ากระโดด`,
        `The leg-friendly plan only removes hard work; the tendon gets stronger from load added step by step. ${STAGES.length} stages from calf holds to hops, every other day, ~10 minutes. You move up when it stays ≤3/10 and the next morning isn’t worse. Jumps stay out of the plan meanwhile.`)}</p>
      <div className="flex gap-2">
        <Button size="sm" onClick={() => setRehab(startRehab(today))}>{t('เริ่มโปรแกรม', 'Start program')}</Button>
        <Button size="sm" variant="soft" onClick={() => setLater(today)}>{t('ไว้ก่อน', 'Not now')}</Button>
      </div>
    </>)
  }

  if (rehab.done) {
    if (doneSeen === rehab.done) return null
    return box(<>
      <div className="font-bold">{t('ผ่านโปรแกรมคืนสภาพเอ็นร้อยหวายครบทุกขั้น', 'Achilles rehab complete')}</div>
      <p className="text-muted">{t('ท่ากระโดดกลับมาในแผนแล้ว เขย่งน่องต่อสัปดาห์ละ 2 ครั้งเพื่อคงความแข็งแรง ถ้ากลับมาเจ็บซ้ำ แอปจะเสนอโปรแกรมอีกครั้ง', 'Jumps are back in the plan. Keep calf raises twice a week to hold on to it; if the pain returns, the app will offer the program again.')}</p>
      <Button size="sm" variant="soft" onClick={() => setDoneSeen(rehab.done!)}>{t('รับทราบ', 'Got it')}</Button>
    </>)
  }

  const cur = settle(rehab, tendon, today)
  const st = STAGES[cur.stage]
  const n = rehabNext(cur, tests, today)
  const inStage = cur.sessions.filter(s => s.stage === cur.stage && s.date >= cur.stageStart).length
  const doneToday = cur.sessions.some(s => s.date === today)
  const rest = !doneToday && !rehabToday(cur, today)
  const log = (pain: number) => {
    const next = logRehab(rehab, pain, tendon, tests, today)
    setRehab(next)
    setLogging(false)
    setMsg(next.done ? null
      : next.stage > cur.stage ? t(`ขึ้นขั้น ${next.stage + 1} ตั้งแต่ครั้งหน้า: ${STAGES[next.stage].th}`, `Stage ${next.stage + 1} from next time: ${STAGES[next.stage].name}`)
      : next.stage < cur.stage || pain > TENDON_LIMIT ? t('ปวดเกิน 3 จาก 10 ครั้งหน้าถอยกลับขั้นที่เบากว่า แล้วค่อยขยับใหม่', 'Over 3/10: next time drops back a stage, then builds up again')
      : t('บันทึกแล้ว พรุ่งนี้เช้าตอบเช็กขาด้วย', 'Saved. Answer the morning leg check tomorrow'))
  }
  return box(<>
    <div className="flex items-center gap-2">
      <div className="flex-1 font-bold">{t(`คืนสภาพเอ็นร้อยหวาย ขั้น ${cur.stage + 1}/${STAGES.length}`, `Achilles rehab stage ${cur.stage + 1}/${STAGES.length}`)}</div>
      <div className="flex gap-0.5" aria-hidden>
        {STAGES.map((_, i) => <span key={i} className={cx('h-1.5 w-4 rounded-full', i <= cur.stage ? 'bg-run-fill' : 'bg-raised')} />)}
      </div>
    </div>
    {cur.backed && <p className="rounded-xl bg-warn/10 p-2.5">{t('เช้าหลังทำครั้งก่อนปวดมากขึ้นหรือเกิน 3 จาก 10 ถอยกลับมาขั้นนี้ก่อน', 'The morning after last session was worse or over 3/10, so you’re back on this stage')}</p>}
    <div className="rounded-xl bg-raised p-2.5">
      <div className="font-semibold">{st.name} <span className="font-normal text-muted">{t(st.th, '')}</span></div>
      <div className="tabular-nums">{t(st.dose, st.doseEn)}</div>
      <p className="mt-1 text-muted">{t(st.how, st.howEn)}</p>
      <a href={yt(st.video)} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-accent">{t('ดูวิดีโอ', 'Watch a video')} <ExternalLink size={12} /></a>
    </div>
    <p className="text-muted">{n.kind === 'test'
      ? t('ทำครบขั้นนี้แล้ว ก่อนขึ้นขั้นกระโดดต้องทดสอบเขย่งขาเดียวให้ได้ ≥25 ครั้งทั้งสองข้าง', 'Stage complete. Before the hopping stage, pass the single-leg calf raise test (≥25 each side)')
      : t(`ขั้นนี้ทำแล้ว ${inStage}/${STAGE_SESSIONS} ครั้ง${n.kind === 'stay' && n.days ? ` อยู่ขั้นนี้อีกอย่างน้อย ${n.days} วัน` : ''} ขยับขั้นเมื่อครบ ${STAGE_SESSIONS} ครั้งใน ${STAGE_DAYS} วันขึ้นไป ปวดไม่เกิน 3 จาก 10`,
        `This stage: ${inStage}/${STAGE_SESSIONS} sessions${n.kind === 'stay' && n.days ? `, at least ${n.days} more days here` : ''}. Move up after ${STAGE_SESSIONS} sessions over ${STAGE_DAYS}+ days at ≤3/10`)}</p>
    {msg && <p role="status" className="rounded-xl bg-good/10 p-2.5">{msg}</p>}
    {n.kind === 'test' && <Button size="sm" variant="soft" onClick={() => { setProgressView('fitness'); nav('progress') }}>{t('ไปทดสอบเขย่ง', 'Take the calf test')}</Button>}
    <div className="flex flex-wrap items-center justify-between gap-2">
      {doneToday ? <p className="font-semibold text-good">{t('วันนี้ทำแล้ว', 'Done today')}</p>
        : rest ? <p className="text-muted">{t('เมื่อวานทำแล้ว วันนี้พักให้เอ็นฟื้น ทำพรุ่งนี้', 'Done yesterday: rest the tendon today, next session tomorrow')}</p>
        : logging ? (
          <div className="w-full">
            <div className="mb-1.5 font-semibold">{t('ระหว่างทำปวดกี่คะแนน', 'Pain during the session?')}</div>
            <div className="grid grid-cols-11 gap-1">
              {Array.from({ length: 11 }, (_, k) => (
                <button key={k} onClick={() => log(k)}
                  className={cx('rounded-lg py-2 text-sm font-bold tabular-nums', k === 0 ? 'bg-good/15 text-good' : k <= TENDON_LIMIT ? 'bg-warn/15 text-warn' : 'bg-bad/15 text-bad')}>
                  {k}<span className="sr-only">{t(' จาก 10', ' of 10')}</span>
                </button>
              ))}
            </div>
          </div>
        ) : <Button size="sm" onClick={() => setLogging(true)}>{t('ทำขั้นนี้ครบแล้ว', 'Finished this session')}</Button>}
      {cur.stage < LAST && !logging && (
        <button className="text-xs text-muted underline" onClick={() => void (async () => { if (await ask(t('หยุดโปรแกรมคืนสภาพเอ็นร้อยหวาย? ท่ากระโดดจะกลับมาในแผน', 'Stop the Achilles rehab program? Jumps come back into the plan.'))) setRehab({ ...rehab, off: today }) })()}>{t('หยุดโปรแกรม', 'Stop the program')}</button>
      )}
    </div>
  </>)
}
