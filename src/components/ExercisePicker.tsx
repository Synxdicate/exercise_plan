import { useState } from 'react'
import { Check, RotateCcw, Search } from 'lucide-react'
import { alternatives, allLibrary, patternNames, patternOf, type LibEx, type Pattern } from '../data/library'
import { searchFoods } from '../data/nutrition'
import type { Exercise } from '../data/workouts'
import { Badge, Sheet } from './ui'
import { TextInput } from './Form'

const whereLabel = { gym: 'ยิม', park: 'สวน', both: 'ยิม/สวน' }

function Row({ e, onClick, right }: { e: LibEx; onClick: () => void; right?: React.ReactNode }) {
  return (
    <li>
      <button onClick={onClick} className="flex w-full items-center gap-3 py-2.5 text-left">
        <span className="min-w-0 flex-1">
          <span className="block font-semibold">{e.name}</span>
          <span className="block text-xs text-muted">{e.th}</span>
        </span>
        {right ?? <Badge tone="muted">{whereLabel[e.where]}</Badge>}
      </button>
    </li>
  )
}

/** สลับท่าเป็นท่าอื่นในกลุ่มเดียวกัน — มีผลกับทุกวันที่มีท่านี้ */
export function SwapSheet({ e, where, exclude, onPick, onClose }: { e: Exercise; where: 'gym' | 'park'; exclude: string[]; onPick: (to?: string) => void; onClose: () => void }) {
  const original = e.swappedFrom ?? e.name
  const p = patternOf(original)
  const list = alternatives(original, where).filter(x => !exclude.includes(x.name))
  return (
    <Sheet onClose={onClose} title={`สลับ ${e.name}`}>
      <p className="-mt-2 mb-2 text-xs text-muted">{p ? `ท่ากลุ่ม${patternNames[p]} ใช้กล้ามหลักชุดเดียวกัน — เซ็ต/ครั้ง/พักเท่าเดิม ใช้กับทุกวันที่มีท่านี้` : 'ท่านี้ยังไม่มีท่าทดแทนในคลัง'}</p>
      <ul className="divide-y divide-line">
        {e.swappedFrom && (
          <li>
            <button onClick={() => onPick(undefined)} className="flex w-full items-center gap-2 py-2.5 text-left font-semibold text-run">
              <RotateCcw size={16} /> กลับเป็นท่าเดิม: {e.swappedFrom}
            </button>
          </li>
        )}
        {list.map(x => <Row key={x.name} e={x} onClick={() => onPick(x.name)} />)}
      </ul>
    </Sheet>
  )
}

/** เพิ่มท่าจากคลังเข้าวันนี้ */
export function AddSheet({ where, existing, onPick, onClose }: { where: 'gym' | 'park'; existing: string[]; onPick: (e: LibEx) => void; onClose: () => void }) {
  const [q, setQ] = useState('')
  const usable = allLibrary.filter(e => e.where === where || e.where === 'both')
  const found = searchFoods(usable, q).concat(q ? usable.filter(e => e.th.includes(q.trim()) && !e.name.toLowerCase().includes(q.trim().toLowerCase())) : [])
  const groups = Object.keys(patternNames) as Pattern[]
  return (
    <Sheet onClose={onClose} title={`เพิ่มท่า (${where === 'gym' ? 'ยิม' : 'สวน'})`}>
      <TextInput value={q} onChange={setQ} placeholder="ค้นหา เช่น curl, ลันจ์, น่อง" icon={<Search size={16} />} />
      <p className="mt-2 text-xs text-muted">เพิ่มทีละ 1–2 ท่าพอ — ปริมาณรวมที่มากเกินทำให้ฟื้นตัวไม่ทันวันวิ่ง</p>
      {groups.map(g => {
        const list = found.filter(e => e.pattern === g)
        if (!list.length) return null
        return (
          <section key={g} className="mt-3">
            <div className="text-xs font-semibold text-muted">{patternNames[g]}</div>
            <ul className="divide-y divide-line">
              {list.map(e => {
                const has = existing.includes(e.name)
                return <Row key={e.name} e={e} onClick={() => !has && onPick(e)} right={has ? <Check size={16} className="text-good" /> : undefined} />
              })}
            </ul>
          </section>
        )
      })}
      {!found.length && <p className="py-6 text-center text-sm text-muted">ไม่พบท่านี้</p>}
    </Sheet>
  )
}
