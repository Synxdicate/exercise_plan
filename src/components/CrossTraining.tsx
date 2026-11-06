import { useState } from 'react'
import { Bike, Plus, X } from 'lucide-react'
import { crossKinds, crossKindsEn, uid, useCross, type CrossKind } from '../lib/log'
import { niceDate, today, weekStart } from '../lib/date'
import { Button, Card, Collapse, Segmented } from './ui'
import { useLang, useT } from '../lib/i18n'
import { useDateField } from '../lib/useToday'
import { DateInput, NumberInput, SelectInput } from './Form'

/** คาร์ดิโอทดแทนการวิ่ง: ปั่นจักรยาน วิ่งในน้ำ ว่ายน้ำ — นับในความฟิต/ความล้า (RPE × นาที) */
export function CrossTrainingCard() {
  const tr = useT()
  const kinds = useLang()[0] === 'en' ? crossKindsEn : crossKinds
  const [cross, setCross] = useCross()
  const [open, setOpen] = useState(false)
  const [date, setDate] = useDateField()
  const [kind, setKind] = useState<CrossKind>('bike')
  const [minutes, setMinutes] = useState('40')
  const [rpe, setRpe] = useState<'3' | '5' | '7'>('5')
  const week = weekStart(today())
  const weekMin = cross.filter(c => weekStart(c.date) === week).reduce((a, c) => a + c.minutes, 0)
  const add = () => {
    if (!(+minutes > 0)) return
    setCross(prev => [...prev, { id: uid(), date, kind, minutes: +minutes, rpe: +rpe }].sort((a, b) => a.date.localeCompare(b.date)))
    setOpen(false)
  }
  return (
    <Card title={<span className="flex items-center gap-2"><Bike size={18} className="text-run" /> {tr('คาร์ดิโออื่น (แรงกระแทกน้อย)', 'Other cardio (low impact)')}</span>}
      action={<Button variant="soft" size="sm" onClick={() => setOpen(!open)}><Plus size={14} /> {tr('เพิ่ม', 'Add')}</Button>}>
      <p className="-mt-1 text-xs text-muted">
        {tr('ปั่นจักรยาน ว่ายน้ำ วิ่งในน้ำ — แอโรบิกที่ไม่กระแทกข้อ ใช้แทนวิ่งช่วงเจ็บได้', 'Cycling, swimming, deep-water running — joint-friendly aerobic work you can swap in when injured')}{weekMin ? tr(` · สัปดาห์นี้ ${weekMin} นาที`, ` · ${weekMin} min this week`) : ''}
      </p>
      <Collapse open={open}>
        <div className="mt-3 grid grid-cols-2 gap-2 rounded-2xl bg-raised p-3">
          <DateInput label={tr('วันที่', 'Date')} value={date} onChange={setDate} />
          <SelectInput label={tr('ประเภท', 'Type')} value={kind} onChange={setKind} options={(Object.keys(crossKinds) as CrossKind[]).map(k => ({ value: k, label: kinds[k] }))} />
          <NumberInput label={tr('เวลา', 'Time')} unit={tr('นาที', 'min')} step={5} stepper className="col-span-2" value={minutes} onChange={setMinutes} />
          <div className="col-span-2">
            <div className="mb-1.5 text-sm font-medium text-muted">{tr('ความเหนื่อย', 'Effort')}</div>
            <Segmented value={rpe} onChange={setRpe} options={[{ value: '3', label: tr('เบา', 'Easy') }, { value: '5', label: tr('ปานกลาง', 'Moderate') }, { value: '7', label: tr('หนัก', 'Hard') }]} />
          </div>
          <Button className="col-span-2" onClick={add}>{tr('บันทึก', 'Save')}</Button>
        </div>
      </Collapse>
      {cross.length > 0 && (
        <ul className="mt-2 divide-y divide-line">
          {[...cross].reverse().slice(0, 5).map(c => (
            <li key={c.id} className="flex items-center gap-2 py-2 text-sm">
              <span className="min-w-0 flex-1">{kinds[c.kind]} · {c.minutes} {tr('นาที', 'min')}</span>
              <span className="text-xs text-muted">{niceDate(c.date)}</span>
              <button aria-label={tr('ลบ', 'Delete')} onClick={() => setCross(prev => prev.filter(x => x.id !== c.id))} className="grid size-7 place-items-center rounded-full text-muted"><X size={14} /></button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
