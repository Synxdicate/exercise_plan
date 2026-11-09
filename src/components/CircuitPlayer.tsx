import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown, Pause, Play, SkipForward, Timer, X } from 'lucide-react'
import { buildCircuit, circuitAt, circuitFit, circuitTotal, coreCircuit, type CircuitStep } from '../lib/circuit'
import { useProgram } from '../lib/program'
import { useTodayIdx } from '../lib/useToday'
import { usePersisted } from '../lib/storage'
import { weekStart } from '../lib/date'
import { useT } from '../lib/i18n'
import { speak } from '../lib/voice'
import { uid, useSessions } from '../lib/log'
import { today } from '../lib/date'
import { useBackClose } from '../lib/back'
import { notify } from '../lib/dialog'
import { cx } from '../lib/cx'
import { Button, Card, Collapse, Portal, Segmented } from './ui'
import { ExerciseDemo } from './ExerciseDemo'

const BY_ROUNDS: Record<1 | 2, CircuitStep[]> = { 1: buildCircuit(coreCircuit, 30, 15, 1), 2: buildCircuit(coreCircuit, 30, 15, 2) }

/** การ์ดในหน้าฝึก: เซอร์กิตแกนกลาง/สะโพก บอกว่าวันนี้เหมาะไหม ทำไปกี่ครั้งแล้ว และเริ่มยังไง */
export function CircuitCard() {
  const [open, setOpen] = useState(false)
  const [how, setHow] = useState(false)
  const t = useT()
  const p = useProgram()
  const todayIdx = useTodayIdx()
  const [sessions] = useSessions()
  const done = sessions.filter(s => s.dayKey === 'circuit')
  const thisWeek = done.filter(s => weekStart(s.date) === weekStart(today())).length
  // มือใหม่เริ่ม 1 รอบ (~6 นาที) 4 ครั้งแรก แล้วค่อยเป็น 2 รอบ
  const [rounds, setRounds] = usePersisted<1 | 2>('circuitRounds', done.length < 4 ? 1 : 2)
  const steps = BY_ROUNDS[rounds]
  const fit = p.finished ? 'good' : circuitFit(p.plan(), todayIdx)
  const doneToday = done.some(s => s.date === today())
  return (
    <Card title={<span className="flex items-center gap-2"><Timer size={18} className="text-accent" /> {t('เซอร์กิตแกนกลาง/สะโพก', 'Core & hip circuit')}</span>}
      action={<span className={cx('rounded-full px-2.5 py-1 text-xs font-semibold tabular-nums', thisWeek >= 2 ? 'bg-good/15 text-good' : 'bg-raised text-muted')}>{t(`สัปดาห์นี้ ${thisWeek}/2`, `This week ${thisWeek}/2`)}</span>}>
      <p className={cx('rounded-xl p-2.5 text-sm font-semibold', doneToday || fit === 'good' ? 'bg-good/10 text-good' : fit === 'avoid' ? 'bg-warn/10 text-warn' : 'bg-raised text-muted')}>
        {doneToday ? t('ทำแล้ววันนี้', 'Done today')
          : fit === 'good' ? t('วันนี้เหมาะ ทำหลังวิ่งเบา หรือช่วงไหนก็ได้ของวันพัก', 'Good day for it — after an easy run, or any time on a rest day')
          : fit === 'avoid' ? t('วันนี้เลี่ยงไว้ก่อน วันนี้หรือพรุ่งนี้มีวิ่งยาว/วิ่งหนัก ขาควรสด', 'Skip today — a long/hard run is today or tomorrow; keep your legs fresh')
          : t('วันเวทมีท่าแกนกลางอยู่แล้ว ไม่ต้องทำเพิ่ม', 'Strength days already include core work')}
      </p>
      <div className="mt-3">
        <Segmented value={String(rounds) as '1' | '2'} onChange={v => setRounds(Number(v) as 1 | 2)} options={[
          { value: '1', label: t(`1 รอบ ~${Math.round(circuitTotal(BY_ROUNDS[1]) / 60)} นาที`, `1 round ~${Math.round(circuitTotal(BY_ROUNDS[1]) / 60)} min`) },
          { value: '2', label: t(`2 รอบ ~${Math.round(circuitTotal(BY_ROUNDS[2]) / 60)} นาที`, `2 rounds ~${Math.round(circuitTotal(BY_ROUNDS[2]) / 60)} min`) },
        ]} />
      </div>
      <Button className="mt-3 w-full" onClick={() => setOpen(true)}><Play size={16} fill="currentColor" /> {t('เริ่มเซอร์กิต', 'Start circuit')}</Button>
      <button onClick={() => setHow(!how)} aria-expanded={how} className="mt-2 flex w-full items-center justify-between py-1 text-sm font-semibold text-run">
        {t('ทำตอนไหน / เริ่มยังไง', 'When & how to start')} <ChevronDown size={16} className={cx('transition-transform', how && 'rotate-180')} />
      </button>
      <Collapse open={how}>
        <ul className="list-disc space-y-1 pl-5 pt-1 text-sm text-muted">
          <li>{t('สัปดาห์ละ 2–3 ครั้ง ทำหลังวิ่งเบา (ร่างกายอุ่นแล้ว) หรือวันพัก ไม่ทำก่อนวิ่งยาว/วิ่งหนัก', '2–3×/week, after an easy run (already warm) or on a rest day — not before a long/hard run')}</li>
          <li>{t('เริ่ม 1 รอบ 2 สัปดาห์แรก แล้วค่อยเพิ่มเป็น 2 รอบ ท่าละ 30 วิ ทำไม่ไหวพักได้ ท่าต้องถูกก่อนจะเร็ว', 'Start with 1 round for 2 weeks, then 2 rounds. 30 s per move — rest if needed; form first')}</li>
          <li>{t('ทำบนเสื่อหรือพื้นนุ่ม ไม่ต้องใช้อุปกรณ์ เสียงนำบอกท่าถัดไปให้ ปิดจอได้', 'On a mat, no equipment; the voice announces each move')}</li>
          <li>{t('หลักฐาน: การฝึกความแข็งแรงช่วยลดการบาดเจ็บจากกีฬาโดยรวม (Lauersen 2014) แต่โปรแกรมแกนกลาง/สะโพก 10 นาทีในนักวิ่งมาราธอนมือใหม่ยังไม่เห็นผลลดเจ็บชัด (Toresdahl 2020) ทำเพื่อความแข็งแรงและท่าวิ่งที่มั่นคง ไม่ใช่เกราะกันเจ็บ', 'Evidence: strength training lowers sports injuries overall (Lauersen 2014), but a 10-min core/hip program in first-time marathoners showed no clear injury reduction (Toresdahl 2020) — do it for strength and stability, not as injury armour')}</li>
        </ul>
      </Collapse>
      {open && <CircuitPlayer steps={steps} rounds={rounds} onClose={() => setOpen(false)} />}
    </Card>
  )
}

