import { HeartPulse, Bluetooth, BluetoothOff } from 'lucide-react'
import type { RunHr } from '../lib/hrLog'
import type { Run } from '../lib/log'
import { defaultProfile, type Profile } from '../lib/calc'
import { connectHr, disconnectHr, hrSupported, useHeartRate } from '../lib/heartRate'
import { hrMaxFor, hrZone, tanakaMax, zoneRanges } from '../lib/zone'
import { usePersisted } from '../lib/storage'
import { useT } from '../lib/i18n'
import { cx } from '../lib/cx'
import { Button, Disclosure } from './ui'
import { NumberInput } from './Form'

const ERR: Record<string, [string, string]> = {
  'bluetooth-off': ['บลูทูธปิดอยู่ เปิดบลูทูธแล้วลองใหม่', 'Bluetooth is off. Turn it on and try again.'],
  'not-found': ['ไม่เจอสายวัดชีพจร ใส่สายให้แนบผิว (เปียกนิดหน่อยช่วยได้) แล้วลองใหม่', 'No strap found. Wear it against the skin (slightly damp helps) and try again.'],
  permission: ['ต้องอนุญาตให้แอปใช้บลูทูธก่อน', 'Allow the app to use Bluetooth first.'],
  unsupported: ['เครื่องนี้ไม่รองรับบลูทูธพลังงานต่ำ', 'This device has no Bluetooth Low Energy.'],
}

/** ปุ่มต่อสายวัดชีพจร + ค่าปัจจุบัน ใช้ทั้งหน้าเริ่มวิ่งและการ์ด zone 2 */
export function HrStrap() {
  const t = useT()
  const hr = useHeartRate()
  const [profile] = usePersisted<Profile>('profile', defaultProfile)
  const [stored] = usePersisted<number | null>('hrMax', null)
  if (!hrSupported()) return null
  const max = hrMaxFor(stored, profile.age)
  const err = hr.error ? ERR[hr.error] ?? [`ต่อไม่สำเร็จ (${hr.error})`, `Couldn't connect (${hr.error})`] : null
  return (
    <div className="space-y-1.5">
      {hr.status === 'on' || hr.status === 'lost' ? (
        <div className="flex items-center gap-2 rounded-xl bg-raised p-2.5 text-sm">
          <HeartPulse size={16} className="shrink-0 text-bad" />
          <span className="min-w-0 flex-1">
            {hr.status === 'lost'
              ? t('สายหลุด กำลังต่อใหม่', 'Strap lost, reconnecting')
              : hr.bpm
                ? <><b className="tabular-nums">{hr.bpm}</b> {t('ครั้ง/นาที', 'bpm')} · {t(`โซน ${hrZone(hr.bpm, max)}`, `Zone ${hrZone(hr.bpm, max)}`)}</>
                : t('ต่อแล้ว รอค่าชีพจร', 'Connected, waiting for a reading')}
            {hr.name && <span className="block truncate text-xs text-muted">{hr.name}</span>}
          </span>
          <Button size="sm" variant="soft" onClick={disconnectHr}><BluetoothOff size={14} /> {t('เลิกต่อ', 'Disconnect')}</Button>
        </div>
      ) : (
        <Button size="sm" variant="soft" className="w-full" onClick={() => void connectHr()} disabled={hr.status === 'connecting'}>
          <Bluetooth size={15} /> {hr.status === 'connecting' ? t('กำลังหาสายวัดชีพจร…', 'Looking for a strap…') : t('ต่อสายวัดชีพจร', 'Connect heart-rate strap')}
        </Button>
      )}
      {err && <p className="text-xs text-bad" role="status">{t(...err)}</p>}
    </div>
  )
}

