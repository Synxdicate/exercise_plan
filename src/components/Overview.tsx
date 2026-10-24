import { useState } from 'react'
import { ChevronDown, Target } from 'lucide-react'
import { activityLevels, bmi, bmr, goals, tdee, targets, type Profile } from '../lib/calc'
import { phases, principles } from '../data/workouts'
import { Dashboard } from './Dashboard'
import { Badge, Card, Field, Stat } from './ui'
import { cx } from '../lib/cx'

type Props = { profile: Profile; setProfile: (p: Profile) => void }

export function Overview({ profile, setProfile }: Props) {
  const t = targets(profile)
  const set = <K extends keyof Profile>(k: K, v: Profile[K]) => setProfile({ ...profile, [k]: v })
  const [editing, setEditing] = useState(false)

  return (
    <>
      <Dashboard />

      <Card title={<span className="flex items-center gap-2"><Target size={18} className="text-accent" /> เป้าหมายต่อวัน</span>}
        action={<button onClick={() => setEditing(!editing)} className="flex items-center gap-1 text-sm font-semibold text-run">
          แก้ข้อมูล <ChevronDown size={16} className={cx('transition', editing && 'rotate-180')} />
        </button>}>
        {editing && (
          <div className="mb-3 grid grid-cols-3 gap-2 rounded-2xl bg-raised p-3">
            <Field label="อายุ"><input type="number" value={profile.age} onChange={e => set('age', +e.target.value)} /></Field>
            <Field label="สูง (ซม.)"><input type="number" value={profile.heightCm} onChange={e => set('heightCm', +e.target.value)} /></Field>
            <Field label="หนัก (กก.)"><input type="number" step="0.1" value={profile.weightKg} onChange={e => set('weightKg', +e.target.value)} /></Field>
            <Field label="กิจกรรม" className="col-span-3">
              <select value={profile.activity} onChange={e => set('activity', +e.target.value)}>
                {activityLevels.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
              </select>
            </Field>
            <Field label="เป้าหมาย" className="col-span-3">
              <select value={profile.goal} onChange={e => set('goal', e.target.value as Profile['goal'])}>
                {Object.entries(goals).map(([k, g]) => <option key={k} value={k}>{g.label}</option>)}
              </select>
            </Field>
          </div>
        )}
        <div className="grid grid-cols-2 gap-2">
          <Stat label="แคลอรี่" value={t.kcal} sub="kcal/วัน" accent />
          <Stat label="โปรตีน" value={`${t.protein} ก.`} sub="ต่อวัน" accent />
          <Stat label="ไขมัน" value={`${t.fat} ก.`} sub="ต่อวัน" />
          <Stat label="คาร์บ" value={`${t.carbs} ก.`} sub="ต่อวัน" />
        </div>
        <div className="mt-2 grid grid-cols-3 gap-2">
          <Stat label="BMI" value={bmi(profile).toFixed(1)} sub="ปกติ 18.5–22.9" />
          <Stat label="BMR" value={Math.round(bmr(profile))} sub="kcal" />
          <Stat label="TDEE" value={Math.round(tdee(profile))} sub="kcal" />
        </div>
        <p className="mt-2 text-xs text-muted">คำนวณด้วยสูตร Mifflin-St Jeor (คลาดเคลื่อนได้ ±10%) ใช้เป็นจุดเริ่มต้น แล้วปรับตามน้ำหนักจริงทุก 2–3 สัปดาห์</p>
      </Card>

      <Card title="แผน 12 สัปดาห์">
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
      </Card>

      <Card title="หุ่นแบบ Tom Holland — ความจริงที่ควรรู้">
        <ul className="list-disc space-y-2 pl-5 text-sm">
          <li>เขาสูงราว 170–173 ซม. และรูปร่างที่เห็นในหนังเป็นแบบ <b>ลีน ไขมันต่ำ กล้ามพอดี</b> ไม่ใช่สายกล้ามใหญ่ ซึ่งเป็นเป้าที่ทำได้จริงสำหรับคุณ (165 ซม. / 64.5 กก.)</li>
          <li>การฝึกของเขาเน้น <b>บอดี้เวท ยิมนาสติก และ conditioning</b> (ดึงข้อ ดิป วิดพื้น) ตามที่เทรนเนอร์ให้สัมภาษณ์ และมีทีมงาน เชฟ และเวลาฝึกเต็มวันก่อนถ่ายทำ</li>
          <li>ภาพโปรโมตถ่ายช่วงไขมันต่ำที่สุด พร้อมแสงและการปั๊มกล้าม ไม่ใช่สภาพทุกวัน</li>
          <li>มือใหม่ที่ฝึกและกินถูกต้อง เพิ่มกล้ามได้ประมาณ <b>0.5–1 กก./เดือน</b> ในปีแรก และลดไขมันได้ราว 0.25–0.5 กก./สัปดาห์โดยไม่เสียกล้าม</li>
          <li>เวลาที่สมเหตุสมผล: เห็นความเปลี่ยนแปลงใน <b>8–12 สัปดาห์</b> และได้รูปร่างใกล้เคียงใน <b>1–2 ปี</b> ถ้าฝึกสม่ำเสมอ</li>
        </ul>
      </Card>

      <Card title="หลักการที่แผนนี้ใช้">
        <div className="space-y-3">
          {principles.map(p => (
            <div key={p.title} className="rounded-2xl bg-raised p-3">
              <div className="font-semibold">{p.title}</div>
              <p className="text-sm text-muted">{p.text}</p>
            </div>
          ))}
        </div>
      </Card>
    </>
  )
}