/** ตัวจับเวลาทีละท่า (เสียงนำ, จอไม่ดับ) ใช้กับเซอร์กิต (บันทึกเป็นการฝึก) และดริลล์ก่อนวิ่ง (ไม่บันทึก จบแล้วไปวิ่งต่อ) */
export function CircuitPlayer({ steps: STEPS, rounds, onClose, drills = false }: { steps: CircuitStep[]; rounds: number; onClose: () => void; drills?: boolean }) {
  const tr = useT()
  const [, setSessions] = useSessions()
  const [running, setRunning] = useState(true)
  const [elapsed, setElapsed] = useState(0)
  const last = useRef<number | null>(null)
  const spokenIdx = useRef(-1)
  useBackClose(onClose)
  const at = useMemo(() => circuitAt(STEPS, elapsed), [STEPS, elapsed])

  // นาฬิกา: นับเฉพาะตอนไม่หยุด
  useEffect(() => {
    if (!running) { last.current = null; return }
    const id = setInterval(() => {
      const now = Date.now()
      if (last.current !== null) setElapsed(e => e + (now - last.current!) / 1000)
      last.current = now
    }, 250)
    return () => clearInterval(id)
  }, [running])

  // จอไม่ดับระหว่างทำ
  useEffect(() => {
    let lock: WakeLockSentinel | undefined
    void navigator.wakeLock?.request('screen').then(l => { lock = l }).catch(() => {})
    return () => { void lock?.release().catch(() => {}) }
  }, [])

  // เสียงบอกเมื่อเปลี่ยนขั้น
  useEffect(() => {
    if (at.index === spokenIdx.current) return
    spokenIdx.current = at.index
    if (at.done) { void speak(drills ? 'ดริลล์เสร็จแล้ว ไปวิ่งได้เลย' : 'จบเซอร์กิตแล้ว เยี่ยมมาก'); return }
    void speak(at.step.kind === 'work' ? `เริ่ม ${at.step.station.th}` : `พัก ต่อไป ${at.step.station.th}`)
  }, [at, drills])

  const finish = () => {
    setSessions(prev => [...prev, { id: uid(), date: today(), mode: 'park', dayKey: 'circuit', title: 'เซอร์กิตแกนกลาง/สะโพก', entries: [], rpe: 5, minutes: Math.max(1, Math.round(elapsed / 60)) }])
    notify(tr('บันทึกเซอร์กิตแล้ว', 'Circuit saved'), 'good')
    onClose()
  }
  const skip = () => {
    const t = STEPS.slice(0, at.index + 1).reduce((a, s) => a + s.sec, 0)
    setElapsed(t)
  }
  const work = at.step.kind === 'work'
  const pct = at.done ? 1 : 1 - at.left / at.step.sec

  return (
    <Portal>
      <div className="fixed inset-0 z-50 animate-sheet-up overflow-y-auto bg-bg">
        <div className="mx-auto flex min-h-full max-w-lg flex-col gap-4 p-4 pb-[calc(var(--sab)+1rem)] pt-[calc(var(--sat)+1rem)]">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-muted">{drills ? tr('ดริลล์ก่อนวิ่ง', 'Pre-run drills') : <>{tr('รอบ', 'Round')} {at.step.round}/{rounds}</>} · {tr('ขั้น', 'step')} {Math.min(at.index + 1, STEPS.length)}/{STEPS.length}</span>
            <button onClick={onClose} aria-label={tr('ปิด', 'Close')} className="grid size-9 place-items-center rounded-full bg-raised"><X size={18} /></button>
          </div>
          {at.done ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
              <div className="text-2xl font-extrabold">{drills ? tr('ดริลล์เสร็จแล้ว', 'Drills done') : tr('จบเซอร์กิตแล้ว', 'Circuit done')}</div>
              {drills ? (
                <>
                  <p className="text-sm text-muted">{tr('ร่างกายอุ่นแล้ว เริ่มวิ่งภายในไม่กี่นาที อย่าพักนานจนตัวเย็น', 'You’re warm — start running within a few minutes, before you cool down')}</p>
                  <Button size="lg" onClick={onClose}>{tr('ไปเริ่มวิ่ง', 'Go run')}</Button>
                </>
              ) : (
                <>
                  <p className="text-sm text-muted">{tr(`${Math.round(elapsed / 60)} นาที บันทึกไว้ในประวัติการฝึกได้เลย`, `${Math.round(elapsed / 60)} min — save it to your workout history`)}</p>
                  <Button size="lg" onClick={finish}>{tr('บันทึก', 'Save')}</Button>
                </>
              )}
            </div>
          ) : (
            <>
              <div className={cx('rounded-3xl p-5 text-center', work ? 'bg-accent-fill text-white' : 'bg-raised')}>
                <div className="text-sm font-semibold opacity-80">{work ? tr('ทำท่า', 'Go') : tr('พัก ต่อไป', 'Rest — next')}</div>
                <div className="text-xl font-bold">{tr(at.step.station.th, at.step.station.en ?? at.step.station.name)}</div>
                <div className="mt-2 text-7xl font-extrabold tabular-nums">{Math.ceil(at.left)}</div>
                <div className="mx-auto mt-3 h-2 max-w-60 overflow-hidden rounded-full bg-black/15">
                  <div className={cx('h-full rounded-full', work ? 'bg-white' : 'bg-accent-fill')} style={{ width: `${pct * 100}%` }} />
                </div>
              </div>
              <ExerciseDemo key={at.step.station.name} name={at.step.station.name} />
              {at.step.station.how && <p className="text-sm text-muted">{tr(at.step.station.how, at.step.station.howEn ?? at.step.station.how)}</p>}
              <div className="mt-auto flex items-center justify-center gap-4">
                <button onClick={() => setRunning(!running)} aria-label={running ? tr('หยุด', 'Pause') : tr('ทำต่อ', 'Resume')} className="grid size-16 place-items-center rounded-full bg-accent-fill text-white shadow-lg">
                  {running ? <Pause size={28} fill="currentColor" /> : <Play size={28} fill="currentColor" />}
                </button>
                <button onClick={skip} aria-label={tr('ข้าม', 'Skip')} className="grid size-12 place-items-center rounded-full bg-raised"><SkipForward size={20} /></button>
              </div>
            </>
          )}
        </div>
      </div>
    </Portal>
  )
}
