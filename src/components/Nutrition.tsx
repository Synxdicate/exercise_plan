import { useState } from 'react'
import { Search } from 'lucide-react'
import { carbFoods, extraFoods, nutritionRules, proteinFoods, sampleDays, searchFoods, streetDishes, type Food } from '../data/nutrition'
import { targets, type Profile } from '../lib/calc'
import { useProgram } from '../lib/program'
import { Badge, Card, Segmented } from './ui'
import { cx } from '../lib/cx'
import { FoodLog } from './FoodLog'
import { TextInput } from './Form'

const verdict = {
  good: { label: 'แนะนำ', cls: 'bg-good/15 text-good' },
  ok: { label: 'พอได้', cls: 'bg-warn/15 text-warn' },
  limit: { label: 'นาน ๆ ครั้ง', cls: 'bg-bad/15 text-bad' },
}

type View = 'menu' | 'street' | 'foods'

export function Nutrition({ profile }: { profile: Profile }) {
  const { isRace } = useProgram()
  const t = targets(profile, isRace)
  const [view, setView] = useState<View>('menu')
  const [q, setQ] = useState('')
  const dishes = searchFoods(streetDishes, q)

  return (
    <>
      <section className="grid grid-cols-4 divide-x divide-line rounded-2xl bg-card py-2.5 text-center shadow-sm ring-1 ring-line">
        {[['พลังงาน', t.kcal, 'kcal', true], ['โปรตีน', t.protein, 'ก.', true], ['ไขมัน', t.fat, 'ก.', false], ['คาร์บ', t.carbs, 'ก.', false]].map(([l, v, u, a]) => (
          <div key={String(l)} className="px-1">
            <div className="text-[11px] text-muted">{l}</div>
            <div className={cx('text-lg font-bold leading-tight tabular-nums', !!a && 'text-accent')}>{v}</div>
            <div className="text-[10px] text-muted">{u}/วัน</div>
          </div>
        ))}
      </section>

      {t.raceAdjusted && <p className="rounded-xl bg-run/10 px-3 py-2 text-xs text-run">อยู่ในโปรแกรมวิ่ง: กินเท่าที่ใช้ (ไม่กินขาด) และเพิ่มคาร์บ เพื่อฟื้นตัวทัน</p>}

      <FoodLog proteinTarget={t.protein} kcalTarget={t.kcal} />

      <Segmented value={view} onChange={setView} options={[
        { value: 'menu', label: 'เมนูตัวอย่าง' },
        { value: 'street', label: 'ร้านตามสั่ง' },
        { value: 'foods', label: 'วัตถุดิบ' },
      ]} />

      {view !== 'menu' && <TextInput value={q} onChange={setQ} placeholder={view === 'street' ? 'ค้นหาเมนู' : 'ค้นหาวัตถุดิบ'} icon={<Search size={16} />} />}

      {view === 'menu' && (
        <>
          {sampleDays.map(d => {
            const kcal = d.meals.reduce((s, m) => s + m.kcal, 0)
            const protein = d.meals.reduce((s, m) => s + m.protein, 0)
            return (
              <Card key={d.title} title={d.title}>
                <ol className="space-y-3">
                  {d.meals.map(m => (
                    <li key={m.time} className="flex gap-3">
                      <span className="w-16 shrink-0 pt-0.5"><Badge>{m.time}</Badge></span>
                      <div className="min-w-0">
                        <div className="text-sm">{m.items}</div>
                        <div className="text-xs text-muted">~{m.kcal} kcal · {m.protein} ก. โปรตีน</div>
                      </div>
                    </li>
                  ))}
                </ol>
                <div className="mt-3 rounded-2xl bg-accent-soft px-3 py-2 text-sm font-bold text-accent">รวม ~{kcal} kcal · {protein} ก. โปรตีน</div>
              </Card>
            )
          })}
          <p className="px-2 text-xs text-muted">ปรับขนาดข้าวให้ตรงเป้าแคลอรี่ของคุณ: ข้าว 1 ทัพพี ≈ 80 kcal</p>
          <Card title="กฎง่าย ๆ">
            <ul className="list-disc space-y-1.5 pl-5 text-sm">{nutritionRules.map(r => <li key={r}>{r}</li>)}</ul>
          </Card>
        </>
      )}

      {view === 'street' && (
        <Card title="อาหารตามสั่ง / ร้านข้างทาง">
          {!dishes.length && <p className="py-4 text-center text-sm text-muted">ไม่พบเมนูนี้</p>}
          <ul className="divide-y divide-line">
            {dishes.map(d => (
              <li key={d.name} className="py-3">
                <div className="flex items-start justify-between gap-2">
                  <span className="font-semibold">{d.name}</span>
                  <span className="shrink-0 text-right text-sm tabular-nums text-muted"><b className="text-accent">{d.protein} ก.</b> · ~{d.kcal} kcal</span>
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <span className={cx('rounded-full px-2 py-0.5 text-xs font-semibold', verdict[d.verdict].cls)}>{verdict[d.verdict].label}</span>
                  <span className="text-xs text-muted">{d.tip}</span>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {view === 'foods' && (
        <>
          <FoodList title="แหล่งโปรตีน" foods={searchFoods(proteinFoods, q)} />
          <FoodList title="แหล่งคาร์บ" foods={searchFoods(carbFoods, q)} />
          <FoodList title="ของกินเล่น / เครื่องดื่ม" foods={searchFoods(extraFoods, q)} />
        </>
      )}

      <p className="px-2 text-xs text-muted">ค่าประมาณ ขึ้นกับปริมาณและวิธีปรุงของแต่ละร้าน · ดูเพิ่มที่ <a href="https://inmu.mahidol.ac.th/thaifcd/home" target="_blank" rel="noreferrer">Thai Food Composition Database (ม.มหิดล)</a></p>
    </>
  )
}

function FoodList({ title, foods }: { title: string; foods: Food[] }) {
  if (!foods.length) return null
  return (
    <Card title={title}>
      <ul className="divide-y divide-line">
        {foods.map(f => (
          <li key={f.name} className="flex items-center justify-between gap-3 py-2.5">
            <div className="min-w-0">
              <div className="font-semibold">{f.name}</div>
              <div className="text-xs text-muted">{f.portion} · {f.where}</div>
            </div>
            <div className="shrink-0 text-right">
              <div className="font-bold tabular-nums text-accent">{f.protein} ก.</div>
              <div className="text-xs tabular-nums text-muted">{f.kcal} kcal</div>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  )
}