/** หน้าเริ่มวิ่ง: คุม zone 2 โดยไม่ต้องมีนาฬิกา (ทดสอบการพูด) + ชีพจรถ้ามีสาย (zone.ts) */
export function ZoneCard({ kind }: { kind: Run['kind'] }) {
  const t = useT()
  const [profile] = usePersisted<Profile>('profile', defaultProfile)
  const [stored, setStored] = usePersisted<number | null>('hrMax', null)
  const [talkOn, setTalkOn] = usePersisted('talkCue', true)
  const max = hrMaxFor(stored, profile.age)
  const z2 = zoneRanges(max)[1]
  const easy = kind === 'easy' || kind === 'long'
  return (
    <Disclosure title={<><HeartPulse size={18} /> {t('คุม zone 2 (วิ่งเบา)', 'Staying in zone 2 (easy)')}</>}
      summary={t('ไม่มีนาฬิกาก็คุมได้ด้วยการพูด', 'No watch needed: use the talk test')}>
      <div className="space-y-3 px-3.5 pb-3.5 text-sm">
        <ul className="space-y-1.5">
          {[
            [t('ทดสอบการพูด', 'Talk test'), t('พูดประโยคยาว 20–30 คำได้โดยไม่ต้องหยุดหายใจ = zone 2 ต้องหยุดหายใจกลางประโยค = ช้าลงนิด พูดได้ทีละไม่กี่คำ = เร็วเกินแล้ว', 'Say a 20–30-word sentence without pausing for breath = zone 2. Pausing mid-sentence = ease off a little. Only a few words at a time = too fast.')],
            [t('ความเหนื่อย', 'Effort'), t('3–4 จาก 10 รู้สึกว่าวิ่งแบบนี้ต่อได้อีกเป็นชั่วโมง', '3–4 out of 10; you could keep going for an hour')],
            [t('การหายใจ', 'Breathing'), t('หายใจเข้า 3 ก้าว ออก 3 ก้าวได้สบาย ต้องเปลี่ยนเป็น 2:2 แปลว่าเร็วขึ้นแล้ว', 'Three steps in, three out feels easy; needing 2:2 means you sped up')],
            [t('10 นาทีแรก', 'First 10 min'), t('ช้ากว่าที่คิด ร่างกายยังเข้าสู่ความเหนื่อยจริงไม่เต็มที่ เช็กหลังนาทีที่ 10', 'Slower than you think; effort hasn’t caught up yet. Check after minute 10')],
            [t('วันร้อน ขึ้นเนิน', 'Heat, hills'), t('เชื่อการพูดมากกว่าเพซ ช้าลงหรือเดินขึ้นเนินได้', 'Trust the talk test over pace; slow down or walk the hill')],
          ].map(([h, b]) => <li key={h}><b>{h}:</b> <span className="text-muted">{b}</span></li>)}
        </ul>
        <label className={cx('flex items-center gap-2 rounded-xl bg-raised px-3 py-2', !easy && 'opacity-60')}>
          <input type="checkbox" className="size-4 accent-accent" checked={talkOn} onChange={e => setTalkOn(e.target.checked)} />
          <span className="flex-1">{t('เตือนให้ลองพูดทุก 10 นาที (วิ่งเบาและวิ่งยาว ต้องเปิดเสียง)', 'Remind me to try talking every 10 min (easy and long runs, voice on)')}</span>
        </label>
        <div className="space-y-2 rounded-xl ring-1 ring-line p-3">
          <div className="font-semibold">{t('ถ้ามีสายวัดชีพจร', 'With a heart-rate strap')}</div>
          <p className="text-muted">{t(`zone 2 ≈ ${z2[0]}–${z2[1]} ครั้ง/นาที (60–70% ของชีพจรสูงสุด ${max}) ${stored ? 'จากค่าที่คุณใส่' : `ประมาณจากอายุ ${profile.age} ปีด้วยสูตร Tanaka (208 − 0.7 × อายุ) คลาดเคลื่อนได้ ±10`} วิ่งเบาเลยขึ้นไปต้นโซน 3 ได้ถ้ายังพูดเป็นประโยคได้ ถ้าตัวเลขขัดกับการพูด ให้เชื่อการพูด`, `Zone 2 ≈ ${z2[0]}–${z2[1]} bpm (60–70% of max ${max}) ${stored ? 'from your value' : `estimated from age ${profile.age} with Tanaka (208 − 0.7 × age), ±10 bpm`}. Easy running can drift into low zone 3 if you can still talk in sentences; if the numbers disagree with the talk test, trust the talk test.`)}</p>
          <NumberInput label={t('ชีพจรสูงสุดที่วัดได้จริง (ไม่บังคับ)', 'Measured max heart rate (optional)')} unit={t('ครั้ง/นาที', 'bpm')}
            value={stored ?? ''} placeholder={String(tanakaMax(profile.age))}
            onChange={v => { const n = parseInt(v, 10); setStored(n >= 120 && n <= 230 ? n : null) }} />
          <HrStrap />
        </div>
      </div>
    </Disclosure>
  )
}

