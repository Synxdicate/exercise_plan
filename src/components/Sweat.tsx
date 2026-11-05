import { useState } from 'react'
import { Droplets } from 'lucide-react'
import { drinkPlan, sweatRate, useSweatTests, type SweatTest } from '../lib/sweat'
import { uid } from '../lib/log'
import { niceDate, today } from '../lib/date'
import { usePersisted } from '../lib/storage'
import { defaultProfile, type Profile } from '../lib/calc'
import { Button, Card, Disclosure } from './ui'
import { useT } from '../lib/i18n'
import { NumberInput } from './Form'

/** ทดสอบเหงื่อ: รู้ว่าต้องดื่มเท่าไรในอากาศร้อนแบบไทย (ทำในวันวิ่ง ≥45 นาที) */
export function SweatCard() {
  const tr = useT()
  const [tests, setTests] = useSweatTests()
  const [profile] = usePersisted<Profile>('profile', defaultProfile)
  const [d, setD] = useState({ pre: '', post: '', drank: '', min: '' })
  const set = (k: keyof typeof d) => (v: string) => setD(x => ({ ...x, [k]: v }))
  const t = { preKg: +d.pre, postKg: +d.post, drankMl: +d.drank || 0, minutes: +d.min }
  const valid = t.preKg > 30 && t.postKg > 30 && t.minutes >= 20 && Math.abs(t.preKg - t.postKg) < 5
  const save = () => {
    setTests(prev => [...prev, { id: uid(), date: today(), ...t } satisfies SweatTest].slice(-10))
    setD({ pre: '', post: '', drank: '', min: '' })
  }
  const last = tests.at(-1)
  const r = last && sweatRate(last)

  return (
    <Card title={<span className="flex items-center gap-2"><Droplets size={18} className="text-run" /> {tr('ทดสอบเหงื่อ', 'Sweat test')}</span>}>
      {r ? (
        <div className="rounded-xl bg-raised p-3 text-sm">
          <div className="text-xs text-muted">{tr('ล่าสุด', 'Latest')} {niceDate(last.date)} · {tr(`วิ่ง ${last.minutes} นาที`, `${last.minutes} min run`)}</div>
          <div className="mt-1 font-bold">{tr(`เสียเหงื่อ ~${r.rateLph.toFixed(1)} ลิตร/ชม. · น้ำหนักลด ${r.lossPct.toFixed(1)}%`, `Sweat ~${r.rateLph.toFixed(1)} L/h · ${r.lossPct.toFixed(1)}% body-mass loss`)}</div>
          {r.lossPct > 2 && <p className="mt-1 text-xs text-warn">{tr('ลดเกิน 2% — ครั้งหน้าดื่มระหว่างวิ่งมากขึ้น', 'Over 2% — drink more during the run next time')}</p>}
          <ul className="mt-2 space-y-1 text-xs">
            {[45, 90, 150].map(m => {
              const p = drinkPlan(r.rateLph, last.preKg || profile.weightKg, m)
              return <li key={m}>{tr(`วิ่ง ${m} นาที`, `${m} min run`)}: {p.needMlph ? tr(`ดื่ม ~${p.per20} มล. ทุก 20 นาที`, `drink ~${p.per20} ml every 20 min`) : tr('ไม่จำเป็นต้องดื่มระหว่างวิ่ง (ดื่มก่อน–หลังพอ)', 'no need to drink during (before/after is enough)')}{p.sodium && tr(' + เกลือแร่', ' + electrolytes')}</li>
            })}
          </ul>
        </div>
      ) : (
        <p className="text-sm text-muted">{tr('ชั่งน้ำหนักก่อน–หลังวิ่งแล้วแอปจะบอกว่าต้องดื่มเท่าไร — สำคัญมากในอากาศร้อน', 'Weigh yourself before and after a run and the app tells you how much to drink — key in hot weather')}</p>
      )}
      <Disclosure title={r ? tr('ทดสอบใหม่', 'New test') : tr('วิธีทดสอบ', 'How to test')} defaultOpen={!r}>
        <ol className="list-decimal space-y-1 pl-5 text-xs text-muted">
          <li>{tr('ฉี่ก่อน แล้วชั่งน้ำหนัก (ใส่ชุดน้อยที่สุด)', 'Pee first, then weigh yourself (minimal clothing)')}</li>
          <li>{tr('วิ่งตามปกติ 45–60 นาที จดว่าดื่มน้ำไปกี่ มล. (อย่าฉี่ระหว่างวิ่ง)', 'Run normally for 45–60 min, note how many ml you drink (no toilet stops)')}</li>
          <li>{tr('เช็ดตัวให้แห้ง ถอดชุดที่เปียกเหงื่อ แล้วชั่งอีกครั้ง', 'Towel off, remove sweaty clothes, weigh again')}</li>
        </ol>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <NumberInput label={tr('ก่อนวิ่ง', 'Before')} unit={tr('กก.', 'kg')} step={0.1} value={d.pre} onChange={set('pre')} />
          <NumberInput label={tr('หลังวิ่ง', 'After')} unit={tr('กก.', 'kg')} step={0.1} value={d.post} onChange={set('post')} />
          <NumberInput label={tr('ดื่มระหว่างวิ่ง', 'Drank during')} unit={tr('มล.', 'ml')} step={50} value={d.drank} onChange={set('drank')} />
          <NumberInput label={tr('เวลาวิ่ง', 'Run time')} unit={tr('นาที', 'min')} value={d.min} onChange={set('min')} />
        </div>
        <Button className="mt-2 w-full" disabled={!valid} onClick={save}>{tr('บันทึกผลทดสอบ', 'Save result')}</Button>
        <p className="mt-2 text-[11px] text-muted">{tr('หลักการ: ระหว่างวิ่งไม่ให้น้ำหนักลดเกิน 2% และไม่ดื่มเกินที่เสีย (ACSM 2007) · อากาศต่างกันมาก อัตราเหงื่อก็ต่าง ทดสอบซ้ำในวันที่อากาศใกล้วันแข่ง', 'Rule: lose no more than 2% body mass and never drink more than you sweat (ACSM 2007) · sweat rate changes with weather; retest in race-like conditions')}</p>
      </Disclosure>
    </Card>
  )
}
