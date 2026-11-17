import { Activity } from 'lucide-react'
import type { Day } from '../data/workouts'
import { ropeReady } from '../lib/jumpRope'
import { useLegTests } from '../lib/legTests'
import type { Readiness } from '../lib/readiness'
import type { TendonLog } from '../lib/tendon'
import { useProgram } from '../lib/program'
import { usePersisted } from '../lib/storage'
import { useToday } from '../lib/useToday'
import { useNav } from '../lib/nav'
import { useT } from '../lib/i18n'
import { Button } from './ui'

/** วันเวทที่มี Pogo Jumps: เสนอกระโดดเชือกแทนเมื่อขาพร้อม (jumpRope.ts) ไม่พร้อมบอกว่าต้องทำอะไรก่อน */
export function JumpRopeOffer({ day }: { day: Day }) {
  const t = useT()
  const p = useProgram()
  const now = useToday()
  const nav = useNav()
  const [tests] = useLegTests()
  const [readiness] = usePersisted<Record<string, Readiness>>('readiness', {})
  const [tendon] = usePersisted<TendonLog>('tendonLog', {})
  const [hidden, setHidden] = usePersisted('ropeOfferHidden', false)
  const [, setProgressView] = usePersisted('progressView', 'workouts')
  if (hidden || !day.exercises.some(e => e.name === 'Pogo Jumps' && !e.swappedFrom)) return null
  const r = ropeReady(tests, readiness, tendon, now)
  return (
    <div className="mt-3 flex items-start gap-2.5 rounded-xl bg-raised p-3 text-sm">
      <Activity size={16} className="mt-0.5 shrink-0 text-run" />
      <div className="min-w-0 flex-1">
        <div className="font-semibold">{t('มีเชือกกระโดด ใช้แทน Pogo Jumps ได้', 'Have a jump rope? Use it instead of Pogo Jumps')}</div>
        {r.ready ? (
          <>
            <p className="text-muted">{t('ฝึกแบบเดียวกัน (เด้งด้วยข้อเท้า) นักวิ่งที่กระโดดเชือก 10 สัปดาห์วิ่ง 3 กม.ได้เร็วขึ้น เริ่ม 30 วิต่อรอบ 2 สัปดาห์ แล้วค่อยเพิ่ม', 'Same training effect (springy ankles); runners who skipped for 10 weeks ran 3 km faster. Start at 30 s per round for 2 weeks, then build up.')}</p>
            <div className="mt-2 flex gap-2">
              <Button size="sm" onClick={() => p.swap('Pogo Jumps', 'Jump Rope')}>{t('ใช้กระโดดเชือก', 'Use jump rope')}</Button>
              <Button size="sm" variant="soft" onClick={() => setHidden(true)}>{t('ไม่มีเชือก', 'No rope')}</Button>
            </div>
          </>
        ) : (
          <>
            <p className="text-muted">{r.why === 'pain'
              ? t('ยังไม่ควรเริ่ม มีอาการเจ็บขาใน 7 วันที่ผ่านมา การกระโดดลงแรงที่เอ็นร้อยหวายมาก รอให้ไม่เจ็บครบ 7 วันก่อน', 'Not yet: leg pain in the last 7 days, and skipping loads the Achilles a lot. Wait for 7 pain-free days.')
              : r.why === 'calf'
                ? t('ยังไม่ควรเริ่ม ผลทดสอบเขย่งขาเดียวล่าสุดยังไม่ถึง 25 ครั้งทั้งสองข้าง ฝึกเขย่งน่องต่อแล้วทดสอบใหม่', 'Not yet: your latest single-leg calf raise test is under 25 on a leg. Keep doing calf raises and retest.')
                : t('ทดสอบเขย่งขาเดียวก่อน ถ้าได้ 25 ครั้งขึ้นไปทั้งสองข้างและไม่เจ็บ แอปจะให้สลับได้', 'Do the single-leg calf raise test first: 25+ on both legs, pain-free, unlocks the swap.')}</p>
            {r.why !== 'pain' && (
              <div className="mt-2">
                <Button size="sm" variant="soft" onClick={() => { setProgressView('fitness'); nav('progress') }}>{t('ไปทดสอบ', 'Test now')}</Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
