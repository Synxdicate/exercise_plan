import { useEffect } from 'react'
import { BookOpen, Dumbbell, Footprints, House, TrendingUp, Utensils } from 'lucide-react'
import { Overview } from './components/Overview'
import { Plan } from './components/Plan'
import { Nutrition } from './components/Nutrition'
import { Progress } from './components/Progress'
import { Runs } from './components/Runs'
import { Sources } from './components/Sources'
import { defaultProfile, type Profile } from './lib/calc'
import { usePersisted } from './lib/storage'

const tabs = [
  { id: 'overview', label: 'ภาพรวม', icon: House },
  { id: 'plan', label: 'ตารางฝึก', icon: Dumbbell },
  { id: 'runs', label: 'วิ่ง', icon: Footprints },
  { id: 'food', label: 'อาหาร', icon: Utensils },
  { id: 'progress', label: 'บันทึก', icon: TrendingUp },
  { id: 'sources', label: 'แหล่งข้อมูล', icon: BookOpen },
] as const

type Tab = (typeof tabs)[number]['id']

export default function App() {
  const [tab, setTab] = usePersisted<Tab>('tab', 'overview')
  const [profile, setProfile] = usePersisted<Profile>('profile', defaultProfile)

  // ลิงก์ตรงไปแท็บได้ เช่น /#runs
  useEffect(() => {
    const h = location.hash.slice(1)
    if (tabs.some(t => t.id === h)) setTab(h as Tab)
  }, [setTab])

  const go = (id: Tab) => {
    setTab(id)
    history.replaceState(null, '', `#${id}`)
    window.scrollTo({ top: 0 })
  }

  return (
    <div className="app">
      <header className="hero">
        <h1>Lean & Athletic</h1>
        <p>แผนเวท + วิ่ง 12 สัปดาห์ สู่รูปร่างลีนแบบ Tom Holland — ฝึกที่ยิมหรือที่สวนสาธารณะได้</p>
      </header>
      <nav className="tabs">
        {tabs.map(t => (
          <button key={t.id} className={tab === t.id ? 'on' : ''} onClick={() => go(t.id)}>
            <t.icon className="tab-icon" size={18} aria-hidden />
            <span>{t.label}</span>
          </button>
        ))}
      </nav>
      <main>
        {tab === 'overview' && <Overview profile={profile} setProfile={setProfile} />}
        {tab === 'plan' && <Plan />}
        {tab === 'runs' && <Runs />}
        {tab === 'food' && <Nutrition profile={profile} />}
        {tab === 'progress' && <Progress />}
        {tab === 'sources' && <Sources />}
      </main>
      <footer className="muted small">ข้อมูลเพื่อการศึกษา ไม่ใช่คำแนะนำทางการแพทย์</footer>
    </div>
  )
}
