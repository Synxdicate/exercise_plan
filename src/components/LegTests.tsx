import { useState } from 'react'
import { Footprints } from 'lucide-react'
import { CALF_OK, legVerdict, lsi, LSI_OK, useLegTests, type LegTest } from '../lib/legTests'
import { uid } from '../lib/log'
import { niceDate, today } from '../lib/date'
import { cx } from '../lib/cx'
import { Button, Card, Disclosure } from './ui'
import { NumberInput } from './Form'

/** ทดสอบขาทุก 4–8 สัปดาห์: กระโดดขาเดียว + เขย่งขาเดียว เทียบซ้าย/ขวา */
export function LegTestCard() {
  const [tests, setTests] = useLegTests()
  const [draft, setDraft] = useState<Omit<LegTest, 'id' | 'date'>>({})
  const set = (k: keyof typeof draft) => (v: string) => setDraft(d => ({ ...d, [k]: Number(v) || undefined }))
  const ready = (draft.hopL && draft.hopR) || (draft.calfL && draft.calfR)
  const save = () => {
    setTests(prev => [...prev.filter(t => t.date !== today()), { id: uid(), date: today(), ...draft }].sort((a, b) => a.date.localeCompare(b.date)))
    setDraft({})
  }
  const last = tests.at(-1)

  return (
    <Card title={<span className="flex items-center gap-2"><Footprints size={16} className="text-run" /> ทดสอบขาซ้าย/ขวา</span>}>
      <Disclosure title="ทำยังไง">
        <ul className="list-disc space-y-1 pl-5 text-sm text-muted">
          <li><b className="text-ink">กระโดดขาเดียว</b>: ยืนขาเดียวที่เส้น กระโดดไปข้างหน้าให้ไกลที่สุด ลงขาเดิมแล้วยืนนิ่ง 2 วิ วัดจากเส้นถึงส้นเท้า เอาดีที่สุดจาก 3 ครั้ง</li>
          <li><b className="text-ink">เขย่งขาเดียว</b>: ยืนบนพื้นเรียบ แตะผนังทรงตัวได้ เขย่งให้สูงสุดทุกครั้ง จังหวะ 1 ครั้ง/2 วิ นับจนเขย่งได้ไม่สุด</li>
          <li>เกณฑ์: สองขาต่างกันไม่เกิน 10% (LSI ≥{LSI_OK}%) · เขย่งได้ ≥{CALF_OK} ครั้ง · เจ็บระหว่างทดสอบให้หยุด</li>
        </ul>
      </Disclosure>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <NumberInput label="กระโดด ซ้าย" unit="ซม." value={draft.hopL ?? ''} onChange={set('hopL')} />
        <NumberInput label="กระโดด ขวา" unit="ซม." value={draft.hopR ?? ''} onChange={set('hopR')} />
        <NumberInput label="เขย่ง ซ้าย" unit="ครั้ง" value={draft.calfL ?? ''} onChange={set('calfL')} />
        <NumberInput label="เขย่ง ขวา" unit="ครั้ง" value={draft.calfR ?? ''} onChange={set('calfR')} />
      </div>
      <Button className="mt-2 w-full" disabled={!ready} onClick={save}>บันทึกผลทดสอบ</Button>

      {last && (
        <div className="mt-3 space-y-1.5">
          <div className="text-xs text-muted">ล่าสุด {niceDate(last.date)}</div>
          {legVerdict(last).map(v => (
            <p key={v.text} className={cx('rounded-xl px-3 py-2 text-sm', v.tone === 'good' ? 'bg-good/10 text-good' : 'bg-warn/10 text-warn')}>{v.text}</p>
          ))}
        </div>
      )}
      {tests.length > 1 && (
        <ul className="mt-3 divide-y divide-line text-sm">
          {tests.slice(-6).reverse().map(t => (
            <li key={t.id} className="flex justify-between gap-2 py-1.5">
              <span className="text-muted">{niceDate(t.date)}</span>
              <span className="tabular-nums">
                {t.hopL && t.hopR ? `กระโดด ${t.hopL}/${t.hopR} (${lsi(t.hopL, t.hopR)}%)` : ''}
                {t.calfL && t.calfR ? ` · เขย่ง ${t.calfL}/${t.calfR}` : ''}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
