import { useEffect, useMemo, useRef, useState } from 'react'
import { Pause, Play, SkipForward, Timer, X } from 'lucide-react'
import { buildCircuit, circuitAt, circuitTotal, coreCircuit } from '../lib/circuit'
import { speak } from '../lib/voice'
import { uid, useSessions } from '../lib/log'
import { today } from '../lib/date'
import { useBackClose } from '../lib/back'
import { notify } from '../lib/dialog'
import { cx } from '../lib/cx'
import { Button, Card, Portal } from './ui'
import { ExerciseDemo } from './ExerciseDemo'

const STEPS = buildCircuit(coreCircuit)
const TOTAL = circuitTotal(STEPS)

/** การ์ดในหน้าฝึก: เริ่มเซอร์กิตแกนกลาง/สะโพก */
export function CircuitCard() {
  const [open, setOpen] = useState(false)
  return (
    <Card title={<span className="flex items-center gap-2"><Timer size={18} className="text-accent" /> เซอร์กิตแกนกลาง/สะโพก</span>}>
      <p className="text-sm text-muted">8 ท่า × 2 รอบ ท่าละ 30 วิ พัก 15 วิ (~{Math.round(TOTAL / 60)} นาที) ใช้ร่างกายอย่างเดียว — แกนกลางและสะโพกเป็นจุดอ่อนที่พบบ่อยของนักวิ่ง ทำหลังวิ่งเบาหรือวันพักได้</p>
      <Button className="mt-3 w-full" onClick={() => setOpen(true)}><Play size={16} fill="currentColor" /> เริ่มเซอร์กิต</Button>
      {open && <CircuitPlayer onClose={() => setOpen(false)} />}
    </Card>
  )
}

function CircuitPlayer({ onClose }: { onClose: () => void }) {
  const [, setSessions] = useSessions()
  const [running, setRunning] = useState(true)
  const [elapsed, setElapsed] = useState(0)
  const last = useRef<number | null>(null)
  const spokenIdx = useRef(-1)
  useBackClose(onClose)
  const at = useMemo(() => circuitAt(STEPS, elapsed), [elapsed])

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
    if (at.done) { void speak('จบเซอร์กิตแล้ว เยี่ยมมาก'); return }
    void speak(at.step.kind === 'work' ? `เริ่ม ${at.step.station.th}` : `พัก ต่อไป ${at.step.station.th}`)
  }, [at])

  const finish = () => {
    setSessions(prev => [...prev, { id: uid(), date: today(), mode: 'park', dayKey: 'circuit', title: 'เซอร์กิตแกนกลาง/สะโพก', entries: [], rpe: 5, minutes: Math.max(1, Math.round(elapsed / 60)) }])
    notify('บันทึกเซอร์กิตแล้ว', 'good')
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
            <span className="text-sm font-semibold text-muted">รอบ {at.step.round}/2 · ขั้น {Math.min(at.index + 1, STEPS.length)}/{STEPS.length}</span>
            <button onClick={onClose} aria-label="ปิด" className="grid size-9 place-items-center rounded-full bg-raised"><X size={18} /></button>
          </div>
          {at.done ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
              <div className="text-2xl font-extrabold">จบเซอร์กิตแล้ว</div>
              <p className="text-sm text-muted">{Math.round(elapsed / 60)} นาที — บันทึกไว้ในประวัติการฝึกได้เลย</p>
              <Button size="lg" onClick={finish}>บันทึก</Button>
            </div>
          ) : (
            <>
              <div className={cx('rounded-3xl p-5 text-center', work ? 'bg-accent text-white' : 'bg-raised')}>
                <div className="text-sm font-semibold opacity-80">{work ? 'ทำท่า' : 'พัก — ต่อไป'}</div>
                <div className="text-xl font-bold">{at.step.station.th}</div>
                <div className="mt-2 text-7xl font-extrabold tabular-nums">{Math.ceil(at.left)}</div>
                <div className="mx-auto mt-3 h-2 max-w-60 overflow-hidden rounded-full bg-black/15">
                  <div className={cx('h-full rounded-full', work ? 'bg-white' : 'bg-accent')} style={{ width: `${pct * 100}%` }} />
                </div>
              </div>
              <ExerciseDemo key={at.step.station.name} name={at.step.station.name} />
              <div className="mt-auto flex items-center justify-center gap-4">
                <button onClick={() => setRunning(!running)} aria-label={running ? 'หยุด' : 'ทำต่อ'} className="grid size-16 place-items-center rounded-full bg-accent text-white shadow-lg">
                  {running ? <Pause size={28} fill="currentColor" /> : <Play size={28} fill="currentColor" />}
                </button>
                <button onClick={skip} aria-label="ข้าม" className="grid size-12 place-items-center rounded-full bg-raised"><SkipForward size={20} /></button>
              </div>
            </>
          )}
        </div>
      </div>
    </Portal>
  )
}