/** ระหว่างวิ่ง: ชีพจรตอนนี้และโซน (แสดงเมื่อต่อสายไว้) */
export function LiveHr() {
  const t = useT()
  const hr = useHeartRate()
  const [profile] = usePersisted<Profile>('profile', defaultProfile)
  const [stored] = usePersisted<number | null>('hrMax', null)
  if (hr.status !== 'on' && hr.status !== 'lost') return null
  const max = hrMaxFor(stored, profile.age)
  return (
    <div className="flex items-center justify-center gap-2 rounded-2xl bg-card p-2.5 text-sm ring-1 ring-line" role="status">
      <HeartPulse size={16} className="text-bad" />
      {hr.status === 'lost' || !hr.bpm
        ? <span className="text-muted">{t('รอสัญญาณสายวัดชีพจร', 'Waiting for the strap')}</span>
        : <><b className="text-lg tabular-nums">{hr.bpm}</b> <span className="text-muted">{t('ครั้ง/นาที', 'bpm')}</span> <span className="rounded-full bg-raised px-2 py-0.5 text-xs font-semibold">{t(`โซน ${hrZone(hr.bpm, max)}`, `Zone ${hrZone(hr.bpm, max)}`)}</span></>}
    </div>
  )
}

const ZONE_TONE = ['bg-muted/40', 'bg-good-fill', 'bg-warn', 'bg-run-fill', 'bg-bad-fill']

/** รายละเอียดรอบวิ่ง: ชีพจรเฉลี่ย/สูงสุด กราฟทุก 30 วิ และเวลาในแต่ละโซน */
export function RunHrCard({ hr }: { hr: RunHr }) {
  const t = useT()
  const total = hr.zones.reduce((a, b) => a + b, 0) || 1
  const lo = Math.min(...hr.series) - 5
  const hi = Math.max(...hr.series) + 5
  const W = 300
  const H = 80
  const pts = hr.series.map((v, i) => `${(i / Math.max(1, hr.series.length - 1)) * W},${H - ((v - lo) / (hi - lo)) * H}`).join(' ')
  const z2 = zoneRanges(hr.ref)[1]
  return (
    <section className="rounded-2xl bg-card p-3.5 shadow-sm ring-1 ring-line">
      <div className="card-title flex items-center gap-2 font-bold"><HeartPulse size={18} /> {t('ชีพจร', 'Heart rate')}</div>
      <div className="mt-2 grid grid-cols-2 gap-2 text-center text-sm">
        <div className="rounded-xl bg-raised p-2"><div className="text-xs text-muted">{t('เฉลี่ย', 'Average')}</div><b className="text-lg tabular-nums">{hr.avg}</b></div>
        <div className="rounded-xl bg-raised p-2"><div className="text-xs text-muted">{t('สูงสุด', 'Max')}</div><b className="text-lg tabular-nums">{hr.max}</b></div>
      </div>
      {hr.series.length > 1 && (
        <svg viewBox={`0 0 ${W} ${H}`} className="mt-3 h-20 w-full" preserveAspectRatio="none" role="img" aria-label={t(`กราฟชีพจร ${lo + 5}–${hi - 5} ครั้งต่อนาที`, `Heart-rate chart ${lo + 5}–${hi - 5} bpm`)}>
          <rect x="0" width={W} y={H - ((z2[1] - lo) / (hi - lo)) * H} height={Math.max(0, ((z2[1] - z2[0]) / (hi - lo)) * H)} className="fill-good/15" />
          <polyline points={pts} fill="none" className="stroke-bad" strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
        </svg>
      )}
      <div className="mt-3 space-y-1">
        {hr.zones.map((s, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <span className="w-12 shrink-0 text-muted">{t(`โซน ${i + 1}`, `Zone ${i + 1}`)}</span>
            <span className="h-2 flex-1 overflow-hidden rounded-full bg-raised"><span className={cx('block h-full rounded-full', ZONE_TONE[i])} style={{ width: `${(s / total) * 100}%` }} /></span>
            <span className="w-14 shrink-0 text-right tabular-nums">{Math.round(s / 60)} {t('นาที', 'min')}</span>
          </div>
        ))}
      </div>
      <p className="mt-2 text-xs text-muted">{t(`แถบเขียวในกราฟคือ zone 2 (${z2[0]}–${z2[1]}) คิดจากชีพจรสูงสุด ${hr.ref}`, `The green band is zone 2 (${z2[0]}–${z2[1]}) from max HR ${hr.ref}`)}</p>
    </section>
  )
}
