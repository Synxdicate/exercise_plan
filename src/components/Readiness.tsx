import { useEffect, useState } from 'react'
import { BatteryLow, BatteryMedium, BatteryFull, Play, Moon } from 'lucide-react'
import { usePersisted } from '../lib/storage'
import { today } from '../lib/date'
import { cx } from '../lib/cx'
import { readinessLevel, type Level, type Readiness } from '../lib/readiness'
import { Button, Sheet } from './ui'

const advice: Record<'strength' | 'run', Record<Level, string>> = {
  strength: {
    green: 'พร้อมเต็มที่ — ฝึกตามแผนได้เลย',
    yellow: 'ฝึกได้แต่เบาลง: ลด 1 เซ็ตทุกท่า และหยุดก่อนหมดแรง 3 ครั้ง',
    red: 'วันนี้ควรพัก หรือเดิน/ยืดเหยียดเบา ๆ แทน — ฝึกหนักตอนล้ามากเพิ่มความเสี่ยงบาดเจ็บ',
  },
  run: {
    green: 'พร้อมเต็มที่ — วิ่งตามแผนได้เลย',
    yellow: 'เปลี่ยนเป็น Easy run และลดระยะเหลือ ~70% ของแผน',
    red: 'วันนี้ควรพัก — ถ้าอยากขยับ เดินเร็ว 20–30 นาทีพอ',
  },
}

const Choice = <T,>({ value, on, onPick, label }: { value: T; on: boolean; onPick: (v: T) => void; label: string }) => (
  <button onClick={() => onPick(value)} className={cx('flex-1 rounded-2xl px-2 py-2.5 text-sm font-semibold ring-2 transition-colors',
    on ? 'bg-accent-soft text-accent ring-accent' : 'bg-raised text-ink ring-transparent')}>{label}</button>
)

/** ถาม 3 ข้อก่อนเริ่มฝึก แล้วแนะนำว่าควรฝึกเต็ม ฝึกเบา หรือพัก */
export function ReadinessSheet({ kind, onClose, onProceed }: { kind: 'strength' | 'run'; onClose: () => void; onProceed: (light: boolean) => void }) {
  const [log, setLog] = usePersisted<Record<string, Readiness & { level: Level }>>('readiness', {})
  const [r, setR] = useState<Readiness>(() => log[today()] ?? { sleep: 0, sore: 0, pain: false })
  const level = readinessLevel(r)
  const Icon = level === 'green' ? BatteryFull : level === 'yellow' ? BatteryMedium : BatteryLow

  // ถามวันละครั้งพอ — ถ้าวันนี้ตอบแล้วและไม่ใช่ระดับแดง เริ่มได้เลยไม่ต้องถามซ้ำ
  const answered = log[today()]
  useEffect(() => {
    if (answered && answered.level !== 'red') onProceed(answered.level === 'yellow')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  if (answered && answered.level !== 'red') return null

  const go = (light: boolean) => {
    setLog(prev => ({ ...prev, [today()]: { ...r, level } }))
    onProceed(light)
  }

  return (
    <Sheet onClose={onClose} title="เช็กความพร้อมก่อนเริ่ม">
      <div className="space-y-4">
        <div>
          <div className="mb-1.5 text-sm text-muted">เมื่อคืนนอนกี่ชั่วโมง</div>
          <div className="flex gap-2">
            <Choice value={0 as const} on={r.sleep === 0} onPick={v => setR({ ...r, sleep: v })} label="7+ ชม." />
            <Choice value={1 as const} on={r.sleep === 1} onPick={v => setR({ ...r, sleep: v })} label="6–7 ชม." />
            <Choice value={2 as const} on={r.sleep === 2} onPick={v => setR({ ...r, sleep: v })} label="น้อยกว่า 6" />
          </div>
        </div>
        <div>
          <div className="mb-1.5 text-sm text-muted">ร่างกายรู้สึกยังไง</div>
          <div className="flex gap-2">
            <Choice value={0 as const} on={r.sore === 0} onPick={v => setR({ ...r, sore: v })} label="สดชื่น" />
            <Choice value={1 as const} on={r.sore === 1} onPick={v => setR({ ...r, sore: v })} label="เมื่อยนิดหน่อย" />
            <Choice value={2 as const} on={r.sore === 2} onPick={v => setR({ ...r, sore: v })} label="ล้ามาก" />
          </div>
        </div>
        <div>
          <div className="mb-1.5 text-sm text-muted">มีจุดที่เจ็บแปลบ หรือเจ็บข้อต่อไหม</div>
          <div className="flex gap-2">
            <Choice value={false} on={!r.pain} onPick={v => setR({ ...r, pain: v })} label="ไม่มี" />
            <Choice value={true} on={r.pain} onPick={v => setR({ ...r, pain: v })} label="มี" />
          </div>
        </div>

        <div key={level} className={cx('flex animate-fade-up gap-3 rounded-2xl p-3 text-sm',
          level === 'green' ? 'bg-good/15 text-good' : level === 'yellow' ? 'bg-warn/15 text-warn' : 'bg-bad/15 text-bad')}>
          <Icon size={22} className="shrink-0" />
          <span>{r.pain ? 'หลีกเลี่ยงท่าหรือการวิ่งที่ทำให้จุดนั้นเจ็บ ถ้าเจ็บเกิน 3 วันหรือบวม ควรพบแพทย์/นักกายภาพ — ' : ''}{advice[kind][level]}</span>
        </div>

        <div className="flex gap-2">
          {level === 'red' ? (
            <>
              <Button variant="soft" className="flex-1" onClick={() => go(true)}>ฝึกเบา ๆ อยู่ดี</Button>
              <Button variant="success" className="flex-1" onClick={() => { setLog(prev => ({ ...prev, [today()]: { ...r, level } })); onClose() }}><Moon size={16} /> พักวันนี้</Button>
            </>
          ) : (
            <Button size="lg" className="w-full" onClick={() => go(level === 'yellow')}>
              <Play size={18} fill="currentColor" /> {level === 'yellow' ? 'เริ่มแบบเบาลง' : 'เริ่มเลย'}
            </Button>
          )}
        </div>
      </div>
    </Sheet>
  )
}
