import { useState } from 'react'
import { ChevronDown, ChevronRight, ShieldCheck, Target } from 'lucide-react'
import { useNav } from '../lib/nav'
import { activityLevels, bmi, bmr, goals, tdee, targets, type Profile } from '../lib/calc'
import { phases, principles } from '../data/workouts'
import { Dashboard } from './Dashboard'
import { useProgram } from '../lib/program'
import { Badge, Card, Disclosure, Stat } from './ui'
import { NumberInput, SelectInput } from './Form'
import { cx } from '../lib/cx'

type Props = { profile: Profile; setProfile: (p: Profile) => void }

const safety: [string, string][] = [
  ['กฎความเจ็บ', 'ปวดเมื่อยกล้ามทั่วไป (≤3/10) ฝึกต่อได้ แต่ถ้าปวดแปลบ ปวดมากขึ้นระหว่างวิ่ง หรือทำให้ท่าวิ่งเปลี่ยน ให้หยุดทันที ถ้ายังปวดเกิน 3 วันควรพบแพทย์/นักกายภาพ'],
  ['อากาศร้อนในไทย', 'วิ่งช่วงเช้าก่อน 7 โมงหรือหลัง 6 โมงเย็น ดื่มน้ำ ~300–450 มล. 2–4 ชม. ก่อนวิ่ง วิ่งเกิน 60 นาทีพกน้ำ + เกลือแร่ ถ้าเวียนหัว คลื่นไส้ สับสน พูดไม่รู้เรื่อง หรือเดินเซ ให้หยุดเข้าที่ร่มทันที ราดน้ำเย็น/ประคบเย็น และเรียกความช่วยเหลือ — ฮีทสโตรกขณะออกกำลังกายเหงื่ออาจยังออกอยู่ อย่ารอให้เหงื่อหยุด (ACSM)'],
  ['สัญญาณซ้อมหนักเกิน', 'เหนื่อยผิดปกติหลายวัน นอนไม่หลับ ชีพจรตอนตื่นสูงกว่าปกติชัดเจน หรือวิ่งช้าลงทั้งที่พยายาม → เปลี่ยนวันนั้นเป็นวันพักหรือวิ่งเบา'],
  ['พลาดวันฝึก', 'ข้ามไปได้เลย ไม่ต้องชดเชยสองวันรวด ถ้าหยุดเกิน 2 สัปดาห์ให้ย้อนกลับไป 1–2 สัปดาห์'],
  ['ป่วย', 'มีไข้หรืออาการทั้งตัว (ปวดเมื่อย ไอลงคอ) ให้พักจนหายดี ไม่ควรวิ่งฝืน'],
]

