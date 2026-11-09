import { ShieldCheck } from 'lucide-react'
import { phases, phasesEn, principles, principlesEn } from '../data/workouts'
import { useLang, useT } from '../lib/i18n'
import { Dashboard } from './Dashboard'
import { useProgram } from '../lib/program'
import { Badge, Disclosure } from './ui'

const safety: [string, string][] = [
  ['กฎความเจ็บ', 'ปวดเมื่อยกล้ามทั่วไป (≤3/10) ฝึกต่อได้ แต่ถ้าปวดแปลบ ปวดมากขึ้นระหว่างวิ่ง หรือทำให้ท่าวิ่งเปลี่ยน ให้หยุดทันที ถ้ายังปวดเกิน 3 วันควรพบแพทย์/นักกายภาพ'],
  ['อากาศร้อนในไทย', 'วิ่งช่วงเช้าก่อน 7 โมงหรือหลัง 6 โมงเย็น ดื่มน้ำ ~300–450 มล. 2–4 ชม. ก่อนวิ่ง วิ่งเกิน 60 นาทีพกน้ำ + เกลือแร่ ถ้าเวียนหัว คลื่นไส้ สับสน พูดไม่รู้เรื่อง หรือเดินเซ ให้หยุดเข้าที่ร่มทันที ราดน้ำเย็น/ประคบเย็น และเรียกความช่วยเหลือ ฮีทสโตรกขณะออกกำลังกายเหงื่ออาจยังออกอยู่ อย่ารอให้เหงื่อหยุด (ACSM)'],
  ['สัญญาณซ้อมหนักเกิน', 'เหนื่อยผิดปกติหลายวัน นอนไม่หลับ ชีพจรตอนตื่นสูงกว่าปกติชัดเจน หรือวิ่งช้าลงทั้งที่พยายาม → เปลี่ยนวันนั้นเป็นวันพักหรือวิ่งเบา'],
  ['พลาดวันฝึก', 'ข้ามไปได้เลย ไม่ต้องชดเชยสองวันรวด ถ้าหยุดเกิน 2 สัปดาห์ให้ย้อนกลับไป 1–2 สัปดาห์'],
  ['ป่วย', 'มีไข้หรืออาการทั้งตัว (ปวดเมื่อย ไอลงคอ) ให้พักจนหายดี ไม่ควรวิ่งฝืน'],
]
const safetyEn: [string, string][] = [
  ['Pain rule', 'General muscle soreness (≤3/10) is fine to train through, but stop immediately for sharp pain, pain that grows during a run or changes your stride; pain lasting over 3 days needs a doctor/physio'],
  ['Thai heat', 'Run before 7 am or after 6 pm, drink ~300–450 ml 2–4 h before; over 60 min carry water + electrolytes. Dizziness, nausea, confusion, slurred speech or staggering: stop, get into shade, cool with cold water and call for help — in exertional heat stroke you may still be sweating, don’t wait for it to stop (ACSM)'],
  ['Overtraining signs', 'Unusual fatigue for days, poor sleep, clearly higher waking heart rate, or getting slower despite trying → make that day rest or easy'],
  ['Missed a session', 'Just skip it — no doubling up. Off for over 2 weeks: step back 1–2 weeks'],
  ['Illness', 'Fever or whole-body symptoms (aches, chest cough): rest until fully well, don’t run through it'],
]

// หน้าหลักเหลือแค่เรื่องของวันนี้ ความรู้ประกอบย้ายไปหน้า "ความรู้และแหล่งข้อมูล" (เมนูบัญชี)
export function Overview() {
  return <Dashboard />
}

