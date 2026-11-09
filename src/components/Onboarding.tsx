import { useState } from 'react'
import { ArrowLeft, ArrowRight, Check } from 'lucide-react'
import { LogoMark } from './Logo'
import { locationInfo, programs, type LocationPref, type ProgramId } from '../data/programs'
import { activityLevels, defaultProfile, goals, targets, type Profile } from '../lib/calc'
import { useProgram } from '../lib/program'
import { usePersisted } from '../lib/storage'
import { cx } from '../lib/cx'
import { Button, Stat } from './ui'
import { ScreeningForm } from './Screening'
import { clearance, clearanceText, emptyScreening, useScreening, type Screening } from '../lib/screening'
import { today } from '../lib/date'
import { DateInput, NumberInput, SelectInput } from './Form'
import { ProgramPicker } from './ProgramPicker'
import { useLang, useT } from '../lib/i18n'
import { useDayText } from '../lib/dayText'

const STEPS = ['เช็กสุขภาพ', 'ข้อมูลร่างกาย', 'เป้าหมาย', 'สถานที่ฝึก', 'พร้อมแล้ว']
const STEPS_EN = ['Health check', 'About you', 'Goal', 'Where you train', 'All set']

/** ตั้งค่าครั้งแรกหลัง login — ถามแค่ที่จำเป็น ที่เหลือแก้ทีหลังได้ */
export function Onboarding({ onDone }: { onDone: () => void }) {
  const p = useProgram()
  const tr = useT()
  const en = useLang()[0] === 'en'
  const dt = useDayText()
  const loc = (id: LocationPref) => en ? { label: locationInfo[id].labelEn, text: locationInfo[id].textEn } : locationInfo[id]
  const [profile, setProfile] = usePersisted<Profile>('profile', defaultProfile)
  const [step, setStep] = useState(0)
  const [saved, setSaved] = useScreening()
  const [draft, setDraft] = useState(profile)
  const [program, setProgram] = useState<ProgramId>(p.program)
  const [where, setWhere] = useState<LocationPref>(p.location)
  const [raceDate, setRaceDate] = useState(p.raceDate)
  const [screen, setScreen] = useState<Screening>(saved ?? emptyScreening)
  const set = <K extends keyof Profile>(k: K, v: Profile[K]) => setDraft(d => ({ ...d, [k]: v }))

  const finish = () => {
    setProfile(draft)
    setSaved({ ...screen, date: today() })
    if (program !== p.program) p.setProgram(program)
    p.setLocationPref(where)
    if (programs[program].raceKm) p.setRaceDate(raceDate)
    onDone()
  }

  const t = targets(draft, !!programs[program].raceKm)

  const Option = ({ on, onClick, title, text }: { on: boolean; onClick: () => void; title: string; text: string }) => (
    <button onClick={onClick} className={cx('flex w-full items-start gap-3 rounded-2xl p-3 text-left ring-2 transition-colors active:scale-[.99]',
      on ? 'bg-accent-soft/50 ring-accent' : 'bg-card ring-line')}>
      <span className={cx('mt-0.5 grid size-5 shrink-0 place-items-center rounded-full ring-2', on ? 'bg-accent-fill ring-accent' : 'ring-line')}>
        {on && <Check size={12} className="animate-pop text-white" strokeWidth={3} />}
      </span>
      <span><span className="block font-bold">{title}</span><span className="block text-sm text-muted">{text}</span></span>
    </button>
  )

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col gap-5 p-4 pt-[calc(var(--sat)+1.5rem)] pb-[calc(var(--sab)+1rem)]">
      <div className="flex items-center gap-3">
        <div className="grid size-11 place-items-center rounded-2xl bg-accent-fill text-white"><LogoMark size={28} /></div>
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-accent">Kao</div>
          <div className="text-lg font-bold">{tr('ตั้งค่าครั้งแรก', 'First-time setup')}</div>
        </div>
      </div>

      <div className="flex gap-1.5">
        {STEPS.map((s, i) => <span key={s} className={cx('h-1.5 flex-1 rounded-full transition-colors duration-500', i <= step ? 'bg-accent-fill' : 'bg-body')} />)}
      </div>

      <div key={step} className="flex-1 animate-fade-up space-y-3">
        <h1 className="text-2xl font-extrabold">{(en ? STEPS_EN : STEPS)[step]}</h1>

        {step === 0 && (
          <>
            <p className="text-sm text-muted">{tr('4 คำถามสั้น ๆ ตามแนวทางคัดกรองของ ACSM', '4 quick questions based on ACSM screening guidelines')}</p>
            <ScreeningForm value={screen} onChange={setScreen} />
          </>
        )}

        {step === 1 && (
          <>
            <p className="text-sm text-muted">{tr('ใช้คำนวณแคลอรี่และโปรตีนที่ควรกินต่อวัน', 'Used to work out your daily calories and protein')}</p>
            <div className="grid grid-cols-3 gap-2.5">
              <NumberInput label={tr('อายุ', 'Age')} unit={tr('ปี', 'y')} value={draft.age} onChange={v => set('age', +v)} />
              <NumberInput label={tr('ส่วนสูง', 'Height')} unit={tr('ซม.', 'cm')} value={draft.heightCm} onChange={v => set('heightCm', +v)} />
              <NumberInput label={tr('น้ำหนัก', 'Weight')} unit={tr('กก.', 'kg')} step={0.1} value={draft.weightKg} onChange={v => set('weightKg', +v)} />
            </div>
            <SelectInput label={tr('อยากให้รูปร่างเปลี่ยนแบบไหน', 'Body goal')} value={draft.goal} onChange={v => set('goal', v)}
              options={Object.entries(goals).map(([k, g]) => ({ value: k as Profile['goal'], label: en ? g.labelEn : g.label }))} />
            <SelectInput label={tr('ออกกำลังกายกี่วันต่อสัปดาห์', 'Training days per week')} value={draft.activity} onChange={v => set('activity', v)}
              options={activityLevels.map(a => ({ value: a.value, label: en ? a.labelEn : a.label }))} />
          </>
        )}

        {step === 2 && (
          <>
            <ProgramPicker value={program} onChange={setProgram} />
            {!!programs[program].raceKm && (
              <DateInput label={tr('วันแข่ง (ไม่บังคับ)', 'Race date (optional)')} value={raceDate} onChange={setRaceDate} />
            )}
          </>
        )}

        {step === 3 && (
          <>
            <p className="text-sm text-muted">{tr('วันไหนอยากเปลี่ยนที่ สลับเฉพาะวันนั้นได้ในหน้าฝึก', 'You can change the place for a single day in the plan tab')}</p>
            {(['mix', 'gym', 'park', 'home'] as LocationPref[]).map(id => (
              <Option key={id} on={where === id} onClick={() => setWhere(id)} title={loc(id).label} text={loc(id).text} />
            ))}
          </>
        )}

        {step === 4 && (
          <>
            <p className="text-sm text-muted">{tr('เป้าต่อวันของคุณ (แก้ได้ที่หน้าหลัก)', 'Your daily targets (editable later)')}</p>
            <div className="grid grid-cols-2 gap-2">
              <Stat label={tr('พลังงาน', 'Energy')} value={t.kcal} sub={tr('kcal/วัน', 'kcal/day')} accent />
              <Stat label={tr('โปรตีน', 'Protein')} value={tr(`${t.protein} ก.`, `${t.protein} g`)} sub={tr('ต่อวัน', 'per day')} accent />
            </div>
            <ul className="space-y-2 rounded-2xl bg-card p-4 text-sm ring-1 ring-line">
              <li><b>{tr('โปรแกรม:', 'Program:')}</b> {dt.program(program).name}</li>
              <li><b>{tr('ฝึกเวทที่:', 'Strength at:')}</b> {loc(where).label}</li>
              <li><b>{tr('เริ่มยังไง:', 'How to start:')}</b> {tr('เปิดแอปทุกวันแล้วดูการ์ด "วันนี้" ที่หน้าหลัก กดเริ่มได้เลย', 'Open the app each day and tap start on the "Today" card on the home tab')}</li>
            </ul>
            {clearance(screen) !== 'clear' && (
              <p className="rounded-2xl bg-bad/15 p-3 text-sm text-bad">{en ? clearanceText[clearance(screen)].titleEn : clearanceText[clearance(screen)].title}: {en ? clearanceText[clearance(screen)].textEn : clearanceText[clearance(screen)].text}</p>
            )}
          </>
        )}
      </div>

      <div className="flex gap-2">
        {step > 0 && <Button variant="soft" size="lg" onClick={() => setStep(s => s - 1)}><ArrowLeft size={18} /></Button>}
        {step < STEPS.length - 1
          ? <Button size="lg" className="flex-1" onClick={() => setStep(s => s + 1)}>{tr('ถัดไป', 'Next')} <ArrowRight size={18} /></Button>
          : <Button size="lg" variant="success" className="flex-1" onClick={finish}><Check size={18} /> {tr('เริ่มใช้งาน', 'Get started')}</Button>}
      </div>
    </div>
  )
}
