import { useState } from 'react'
import { CalendarCheck } from 'lucide-react'
import { useProgram } from '../lib/program'
import { useDayDone } from '../lib/dayDone'
import { usePersisted } from '../lib/storage'
import { cx } from '../lib/cx'
import { Button } from './ui'

type Feel = 'easy' | 'ok' | 'hard'
const FEEL: Record<Feel, { label: string; reply: string }> = {
  easy: { label: 'สบาย', reply: 'ไปต่อตามแผน — ถ้าสบายมาก 2 สัปดาห์ติดกัน ข้ามไปสัปดาห์ถัดไปได้ 1 สัปดาห์' },
  ok: { label: 'พอดี', reply: 'กำลังดี ไปต่อตามแผน' },
  hard: { label: 'หนักไป', reply: 'ทำสัปดาห์นี้ซ้ำอีกรอบดีกว่าฝืน — ร่างกายปรับตัวทันแล้วค่อยไปต่อ' },
}

/** ท้ายสัปดาห์ถามว่าหนักไปไหม — หนักไปเสนอให้ทำสัปดาห์เดิมซ้ำ (มือใหม่มักฝืนไปต่อแล้วเจ็บ) */
export function WeekCheckCard() {
  const p = useProgram()
  const dayDone = useDayDone()
  const [answers, setAnswers] = usePersisted<Record<string, Feel | true>>('weekCheck', {})
  const [todayIdx] = useState(() => (new Date().getDay() + 6) % 7) // 0 = จันทร์
  if (p.ongoing || p.program === 'strength') return null
  const plan = p.plan()
  const training = plan.flatMap((d, i) => (d.type !== 'rest' ? [i] : []))
  const done = training.filter(i => dayDone(p.currentWeek, i, plan[i])).length
  // หนึ่งคำตอบต่อหนึ่งสัปดาห์ในปฏิทิน (สัปดาห์ที่ทำซ้ำจะถามใหม่)
  const key = `${p.program}-${p.doneId(p.currentWeek, 0)}`
  const answer = answers[key] as Feel | undefined
  const close = () => setAnswers(a => ({ ...a, [`${key}:acted`]: true }))
  // ถามเมื่อทำครบทุกวันของสัปดาห์ หรือถึงวันอาทิตย์แล้วได้ทำไปบ้าง
  if (!done || (done < training.length && todayIdx < 6)) return null
  if (answers[`${key}:acted`]) return null
  const last = p.currentWeek >= p.meta.weeks

  return (
    <section className="animate-fade-up rounded-2xl bg-card p-3.5 shadow-sm ring-1 ring-line">
      <div className="flex items-center gap-2 font-bold"><CalendarCheck size={18} className="text-run" /> สัปดาห์ที่ {p.currentWeek} เป็นยังไงบ้าง</div>
      {!answer ? (
        <div className="mt-2 flex gap-2">
          {(Object.keys(FEEL) as Feel[]).map(f => (
            <button key={f} onClick={() => setAnswers(a => ({ ...a, [key]: f }))}
              className={cx('flex-1 rounded-xl py-2 text-sm font-semibold ring-1', f === 'hard' ? 'bg-warn/10 text-warn ring-warn/30' : 'bg-raised ring-line')}>
              {FEEL[f].label}
            </button>
          ))}
        </div>
      ) : (
        <>
          <p className="mt-1 text-sm">{FEEL[answer].reply}</p>
          <div className="mt-2 flex gap-2">
            {answer === 'hard' && !p.autoWeek && !last && <Button size="sm" onClick={() => { p.repeatWeek(); close() }}>ทำสัปดาห์ {p.currentWeek} ซ้ำ</Button>}
            {answer === 'hard' && p.autoWeek && <span className="text-xs text-muted">มีวันแข่งแล้ว: ลดระยะสัปดาห์หน้าลง ~20% แทนการทำซ้ำ</span>}
            <Button size="sm" variant="soft" onClick={close}>{answer === 'hard' ? 'ไปต่อตามแผน' : 'รับทราบ'}</Button>
          </div>
        </>
      )}
    </section>
  )
}
