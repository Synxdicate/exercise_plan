import { useState } from 'react'
import { Bike, Plus, X } from 'lucide-react'
import { crossKinds, uid, useCross, type CrossKind } from '../lib/log'
import { niceDate, today, weekStart } from '../lib/date'
import { Button, Card, Collapse, Segmented } from './ui'
import { DateInput, NumberInput, SelectInput } from './Form'

/** คาร์ดิโอทดแทนการวิ่ง: ปั่นจักรยาน วิ่งในน้ำ ว่ายน้ำ — นับในความฟิต/ความล้า (RPE × นาที) */
export function CrossTrainingCard() {
  const [cross, setCross] = useCross()
  const [open, setOpen] = useState(false)
  const [date, setDate] = useState(today())
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
    <Card title={<span className="flex items-center gap-2"><Bike size={18} className="text-run" /> คาร์ดิโออื่น (แรงกระแทกน้อย)</span>}
      action={<Button variant="soft" size="sm" onClick={() => setOpen(!open)}><Plus size={14} /> บันทึก</Button>}>
      <p className="-mt-1 text-xs text-muted">
        ปั่นจักรยาน วิ่งในน้ำ ว่ายน้ำ ได้ระบบหัวใจ-ปอดโดยไม่กระแทกข้อ — เพิ่มปริมาณแอโรบิกได้โดยไม่ต้องวิ่งเพิ่ม และใช้แทนการวิ่งช่วงบาดเจ็บ{weekMin ? ` · สัปดาห์นี้ ${weekMin} นาที` : ''}
      </p>
      <Collapse open={open}>
        <div className="mt-3 grid grid-cols-2 gap-2 rounded-2xl bg-raised p-3">
          <DateInput label="วันที่" value={date} onChange={setDate} />
          <SelectInput label="ประเภท" value={kind} onChange={setKind} options={(Object.keys(crossKinds) as CrossKind[]).map(k => ({ value: k, label: crossKinds[k] }))} />
          <NumberInput label="เวลา" unit="นาที" step={5} stepper className="col-span-2" value={minutes} onChange={setMinutes} />
          <div className="col-span-2">
            <div className="mb-1.5 text-sm font-medium text-muted">ความเหนื่อย</div>
            <Segmented value={rpe} onChange={setRpe} options={[{ value: '3', label: 'เบา' }, { value: '5', label: 'ปานกลาง' }, { value: '7', label: 'หนัก' }]} />
          </div>
          <Button className="col-span-2" onClick={add}>บันทึก</Button>
        </div>
      </Collapse>
      {cross.length > 0 && (
        <ul className="mt-2 divide-y divide-line">
          {[...cross].reverse().slice(0, 5).map(c => (
            <li key={c.id} className="flex items-center gap-2 py-2 text-sm">
              <span className="min-w-0 flex-1">{crossKinds[c.kind]} · {c.minutes} นาที</span>
              <span className="text-xs text-muted">{niceDate(c.date)}</span>
              <button aria-label="ลบ" onClick={() => setCross(prev => prev.filter(x => x.id !== c.id))} className="grid size-7 place-items-center rounded-full text-muted"><X size={14} /></button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
