import { useState } from 'react'
import { Droplets } from 'lucide-react'
import { drinkPlan, sweatRate, useSweatTests, type SweatTest } from '../lib/sweat'
import { uid } from '../lib/log'
import { niceDate, today } from '../lib/date'
import { usePersisted } from '../lib/storage'
import { defaultProfile, type Profile } from '../lib/calc'
import { Button, Card, Disclosure } from './ui'
import { NumberInput } from './Form'

/** ทดสอบเหงื่อ: รู้ว่าต้องดื่มเท่าไรในอากาศร้อนแบบไทย (ทำในวันวิ่ง ≥45 นาที) */
export function SweatCard() {
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
    <Card title={<span className="flex items-center gap-2"><Droplets size={18} className="text-run" /> ทดสอบเหงื่อ</span>}>
      {r ? (
        <div className="rounded-xl bg-raised p-3 text-sm">
          <div className="text-xs text-muted">ล่าสุด {niceDate(last.date)} · วิ่ง {last.minutes} นาที</div>
          <div className="mt-1 font-bold">เสียเหงื่อ ~{r.rateLph.toFixed(1)} ลิตร/ชม. · น้ำหนักลด {r.lossPct.toFixed(1)}%</div>
          {r.lossPct > 2 && <p className="mt-1 text-xs text-warn">ลดเกิน 2% — ครั้งหน้าดื่มระหว่างวิ่งมากขึ้น</p>}
          <ul className="mt-2 space-y-1 text-xs">
            {[45, 90, 150].map(m => {
              const p = drinkPlan(r.rateLph, last.preKg || profile.weightKg, m)
              return <li key={m}>วิ่ง {m} นาที: {p.needMlph ? `ดื่ม ~${p.per20} มล. ทุก 20 นาที` : 'ไม่จำเป็นต้องดื่มระหว่างวิ่ง (ดื่มก่อน–หลังพอ)'}{p.sodium && ' + เกลือแร่'}</li>
            })}
          </ul>
        </div>
      ) : (
        <p className="text-sm text-muted">ชั่งน้ำหนักก่อน–หลังวิ่งแล้วแอปจะบอกว่าต้องดื่มเท่าไร — สำคัญมากในอากาศร้อน</p>
      )}
      <Disclosure title={r ? 'ทดสอบใหม่' : 'วิธีทดสอบ'} defaultOpen={!r}>
        <ol className="list-decimal space-y-1 pl-5 text-xs text-muted">
          <li>ฉี่ก่อน แล้วชั่งน้ำหนัก (ใส่ชุดน้อยที่สุด)</li>
          <li>วิ่งตามปกติ 45–60 นาที จดว่าดื่มน้ำไปกี่ มล. (อย่าฉี่ระหว่างวิ่ง)</li>
          <li>เช็ดตัวให้แห้ง ถอดชุดที่เปียกเหงื่อ แล้วชั่งอีกครั้ง</li>
        </ol>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <NumberInput label="ก่อนวิ่ง" unit="กก." step={0.1} value={d.pre} onChange={set('pre')} />
          <NumberInput label="หลังวิ่ง" unit="กก." step={0.1} value={d.post} onChange={set('post')} />
          <NumberInput label="ดื่มระหว่างวิ่ง" unit="มล." step={50} value={d.drank} onChange={set('drank')} />
          <NumberInput label="เวลาวิ่ง" unit="นาที" value={d.min} onChange={set('min')} />
        </div>
        <Button className="mt-2 w-full" disabled={!valid} onClick={save}>บันทึกผลทดสอบ</Button>
        <p className="mt-2 text-[11px] text-muted">หลักการ: ระหว่างวิ่งไม่ให้น้ำหนักลดเกิน 2% และไม่ดื่มเกินที่เสีย (ACSM 2007) · อากาศต่างกันมาก อัตราเหงื่อก็ต่าง ทดสอบซ้ำในวันที่อากาศใกล้วันแข่ง</p>
      </Disclosure>
    </Card>
  )
}
