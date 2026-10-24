import { activityLevels, bmi, bmr, goals, tdee, targets, type Profile } from '../lib/calc'
import { phases, principles } from '../data/workouts'
import { Dashboard } from './Dashboard'

type Props = { profile: Profile; setProfile: (p: Profile) => void }

export function Overview({ profile, setProfile }: Props) {
  const t = targets(profile)
  const set = <K extends keyof Profile>(k: K, v: Profile[K]) => setProfile({ ...profile, [k]: v })

  return (
    <>
      <Dashboard />
      <section className="card">
        <h2>ข้อมูลของคุณ</h2>
        <div className="form">
          <label>อายุ<input type="number" value={profile.age} onChange={e => set('age', +e.target.value)} /></label>
          <label>ส่วนสูง (ซม.)<input type="number" value={profile.heightCm} onChange={e => set('heightCm', +e.target.value)} /></label>
          <label>น้ำหนัก (กก.)<input type="number" step="0.1" value={profile.weightKg} onChange={e => set('weightKg', +e.target.value)} /></label>
          <label>กิจกรรม
            <select value={profile.activity} onChange={e => set('activity', +e.target.value)}>
              {activityLevels.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
            </select>
          </label>
          <label>เป้าหมาย
            <select value={profile.goal} onChange={e => set('goal', e.target.value as Profile['goal'])}>
              {Object.entries(goals).map(([k, g]) => <option key={k} value={k}>{g.label}</option>)}
            </select>
          </label>
        </div>
        <div className="stats">
          <Stat label="BMI" value={bmi(profile).toFixed(1)} sub="ปกติ 18.5–22.9 (เกณฑ์เอเชีย)" />
          <Stat label="BMR" value={Math.round(bmr(profile))} sub="kcal พลังงานพื้นฐาน" />
          <Stat label="TDEE" value={Math.round(tdee(profile))} sub="kcal ที่ใช้ต่อวัน" />
          <Stat label="เป้าแคลอรี่" value={t.kcal} sub="kcal/วัน" accent />
          <Stat label="โปรตีน" value={`${t.protein} ก.`} sub="ต่อวัน" accent />
          <Stat label="ไขมัน / คาร์บ" value={`${t.fat} / ${t.carbs} ก.`} sub="ต่อวัน" />
        </div>
        <p className="muted small">คำนวณด้วยสูตร Mifflin-St Jeor ซึ่งเป็นค่าประมาณ (คลาดเคลื่อนได้ ±10%) ใช้เป็นจุดเริ่มต้น แล้วปรับตามน้ำหนักจริงทุก 2–3 สัปดาห์</p>
      </section>

      <section className="card">
        <h2>หุ่นแบบ Tom Holland — ความจริงที่ควรรู้</h2>
        <ul className="list">
          <li>เขาสูงราว 170–173 ซม. และรูปร่างที่เห็นในหนังเป็นแบบ <b>ลีน ไขมันต่ำ กล้ามพอดี</b> ไม่ใช่สายกล้ามใหญ่ ซึ่งเป็นเป้าที่ทำได้จริงสำหรับคุณ (165 ซม. / 64.5 กก.)</li>
          <li>การฝึกของเขาเน้น <b>บอดี้เวท ยิมนาสติก และ conditioning</b> (ดึงข้อ ดิป วิดพื้น) ตามที่เทรนเนอร์ให้สัมภาษณ์ และมีทีมงาน เชฟ และเวลาฝึกเต็มวันก่อนถ่ายทำ</li>
          <li>ภาพโปรโมตถ่ายช่วงไขมันต่ำที่สุด พร้อมแสงและการปั๊มกล้าม ไม่ใช่สภาพทุกวัน</li>
          <li>มือใหม่ที่ฝึกและกินถูกต้อง เพิ่มกล้ามได้ประมาณ <b>0.5–1 กก./เดือน</b> ในปีแรก และลดไขมันได้ราว 0.25–0.5 กก./สัปดาห์โดยไม่เสียกล้าม</li>
          <li>เวลาที่สมเหตุสมผล: เห็นความเปลี่ยนแปลงใน <b>8–12 สัปดาห์</b> และได้รูปร่างใกล้เคียงใน <b>1–2 ปี</b> ถ้าฝึกสม่ำเสมอ</li>
        </ul>
      </section>

      <section className="card">
        <h2>แผน 12 สัปดาห์</h2>
        <div className="phases">
          {phases.map(p => (
            <div key={p.weeks} className="phase">
              <span className="badge">สัปดาห์ {p.weeks}</span>
              <h3>{p.name}</h3>
              <p>{p.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="card">
        <h2>หลักการที่แผนนี้ใช้</h2>
        <div className="grid2">
          {principles.map(p => (
            <div key={p.title}>
              <h3>{p.title}</h3>
              <p className="muted">{p.text}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  )
}

function Stat({ label, value, sub, accent }: { label: string; value: string | number; sub: string; accent?: boolean }) {
  return (
    <div className={`stat${accent ? ' accent' : ''}`}>
      <span className="label">{label}</span>
      <span className="value">{value}</span>
      <span className="sub">{sub}</span>
    </div>
  )
}
