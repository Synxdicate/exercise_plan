import { useEffect, useState } from 'react'
import { BatteryLow, BatteryMedium, BatteryFull, Play, Moon } from 'lucide-react'
import { usePersisted } from '../lib/storage'
import { today } from '../lib/date'
import { cx } from '../lib/cx'
import { useLang, useT } from '../lib/i18n'
import { PAIN_AREAS, readinessLevel, type Level, type PainArea, type Readiness } from '../lib/readiness'
import { Button, Sheet } from './ui'

const adviceEn: typeof advice = {
  strength: {
    green: 'Fully ready — train as planned',
    yellow: 'Train lighter: one set fewer per exercise, stop 3 reps short of failure',
    red: 'Rest today, or walk/stretch gently — training hard while very fatigued raises injury risk',
  },
  run: {
    green: 'Fully ready — run as planned',
    yellow: 'Switch to an easy run at ~70% of the planned distance',
    red: 'Rest today — if you want to move, a 20–30 min brisk walk is enough',
  },
}

const advice: Record<'strength' | 'run', Record<Level, string>> = {
  strength: {
    green: 'พร้อมเต็มที่ ฝึกตามแผนได้เลย',
    yellow: 'ฝึกได้แต่เบาลง: ลด 1 เซ็ตทุกท่า และหยุดก่อนหมดแรง 3 ครั้ง',
    red: 'วันนี้ควรพัก หรือเดิน/ยืดเหยียดเบา ๆ แทน ฝึกหนักตอนล้ามากเพิ่มความเสี่ยงบาดเจ็บ',
  },
  run: {
    green: 'พร้อมเต็มที่ วิ่งตามแผนได้เลย',
    yellow: 'เปลี่ยนเป็น Easy run และลดระยะเหลือ ~70% ของแผน',
    red: 'วันนี้ควรพัก ถ้าอยากขยับ เดินเร็ว 20–30 นาทีพอ',
  },
}

const Choice = <T,>({ value, on, onPick, label }: { value: T; on: boolean; onPick: (v: T) => void; label: string }) => (
  <button onClick={() => onPick(value)} className={cx('flex-1 rounded-2xl px-2 py-2.5 text-sm font-semibold ring-2 transition-colors',
    on ? 'bg-accent-soft text-accent ring-accent' : 'bg-raised text-ink ring-transparent')}>{label}</button>
)

