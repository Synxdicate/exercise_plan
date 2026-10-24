import { useState } from 'react'
import { HeartPulse } from 'lucide-react'
import { clearance, clearanceText, emptyScreening, useScreening, type Screening } from '../lib/screening'
import { today } from '../lib/date'
import { cx } from '../lib/cx'
import { Button, Sheet } from './ui'

const questions: { key: keyof Omit<Screening, 'date'>; text: string; yesIsGood?: boolean }[] = [
  { key: 'exercising', text: 'ช่วง 3 เดือนที่ผ่านมา ออกกำลังกายระดับปานกลางขึ้นไป ครั้งละ ≥30 นาที อย่างน้อย 3 วัน/สัปดาห์', yesIsGood: true },
  { key: 'disease', text: 'แพทย์เคยวินิจฉัยว่าเป็นโรคหัวใจ/หลอดเลือด ความดันสูง เบาหวาน หรือโรคไต' },
  { key: 'symptoms', text: 'เคยเจ็บแน่นหน้าอก หน้ามืด/เป็นลม หอบผิดปกติ ใจสั่น หรือข้อเท้าบวม ขณะออกแรงหรือพัก' },
  { key: 'joint', text: 'มีปัญหากระดูกหรือข้อต่อ ที่ออกกำลังกายแล้วอาการแย่ลง' },
]

/** คำถามคัดกรอง 4 ข้อ (ACSM 2015 + PAR-Q) — ใช้ทั้งใน onboarding และแผ่นแยก */
export function ScreeningForm({ value, onChange }: { value: Screening; onChange: (s: Screening) => void }) {
  const result = clearance(value)
  return (
    <div className="space-y-3">
      {questions.map(q => (
        <div key={q.key} className="rounded-2xl bg-card p-3 ring-1 ring-line">
          <p className="text-sm">{q.text}</p>
          <div className="mt-2 flex gap-2">
            {[true, false].map(v => (
              <button key={String(v)} onClick={() => onChange({ ...value, [q.key]: v })}
                className={cx('flex-1 rounded-xl py-2 text-sm font-semibold ring-2 transition-colors',
                  value[q.key] === v ? 'bg-accent-soft text-accent ring-accent' : 'bg-raised ring-transparent')}>
                {v ? 'ใช่' : 'ไม่ใช่'}
              </button>
            ))}
          </div>
        </div>
      ))}
      <div key={result} className={cx('flex animate-fade-up gap-3 rounded-2xl p-3 text-sm',
        result === 'clear' ? 'bg-good/15 text-good' : result === 'moderate-only' ? 'bg-warn/15 text-warn' : 'bg-bad/15 text-bad')}>
        <HeartPulse size={20} className="shrink-0" />
        <span><b>{clearanceText[result].title}</b> — {clearanceText[result].text}
          {value.joint && ' · ปัญหาข้อ/กระดูก: เลือกท่าที่ไม่เจ็บ และปรึกษานักกายภาพถ้าอาการไม่ดีขึ้น'}</span>
      </div>
      {!value.exercising && result === 'clear' && (
        <p className="text-xs text-muted">ยังไม่ได้ออกกำลังกายสม่ำเสมอ: เริ่มเบา–ปานกลางก่อน แล้วค่อยเพิ่มความหนัก</p>
      )}
    </div>
  )
}

export function ScreeningSheet({ onClose }: { onClose: () => void }) {
  const [saved, setSaved] = useScreening()
  const [draft, setDraft] = useState<Screening>(saved ?? emptyScreening)
  return (
    <Sheet onClose={onClose} title="เช็กสุขภาพก่อนออกกำลังกาย">
      <ScreeningForm value={draft} onChange={setDraft} />
      <Button className="mt-4 w-full" size="lg" onClick={() => { setSaved({ ...draft, date: today() }); onClose() }}>บันทึก</Button>
    </Sheet>
  )
}
