import { useMemo, useState } from 'react'
import { ClipboardList, Droplets, Dumbbell, Flag, Footprints, Mountain, Ruler, X } from 'lucide-react'
import { setupGaps, type Gap, type GapId } from '../lib/setupGaps'
import { useRuns, useSessions } from '../lib/log'
import { useProgram } from '../lib/program'
import { useShoes } from '../lib/shoes'
import { useSweatTests } from '../lib/sweat'
import { useLegTests } from '../lib/legTests'
import { useRaceCourse } from '../lib/course'
import { usePersisted } from '../lib/storage'
import { useNav } from '../lib/nav'
import { today } from '../lib/date'
import { useT } from '../lib/i18n'
import { Button, Disclosure } from './ui'
import { ProgramSheet } from './ProgramSheet'

const ICON: Record<GapId, typeof Flag> = { race: Flag, kg: Dumbbell, legTest: Ruler, shoes: Footprints, sweat: Droplets, course: Mountain }

/** หน้าหลัก (ล่างสุด): ข้อมูลที่แผนใช้แต่ยังไม่ได้กรอก รวมไว้ที่เดียว ซ่อนทีละข้อได้ (device key gapsHidden) */
export function SetupGapsCard() {
  const t = useT()
  const p = useProgram()
  const [runs] = useRuns()
  const [sessions] = useSessions()
  const [shoes] = useShoes()
  const [sweat] = useSweatTests()
  const [legTests] = useLegTests()
  const [course] = useRaceCourse()
  const [hidden, setHidden] = usePersisted<string[]>('gapsHidden', [])
  const [, setRunsView] = usePersisted('runsView', 'start')
  const [, setProgressView] = usePersisted('progressView', 'workouts')
  const [sheet, setSheet] = useState(false)
  const nav = useNav()
  const d = today()
  const active = p.isRace && !!p.raceDate && !p.finished
  const gaps = useMemo(() => setupGaps({
    today: d,
    race: { active, kmSet: p.raceKm !== p.meta.raceKm, cutoffSet: !!p.raceCutoff, course: !!course },
    runs, sessions, shoes, sweatTests: sweat.length, legTests,
  }).filter(g => !hidden.includes(g.id)), [d, active, p.raceKm, p.meta.raceKm, p.raceCutoff, course, runs, sessions, shoes, sweat.length, legTests, hidden])
  if (!gaps.length) return sheet ? <ProgramSheet onClose={() => setSheet(false)} /> : null

  const text = (g: Gap): { title: string; why: string; go?: [string, () => void] } => {
    switch (g.id) {
      case 'race': return {
        title: t('ระยะงานจริงและเวลาตัดตัว', 'Actual race distance and cutoff'),
        why: t('แผนวันแข่ง เพซรายกิโล และเวลาจบโดยประมาณคิดจากค่านี้', 'Your race-day plan, per-km pacing and finish estimate use these'),
        go: [t('ตั้งค่า', 'Set up'), () => setSheet(true)],
      }
      case 'kg': return {
        title: t('น้ำหนักจริงของท่าเวท', 'Real weights for your lifts'),
        why: t(`${g.names!.slice(0, 3).join(', ')}${g.names!.length > 3 ? ` และอีก ${g.names!.length - 3} ท่า` : ''} ยังบันทึกเป็น 0 กก. แอปจึงแนะนำให้เพิ่มน้ำหนักไม่ได้ ฝึกครั้งหน้าใส่น้ำหนักที่ยกจริง (บาร์เปล่า 20 กก.)`,
          `${g.names!.slice(0, 3).join(', ')}${g.names!.length > 3 ? ` and ${g.names!.length - 3} more` : ''} are logged at 0 kg, so the app can't suggest when to add weight. Enter what you actually lift next time (empty bar = 20 kg)`),
      }
      case 'legTest': return {
        title: t('ทดสอบขา (กระโดดขาเดียว เขย่งขาเดียว)', 'Leg tests (single-leg hop and calf raise)'),
        why: t('บอกว่าขาสองข้างแข็งแรงเท่ากันไหม และน่องพร้อมรับระยะวิ่งที่เพิ่มขึ้นหรือยัง ทำทุก 8 สัปดาห์', 'Shows whether both legs are equally strong and your calves are ready for more mileage. Repeat every 8 weeks'),
        go: [t('ไปทดสอบ', 'Test now'), () => { setProgressView('fitness'); nav('progress') }],
      }
      case 'shoes': return {
        title: t('รองเท้าวิ่ง', 'Running shoes'),
        why: t('แอปนับระยะของแต่ละคู่ และเตือนเมื่อใกล้ถึงเวลาเปลี่ยน', 'The app tracks each pair’s distance and tells you when to replace it'),
        go: [t('เพิ่มรองเท้า', 'Add shoes'), () => { setRunsView('stats'); nav('runs') }],
      }
      case 'sweat': return {
        title: t('ทดสอบเหงื่อ', 'Sweat test'),
        why: t('ชั่งน้ำหนักก่อนและหลังวิ่งราว 1 ชั่วโมง แอปจะคำนวณว่าวันแข่งควรดื่มน้ำเท่าไร', 'Weigh yourself before and after a ~1-hour run and the app works out how much to drink on race day'),
        go: [t('ไปทดสอบ', 'Test now'), () => { setRunsView('stats'); nav('runs') }],
      }
      case 'course': return {
        title: t('เส้นทางสนามแข่ง (ไม่บังคับ)', 'Race course (optional)'),
        why: t('นำเข้าไฟล์ GPX ของสนาม แอปวางเพซตามเนินให้แต่ละกิโล', 'Import the course GPX and the app paces each km for the hills'),
        go: [t('นำเข้า', 'Import'), () => nav('plan')],
      }
    }
  }

  return (
    <>
      <Disclosure
        title={<span className="flex items-center gap-2"><ClipboardList size={18} className="text-accent" /> {t('ข้อมูลที่ยังขาด', 'Missing info')}</span>}
        summary={t(`${gaps.length} อย่าง กรอกแล้วแผนจะแม่นขึ้น`, `${gaps.length} item${gaps.length > 1 ? 's' : ''} that make your plan more accurate`)}>
        <ul className="space-y-2.5">
          {gaps.map(g => {
            const x = text(g)
            const Icon = ICON[g.id]
            return (
              <li key={g.id} className="flex gap-2.5 rounded-xl bg-raised p-3">
                <Icon size={18} className="mt-0.5 shrink-0 text-accent" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold">{x.title}</div>
                  <p className="mt-0.5 text-xs text-muted">{x.why}</p>
                  {x.go && <Button size="sm" variant="soft" className="mt-2" onClick={x.go[1]}>{x.go[0]}</Button>}
                </div>
                <button onClick={() => setHidden(prev => [...prev, g.id])} className="grid size-8 shrink-0 place-items-center rounded-full text-muted">
                  <X size={16} /><span className="sr-only">{t('ซ่อน', 'Hide')} {x.title}</span>
                </button>
              </li>
            )
          })}
        </ul>
      </Disclosure>
      {sheet && <ProgramSheet onClose={() => setSheet(false)} />}
    </>
  )
}
