import { useState } from 'react'
import { carbFoods, nutritionRules, proteinFoods, sampleDays, streetDishes, type Food } from '../data/nutrition'
import { targets, type Profile } from '../lib/calc'
import { Badge, Card, Segmented, Stat } from './ui'
import { cx } from '../lib/cx'

const verdict = {
  good: { label: 'แนะนำ', cls: 'bg-good/15 text-good' },
  ok: { label: 'พอได้', cls: 'bg-warn/15 text-warn' },
  limit: { label: 'นาน ๆ ครั้ง', cls: 'bg-bad/15 text-bad' },
}

type View = 'menu' | 'street' | 'foods'

export function Nutrition({ profile }: { profile: Profile }) {
  const t = targets(profile)
  const [view, setView] = useState<View>('menu')

  return (
    <>
      <div className="grid grid-cols-2 gap-2">
        <Stat label="พลังงาน" value={t.kcal} sub="kcal/วัน" accent />
        <Stat label="โปรตีน" value={`${t.protein} ก.`} sub={`~${Math.round(t.protein / 4)} ก. × 4 มื้อ`} accent />
        <Stat label="ไขมัน" value={`${t.fat} ก.`} sub="ขั้นต่ำเพื่อฮอร์โมน" />
        <Stat label="คาร์บ" value={`${t.carbs} ก.`} sub={`≈ ${Math.round(t.carbs / 18)} ทัพพีข้าว`} />
      </div>

      <Segmented value={view} onChange={setView} options={[
        { value: 'menu', label: 'เมนูตัวอย่าง' },
        { value: 'street', label: 'ร้านตามสั่ง' },
        { value: 'foods', label: 'วัตถุดิบ' },
      ]} />

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
          <ul className="divide-y divide-line">
            {streetDishes.map(d => (
              <li key={d.name} className="py-3">
                <div className="flex items-start justify-between gap-2">
                  <span className="font-semibold">{d.name}</span>
                  <span className="shrink-0 text-sm tabular-nums text-muted">~{d.kcal} kcal</span>
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
          <FoodList title="แหล่งโปรตีน" foods={proteinFoods} />
          <FoodList title="แหล่งคาร์บ" foods={carbFoods} />
        </>
      )}

      <p className="px-2 text-xs text-muted">ค่าทั้งหมดเป็นค่าประมาณจากฐานข้อมูลอาหาร (USDA FoodData Central, ฉลากสินค้า และตารางพลังงานอาหารจานเดียวที่เผยแพร่ในไทย) ค่าจริงขึ้นกับปริมาณและวิธีปรุงของแต่ละร้าน</p>
    </>
  )
}

function FoodList({ title, foods }: { title: string; foods: Food[] }) {
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
