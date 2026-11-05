import { CalendarCheck } from 'lucide-react'
import { useProgram } from '../lib/program'
import { useTodayIdx } from '../lib/useToday'
import { useDayDone } from '../lib/dayDone'
import { usePersisted } from '../lib/storage'
import { cx } from '../lib/cx'
import { Button } from './ui'
import { useT } from '../lib/i18n'

type Feel = 'easy' | 'ok' | 'hard'
const FEEL: Record<Feel, { label: string; reply: string }> = {
  easy: { label: 'สบาย', reply: 'ไปต่อตามแผน — ถ้าสบายมาก 2 สัปดาห์ติดกัน ข้ามไปสัปดาห์ถัดไปได้ 1 สัปดาห์' },
  ok: { label: 'พอดี', reply: 'กำลังดี ไปต่อตามแผน' },
  hard: { label: 'หนักไป', reply: 'ทำสัปดาห์นี้ซ้ำอีกรอบดีกว่าฝืน — ร่างกายปรับตัวทันแล้วค่อยไปต่อ' },
}
const FEEL_EN: Record<Feel, { label: string; reply: string }> = {
  easy: { label: 'Easy', reply: 'Carry on with the plan — if it feels very easy two weeks running, you can skip ahead one week' },
  ok: { label: 'About right', reply: 'Just right — carry on with the plan' },
  hard: { label: 'Too hard', reply: 'Better to repeat this week than force it — move on once your body has caught up' },
}

/** ท้ายสัปดาห์ถามว่าหนักไปไหม — หนักไปเสนอให้ทำสัปดาห์เดิมซ้ำ (มือใหม่มักฝืนไปต่อแล้วเจ็บ) */
export function WeekCheckCard() {
  const p = useProgram()
  const t = useT()
  const feel = t('th', 'en') === 'en' ? FEEL_EN : FEEL
  const dayDone = useDayDone()
  const [answers, setAnswers] = usePersisted<Record<string, Feel | true>>('weekCheck', {})
  const todayIdx = useTodayIdx() // 0 = จันทร์ — เปลี่ยนเองเมื่อข้ามวัน
  if (p.ongoing || p.program === 'strength' || p.finished) return null
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
      <div className="flex items-center gap-2 font-bold"><CalendarCheck size={18} className="text-run" /> {t(`สัปดาห์ที่ ${p.currentWeek} เป็นยังไงบ้าง`, `How was week ${p.currentWeek}?`)}</div>
      {!answer ? (
        <div className="mt-2 flex gap-2">
          {(Object.keys(FEEL) as Feel[]).map(f => (
            <button key={f} onClick={() => setAnswers(a => ({ ...a, [key]: f }))}
              className={cx('flex-1 rounded-xl py-2 text-sm font-semibold ring-1', f === 'hard' ? 'bg-warn/10 text-warn ring-warn/30' : 'bg-raised ring-line')}>
              {feel[f].label}
            </button>
          ))}
        </div>
      ) : (
        <>
          <p className="mt-1 text-sm">{feel[answer].reply}</p>
          <div className="mt-2 flex gap-2">
            {answer === 'hard' && !p.autoWeek && !last && <Button size="sm" onClick={() => { p.repeatWeek(); close() }}>{t(`ทำสัปดาห์ ${p.currentWeek} ซ้ำ`, `Repeat week ${p.currentWeek}`)}</Button>}
            {answer === 'hard' && p.autoWeek && <span className="text-xs text-muted">{t('มีวันแข่งแล้ว: ลดระยะสัปดาห์หน้าลง ~20% แทนการทำซ้ำ', 'You have a race date: cut next week’s distance ~20% instead of repeating')}</span>}
            <Button size="sm" variant="soft" onClick={close}>{answer === 'hard' ? t('ไปต่อตามแผน', 'Continue with the plan') : t('รับทราบ', 'Got it')}</Button>
          </div>
        </>
      )}
    </section>
  )
}
