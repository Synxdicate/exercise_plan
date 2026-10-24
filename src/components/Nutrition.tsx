import { carbFoods, nutritionRules, proteinFoods, sampleDays, streetDishes, type Food } from '../data/nutrition'
import { targets, type Profile } from '../lib/calc'

const verdictLabel = { good: 'แนะนำ', ok: 'พอได้', limit: 'นาน ๆ ครั้ง' }

export function Nutrition({ profile }: { profile: Profile }) {
  const t = targets(profile)
  return (
    <>
      <section className="card">
        <h2>เป้าต่อวันของคุณ</h2>
        <div className="stats">
          <div className="stat accent"><span className="label">พลังงาน</span><span className="value">{t.kcal}</span><span className="sub">kcal</span></div>
          <div className="stat accent"><span className="label">โปรตีน</span><span className="value">{t.protein} ก.</span><span className="sub">~{Math.round(t.protein / 4)} ก. × 4 มื้อ</span></div>
          <div className="stat"><span className="label">ไขมัน</span><span className="value">{t.fat} ก.</span><span className="sub">ขั้นต่ำเพื่อฮอร์โมน</span></div>
          <div className="stat"><span className="label">คาร์บ</span><span className="value">{t.carbs} ก.</span><span className="sub">≈ {Math.round(t.carbs / 18)} ทัพพีข้าว (ถ้ามาจากข้าวล้วน)</span></div>
        </div>
        <ul className="list">{nutritionRules.map(r => <li key={r}>{r}</li>)}</ul>
      </section>

      <section className="card">
        <h2>ตัวอย่างเมนู 1 วัน</h2>
        <div className="grid2">
          {sampleDays.map(d => {
            const kcal = d.meals.reduce((s, m) => s + m.kcal, 0)
            const protein = d.meals.reduce((s, m) => s + m.protein, 0)
            return (
              <div key={d.title} className="meal-plan">
                <h3>{d.title}</h3>
                {d.meals.map(m => (
                  <div key={m.time} className="meal">
                    <span className="badge">{m.time}</span>
                    <span>{m.items}</span>
                    <span className="muted small">~{m.kcal} kcal · {m.protein} ก. โปรตีน</span>
                  </div>
                ))}
                <p className="total">รวม ~{kcal} kcal · {protein} ก. โปรตีน</p>
              </div>
            )
          })}
        </div>
        <p className="muted small">ปรับขนาดข้าวให้ตรงเป้าแคลอรี่ของคุณ: ข้าว 1 ทัพพี ≈ 80 kcal</p>
      </section>

      <section className="card">
        <h2>อาหารตามสั่ง / ร้านข้างทาง</h2>
        <div className="table-wrap">
          <table>
            <thead><tr><th>เมนู</th><th>kcal (ประมาณ)</th><th></th><th>เคล็ดลับ</th></tr></thead>
            <tbody>
              {streetDishes.map(d => (
                <tr key={d.name}>
                  <td>{d.name}</td>
                  <td>{d.kcal}</td>
                  <td><span className={`pill ${d.verdict}`}>{verdictLabel[d.verdict]}</span></td>
                  <td className="muted">{d.tip}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid2">
        <FoodTable title="แหล่งโปรตีน" foods={proteinFoods} />
        <FoodTable title="แหล่งคาร์บ" foods={carbFoods} />
      </div>
      <p className="muted small">ค่าทั้งหมดเป็นค่าประมาณจากฐานข้อมูลอาหาร (USDA FoodData Central, ฉลากสินค้า และตารางพลังงานอาหารจานเดียวที่เผยแพร่ในไทย) ค่าจริงขึ้นกับปริมาณและวิธีปรุงของแต่ละร้าน</p>
    </>
  )
}

function FoodTable({ title, foods }: { title: string; foods: Food[] }) {
  return (
    <section className="card">
      <h2>{title}</h2>
      <div className="table-wrap">
        <table>
          <thead><tr><th>อาหาร</th><th>ปริมาณ</th><th>kcal</th><th>โปรตีน</th></tr></thead>
          <tbody>
            {foods.map(f => (
              <tr key={f.name}>
                <td>{f.name}<div className="muted small">{f.where}</div></td>
                <td>{f.portion}</td>
                <td>{f.kcal}</td>
                <td>{f.protein} ก.</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
