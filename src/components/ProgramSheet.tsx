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
import { useLang, useT } from '../lib/i18n'

/** ตั้งค่าเป้าหมาย/วันแข่ง/สถานที่ฝึก เปิดได้จากเมนูโปรไฟล์และการ์ดโปรแกรมในหน้าฝึก */
export function ProgramSheet({ onClose }: { onClose: () => void }) {
  const p = useProgram()
  const t = useT()
  const en = useLang()[0] === 'en'
  const [choice, setChoice] = useState<ProgramId>(p.program)
  const [screening] = useScreening()
  const [where, setWhere] = useState<LocationPref>(p.location)
  const [date, setDate] = useState(p.raceDate)
  const [km, setKm] = useState(choice === p.program && p.raceKm !== programs[p.program].raceKm ? String(p.raceKm ?? '') : '')
  const [hills, setHills] = useState(p.raceHills)
  const [cutoff, setCutoff] = useState(choice === p.program && p.raceCutoff ? String(p.raceCutoff) : '')
  const weeksAway = date ? Math.ceil(daysBetween(today(), date) / 7) : null

  const save = () => {
    if (choice !== p.program) p.setProgram(choice)
    if (programs[choice].raceKm) {
      p.setRaceDate(date)
      const n = Number(km)
      p.setRaceKm(n > 0 && n !== programs[choice].raceKm ? n : null)
      p.setRaceCutoff(Number(cutoff) > 0 ? Number(cutoff) : null)
      p.setRaceHills(hills)
    }
    p.setLocationPref(where)
    onClose()
  }

  const Radio = ({ on }: { on: boolean }) => (
    <span className={cx('mt-0.5 grid size-5 shrink-0 place-items-center rounded-full ring-2 transition-colors', on ? 'bg-accent-fill ring-accent' : 'ring-line')}>
      {on && <Check size={12} className="animate-pop text-white" strokeWidth={3} />}
    </span>
  )

  return (
    <Sheet onClose={onClose} title={t('ตั้งค่าโปรแกรม', 'Program settings')}>
      <ProgramPicker value={choice} onChange={setChoice} />

      <Collapse open={!!programs[choice].raceKm}>
        <div className="pt-3">
          {screening && clearance(screening) !== 'clear' && (
            <p className="mb-3 rounded-xl bg-bad/15 p-2 text-xs text-bad">{t('ผลเช็กสุขภาพแนะนำให้พบแพทย์ก่อนฝึกหนัก โปรแกรมวิ่งแข่งมีวิ่ง tempo/interval ที่นับเป็นการฝึกหนัก', 'Your health check suggests seeing a doctor before vigorous training — race programs include tempo/interval runs')}</p>
          )}
          <DateInput label={t('วันแข่ง', 'Race date')} hint={t('ไม่บังคับ ใส่แล้วแอปจะนับสัปดาห์และ taper ให้เอง', 'Optional — the app counts weeks and the taper for you')} value={date} onChange={setDate} />
          <NumberInput className="mt-2" label={t('ระยะงานจริง', 'Actual race distance')} unit={t('กม.', 'km')} step={0.05} value={km} placeholder={String(programs[choice].raceKm)}
            hint={t(`ไม่ใส่ = ${programs[choice].raceKm} กม. · งานมินิแต่ละงานยาวไม่เท่ากัน`, `Blank = ${programs[choice].raceKm} km · mini races vary in length`)} onChange={setKm} />
          <NumberInput className="mt-2" label={t('เวลาตัดตัว (cutoff)', 'Cutoff time')} unit={t('นาที', 'min')} step={5} value={cutoff} placeholder={t('เช่น 120', 'e.g. 120')}
            hint={t('ไม่บังคับ แอปจะเทียบกับเวลาจบโดยประมาณ', 'Optional — compared with your estimated finish')} onChange={setCutoff} />
          <label className="mt-3 flex items-start gap-3 rounded-2xl bg-raised p-3">
            <input type="checkbox" className="mt-0.5 size-5 shrink-0 accent-accent" checked={hills} onChange={e => setHills(e.target.checked)} />
            <span>
              <span className="block text-sm font-semibold">{t('เส้นทางแข่งมีเนิน', 'The race course is hilly')}</span>
              <span className="block text-xs text-muted">{t('รวมถึง "เนินซึม" ยาว ๆ ที่มองไม่ค่อยเห็น (เช่น ขอนแก่น) แผนจะเพิ่มวิ่งยาวบนเส้นทางมีเนิน ซ้อมลงเนิน และวิธีคุมแรงบนเนินวันแข่ง', 'Including long gradual grades you barely notice — the plan adds hilly long runs, downhill practice and hill pacing for race day')}</span>
            </span>
          </label>
          {!!programs[choice].raceKm && weeksAway !== null && weeksAway < programs[choice].weeks && (
            <p className="mt-2 rounded-xl bg-warn/15 p-2 text-xs text-warn">
              {t(`เหลือ ${Math.max(weeksAway, 0)} สัปดาห์ น้อยกว่าโปรแกรม ${programs[choice].weeks} สัปดาห์ แอปจะเริ่มจากกลางโปรแกรม ถ้าฐานยังไม่ถึง ควรเลือกงานที่ไกลกว่านี้`, `${Math.max(weeksAway, 0)} weeks left, shorter than the ${programs[choice].weeks}-week program — the app starts mid-program; if your base isn't there yet, pick a later race`)}
            </p>
          )}
        </div>
      </Collapse>

      <div className="mb-2 mt-5 text-sm font-semibold text-muted">{t('ฝึกเวทที่ไหน', 'Where you do strength')}</div>
      <div className="space-y-2">
        {(['mix', 'gym', 'park', 'home'] as LocationPref[]).map(id => (
          <button key={id} onClick={() => setWhere(id)}
            className={cx('flex w-full items-start gap-3 rounded-2xl p-3 text-left ring-2 transition-colors active:scale-[.99]',
              where === id ? 'bg-accent-soft/50 ring-accent' : 'bg-raised ring-transparent')}>
            <Radio on={where === id} />
            <span className="min-w-0">
              <span className="block font-bold">{en ? locationInfo[id].labelEn : locationInfo[id].label}</span>
              <span className="block text-sm text-muted">{en ? locationInfo[id].textEn : locationInfo[id].text}</span>
            </span>
          </button>
        ))}
      </div>
      <p className="mt-2 text-xs text-muted">{t('สลับที่เฉพาะวันได้ในหน้าฝึก', 'Change a single day’s place in the plan tab')}</p>

      <div className="mt-4 flex gap-2">
        <Button variant="soft" className="flex-1" onClick={onClose}>{t('ยกเลิก', 'Cancel')}</Button>
        <Button className="flex-1" onClick={save}>{t('บันทึก', 'Save')}</Button>
      </div>
    </Sheet>
  )
}
