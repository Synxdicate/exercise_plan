import { useState } from 'react'
import { Check, RotateCcw, Search, Sparkles } from 'lucide-react'
import { alternatives, allLibrary, homeUsable, patternNames, patternNamesEn, patternOf, type LibEx, type Pattern } from '../data/library'
import { searchFoods } from '../data/nutrition'
import type { Exercise } from '../data/workouts'
import { Badge, Sheet } from './ui'
import { useLang, useT } from '../lib/i18n'
import { TextInput } from './Form'
import { SUGGEST } from '../data/suggest'
import { useProgram } from '../lib/program'

const whereLabel = { gym: 'ยิม', park: 'สวน', both: 'ยิม/สวน' }
const whereLabelEn = { gym: 'Gym', park: 'Park', both: 'Gym/park' }
const placeName = (w: 'gym' | 'park' | 'home', en: boolean) => en ? { gym: 'Gym', park: 'Park', home: 'Home' }[w] : { gym: 'ยิม', park: 'สวน', home: 'บ้าน' }[w]

function Row({ e, onClick, right }: { e: LibEx; onClick: () => void; right?: React.ReactNode }) {
  const en = useLang()[0] === 'en'
  return (
    <li>
      <button onClick={onClick} className="flex w-full items-center gap-3 py-2.5 text-left">
        <span className="min-w-0 flex-1">
          <span className="block font-semibold">{e.name}</span>
          {!en && <span className="block text-xs text-muted">{e.th}</span>}
        </span>
        {right ?? <Badge tone="muted">{(en ? whereLabelEn : whereLabel)[e.where]}</Badge>}
      </button>
    </li>
  )
}

/** สลับท่าเป็นท่าอื่นในกลุ่มเดียวกัน มีผลกับทุกวันที่มีท่านี้ */
export function SwapSheet({ e, where, exclude, onPick, onClose }: { e: Exercise; where: 'gym' | 'park' | 'home'; exclude: string[]; onPick: (to?: string) => void; onClose: () => void }) {
  const original = e.swappedFrom ?? e.name
  const p = patternOf(original)
  const tr = useT()
  const list = alternatives(original, where).filter(x => !exclude.includes(x.name))
  return (
    <Sheet onClose={onClose} title={tr(`สลับ ${e.name}`, `Swap ${e.name}`)}>
      <p className="-mt-2 mb-2 text-xs text-muted">{p ? tr(`ท่ากลุ่ม${patternNames[p]} ใช้กล้ามหลักชุดเดียวกัน · เปลี่ยนทุกวันที่มีท่านี้`, `${patternNamesEn[p]} moves work the same main muscles · applies to every day with this exercise`) : tr('ท่านี้ยังไม่มีท่าทดแทนในคลัง', 'No alternatives in the library yet')}</p>
      <ul className="divide-y divide-line">
        {e.swappedFrom && (
          <li>
            <button onClick={() => onPick(undefined)} className="flex w-full items-center gap-2 py-2.5 text-left font-semibold text-run">
              <RotateCcw size={16} /> {tr('กลับเป็นท่าเดิม:', 'Back to original:')} {e.swappedFrom}
            </button>
          </li>
        )}
        {list.map(x => <Row key={x.name} e={x} onClick={() => onPick(x.name)} />)}
      </ul>
    </Sheet>
  )
}

/** เพิ่มท่าจากคลังเข้าวันนี้ */
export function AddSheet({ where, existing, onPick, onClose }: { where: 'gym' | 'park' | 'home'; existing: string[]; onPick: (e: LibEx) => void; onClose: () => void }) {
  const [q, setQ] = useState('')
  // ที่บ้าน: ท่าที่ไม่ต้องใช้บาร์/เครื่อง (เดิมกรอง where === 'home' ซึ่งไม่มีในคลัง เลยเหลือแต่ท่า both)
  const usable = allLibrary.filter(e => where === 'home' ? homeUsable(e.name) : e.where === where || e.where === 'both')
  const tr = useT()
  const en = useLang()[0] === 'en'
  const found = searchFoods(usable, q).concat(q ? usable.filter(e => e.th.includes(q.trim()) && !e.name.toLowerCase().includes(q.trim().toLowerCase())) : [])
  const groups = Object.keys(patternNames) as Pattern[]
  const p = useProgram()
  const runner = p.program !== 'physique' && p.program !== 'strength'
  const picks = SUGGEST[runner ? 'runner' : 'lifter']
    .flatMap(sg => { const e = usable.find(x => x.name === sg.name); return e && !existing.includes(e.name) ? [{ e, s: sg }] : [] })
    .slice(0, 3)
  return (
    <Sheet onClose={onClose} title={tr(`เพิ่มท่า (${placeName(where, false)})`, `Add exercise (${placeName(where, true)})`)}>
      <TextInput value={q} onChange={setQ} placeholder={tr('ค้นหา เช่น curl, ลันจ์, น่อง', 'Search e.g. curl, lunge, calf')} icon={<Search size={16} />} />
      <p className="mt-2 text-xs text-muted">{tr('เพิ่มทีละ 1–2 ท่าพอ ปริมาณรวมที่มากเกินทำให้ฟื้นตัวไม่ทันวันวิ่ง', 'Add 1–2 at most — too much total volume hurts recovery for run days')}</p>
      {!q && picks.length > 0 && (
        <section className="mt-3 rounded-2xl bg-accent-soft/40 p-3 ring-1 ring-accent/20">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-accent"><Sparkles size={14} /> {tr(runner ? 'แนะนำสำหรับนักวิ่ง' : 'แนะนำสำหรับสร้างกล้าม', runner ? 'Suggested for runners' : 'Suggested for muscle')}</div>
          <ul className="divide-y divide-line">
            {picks.map(({ e, s: sg }) => (
              <li key={e.name}>
                <Row e={e} onClick={() => onPick(e)} />
                <p className="-mt-1 pb-2 text-[11px] text-muted">{en ? sg.whyEn : sg.why}</p>
              </li>
            ))}
          </ul>
        </section>
      )}
      {groups.map(g => {
        const list = found.filter(e => e.pattern === g)
        if (!list.length) return null
        return (
          <section key={g} className="mt-3">
            <div className="text-xs font-semibold text-muted">{(en ? patternNamesEn : patternNames)[g]}</div>
            <ul className="divide-y divide-line">
              {list.map(e => {
                const has = existing.includes(e.name)
                return <Row key={e.name} e={e} onClick={() => !has && onPick(e)} right={has ? <Check size={16} className="text-good" /> : undefined} />
              })}
            </ul>
          </section>
        )
      })}
      {!found.length && <p className="py-6 text-center text-sm text-muted">{tr('ไม่พบท่านี้', 'No match')}</p>}
    </Sheet>
  )
}
