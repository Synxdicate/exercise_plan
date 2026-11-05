import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { activityLevels, bmi, bmr, goals, tdee, type Profile } from '../lib/calc'
import { cx } from '../lib/cx'
import { Card, Stat } from './ui'
import { useLang, useT } from '../lib/i18n'
import { NumberInput, SelectInput } from './Form'

/** ข้อมูลร่างกายที่ใช้คำนวณเป้ากิน — อยู่ในแท็บอาหาร */
export function ProfileCard({ profile, setProfile }: { profile: Profile; setProfile: (p: Profile) => void }) {
  const set = <K extends keyof Profile>(k: K, v: Profile[K]) => setProfile({ ...profile, [k]: v })
  const [editing, setEditing] = useState(false)
  const tr = useT()
  const en = useLang()[0] === 'en'
  return (
    <Card title={tr('ข้อมูลร่างกาย', 'Body data')}
      action={<button onClick={() => setEditing(!editing)} className="flex items-center gap-1 text-sm font-semibold text-run">
        {tr('แก้ข้อมูล', 'Edit')} <ChevronDown size={16} className={cx('transition', editing && 'rotate-180')} />
      </button>}>
      {editing && (
        <div className="mb-3 grid animate-fade-up grid-cols-3 gap-3 rounded-2xl bg-card p-1">
          <NumberInput label={tr('อายุ', 'Age')} unit={tr('ปี', 'y')} value={profile.age} onChange={v => set('age', +v)} />
          <NumberInput label={tr('ส่วนสูง', 'Height')} unit={tr('ซม.', 'cm')} value={profile.heightCm} onChange={v => set('heightCm', +v)} />
          <NumberInput label={tr('น้ำหนัก', 'Weight')} unit={tr('กก.', 'kg')} step={0.1} value={profile.weightKg} onChange={v => set('weightKg', +v)} />
          <SelectInput label={tr('กิจกรรม', 'Activity')} className="col-span-3" value={profile.activity} onChange={v => set('activity', v)}
            options={activityLevels.map(a => ({ value: a.value, label: en ? a.labelEn : a.label }))} />
          <SelectInput label={tr('เป้าหมาย', 'Goal')} className="col-span-3" value={profile.goal} onChange={v => set('goal', v)}
            options={Object.entries(goals).map(([k, g]) => ({ value: k as Profile['goal'], label: en ? g.labelEn : g.label }))} />
        </div>
      )}
      <div className="grid grid-cols-3 gap-2">
        <Stat label="BMI" value={bmi(profile).toFixed(1)} sub={tr('ปกติ 18.5–22.9', 'normal 18.5–22.9')} />
        <Stat label="BMR" value={Math.round(bmr(profile))} sub="kcal" />
        <Stat label="TDEE" value={Math.round(tdee(profile))} sub="kcal" />
      </div>
      <p className="mt-2 text-xs text-muted">{tr('สูตร Mifflin-St Jeor (คลาดเคลื่อนได้ ±10%) — ปรับตามน้ำหนักจริงทุก 2–3 สัปดาห์', 'Mifflin-St Jeor formula (±10%) — adjust to your real weight trend every 2–3 weeks')}</p>
    </Card>
  )
}
