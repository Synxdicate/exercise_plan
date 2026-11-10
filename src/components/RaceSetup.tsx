import { useState } from 'react'
import { Flag } from 'lucide-react'
import { useProgram } from '../lib/program'
import { usePersisted } from '../lib/storage'
import { useT } from '../lib/i18n'
import { Button } from './ui'
import { ProgramSheet } from './ProgramSheet'

/** หน้าแรก: โปรแกรมแข่งที่มีวันแข่งแล้วแต่ยังไม่ได้ตั้งระยะงานจริง/เวลาตัด เตือนครั้งเดียวต่อวันแข่ง กดแล้วเปิดตั้งค่าโปรแกรมทันที
 *  (ระยะงานแต่ละงานไม่เท่ากัน เวลาจบโดยประมาณ แผนวันแข่ง และเพซรายกิโลคิดจากค่านี้) */
export function RaceSetupCard() {
  const p = useProgram()
  const t = useT()
  const [seen, setSeen] = usePersisted('raceSetupSeen', '')
  const [open, setOpen] = useState(false)
  const missingKm = p.raceKm === p.meta.raceKm
  const missingCutoff = !p.raceCutoff
  if (!p.isRace || !p.raceDate || p.finished || seen === p.raceDate || (!missingKm && !missingCutoff)) return open ? <ProgramSheet onClose={() => setOpen(false)} /> : null
  const items = [
    missingKm && t(`ระยะงานจริง (ตอนนี้ใช้ ${p.meta.raceKm} กม. ตามโปรแกรม)`, `actual race distance (using the program's ${p.meta.raceKm} km)`),
    missingCutoff && t('เวลาตัดตัว', 'cutoff time'),
    !p.raceHills && t('เส้นทางมีเนินไหม', 'whether the course is hilly'),
  ].filter(Boolean)
  return (
    <section className="animate-fade-up rounded-2xl bg-card p-3.5 shadow-sm ring-1 ring-line">
      <div className="card-title flex items-center gap-2 font-bold"><Flag size={18} className="text-accent" /> {t('ตั้งค่างานแข่งให้ครบ', 'Finish your race setup')}</div>
      <p className="mt-1.5 text-sm text-muted">{t('ยังไม่ได้ใส่: ', 'Not set yet: ')}{items.join(t(', ', ', '))}</p>
      <p className="mt-1 text-xs text-muted">{t('เวลาจบโดยประมาณ แผนวันแข่ง และเพซรายกิโลคิดจากค่านี้', 'Your finish estimate, race-day plan and per-km pacing use these')}</p>
      <div className="mt-2.5 flex gap-2">
        <Button size="sm" onClick={() => setOpen(true)}>{t('ตั้งค่าตอนนี้', 'Set up now')}</Button>
        <Button size="sm" variant="soft" onClick={() => setSeen(p.raceDate)}>{missingKm ? t(`ใช้ ${p.meta.raceKm} กม. ตามโปรแกรม`, `Keep ${p.meta.raceKm} km`) : t('ข้าม', 'Skip')}</Button>
      </div>
      {open && <ProgramSheet onClose={() => setOpen(false)} />}
    </section>
  )
}