/** ถาม 3 ข้อก่อนเริ่มฝึก แล้วแนะนำว่าควรฝึกเต็ม ฝึกเบา หรือพัก */
export function ReadinessSheet({ kind, onClose, onProceed }: { kind: 'strength' | 'run'; onClose: () => void; onProceed: (light: boolean) => void }) {
  const [log, setLog] = usePersisted<Record<string, Readiness & { level: Level }>>('readiness', {})
  const [r, setR] = useState<Readiness>(() => log[today()] ?? { sleep: 0, sore: 0, pain: false })
  const level = readinessLevel(r)
  const t = useT()
  const en = useLang()[0] === 'en'
  const area = (a: PainArea) => en ? PAIN_AREAS[a].labelEn : PAIN_AREAS[a].label
  const Icon = level === 'green' ? BatteryFull : level === 'yellow' ? BatteryMedium : BatteryLow

  // ถามวันละครั้งพอ ถ้าวันนี้ตอบแล้วและไม่ใช่ระดับแดง เริ่มได้เลยไม่ต้องถามซ้ำ
  const answered = log[today()]
  useEffect(() => {
    if (answered && answered.level !== 'red') onProceed(answered.level === 'yellow')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  if (answered && answered.level !== 'red') return null

  const go = (light: boolean) => {
    setLog(prev => ({ ...prev, [today()]: { ...r, level } }))
    onProceed(light)
  }

  return (
    <Sheet onClose={onClose} title={t('เช็กความพร้อมก่อนเริ่ม', 'Readiness check')}>
      <div className="space-y-4">
        <div>
          <div className="mb-1.5 text-sm text-muted">{t('เมื่อคืนนอนกี่ชั่วโมง', 'Sleep last night')}</div>
          <div className="flex gap-2">
            <Choice value={0 as const} on={r.sleep === 0} onPick={v => setR({ ...r, sleep: v })} label={t('7+ ชม.', '7+ h')} />
            <Choice value={1 as const} on={r.sleep === 1} onPick={v => setR({ ...r, sleep: v })} label={t('6–7 ชม.', '6–7 h')} />
            <Choice value={2 as const} on={r.sleep === 2} onPick={v => setR({ ...r, sleep: v })} label={t('น้อยกว่า 6', 'Under 6')} />
          </div>
        </div>
        <div>
          <div className="mb-1.5 text-sm text-muted">{t('ร่างกายรู้สึกยังไง', 'How does your body feel')}</div>
          <div className="flex gap-2">
            <Choice value={0 as const} on={r.sore === 0} onPick={v => setR({ ...r, sore: v })} label={t('สดชื่น', 'Fresh')} />
            <Choice value={1 as const} on={r.sore === 1} onPick={v => setR({ ...r, sore: v })} label={t('เมื่อยนิดหน่อย', 'A bit sore')} />
            <Choice value={2 as const} on={r.sore === 2} onPick={v => setR({ ...r, sore: v })} label={t('ล้ามาก', 'Very tired')} />
          </div>
        </div>
        <div>
          <div className="mb-1.5 text-sm text-muted">{t('มีจุดที่เจ็บแปลบ หรือเจ็บข้อต่อไหม', 'Any sharp or joint pain?')}</div>
          <div className="flex gap-2">
            <Choice value={false} on={!r.pain} onPick={v => setR({ ...r, pain: v, areas: undefined })} label={t('ไม่มี', 'No')} />
            <Choice value={true} on={r.pain} onPick={v => setR({ ...r, pain: v })} label={t('มี', 'Yes')} />
          </div>
          {r.pain && (
            <div className="mt-2 flex animate-fade-up flex-wrap gap-1.5">
              <span className="w-full text-xs text-muted">{t('ตรงไหน (เลือกได้หลายจุด)', 'Where (pick any)')}</span>
              {(Object.keys(PAIN_AREAS) as PainArea[]).map(a => {
                const on = r.areas?.includes(a)
                return (
                  <button key={a} aria-pressed={on} onClick={() => setR({ ...r, areas: on ? r.areas!.filter(x => x !== a) : [...(r.areas ?? []), a] })}
                    className={cx('rounded-full px-3 py-1 text-xs font-semibold ring-1', on ? 'bg-bad/15 text-bad ring-bad/40' : 'bg-raised ring-line')}>
                    {area(a)}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        <div key={level} className={cx('flex animate-fade-up gap-3 rounded-2xl p-3 text-sm',
          level === 'green' ? 'bg-good/15 text-good' : level === 'yellow' ? 'bg-warn/15 text-warn' : 'bg-bad/15 text-bad')}>
          <Icon size={22} className="shrink-0" />
          <span>
            {r.pain ? t('หลีกเลี่ยงท่าหรือการวิ่งที่ทำให้จุดนั้นเจ็บ ถ้าเจ็บเกิน 3 วันหรือบวม ควรพบแพทย์/นักกายภาพ ', 'Avoid moves or runs that hurt that spot; pain over 3 days or swelling: see a doctor/physio — ') : ''}{(en ? adviceEn : advice)[kind][level]}
            {r.areas?.map(a => <span key={a} className="mt-1 block font-semibold">{area(a)}: {en ? PAIN_AREAS[a].avoidEn : PAIN_AREAS[a].avoid}</span>)}
          </span>
        </div>

        <div className="flex gap-2">
          {level === 'red' ? (
            <>
              <Button variant="soft" className="flex-1" onClick={() => go(true)}>{t('ฝึกเบา ๆ อยู่ดี', 'Train lightly anyway')}</Button>
              <Button variant="success" className="flex-1" onClick={() => { setLog(prev => ({ ...prev, [today()]: { ...r, level } })); onClose() }}><Moon size={16} /> {t('พักวันนี้', 'Rest today')}</Button>
            </>
          ) : (
            <Button size="lg" className="w-full" onClick={() => go(level === 'yellow')}>
              <Play size={18} fill="currentColor" /> {level === 'yellow' ? t('เริ่มแบบเบาลง', 'Start lighter') : t('เริ่มเลย', 'Start')}
            </Button>
          )}
        </div>
      </div>
    </Sheet>
  )
}
