import { useState } from 'react'
import { Bandage, HeartPulse, History } from 'lucide-react'
import { clearance, clearanceText, useScreening } from '../lib/screening'
import { comeback } from '../lib/detraining'
import { PAIN_AREAS, recentPainDays, repeatedPainAreas, type Readiness } from '../lib/readiness'
import { useRuns, useSessions } from '../lib/log'
import { useProgram } from '../lib/program'
import { usePersisted } from '../lib/storage'
import { today } from '../lib/date'
import { activeRecovery } from '../lib/recovery'
import { cx } from '../lib/cx'
import { useLang, useT } from '../lib/i18n'
import { Button } from './ui'
import { ScreeningSheet } from './Screening'

/** การ์ดเตือนเรื่องสุขภาพ/การกลับมาฝึก แสดงเฉพาะเมื่อมีเรื่องต้องทำ */
export function Alerts() {
  const [screening] = useScreening()
  const [sessions] = useSessions()
  const [runs] = useRuns()
  const p = useProgram()
  const t = useT()
  const [lang] = useLang()
  const en = lang === 'en'
  const area = (a: keyof typeof PAIN_AREAS) => en ? PAIN_AREAS[a].labelEn : PAIN_AREAS[a].label
  const avoid = (a: keyof typeof PAIN_AREAS) => en ? PAIN_AREAS[a].avoidEn : PAIN_AREAS[a].avoid
  const [dismissed, setDismissed] = usePersisted('comebackDismissed', '')
  const [open, setOpen] = useState(false)
  const [readiness] = usePersisted<Record<string, Readiness>>('readiness', {})
  const [painSeen, setPainSeen] = usePersisted('painDismissed', '')
  const pain = recentPainDays(readiness, today())
  const showPain = pain.length >= 2 && painSeen !== pain.at(-1)
  const areas = repeatedPainAreas(readiness, today())

  const dates = [...sessions.map(s => s.date), ...runs.map(r => r.date)]
  const lastActivity = dates.reduce((a, b) => (a > b ? a : b), '')
  const cb = comeback(dates, today())
  const showComeback = cb && dismissed !== lastActivity
  const result = screening ? clearance(screening) : null
  const rec = activeRecovery(runs, today())
  const [recSeen, setRecSeen] = usePersisted('recoveryDismissed', '')

  return (
    <>
      {result && result !== 'clear' && (
        <Banner tone="bad" icon={<HeartPulse size={20} />} title={en ? clearanceText[result].titleEn : clearanceText[result].title} text={en ? clearanceText[result].textEn : clearanceText[result].text}
          action={<Button size="sm" variant="soft" onClick={() => setOpen(true)}>{t('ตอบใหม่', 'Answer again')}</Button>} />
      )}
      {showComeback && (
        <Banner tone="warn" icon={<History size={20} />} title={t(`ห่างการฝึกไป ${cb.days} วัน`, `${cb.days} days since your last workout`)} text={en ? cb.textEn : cb.text}
          action={
            <div className="flex gap-2">
              {cb.weeksBack > 0 && !p.autoWeek && p.currentWeek > 1 && (
                <Button size="sm" onClick={() => { p.setWeek(Math.max(1, p.currentWeek - cb.weeksBack)); setDismissed(lastActivity) }}>
                  {t(`ย้อน ${Math.min(cb.weeksBack, p.currentWeek - 1)} สัปดาห์`, `Go back ${Math.min(cb.weeksBack, p.currentWeek - 1)} wk`)}
                </Button>
              )}
              <Button size="sm" variant="soft" onClick={() => setDismissed(lastActivity)}>{t('รับทราบ', 'Got it')}</Button>
            </div>
          } />
      )}
      {rec && recSeen !== rec.race.id && (
        <Banner tone="warn" icon={<History size={20} />} title={t(`ช่วงฟื้นตัวหลังแข่ง ${rec.race.km} กม. อีก ${rec.left} วัน`, `Recovering from a ${rec.race.km} km race — ${rec.left} days left`)}
          text={t(`วิ่งเบาหรือพักจนถึง ${rec.until} งดวิ่งหนัก/วิ่งยาว (แข่งหนึ่งครั้งต้องฟื้นตัว ${rec.days} วัน เหตุผลที่ไม่ควรลงแข่งเพิ่มระหว่างโปรแกรม)`, `Easy running or rest until ${rec.until}; no hard or long runs (a race needs ${rec.days} days of recovery — why extra races mid-program are a bad idea)`)}
          action={<Button size="sm" variant="soft" onClick={() => setRecSeen(rec.race.id)}>{t('รับทราบ', 'Got it')}</Button>} />
      )}
      {showPain && (
        <Banner tone="bad" icon={<Bandage size={20} />}
          title={areas.length ? t(`เจ็บ${areas.map(area).join(', ')} ซ้ำใน 7 วัน`, `Repeated ${areas.map(area).join(', ')} pain in 7 days`) : t(`เจ็บ ${pain.length} วันใน 7 วันที่ผ่านมา`, `Pain on ${pain.length} of the last 7 days`)}
          text={[...areas.map(a => `${area(a)}: ${avoid(a)}`),
            t('งดวิ่งหนักและวิ่งยาว 3–5 วัน แล้วกลับมาที่ระดับต่ำกว่าเดิม 1 สัปดาห์ ถ้าเจ็บเกิน 1 สัปดาห์ เดินกะเผลก หรือบวม ควรพบแพทย์/นักกายภาพ', 'No hard or long runs for 3–5 days, then resume one week lower. Pain over a week, limping or swelling: see a doctor/physio')].join(' · ')}
          action={
            <div className="flex gap-2">
              {!p.autoWeek && p.currentWeek > 1 && (
                <Button size="sm" onClick={() => { p.setWeek(p.currentWeek - 1); setPainSeen(pain.at(-1)!) }}>{t('ย้อน 1 สัปดาห์', 'Go back 1 wk')}</Button>
              )}
              <Button size="sm" variant="soft" onClick={() => setPainSeen(pain.at(-1)!)}>{t('รับทราบ', 'Got it')}</Button>
            </div>
          } />
      )}
      {open && <ScreeningSheet onClose={() => setOpen(false)} />}
    </>
  )
}

function Banner({ tone, icon, title, text, action }: { tone: 'bad' | 'warn'; icon: React.ReactNode; title: string; text: string; action: React.ReactNode }) {
  const tones = { bad: 'bg-bad/10 text-bad ring-bad/30', warn: 'bg-warn/10 text-warn ring-warn/30' }
  return (
    <section className={cx('animate-fade-up rounded-2xl px-3.5 py-3 ring-1', tones[tone])}>
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5 shrink-0">{icon}</span>
        {/* ปุ่มอยู่ใต้ข้อความ วางข้าง ๆ แล้วข้อความยาวถูกบีบเป็นคอลัมน์แคบบนจอมือถือ */}
        <div className="min-w-0 flex-1">
          <div className="text-sm font-bold">{title}</div>
          <p className="text-xs text-ink/75">{text}</p>
          <div className="mt-2">{action}</div>
        </div>
      </div>
    </section>
  )
}
