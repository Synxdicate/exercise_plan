import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { activityLevels, bmi, bmr, goals, tdee, type Profile } from '../lib/calc'
import { cx } from '../lib/cx'
import { Card, Stat } from './ui'
import { NumberInput, SelectInput } from './Form'

/** ข้อมูลร่างกายที่ใช้คำนวณเป้ากิน — อยู่ในแท็บอาหาร */
export function ProfileCard({ profile, setProfile }: { profile: Profile; setProfile: (p: Profile) => void }) {
  const set = <K extends keyof Profile>(k: K, v: Profile[K]) => setProfile({ ...profile, [k]: v })
  const [editing, setEditing] = useState(false)
  return (
    <Card title="ข้อมูลร่างกาย"
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
      <p className="mt-2 text-xs text-muted">สูตร Mifflin-St Jeor (คลาดเคลื่อนได้ ±10%) — ปรับตามน้ำหนักจริงทุก 2–3 สัปดาห์</p>
    </Card>
  )
}
