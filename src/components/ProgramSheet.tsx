import { useState } from 'react'
import { Check } from 'lucide-react'
import { locationInfo, programs, type LocationPref, type ProgramId } from '../data/programs'
import { useProgram } from '../lib/program'
import { daysBetween, today } from '../lib/date'
import { cx } from '../lib/cx'
import { Button, Collapse, Sheet } from './ui'
import { DateInput, NumberInput } from './Form'
import { ProgramPicker } from './ProgramPicker'
import { clearance, useScreening } from '../lib/screening'

/** ตั้งค่าเป้าหมาย/วันแข่ง/สถานที่ฝึก — เปิดได้จากเมนูโปรไฟล์และการ์ดโปรแกรมในหน้าฝึก */
export function ProgramSheet({ onClose }: { onClose: () => void }) {
  const p = useProgram()
  const [choice, setChoice] = useState<ProgramId>(p.program)
  const [screening] = useScreening()
  const [where, setWhere] = useState<LocationPref>(p.location)
  const [date, setDate] = useState(p.raceDate)
  const [km, setKm] = useState(choice === p.program && p.raceKm !== programs[p.program].raceKm ? String(p.raceKm ?? '') : '')
  const weeksAway = date ? Math.ceil(daysBetween(today(), date) / 7) : null

  const save = () => {
    if (choice !== p.program) p.setProgram(choice)
    if (programs[choice].raceKm) {
      p.setRaceDate(date)
      const n = Number(km)
      p.setRaceKm(n > 0 && n !== programs[choice].raceKm ? n : null)
    }
    p.setLocationPref(where)
    onClose()
  }

  const Radio = ({ on }: { on: boolean }) => (
    <span className={cx('mt-0.5 grid size-5 shrink-0 place-items-center rounded-full ring-2 transition-colors', on ? 'bg-accent ring-accent' : 'ring-line')}>
      {on && <Check size={12} className="animate-pop text-white" strokeWidth={3} />}
    </span>
  )

  return (
    <Sheet onClose={onClose} title="ตั้งค่าโปรแกรม">
      <ProgramPicker value={choice} onChange={setChoice} />

      <Collapse open={!!programs[choice].raceKm}>
        <div className="pt-3">
          {screening && clearance(screening) !== 'clear' && (
            <p className="mb-3 rounded-xl bg-bad/15 p-2 text-xs text-bad">ผลเช็กสุขภาพแนะนำให้พบแพทย์ก่อนฝึกหนัก — โปรแกรมวิ่งแข่งมีวิ่ง tempo/interval ที่นับเป็นการฝึกหนัก</p>
          )}
          <DateInput label="วันแข่ง" hint="ไม่บังคับ — ใส่แล้วแอปจะนับสัปดาห์และ taper ให้เอง" value={date} onChange={setDate} />
          <NumberInput className="mt-2" label="ระยะงานจริง" unit="กม." step={0.05} value={km} placeholder={String(programs[choice].raceKm)}
            hint={`ไม่ใส่ = ${programs[choice].raceKm} กม. · งานมินิแต่ละงานยาวไม่เท่ากัน`} onChange={setKm} />
          {!!programs[choice].raceKm && weeksAway !== null && weeksAway < programs[choice].weeks && (
            <p className="mt-2 rounded-xl bg-warn/15 p-2 text-xs text-warn">
              เหลือ {Math.max(weeksAway, 0)} สัปดาห์ น้อยกว่าโปรแกรม {programs[choice].weeks} สัปดาห์ — แอปจะเริ่มจากกลางโปรแกรม ถ้าฐานยังไม่ถึง ควรเลือกงานที่ไกลกว่านี้
            </p>
          )}
        </div>
      </Collapse>

      <div className="mb-2 mt-5 text-sm font-semibold text-muted">ฝึกเวทที่ไหน</div>
      <div className="space-y-2">
        {(['mix', 'gym', 'park'] as LocationPref[]).map(id => (
          <button key={id} onClick={() => setWhere(id)}
            className={cx('flex w-full items-start gap-3 rounded-2xl p-3 text-left ring-2 transition-colors active:scale-[.99]',
              where === id ? 'bg-accent-soft/50 ring-accent' : 'bg-raised ring-transparent')}>
            <Radio on={where === id} />
            <span className="min-w-0">
              <span className="block font-bold">{locationInfo[id].label}</span>
              <span className="block text-sm text-muted">{locationInfo[id].text}</span>
            </span>
          </button>
        ))}
      </div>
      <p className="mt-2 text-xs text-muted">สลับที่เฉพาะวันได้ในหน้าฝึก</p>

      <div className="mt-4 flex gap-2">
        <Button variant="soft" className="flex-1" onClick={onClose}>ยกเลิก</Button>
        <Button className="flex-1" onClick={save}>บันทึก</Button>
      </div>
    </Sheet>
  )
}
