import { useState } from 'react'
import { ChevronDown, Play, Zap } from 'lucide-react'
import { buildCircuit, circuitTotal } from '../lib/circuit'
import { DRILL_REST, easyDrills, qualityDrills } from '../data/drills'
import type { Run } from '../lib/log'
import { useT } from '../lib/i18n'
import { cx } from '../lib/cx'
import { Button, Collapse, Segmented } from './ui'
import { CircuitPlayer } from './CircuitPlayer'
import { ExerciseDemo } from './ExerciseDemo'

const SETS = { easy: buildCircuit(easyDrills, 45, DRILL_REST, 1), quality: buildCircuit(qualityDrills, 45, DRILL_REST, 1) }
const QUALITY: Run['kind'][] = ['tempo', 'interval', 'race']

/** ดริลล์ก่อนวิ่ง: เลือกชุดตามประเภทการวิ่งที่เลือก แล้วเล่นทีละท่าพร้อมเสียงนำ */
export function DrillsCard({ kind }: { kind: Run['kind'] }) {
  const t = useT()
  const suggested = QUALITY.includes(kind) ? 'quality' : 'easy'
  const [picked, setPicked] = useState<'easy' | 'quality' | null>(null)
  const set = picked ?? suggested
  const [open, setOpen] = useState(false)
  const [how, setHow] = useState<string | null>(null)
  const [playing, setPlaying] = useState(false)
  const list = set === 'quality' ? qualityDrills : easyDrills
  const min = (s: keyof typeof SETS) => Math.round(circuitTotal(SETS[s]) / 60)
  return (
    <section className="rounded-2xl bg-card p-3.5 shadow-sm ring-1 ring-line">
      <button onClick={() => setOpen(!open)} aria-expanded={open} className="flex w-full items-center gap-3 text-left active:scale-100">
        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-run/10 text-run"><Zap size={20} /></span>
        <span className="min-w-0 flex-1">
          <span className="block font-bold">{t('ดริลล์ก่อนวิ่ง', 'Pre-run drills')}</span>
          <span className="block truncate text-sm text-muted">{t(`หลังเดินเร็ว/จ็อก 5–10 นาที · ~${min(set)} นาที`, `After a 5–10 min brisk walk/jog · ~${min(set)} min`)}</span>
        </span>
        <ChevronDown size={18} className={cx('shrink-0 text-muted transition-transform', open && 'rotate-180')} />
      </button>
      <Collapse open={open}>
        <div className="pt-3">
          <Segmented value={set} onChange={setPicked} options={[
            { value: 'easy', label: t('ก่อนวิ่งเบา', 'Easy days') },
            { value: 'quality', label: t('ก่อนวิ่งเร็ว', 'Fast days') },
          ]} />
          <p className="mt-2 text-xs text-muted">
            {set === 'quality'
              ? t('วันวิ่งเร็ว/เนิน/แข่ง: เพิ่มเอสคิปและสเตรตเลกบาวด์ (แรงกระแทกมากกว่า) ชุดซ้อมของวันนั้นมีขั้นดริลล์อยู่แล้ว ทำตรงนี้แทนได้', 'Fast/hill/race days add A-skips and straight-leg bounds (more impact) — the day’s guided workout already has a drills step; you can do it here instead')
              : t('วันวิ่งเบา/วิ่งยาว: ท่าแรงกระแทกต่ำ ช่วยให้ข้อต่อพร้อมและจับจังหวะก้าว', 'Easy/long days: low-impact moves to loosen up and find your rhythm')}
          </p>
          <ol className="mt-2 divide-y divide-line">
            {list.map((d, i) => (
              <li key={d.name}>
                <button onClick={() => setHow(how === d.name ? null : d.name)} aria-expanded={how === d.name} className="flex w-full items-center gap-2 py-2 text-left text-sm">
                  <span className="w-4 text-xs tabular-nums text-muted">{i + 1}</span>
                  <span className="flex-1 font-semibold">{t(d.th, d.en ?? d.name)}</span>
                  <span className="text-xs tabular-nums text-muted">{d.sec} {t('วิ', 's')}</span>
                  <ChevronDown size={14} className={cx('text-muted transition-transform', how === d.name && 'rotate-180')} />
                </button>
                <Collapse open={how === d.name}>
                  <div className="pb-3">
                    {how === d.name && <ExerciseDemo name={d.name} />}
                    <p className="mt-2 text-sm text-muted">{t(d.how, d.howEn)}</p>
                  </div>
                </Collapse>
              </li>
            ))}
          </ol>
          <Button variant="run" className="mt-2 w-full" onClick={() => setPlaying(true)}><Play size={16} fill="currentColor" /> {t('เริ่มดริลล์ (มีเสียงนำ)', 'Start drills (voice-guided)')}</Button>
          <p className="mt-2 text-[11px] text-muted">{t('ดริลล์เป็นการวอร์มอัพและฝึกจังหวะ งานวิจัยพบว่าช่วยให้ก้าวสั้นลง ถี่ขึ้นได้ แต่ไม่ได้ทำให้วิ่งประหยัดแรงขึ้นทันที ความเร็วยังมาจากการซ้อมตามแผน (Fradkin 2010, Craighead 2014, Yamaguchi 2015)', 'Drills are a warm-up and rhythm practice — studies show they can shorten and quicken your stride but don’t instantly improve economy; speed still comes from the training plan (Fradkin 2010, Craighead 2014, Yamaguchi 2015)')}</p>
        </div>
      </Collapse>
      {playing && <CircuitPlayer drills steps={SETS[set]} rounds={1} onClose={() => setPlaying(false)} />}
    </section>
  )
}
