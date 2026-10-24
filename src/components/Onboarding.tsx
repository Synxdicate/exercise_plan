import { useState } from 'react'
import { ArrowLeft, ArrowRight, Check, Dumbbell } from 'lucide-react'
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

const STEPS = ['เช็กสุขภาพ', 'ข้อมูลร่างกาย', 'เป้าหมาย', 'สถานที่ฝึก', 'พร้อมแล้ว']

/** ตั้งค่าครั้งแรกหลัง login — ถามแค่ที่จำเป็น ที่เหลือแก้ทีหลังได้ */
export function Onboarding({ onDone }: { onDone: () => void }) {
  const p = useProgram()
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
    if (program !== 'physique') p.setRaceDate(raceDate)
    onDone()
  }

  const t = targets(draft, program !== 'physique')

  const Option = ({ on, onClick, title, text }: { on: boolean; onClick: () => void; title: string; text: string }) => (
    <button onClick={onClick} className={cx('flex w-full items-start gap-3 rounded-2xl p-3 text-left ring-2 transition-colors active:scale-[.99]',
      on ? 'bg-accent-soft/50 ring-accent' : 'bg-card ring-line')}>
      <span className={cx('mt-0.5 grid size-5 shrink-0 place-items-center rounded-full ring-2', on ? 'bg-accent ring-accent' : 'ring-line')}>
        {on && <Check size={12} className="animate-pop text-white" strokeWidth={3} />}
      </span>
      <span><span className="block font-bold">{title}</span><span className="block text-sm text-muted">{text}</span></span>
    </button>
  )

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col gap-5 p-4 pt-[calc(env(safe-area-inset-top)+1.5rem)] pb-[calc(env(safe-area-inset-bottom)+1rem)]">
      <div className="flex items-center gap-3">
        <div className="grid size-11 place-items-center rounded-2xl bg-accent text-white"><Dumbbell size={22} /></div>
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-accent">Exercise-Plan</div>
          <div className="text-lg font-bold">ตั้งค่าครั้งแรก</div>
        </div>
      </div>

      <div className="flex gap-1.5">
        {STEPS.map((s, i) => <span key={s} className={cx('h-1.5 flex-1 rounded-full transition-colors duration-500', i <= step ? 'bg-accent' : 'bg-body')} />)}
      </div>

      <div key={step} className="flex-1 animate-fade-up space-y-3">
        <h1 className="text-2xl font-extrabold">{STEPS[step]}</h1>

        {step === 0 && (
          <>
            <p className="text-sm text-muted">4 คำถามสั้น ๆ ตามแนวทางคัดกรองของ ACSM — ใช้เวลาไม่ถึง 30 วินาที</p>
            <ScreeningForm value={screen} onChange={setScreen} />
          </>
        )}

        {step === 1 && (
          <>
            <p className="text-sm text-muted">ใช้คำนวณแคลอรี่และโปรตีนที่ควรกินต่อวัน</p>
            <div className="grid grid-cols-3 gap-2.5">
              <NumberInput label="อายุ" unit="ปี" value={draft.age} onChange={v => set('age', +v)} />
              <NumberInput label="ส่วนสูง" unit="ซม." value={draft.heightCm} onChange={v => set('heightCm', +v)} />
              <NumberInput label="น้ำหนัก" unit="กก." step={0.1} value={draft.weightKg} onChange={v => set('weightKg', +v)} />
            </div>
            <SelectInput label="อยากให้รูปร่างเปลี่ยนแบบไหน" value={draft.goal} onChange={v => set('goal', v)}
              options={Object.entries(goals).map(([k, g]) => ({ value: k as Profile['goal'], label: g.label }))} />
            <SelectInput label="ออกกำลังกายกี่วันต่อสัปดาห์" value={draft.activity} onChange={v => set('activity', v)}
              options={activityLevels.map(a => ({ value: a.value, label: a.label }))} />
          </>
        )}

        {step === 2 && (
          <>
            <p className="text-sm text-muted">ถ้าวิ่งยังไม่ถึง 15 กม./สัปดาห์ เริ่มจากหุ่นหรือ 10K ก่อน แล้วค่อยต่อฮาล์ฟ → ฟูล</p>
            {(Object.keys(programs) as ProgramId[]).map(id => (
              <Option key={id} on={program === id} onClick={() => setProgram(id)} title={`${programs[id].name} · ${programs[id].weeks} สัปดาห์`} text={programs[id].summary} />
            ))}
            {program !== 'physique' && (
              <DateInput label="วันแข่ง (ไม่บังคับ)" value={raceDate} onChange={setRaceDate} />
            )}
          </>
        )}

        {step === 3 && (
          <>
            <p className="text-sm text-muted">วันไหนอยากเปลี่ยนที่ สลับเฉพาะวันนั้นได้ในหน้าฝึก</p>
            {(['mix', 'gym', 'park'] as LocationPref[]).map(id => (
              <Option key={id} on={where === id} onClick={() => setWhere(id)} title={locationInfo[id].label} text={locationInfo[id].text} />
            ))}
          </>
        )}

        {step === 4 && (
          <>
            <p className="text-sm text-muted">เป้าต่อวันของคุณ (แก้ได้ที่หน้าหลัก)</p>
            <div className="grid grid-cols-2 gap-2">
              <Stat label="พลังงาน" value={t.kcal} sub="kcal/วัน" accent />
              <Stat label="โปรตีน" value={`${t.protein} ก.`} sub="ต่อวัน" accent />
            </div>
            <ul className="space-y-2 rounded-2xl bg-card p-4 text-sm ring-1 ring-line">
              <li><b>โปรแกรม:</b> {programs[program].name}</li>
              <li><b>ฝึกเวทที่:</b> {locationInfo[where].label}</li>
              <li><b>เริ่มยังไง:</b> เปิดแอปทุกวันแล้วดูการ์ด "วันนี้" ที่หน้าหลัก กดเริ่มได้เลย</li>
            </ul>
            {clearance(screen) !== 'clear' && (
              <p className="rounded-2xl bg-bad/15 p-3 text-sm text-bad">{clearanceText[clearance(screen)].title}: {clearanceText[clearance(screen)].text}</p>
            )}
          </>
        )}
      </div>

      <div className="flex gap-2">
        {step > 0 && <Button variant="soft" size="lg" onClick={() => setStep(s => s - 1)}><ArrowLeft size={18} /></Button>}
        {step < STEPS.length - 1
          ? <Button size="lg" className="flex-1" onClick={() => setStep(s => s + 1)}>ถัดไป <ArrowRight size={18} /></Button>
          : <Button size="lg" variant="success" className="flex-1" onClick={finish}><Check size={18} /> เริ่มใช้งาน</Button>}
      </div>
    </div>
  )
}
