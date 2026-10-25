import { useEffect, useState } from 'react'
import { Check, Droplets, Footprints, Play, Sandwich, StretchHorizontal } from 'lucide-react'
import { formatDuration } from '../lib/log'
import { speak } from '../lib/voice'
import { cx } from '../lib/cx'
import { Button, Collapse, Sheet } from './ui'

const WALK_SEC = 5 * 60

function Item({ icon: Icon, title, text, done }: { icon: typeof Droplets; title: string; text: string; done?: boolean }) {
  return (
    <li className="flex gap-3">
      <span className={cx('grid size-9 shrink-0 place-items-center rounded-xl', done ? 'bg-good text-white' : 'bg-raised text-run')}>{done ? <Check size={18} /> : <Icon size={18} />}</span>
      <span><b className="block text-sm">{title}</b><span className="text-xs text-muted">{text}</span></span>
    </li>
  )
}

const stretches = [
  ['น่อง', 'ดันกำแพง ขาหลังเหยียดตรง ส้นเท้าติดพื้น'],
  ['ต้นขาหลัง', 'วางส้นเท้าบนขอบ/ม้านั่ง เอนตัวจากสะโพก หลังตรง'],
  ['ต้นขาหน้า', 'ยืนจับข้อเท้าดึงไปหาก้น เข่าชิดกัน'],
  ['สะโพกด้านหน้า', 'ท่าคุกเข่าขาเดียว ดันสะโพกไปข้างหน้า'],
  ['ก้น', 'นั่งไขว่ห้างแบบเลข 4 แล้วเอนตัวไปข้างหน้า'],
]

/**
 * หลังวิ่ง: เดิน/จ็อกเบาให้หัวใจค่อย ๆ ลง (ลดอาการหน้ามืด โดยเฉพาะตอนร้อน), ดื่มน้ำ, กินโปรตีน+คาร์บ
 * งานวิจัย: cool-down ไม่ได้ลดอาการปวดเมื่อย/บาดเจ็บ แต่ช่วยร่างกายกลับสู่ภาวะพัก (Van Hooren & Peake 2018)
 * ยืดเหยียดลดปวดเมื่อยได้น้อยมาก (Herbert 2011) — จึงเป็นทางเลือกเพื่อความสบายตัว
 */
export function CooldownSheet({ km, onDone }: { km: number; onDone: () => void }) {
  const [endAt, setEndAt] = useState<number | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const [walked, setWalked] = useState(false)
  const [showStretch, setShowStretch] = useState(false)
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
    <Sheet onClose={onDone} title={`เยี่ยม! วิ่ง ${km.toFixed(2)} กม. 🎉 ต่อด้วยคูลดาวน์`}>
      <div className="space-y-4">
        <div className="rounded-2xl bg-raised p-4 text-center">
          <div className="text-xs text-muted">เดินหรือจ็อกเบามาก ๆ</div>
          <div className="text-5xl font-extrabold tabular-nums">{formatDuration(left)}</div>
          {!endAt && !walked && <Button className="mt-3" onClick={() => setEndAt(Date.now() + WALK_SEC * 1000)}><Play size={16} fill="currentColor" /> เริ่มคูลดาวน์ 5 นาที</Button>}
          {endAt && !walked && <Button variant="soft" className="mt-3" onClick={() => setWalked(true)}>ข้าม</Button>}
          {walked && <div className="mt-2 text-sm font-semibold text-good">เสร็จแล้ว ✓</div>}
        </div>
        <ul className="space-y-3">
          <Item icon={Footprints} title="เดิน 5 นาที" text="ให้ชีพจรค่อย ๆ ลง ลดอาการหน้ามืดจากการหยุดทันที (สำคัญตอนอากาศร้อน)" done={walked} />
          <Item icon={Droplets} title="ดื่มน้ำ / เกลือแร่" text="ดื่มทดแทนเหงื่อที่เสียไป ถ้าวิ่งนานหรือเหงื่อออกมากใช้เกลือแร่" />
          <Item icon={Sandwich} title="กินภายใน 1–2 ชม." text="โปรตีน ~20–40 ก. + คาร์บ เช่น ข้าว + อกไก่/ไข่ หรือ นม + กล้วย (ISSN 2017)" />
        </ul>
        <div>
          <button onClick={() => setShowStretch(!showStretch)} className="flex items-center gap-2 text-sm font-semibold text-run">
            <StretchHorizontal size={16} /> ยืดเหยียด (ไม่บังคับ) {showStretch ? '▲' : '▼'}
          </button>
          <Collapse open={showStretch}>
            <ul className="mt-2 space-y-1.5 text-sm">
              {stretches.map(([name, how]) => <li key={name}><b>{name}</b> <span className="text-muted">— {how} · ค้าง 30 วิ/ข้าง</span></li>)}
            </ul>
            <p className="mt-2 text-[11px] text-muted">ยืดเพื่อความสบายตัวได้ แต่ไม่ได้ช่วยลดปวดเมื่อยมากนัก (Cochrane 2011) — ความยืดหยุ่นระยะยาวได้จากเวทเทรนนิ่งพอ ๆ กับการยืด</p>
          </Collapse>
        </div>
        <Button size="lg" className="w-full" onClick={onDone}>ดูสรุปการวิ่ง</Button>
      </div>
    </Sheet>
  )
}
