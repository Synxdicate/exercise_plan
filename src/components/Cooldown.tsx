import { useEffect, useMemo, useState } from 'react'
import { Check, Droplets, Footprints, Play, Sandwich, StretchHorizontal } from 'lucide-react'
import { formatDuration, formatPace, useRuns, type Run } from '../lib/log'
import { RunAchievements } from './RunExtras'
import { isWalk, looksLikeWalk } from '../lib/walk'
import { RpePicker } from './RpePicker'
import { useT } from '../lib/i18n'
import { speak } from '../lib/voice'
import { cx } from '../lib/cx'
import { Button, Collapse, Sheet } from './ui'

const WALK_SEC = 5 * 60

function Item({ icon: Icon, title, text, done }: { icon: typeof Droplets; title: string; text: string; done?: boolean }) {
  return (
    <li className="flex gap-3">
      <span className={cx('grid size-9 shrink-0 place-items-center rounded-xl', done ? 'bg-good-fill text-white' : 'bg-raised text-run')}>{done ? <Check size={18} /> : <Icon size={18} />}</span>
      <span><b className="block text-sm">{title}</b><span className="text-xs text-muted">{text}</span></span>
    </li>
  )
}

const stretches = [
  ['น่อง', 'ดันกำแพง ขาหลังเหยียดตรง ส้นเท้าติดพื้น', 'Calves', 'Push against a wall, back leg straight, heel down'],
  ['ต้นขาหลัง', 'วางส้นเท้าบนขอบ/ม้านั่ง เอนตัวจากสะโพก หลังตรง', 'Hamstrings', 'Heel on a ledge/bench, hinge from the hips, back straight'],
  ['ต้นขาหน้า', 'ยืนจับข้อเท้าดึงไปหาก้น เข่าชิดกัน', 'Quads', 'Standing, pull the ankle toward the glute, knees together'],
  ['สะโพกด้านหน้า', 'ท่าคุกเข่าขาเดียว ดันสะโพกไปข้างหน้า', 'Hip flexors', 'Half-kneeling, push the hips forward'],
  ['ก้น', 'นั่งไขว่ห้างแบบเลข 4 แล้วเอนตัวไปข้างหน้า', 'Glutes', 'Seated figure-4, lean forward'],
]

/**
 * หลังวิ่ง: เดิน/จ็อกเบาให้หัวใจค่อย ๆ ลง (ลดอาการหน้ามืด โดยเฉพาะตอนร้อน), ดื่มน้ำ, กินโปรตีน+คาร์บ
 * งานวิจัย: cool-down ไม่ได้ลดอาการปวดเมื่อย/บาดเจ็บ แต่ช่วยร่างกายกลับสู่ภาวะพัก (Van Hooren & Peake 2018)
 * ยืดเหยียดลดปวดเมื่อยได้น้อยมาก (Herbert 2011) จึงเป็นทางเลือกเพื่อความสบายตัว
 */
