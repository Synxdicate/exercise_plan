import { useState } from 'react'
import { Check } from 'lucide-react'
import { locationInfo, programLength, programs, type LocationPref, type ProgramId } from '../data/programs'
import { useProgram } from '../lib/program'
import { daysBetween, today } from '../lib/date'
import { cx } from '../lib/cx'
import { Button, Collapse, Sheet } from './ui'
import { DateInput } from './Form'
import { clearance, useScreening } from '../lib/screening'

/** ตั้งค่าเป้าหมาย/วันแข่ง/สถานที่ฝึก — เปิดได้จากเมนูโปรไฟล์และการ์ดโปรแกรมในหน้าฝึก */
export function ProgramSheet({ onClose }: { onClose: () => void }) {
  const p = useProgram()
  const [choice, setChoice] = useState<ProgramId>(p.program)
  const [screening] = useScreening()
  const [where, setWhere] = useState<LocationPref>(p.location)
  const [date, setDate] = useState(p.raceDate)
  const weeksAway = date ? Math.ceil(daysBetween(today(), date) / 7) : null

  const save = () => {
    if (choice !== p.program) p.setProgram(choice)
    if (programs[choice].raceKm) p.setRaceDate(date)
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
      <div className="mb-2 text-sm font-semibold text-muted">เป้าหมาย</div>
      <div className="space-y-2">
        {(Object.keys(programs) as ProgramId[]).map(id => (
          <button key={id} onClick={() => setChoice(id)}
            className={cx('flex w-full items-start gap-3 rounded-2xl p-3 text-left ring-2 transition-colors active:scale-[.99]',
              choice === id ? 'bg-accent-soft/50 ring-accent' : 'bg-raised ring-transparent')}>
            <Radio on={choice === id} />
            <span className="min-w-0">
              <span className="block font-bold">{programs[id].name} <span className="font-normal text-muted">· {programLength(id)}</span></span>
              <span className="block text-sm text-muted">{programs[id].summary}</span>
            </span>
          </button>
        ))}
      </div>

      <Collapse open={!!programs[choice].raceKm}>
        <div className="pt-3">
          {screening && clearance(screening) !== 'clear' && (
            <p className="mb-3 rounded-xl bg-bad/15 p-2 text-xs text-bad">ผลเช็กสุขภาพแนะนำให้พบแพทย์ก่อนฝึกหนัก — โปรแกรมวิ่งแข่งมีวิ่ง tempo/interval ที่นับเป็นการฝึกหนัก</p>
          )}
          <DateInput label="วันแข่ง" hint="ไม่บังคับ — ใส่แล้วแอปจะนับสัปดาห์และ taper ให้เอง" value={date} onChange={setDate} />
          {!!programs[choice].raceKm && weeksAway !== null && weeksAway < programs[choice].weeks && (
            <p className="mt-2 rounded-xl bg-warn/15 p-2 text-xs text-warn">
              เหลือ {Math.max(weeksAway, 0)} สัปดาห์ น้อยกว่าโปรแกรม {programs[choice].weeks} สัปดาห์ — แอปจะเริ่มจากกลางโปรแกรม ถ้าฐานยังไม่ถึง ควรเลือกงานที่ไกลกว่านี้
            </p>
          )}
        </div>
      </Collapse>

      <div className="mb-2 mt-4 text-sm font-semibold text-muted">ฝึกเวทที่ไหน</div>
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

      <div className="mt-4 rounded-2xl bg-raised p-3 text-sm">
        <div className="mb-1 font-bold">หุ่นกับมาราธอน ทำตามลำดับดีที่สุด</div>
        <ol className="list-decimal space-y-1 pl-5 text-muted">
          <li><b className="text-ink">ตอนนี้:</b> โปรแกรมหุ่น 8–12 สัปดาห์ สร้างกล้ามและฐานวิ่ง (10–15 กม./สัปดาห์)</li>
          <li><b className="text-ink">10K 10 สัปดาห์:</b> ขยับจากวิ่ง 3 เป็น 4 วัน สร้างฐานให้พร้อมฮาล์ฟ</li>
          <li><b className="text-ink">ฮาล์ฟ 16 สัปดาห์:</b> วิ่งเป็นหลัก เวท 2 วันพอรักษากล้าม</li>
          <li><b className="text-ink">พัก 2–4 สัปดาห์</b> แล้วเข้า <b className="text-ink">ฟูล 18 สัปดาห์</b></li>
          <li>หลังแข่ง กลับมาโปรแกรมหุ่นเพื่อเพิ่มกล้ามต่อ</li>
        </ol>
      </div>

      <div className="mt-4 flex gap-2">
        <Button variant="soft" className="flex-1" onClick={onClose}>ยกเลิก</Button>
        <Button className="flex-1" onClick={save}>บันทึก</Button>
      </div>
    </Sheet>
  )
}
