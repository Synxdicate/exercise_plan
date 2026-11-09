import { useState } from 'react'
import { useSwipe } from '../lib/swipe'
import { Search } from 'lucide-react'
import { carbFoods, extraFoods, nutritionRules, nutritionRulesEn, proteinFoods, sampleDays, searchFoods, streetDishes, type Food } from '../data/nutrition'
import { targets, type Profile } from '../lib/calc'
import { useProgram } from '../lib/program'
import { Badge, Card, Segmented } from './ui'
import { cx } from '../lib/cx'
import { FoodLog } from './FoodLog'
import { TextInput } from './Form'
import { ProfileCard } from './ProfileCard'
import { useT } from '../lib/i18n'

const verdictEn = { good: 'Recommended', ok: 'OK', limit: 'Occasionally' }
const verdict = {
  good: { label: 'แนะนำ', cls: 'bg-good/15 text-good' },
  ok: { label: 'พอได้', cls: 'bg-warn/15 text-warn' },
  limit: { label: 'นาน ๆ ครั้ง', cls: 'bg-bad/15 text-bad' },
}

type View = 'menu' | 'street' | 'foods'

export function Nutrition({ profile, setProfile }: { profile: Profile; setProfile: (p: Profile) => void }) {
  const { isRace } = useProgram()
  const t = targets(profile, isRace)
  const [view, setView] = useState<View>('menu')
  useSwipe(['menu', 'street', 'foods'] as const, view, setView)
  const tr = useT()
  const [q, setQ] = useState('')
  const dishes = searchFoods(streetDishes, q)

  return (
    <>
      <section className="grid grid-cols-4 divide-x divide-line rounded-2xl bg-card py-2.5 text-center shadow-sm ring-1 ring-line">
        {[[tr('พลังงาน', 'Energy'), t.kcal, 'kcal', true], [tr('โปรตีน', 'Protein'), t.protein, tr('ก.', 'g'), true], [tr('ไขมัน', 'Fat'), t.fat, tr('ก.', 'g'), false], [tr('คาร์บ', 'Carbs'), t.carbs, tr('ก.', 'g'), false]].map(([l, v, u, a]) => (
          <div key={String(l)} className="px-1">
            <div className="text-[11px] text-muted">{l}</div>
            <div className={cx('text-lg font-bold leading-tight tabular-nums', !!a && 'text-accent')}>{v}</div>
            <div className="text-[10px] text-muted">{u}/{tr('วัน', 'day')}</div>
          </div>
        ))}
      </section>

      {t.raceAdjusted && <p className="rounded-xl bg-run/10 px-3 py-2 text-xs text-run">{tr('อยู่ในโปรแกรมวิ่ง: กินเท่าที่ใช้ (ไม่กินขาด) และเพิ่มคาร์บ เพื่อฟื้นตัวทัน', 'On a running program: eat at maintenance (no deficit) and add carbs to recover in time')}</p>}

      <FoodLog proteinTarget={t.protein} kcalTarget={t.kcal} />

      <ProfileCard profile={profile} setProfile={setProfile} />

      <div className="space-y-4">
      <Segmented value={view} onChange={setView} options={[
        { value: 'menu', label: tr('เมนูตัวอย่าง', 'Sample menus') },
        { value: 'street', label: tr('ร้านตามสั่ง', 'Street food') },
        { value: 'foods', label: tr('วัตถุดิบ', 'Ingredients') },
      ]} />

      {view !== 'menu' && <TextInput value={q} onChange={setQ} placeholder={view === 'street' ? tr('ค้นหาเมนู', 'Search dishes') : tr('ค้นหาวัตถุดิบ', 'Search ingredients')} icon={<Search size={16} />} />}

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
                        <div className="text-xs text-muted">~{m.kcal} kcal · {m.protein} {tr('ก. โปรตีน', 'g protein')}</div>
                      </div>
                    </li>
                  ))}
                </ol>
                <div className="mt-3 rounded-2xl bg-accent-soft px-3 py-2 text-sm font-bold text-accent">{tr('รวม', 'Total')} ~{kcal} kcal · {protein} {tr('ก. โปรตีน', 'g protein')}</div>
              </Card>
            )
          })}
          <p className="px-2 text-xs text-muted">{tr('ปรับขนาดข้าวให้ตรงเป้าแคลอรี่ของคุณ: ข้าว 1 ทัพพี ≈ 80 kcal', 'Adjust rice to your calorie target: 1 scoop of rice ≈ 80 kcal')}</p>
          <Card title={tr('กฎง่าย ๆ', 'Simple rules')}>
            <ul className="list-disc space-y-1.5 pl-5 text-sm">{nutritionRules.map((r, i) => <li key={r}>{tr(r, nutritionRulesEn[i])}</li>)}</ul>
          </Card>
        </>
      )}

      {view === 'street' && (
        <Card title={tr('อาหารตามสั่ง / ร้านข้างทาง', 'Made-to-order / street food')}>
          {!dishes.length && <p className="py-4 text-center text-sm text-muted">{tr('ไม่พบเมนูนี้', 'No matching dish')}</p>}
          <ul className="divide-y divide-line">
            {dishes.map(d => (
              <li key={d.name} className="py-3">
                <div className="flex items-start justify-between gap-2">
                  <span className="font-semibold">{d.name}</span>
                  <span className="shrink-0 text-right text-sm tabular-nums text-muted"><b className="text-accent">{d.protein} {tr('ก.', 'g')}</b> · ~{d.kcal} kcal</span>
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <span className={cx('rounded-full px-2 py-0.5 text-xs font-semibold', verdict[d.verdict].cls)}>{tr(verdict[d.verdict].label, verdictEn[d.verdict])}</span>
                  <span className="text-xs text-muted">{d.tip}</span>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {view === 'foods' && (
        <>
          <FoodList title={tr('แหล่งโปรตีน', 'Protein sources')} foods={searchFoods(proteinFoods, q)} />
          <FoodList title={tr('แหล่งคาร์บ', 'Carb sources')} foods={searchFoods(carbFoods, q)} />
          <FoodList title={tr('ของกินเล่น / เครื่องดื่ม', 'Snacks / drinks')} foods={searchFoods(extraFoods, q)} />
        </>
      )}

      <p className="px-2 text-xs text-muted">{tr('ค่าประมาณ ขึ้นกับปริมาณและวิธีปรุงของแต่ละร้าน · ดูเพิ่มที่', 'Estimates — vary with portion and cooking · more at')} <a href="https://inmu.mahidol.ac.th/thaifcd/home" target="_blank" rel="noreferrer" className="underline">Thai Food Composition Database (ม.มหิดล)</a></p>
      </div>
    </>
  )
}

function FoodList({ title, foods }: { title: string; foods: Food[] }) {
  const tr = useT()
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
              <div className="font-bold tabular-nums text-accent">{f.protein} {tr('ก.', 'g')}</div>
              <div className="text-xs tabular-nums text-muted">{f.kcal} kcal</div>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  )
}