export function Overview({ profile, setProfile }: Props) {
  const set = <K extends keyof Profile>(k: K, v: Profile[K]) => setProfile({ ...profile, [k]: v })
  const [editing, setEditing] = useState(false)
  const nav = useNav()
  const { program, isRace } = useProgram()
  const t = targets(profile, isRace)

  return (
    <>
      <Dashboard />

      <Card title={<span className="flex items-center gap-2"><Target size={18} className="text-accent" />  ข้อมูลร่างกาย</span>}
        action={<button onClick={() => setEditing(!editing)} className="flex items-center gap-1 text-sm font-semibold text-run">
          แก้ข้อมูล <ChevronDown size={16} className={cx('transition', editing && 'rotate-180')} />
        </button>}>
        {editing && (
          <div className="mb-3 grid animate-fade-up grid-cols-3 gap-3 rounded-2xl bg-card p-1">
            <NumberInput label="อายุ" unit="ปี" value={profile.age} onChange={v => set('age', +v)} />
            <NumberInput label="ส่วนสูง" unit="ซม." value={profile.heightCm} onChange={v => set('heightCm', +v)} />
            <NumberInput label="น้ำหนัก" unit="กก." step={0.1} value={profile.weightKg} onChange={v => set('weightKg', +v)} />
            <SelectInput label="กิจกรรม" className="col-span-3" value={profile.activity} onChange={v => set('activity', v)}
              options={activityLevels.map(a => ({ value: a.value, label: a.label }))} />
            <SelectInput label="เป้าหมาย" className="col-span-3" value={profile.goal} onChange={v => set('goal', v)}
              options={Object.entries(goals).map(([k, g]) => ({ value: k as Profile['goal'], label: g.label }))} />
          </div>
        )}
        <div className="grid grid-cols-3 gap-2">
          <Stat label="BMI" value={bmi(profile).toFixed(1)} sub="ปกติ 18.5–22.9" />
          <Stat label="BMR" value={Math.round(bmr(profile))} sub="kcal" />
          <Stat label="TDEE" value={Math.round(tdee(profile))} sub="kcal" />
        </div>
        <button onClick={() => nav('food')} className="mt-2 flex w-full items-center justify-between rounded-xl bg-raised px-3 py-2 text-left text-sm">
          <span>เป้ากินวันนี้ <b className="text-accent">{t.kcal} kcal · โปรตีน {t.protein} ก.</b></span>
          <ChevronRight size={16} className="text-muted" />
        </button>
        <p className="mt-2 text-xs text-muted">BMR/TDEE จากสูตร Mifflin-St Jeor (คลาดเคลื่อนได้ ±10%) — ปรับตามน้ำหนักจริงทุก 2–3 สัปดาห์</p>
      </Card>

      {program === 'physique' && <Disclosure title="แผน 12 สัปดาห์" summary="ฐาน → เพิ่มความหนัก → Deload → ทดสอบ">
        <ol className="relative space-y-4 border-l-2 border-line pl-5">
          {phases.map(p => (
            <li key={p.weeks} className="relative">
              <span className="absolute -left-[27px] top-1 size-3 rounded-full bg-accent ring-4 ring-card" />
              <Badge>สัปดาห์ {p.weeks}</Badge>
              <div className="mt-1 font-bold">{p.name}</div>
              <p className="text-sm text-muted">{p.text}</p>
            </li>
          ))}
        </ol>
      </Disclosure>}

      <Disclosure title="หุ่นแบบ Tom Holland — ความจริงที่ควรรู้" summary="ทำได้จริงแค่ไหน ใช้เวลานานเท่าไร">
        <ul className="list-disc space-y-2 pl-5 text-sm">
          <li>เขาสูงราว 170–173 ซม. และรูปร่างที่เห็นในหนังเป็นแบบ <b>ลีน ไขมันต่ำ กล้ามพอดี</b> ไม่ใช่สายกล้ามใหญ่ ซึ่งเป็นเป้าที่ทำได้จริงสำหรับคุณ (165 ซม. / 64.5 กก.)</li>
          <li>การฝึกของเขาเน้น <b>บอดี้เวท ยิมนาสติก และ conditioning</b> (ดึงข้อ ดิป วิดพื้น) ตามที่เทรนเนอร์ให้สัมภาษณ์ และมีทีมงาน เชฟ และเวลาฝึกเต็มวันก่อนถ่ายทำ</li>
          <li>ภาพโปรโมตถ่ายช่วงไขมันต่ำที่สุด พร้อมแสงและการปั๊มกล้าม ไม่ใช่สภาพทุกวัน</li>
          <li>มือใหม่เพิ่มกล้ามได้เร็วที่สุดในปีแรก แต่เป็นหลักไม่กี่กิโลกรัมต่อปี (ตัวเลขต่างกันมากตามพันธุกรรม การนอน และอาหาร — ยังไม่มีงานวิจัยที่ให้ตัวเลขแน่นอน) ส่วนการลดไขมัน ~0.5% ของน้ำหนักตัว/สัปดาห์ช่วยรักษากล้ามได้ดีกว่าการลดเร็ว</li>
          <li>เวลาที่สมเหตุสมผล: เห็นความเปลี่ยนแปลงใน <b>8–12 สัปดาห์</b> และได้รูปร่างใกล้เคียงใน <b>1–2 ปี</b> ถ้าฝึกสม่ำเสมอ</li>
        </ul>
      </Disclosure>

      <Disclosure title={<span className="flex items-center gap-2"><ShieldCheck size={18} className="text-good" /> ฝึกอย่างปลอดภัย</span>} summary="กฎความเจ็บ อากาศร้อน ซ้อมหนักเกิน ป่วย">
        <ul className="space-y-3 text-sm">
          {safety.map(([title, text]) => (
            <li key={title}>
              <div className="font-semibold">{title}</div>
              <p className="text-muted">{text}</p>
            </li>
          ))}
        </ul>
      </Disclosure>

      <Disclosure title="หลักการที่แผนนี้ใช้" summary="progressive overload, ปริมาณเซ็ต, วิ่งเบาเป็นหลัก">
        <div className="space-y-3">
          {principles.map(p => (
            <div key={p.title} className="rounded-2xl bg-raised p-3">
              <div className="font-semibold">{p.title}</div>
              <p className="text-sm text-muted">{p.text}</p>
            </div>
          ))}
        </div>
      </Disclosure>
    </>
  )
}
