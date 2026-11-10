import { useState } from 'react'
import { Bike } from 'lucide-react'
import type { Day } from '../data/workouts'
import { crossKinds, crossKindsEn, uid, useCross, useRuns, type CrossKind } from '../lib/log'
import { crossMinutes, easyPaceRef } from '../lib/pace'
import { useToday } from '../lib/useToday'
import { useT } from '../lib/i18n'
import { notify } from '../lib/dialog'
import { Button, Segmented, Sheet } from './ui'
import { NumberInput } from './Form'

const KINDS: CrossKind[] = ['bike', 'elliptical', 'swim', 'aquajog']

/** วันวิ่งเบาที่ขาล้า/เจ็บ: ปั่นจักรยาน (หรือคาร์ดิโออื่น) ระดับพูดได้แทน เวลาเท่ากับวิ่ง บันทึกเป็นคาร์ดิโอทดแทนและติ๊กวันนั้นว่าทำแล้ว */
export function CrossInstead({ day, date, done, setDone }: { day: Day; date: string; done: boolean; setDone: (v: boolean) => void }) {
  const t = useT()
  const today = useToday()
  const [runs] = useRuns()
  const [, setCross] = useCross()
  const [open, setOpen] = useState(false)
  const [kind, setKind] = useState<CrossKind>('bike')
  const [minutes, setMinutes] = useState('')
  if (day.type !== 'run' || day.runKind !== 'easy' || done || date > today) return null
  const suggested = crossMinutes(day, easyPaceRef(runs, today))

  const save = () => {
    const m = Number(minutes || suggested)
    if (!(m > 0)) return
    setCross(prev => [...prev, { id: uid(), date, kind, minutes: m, rpe: 3 }].sort((a, b) => a.date.localeCompare(b.date)))
    setDone(true)
    setOpen(false)
    notify(t(`บันทึก${crossKinds[kind]} ${m} นาที แทนวิ่งเบาแล้ว`, `Logged ${m} min of ${crossKindsEn[kind].toLowerCase()} instead of the easy run`), 'good')
  }

  return (
    <>
      <Button variant="soft" className="w-full" onClick={() => { setMinutes(String(suggested)); setOpen(true) }}>
        <Bike size={18} /> {t('ขาล้า? ปั่นจักรยานแทน', 'Legs tired? Cycle instead')}
      </Button>
      {open && (
        <Sheet onClose={() => setOpen(false)} title={t('คาร์ดิโอแทนวิ่งเบา', 'Cardio instead of the easy run')}>
          <Segmented value={kind} onChange={setKind} options={KINDS.map(k => ({ value: k, label: t(crossKinds[k], crossKindsEn[k]) }))} />
          <NumberInput className="mt-3" label={t('เวลา', 'Time')} unit={t('นาที', 'min')} step={5} stepper value={minutes} onChange={setMinutes}
            hint={t(`เท่ากับเวลาวิ่งเบาวันนี้ (~${suggested} นาที)`, `Same time as today's easy run (~${suggested} min)`)} />
          <p className="mt-3 rounded-xl bg-raised p-3 text-sm text-muted">
            {t('ระดับเบา พูดเป็นประโยคได้ (โซน 2) ช่วยรักษาความฟิตของหัวใจได้ (Eyestone 1993) แต่ไม่ได้ฝึกกระดูก เอ็น และน่องให้รับแรงกระแทกแบบวิ่ง ใช้แทนวันที่ขาล้าหรือเจ็บ ไม่ควรแทนวันวิ่งเป็นประจำ',
              'Easy, conversational (zone 2). It keeps your aerobic fitness (Eyestone 1993) but doesn’t train bones, tendons and calves for running impact: use it on tired or sore days, not as a regular swap')}
          </p>
          <Button className="mt-3 w-full" onClick={save}>{t('บันทึกว่าทำแล้ว', 'Log it as done')}</Button>
        </Sheet>
      )}
    </>
  )
}
