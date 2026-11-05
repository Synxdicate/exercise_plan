import { useState } from 'react'
import { Footprints } from 'lucide-react'
import { CALF_OK, legVerdict, lsi, LSI_OK, useLegTests, type LegTest } from '../lib/legTests'
import { uid } from '../lib/log'
import { niceDate, today } from '../lib/date'
import { cx } from '../lib/cx'
import { Button, Card, Disclosure } from './ui'
import { useLang, useT } from '../lib/i18n'
import { NumberInput } from './Form'

/** ทดสอบขาทุก 4–8 สัปดาห์: กระโดดขาเดียว + เขย่งขาเดียว เทียบซ้าย/ขวา */
export function LegTestCard() {
  const tr = useT()
  const en = useLang()[0] === 'en'
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
    <Card title={<span className="flex items-center gap-2"><Footprints size={16} className="text-run" /> {tr('ทดสอบขาซ้าย/ขวา', 'Left/right leg tests')}</span>}>
      <Disclosure title={tr('ทำยังไง', 'How')}>
        <ul className="list-disc space-y-1 pl-5 text-sm text-muted">
          <li><b className="text-ink">{tr('กระโดดขาเดียว', 'Single-leg hop')}</b>: {tr('ยืนขาเดียวที่เส้น กระโดดไปข้างหน้าให้ไกลที่สุด ลงขาเดิมแล้วยืนนิ่ง 2 วิ วัดจากเส้นถึงส้นเท้า เอาดีที่สุดจาก 3 ครั้ง', 'Stand on one leg at a line, hop forward as far as you can, land on the same leg and hold 2 s; measure line to heel, best of 3')}</li>
          <li><b className="text-ink">{tr('เขย่งขาเดียว', 'Single-leg calf raise')}</b>: {tr('ยืนบนพื้นเรียบ แตะผนังทรงตัวได้ เขย่งให้สูงสุดทุกครั้ง จังหวะ 1 ครั้ง/2 วิ นับจนเขย่งได้ไม่สุด', 'On flat ground, fingertips on a wall for balance, rise as high as you can every rep at 1 rep per 2 s; count until you can’t reach full height')}</li>
          <li>{tr(`เกณฑ์: สองขาต่างกันไม่เกิน 10% (LSI ≥${LSI_OK}%) · เขย่งได้ ≥${CALF_OK} ครั้ง · เจ็บระหว่างทดสอบให้หยุด`, `Targets: legs within 10% (LSI ≥${LSI_OK}%) · ≥${CALF_OK} calf raises · stop if it hurts`)}</li>
        </ul>
      </Disclosure>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <NumberInput label={tr('กระโดด ซ้าย', 'Hop left')} unit={tr('ซม.', 'cm')} value={draft.hopL ?? ''} onChange={set('hopL')} />
        <NumberInput label={tr('กระโดด ขวา', 'Hop right')} unit={tr('ซม.', 'cm')} value={draft.hopR ?? ''} onChange={set('hopR')} />
        <NumberInput label={tr('เขย่ง ซ้าย', 'Calf left')} unit={tr('ครั้ง', 'reps')} value={draft.calfL ?? ''} onChange={set('calfL')} />
        <NumberInput label={tr('เขย่ง ขวา', 'Calf right')} unit={tr('ครั้ง', 'reps')} value={draft.calfR ?? ''} onChange={set('calfR')} />
      </div>
      <Button className="mt-2 w-full" disabled={!ready} onClick={save}>{tr('บันทึกผลทดสอบ', 'Save result')}</Button>

      {last && (
        <div className="mt-3 space-y-1.5">
          <div className="text-xs text-muted">{tr('ล่าสุด', 'Latest')} {niceDate(last.date)}</div>
          {legVerdict(last, en).map(v => (
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
                {t.hopL && t.hopR ? `${tr('กระโดด', 'Hop')} ${t.hopL}/${t.hopR} (${lsi(t.hopL, t.hopR)}%)` : ''}
                {t.calfL && t.calfR ? ` · ${tr('เขย่ง', 'Calf')} ${t.calfL}/${t.calfR}` : ''}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
