import { useMemo, useState } from 'react'
import { Plus, Search, X } from 'lucide-react'
import { logFoods, searchFoods, type LogFood } from '../data/nutrition'
import { usePersisted } from '../lib/storage'
import { uid } from '../lib/log'
import { today } from '../lib/date'
import { Card } from './ui'
import { NumberInput, TextInput } from './Form'

type Item = { id: string; name: string; protein: number; kcal: number }

/** บันทึกโปรตีน/แคลอรี่วันนี้ — ค้นหาเมนู หรือแตะจากรายการที่กินล่าสุด */
export function FoodLog({ proteinTarget, kcalTarget }: { proteinTarget: number; kcalTarget: number }) {
  const [log, setLog] = usePersisted<Record<string, Item[]>>('foodLog', {})
  const [q, setQ] = useState('')
  const [custom, setCustom] = useState(false)
  const [name, setName] = useState('')
  const [protein, setProtein] = useState('')
  const [kcal, setKcal] = useState('')
  const day = today()
  const items = log[day] ?? []
  const p = items.reduce((s, i) => s + i.protein, 0)
  const k = items.reduce((s, i) => s + i.kcal, 0)

  // ที่กินล่าสุด (ไม่ซ้ำชื่อ) รวมเมนูที่กรอกเอง เพื่อให้แตะซ้ำได้โดยไม่ต้องค้นหา
  const recent = useMemo(() => {
    const seen = new Map<string, LogFood>()
    for (const [, list] of Object.entries(log).sort(([a], [b]) => b.localeCompare(a)))
      for (const i of [...list].reverse()) if (!seen.has(i.name)) seen.set(i.name, { name: i.name, protein: i.protein, kcal: i.kcal })
    return [...seen.values()]
  }, [log])
  const pool = useMemo(() => [...recent.filter(r => !logFoods.some(f => f.name === r.name)), ...logFoods], [recent])
  const results = q.trim() ? searchFoods(pool, q).slice(0, 8) : []
  const chips = (recent.length ? recent : logFoods).slice(0, 10)

  const add = (i: Omit<Item, 'id'>) => {
    setLog(prev => {
      // เก็บแค่ 60 วันล่าสุด
      const keep = Object.fromEntries(Object.entries(prev).sort(([a], [b]) => b.localeCompare(a)).slice(0, 60))
      return { ...keep, [day]: [...(keep[day] ?? []), { ...i, id: uid() }] }
    })
    setQ('')
  }
  const remove = (id: string) => setLog(prev => ({ ...prev, [day]: (prev[day] ?? []).filter(i => i.id !== id) }))
  const openCustom = () => { setName(q.trim()); setCustom(true); setQ('') }

  return (
    <Card title="วันนี้กินไปแล้ว">
      <div className="grid grid-cols-2 gap-3">
        <Bar label="โปรตีน" value={p} max={proteinTarget} unit="ก." tone="bg-accent" />
        <Bar label="พลังงาน" value={k} max={kcalTarget} unit="kcal" tone="bg-run" />
      </div>

      <TextInput className="mt-3" value={q} onChange={setQ} placeholder="ค้นหาเมนู เช่น กะเพรา, ไข่, ลาบ" icon={<Search size={16} />} />

      {q.trim() ? (
        <ul className="mt-2 divide-y divide-line">
          {results.map(f => (
            <li key={f.name}>
              <button onClick={() => add({ name: f.name, protein: f.protein, kcal: f.kcal })} className="flex w-full items-center gap-3 py-2.5 text-left">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{f.name}</span>
                  {f.detail && <span className="block text-xs text-muted">{f.detail}</span>}
                </span>
                <span className="shrink-0 text-xs tabular-nums text-muted"><b className="text-accent">{f.protein} ก.</b> · {f.kcal} kcal</span>
                <Plus size={16} className="shrink-0 text-run" />
              </button>
            </li>
          ))}
          <li>
            <button onClick={openCustom} className="flex w-full items-center gap-2 py-2.5 text-sm font-semibold text-run">
              <Plus size={14} /> {results.length ? 'ไม่เจอ? กรอกเอง' : `ไม่พบ "${q.trim()}" — กรอกเอง`}
            </button>
          </li>
        </ul>
      ) : (
        <>
          <div className="mt-3 text-xs text-muted">{recent.length ? 'กินล่าสุด — แตะเพื่อเพิ่ม' : 'แตะเพื่อเพิ่ม'}</div>
          <div className="-mx-4 mt-1.5 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
            {chips.map(f => (
              <button key={f.name} onClick={() => add({ name: f.name, protein: f.protein, kcal: f.kcal })}
                className="flex shrink-0 flex-col items-start rounded-2xl bg-raised px-3 py-2 text-left ring-1 ring-line">
                <span className="text-sm font-semibold">{f.name}</span>
                <span className="text-xs text-muted"><b className="text-accent">{f.protein} ก.</b> · {f.kcal} kcal</span>
              </button>
            ))}
            <button onClick={() => setCustom(!custom)} className="flex shrink-0 items-center gap-1 rounded-2xl px-3 py-2 text-sm font-semibold text-run ring-1 ring-line">
              <Plus size={14} /> กรอกเอง
            </button>
          </div>
        </>
      )}

      {custom && (
        <div className="mt-3 grid animate-fade-up grid-cols-2 gap-2 rounded-2xl bg-raised p-3">
          <TextInput className="col-span-2" label="ชื่ออาหาร" value={name} onChange={setName} placeholder="เช่น สเต๊กอกไก่" />
          <NumberInput label="โปรตีน" unit="ก." value={protein} onChange={setProtein} />
          <NumberInput label="พลังงาน" unit="kcal" value={kcal} onChange={setKcal} step={10} />
          <button className="col-span-2 rounded-full bg-accent py-2.5 font-semibold text-white disabled:opacity-50" disabled={!protein}
            onClick={() => { add({ name: name || 'อาหาร', protein: +protein || 0, kcal: +kcal || 0 }); setName(''); setProtein(''); setKcal(''); setCustom(false) }}>
            เพิ่ม
          </button>
        </div>
      )}

      {items.length > 0 && (
        <ul className="mt-3 divide-y divide-line">
          {items.map(i => (
            <li key={i.id} className="flex animate-fade-up items-center gap-2 py-2 text-sm">
              <span className="min-w-0 flex-1 truncate">{i.name}</span>
              <span className="tabular-nums text-muted">{i.protein} ก. · {i.kcal}</span>
              <button aria-label="ลบ" onClick={() => remove(i.id)} className="grid size-7 place-items-center rounded-full text-muted hover:bg-raised"><X size={14} /></button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

function Bar({ label, value, max, unit, tone }: { label: string; value: number; max: number; unit: string; tone: string }) {
  const pct = Math.min(100, (value / max) * 100)
  return (
    <div>
      <div className="flex items-baseline justify-between text-xs text-muted"><span>{label}</span><span>เป้า {max}</span></div>
      <div className="text-xl font-bold tabular-nums">{Math.round(value)}<span className="ml-1 text-xs font-normal text-muted">{unit}</span></div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-body">
        <div className={`h-full rounded-full transition-[width] duration-500 ${value >= max ? 'bg-good' : tone}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}