export function CooldownSheet({ run, onUpdate, onDone }: { run: Run; onUpdate: (patch: Partial<Run>) => void; onDone: () => void }) {
  const km = run.km
  const t = useT()
  // ถามตอนนี้เลย (แตะครั้งเดียว) ถ้ารอไปถามในหน้ารายละเอียด ครึ่งหนึ่งไม่ได้ให้คะแนน แล้วภาระการฝึกต้องใช้ค่าเดา
  const [suggestWalk] = useState(() => looksLikeWalk(run))
  const [endAt, setEndAt] = useState<number | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const [walked, setWalked] = useState(false)
  const [showStretch, setShowStretch] = useState(false)
  const [runs] = useRuns()
  // หน้านี้ render ทุก 0.5 วิ ตอนจับเวลาคูลดาวน์ ต้องคงอ้างอิงไว้ ไม่งั้นคิดสถิติทั้งหมดใหม่ทุกครั้ง
  const all = useMemo(() => (runs.some(r => r.id === run.id) ? runs : [...runs, run]), [runs, run])
  const left = endAt ? Math.max(0, Math.ceil((endAt - now) / 1000)) : WALK_SEC

  useEffect(() => {
    if (!endAt) return
    const id = setInterval(() => {
      const t = Date.now()
      setNow(t)
      if (t >= endAt) {
        clearInterval(id)
        setWalked(true)
        navigator.vibrate?.([200, 100, 200])
        void speak('ครบ 5 นาที คูลดาวน์เสร็จแล้ว ดื่มน้ำด้วยนะ')
      }
    }, 500)
    return () => clearInterval(id)
  }, [endAt])

  return (
    <Sheet onClose={onDone} title={isWalk(run) ? t(`เดิน ${km.toFixed(2)} กม. บันทึกแล้ว`, `Walked ${km.toFixed(2)} km — saved`) : t(`เยี่ยม! วิ่ง ${km.toFixed(2)} กม. ต่อด้วยคูลดาวน์`, `Nice! ${km.toFixed(2)} km — now cool down`)}>
      <div className="space-y-4">
        {suggestWalk && (
          <div className="rounded-2xl bg-warn/10 p-3 text-sm ring-1 ring-warn/30">
            {isWalk(run)
              ? <span className="flex items-center gap-2 font-semibold text-good"><Check size={16} /> {t('บันทึกเป็น "เดิน" แล้ว ไม่นับเป็นระยะวิ่ง', 'Saved as a walk — not counted as running distance')}</span>
              : <>
                  <p>{t(`เพซเฉลี่ย ${formatPace(run.seconds, run.km)} /กม. ช้ากว่าการวิ่ง (รวมวิ่งสลับเดิน) รอบนี้เป็นการเดินใช่ไหม? ถ้าใช่ ระยะนี้จะไม่นับรวมเป็นระยะวิ่งของสัปดาห์ แต่ยังนับเป็นวันที่ได้ออกกำลังกาย`, `Average pace ${formatPace(run.seconds, run.km)} /km is slower than running (even run-walk). Was this a walk? If so it won't count toward weekly running distance, but still counts as an active day.`)}</p>
                  <div className="mt-2 flex gap-2">
                    <Button size="sm" onClick={() => onUpdate({ kind: 'walk' })}><Footprints size={15} /> {t('บันทึกเป็นเดิน', 'Save as walk')}</Button>
                  </div>
                </>}
          </div>
        )}
        {!isWalk(run) && <RunAchievements run={run} runs={all} className="ring-1 ring-warn/30" />}
        <div className="rounded-2xl bg-raised p-3"><RpePicker value={run.rpe} onPick={rpe => onUpdate({ rpe })} /></div>
        <div className="rounded-2xl bg-raised p-4 text-center">
          <div className="text-xs text-muted">{t('เดินหรือจ็อกเบามาก ๆ', 'Walk or jog very easy')}</div>
          <div className="text-5xl font-extrabold tabular-nums">{formatDuration(left)}</div>
          {!endAt && !walked && <Button className="mt-3" onClick={() => setEndAt(Date.now() + WALK_SEC * 1000)}><Play size={16} fill="currentColor" /> {t('เริ่มคูลดาวน์ 5 นาที', 'Start 5-min cool-down')}</Button>}
          {endAt && !walked && <Button variant="soft" className="mt-3" onClick={() => setWalked(true)}>{t('ข้าม', 'Skip')}</Button>}
          {walked && <div className="mt-2 text-sm font-semibold text-good">{t('เสร็จแล้ว', 'Done')}</div>}
        </div>
        <ul className="space-y-3">
          <Item icon={Footprints} title={t('เดิน 5 นาที', 'Walk 5 minutes')} text={t('ให้ชีพจรค่อย ๆ ลง ลดอาการหน้ามืดจากการหยุดทันที (สำคัญตอนอากาศร้อน)', 'Let your heart rate come down; stopping abruptly can cause light-headedness (important in the heat)')} done={walked} />
          <Item icon={Droplets} title={t('ดื่มน้ำ / เกลือแร่', 'Water / electrolytes')} text={t('ดื่มทดแทนเหงื่อที่เสียไป ถ้าวิ่งนานหรือเหงื่อออกมากใช้เกลือแร่', 'Replace the sweat you lost; use electrolytes after long or very sweaty runs')} />
          <Item icon={Sandwich} title={t('กินภายใน 1–2 ชม.', 'Eat within 1–2 h')} text={t('โปรตีน ~20–40 ก. + คาร์บ เช่น ข้าว + อกไก่/ไข่ หรือ นม + กล้วย (ISSN 2017)', 'Protein ~20–40 g + carbs, e.g. rice + chicken/eggs or milk + banana (ISSN 2017)')} />
        </ul>
        <div>
          <button onClick={() => setShowStretch(!showStretch)} className="flex items-center gap-2 text-sm font-semibold text-run">
            <StretchHorizontal size={16} /> {t('ยืดเหยียด (ไม่บังคับ)', 'Stretching (optional)')} {showStretch ? '▲' : '▼'}
          </button>
          <Collapse open={showStretch}>
            <ul className="mt-2 space-y-1.5 text-sm">
              {stretches.map(([name, how, nameEn, howEn]) => <li key={name}><b>{t(name, nameEn)}</b> <span className="text-muted">— {t(how, howEn)} · {t('ค้าง 30 วิ/ข้าง', 'hold 30 s/side')}</span></li>)}
            </ul>
            <p className="mt-2 text-[11px] text-muted">{t('ยืดเพื่อความสบายตัว ไม่ได้ช่วยลดปวดเมื่อยมากนัก', "Stretch for comfort — it doesn't reduce soreness much")}</p>
          </Collapse>
        </div>
        <Button size="lg" className="w-full" onClick={onDone}>{t('ดูสรุปการวิ่ง', 'View run summary')}</Button>
      </div>
    </Sheet>
  )
}