/** ความรู้ประกอบ: แผน 12 สัปดาห์ (โปรแกรมหุ่น), ความจริงเรื่องหุ่น, ความปลอดภัย, หลักการ */
export function Guide() {
  const { program } = useProgram()
  const t = useT()
  const en = useLang()[0] === 'en'

  return (
    <>
      {program === 'physique' && <Disclosure title={t('แผน 12 สัปดาห์', '12-week plan')} summary={t('ฐาน → เพิ่มความหนัก → Deload → ทดสอบ', 'Base → Build → Deload → Test')}>
        <ol className="relative space-y-4 border-l-2 border-line pl-5">
          {phases.map((p, i) => (
            <li key={p.weeks} className="relative">
              <span className="absolute -left-[27px] top-1 size-3 rounded-full bg-accent-fill ring-4 ring-card" />
              <Badge>{t('สัปดาห์', 'Weeks')} {p.weeks}</Badge>
              <div className="mt-1 font-bold">{en ? phasesEn[i].name : p.name}</div>
              <p className="text-sm text-muted">{en ? phasesEn[i].text : p.text}</p>
            </li>
          ))}
        </ol>
      </Disclosure>}

      <Disclosure title={t('หุ่นแบบ Tom Holland — ความจริงที่ควรรู้', 'A Tom Holland physique — the facts')} summary={t('ทำได้จริงแค่ไหน ใช้เวลานานเท่าไร', 'How realistic, how long it takes')}>
        {en ? <ul className="list-disc space-y-2 pl-5 text-sm">
          <li>He’s about 170–173 cm and the on-screen look is <b>lean, low body fat, moderate muscle</b> — not a bodybuilder, which is a realistic target for you (165 cm / 64.5 kg)</li>
          <li>His training focuses on <b>bodyweight, gymnastics and conditioning</b> (pull-ups, dips, push-ups) per his trainer’s interviews — with a team, a chef and full days to train before filming</li>
          <li>Promo photos are taken at the leanest point with lighting and a pump — not an everyday state</li>
          <li>Beginners gain muscle fastest in year one, but only a few kg a year (varies a lot with genetics, sleep and food — no study gives a firm number); losing ~0.5% body weight per week keeps more muscle than cutting fast</li>
          <li>Realistic timeline: visible change in <b>8–12 weeks</b>, close to the look in <b>1–2 years</b> of consistent training</li>
        </ul> : <ul className="list-disc space-y-2 pl-5 text-sm">
          <li>เขาสูงราว 170–173 ซม. และรูปร่างที่เห็นในหนังเป็นแบบ <b>ลีน ไขมันต่ำ กล้ามพอดี</b> ไม่ใช่สายกล้ามใหญ่ ซึ่งเป็นเป้าที่ทำได้จริงสำหรับคุณ (165 ซม. / 64.5 กก.)</li>
          <li>การฝึกของเขาเน้น <b>บอดี้เวท ยิมนาสติก และ conditioning</b> (ดึงข้อ ดิป วิดพื้น) ตามที่เทรนเนอร์ให้สัมภาษณ์ และมีทีมงาน เชฟ และเวลาฝึกเต็มวันก่อนถ่ายทำ</li>
          <li>ภาพโปรโมตถ่ายช่วงไขมันต่ำที่สุด พร้อมแสงและการปั๊มกล้าม ไม่ใช่สภาพทุกวัน</li>
          <li>มือใหม่เพิ่มกล้ามได้เร็วที่สุดในปีแรก แต่เป็นหลักไม่กี่กิโลกรัมต่อปี (ตัวเลขต่างกันมากตามพันธุกรรม การนอน และอาหาร ยังไม่มีงานวิจัยที่ให้ตัวเลขแน่นอน) ส่วนการลดไขมัน ~0.5% ของน้ำหนักตัว/สัปดาห์ช่วยรักษากล้ามได้ดีกว่าการลดเร็ว</li>
          <li>เวลาที่สมเหตุสมผล: เห็นความเปลี่ยนแปลงใน <b>8–12 สัปดาห์</b> และได้รูปร่างใกล้เคียงใน <b>1–2 ปี</b> ถ้าฝึกสม่ำเสมอ</li>
        </ul>}
      </Disclosure>

      <Disclosure title={<span className="flex items-center gap-2"><ShieldCheck size={18} className="text-good" /> {t('ฝึกอย่างปลอดภัย', 'Train safely')}</span>} summary={t('กฎความเจ็บ อากาศร้อน ซ้อมหนักเกิน ป่วย', 'Pain rule, heat, overtraining, illness')}>
        <ul className="space-y-3 text-sm">
          {(en ? safetyEn : safety).map(([title, text]) => (
            <li key={title}>
              <div className="font-semibold">{title}</div>
              <p className="text-muted">{text}</p>
            </li>
          ))}
        </ul>
      </Disclosure>

      <Disclosure title={t('หลักการที่แผนนี้ใช้', 'Principles behind the plan')} summary={t('progressive overload, ปริมาณเซ็ต, วิ่งเบาเป็นหลัก', 'progressive overload, set volume, mostly easy running')}>
        <div className="space-y-3">
          {(en ? principlesEn : principles).map(p => (
            <div key={p.title} className="rounded-2xl bg-raised p-3">
              <div className="font-semibold">{p.title}</div>
              <p className="text-sm text-muted">{p.text}</p>
            </div>
          ))}
        </div>
      </Disclosure>
    </>
  )
}
