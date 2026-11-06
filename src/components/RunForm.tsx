import { Disclosure } from './ui'
import { useLang, useT } from '../lib/i18n'

// ท่าวิ่ง: ใส่เฉพาะข้อที่มีหลักฐานหรือเป็นคำแนะนำทั่วไปที่ไม่เสี่ยง — ข้อจากพอดแคสต์ที่ยังไม่มีหลักฐาน
// (เช่น "ล็อกข้อเท้า" ช่วยเด้ง, เดินปลายเท้าตรงแล้วประหยัดระยะเป็นกิโล) ไม่ใส่
const tips: [string, string][] = [
  ['วางเท้าใกล้ใต้ลำตัว', 'ไม่เอื้อมเท้าไปไกลหน้าตัว (เหมือนเบรกทุกก้าว) — ถ้ารู้สึกก้าวยาวเกิน ลองก้าวสั้นลงและถี่ขึ้น 5–10% ช่วยลดแรงที่เข่าและสะโพก'],
  ['ไม่ต้องฝืนลงหน้าเท้า', 'วิ่งช้า ลงส้นแล้วกลิ้งเท้าเป็นเรื่องปกติ ยิ่งเร็วจะลงกลางเท้าเอง — งานวิจัยไม่พบว่าการเปลี่ยนการลงเท้าช่วยให้ประหยัดแรงหรือเจ็บน้อยลง'],
  ['ลำตัวนิ่ง แขนผ่อน', 'มองตรงไปข้างหน้า ไหล่ไม่ยก แกว่งแขนจากหัวไหล่ไม่ข้ามลำตัว กำมือหลวม ๆ เกร็งท้องพอให้ตัวไม่โยกซ้ายขวา'],
  ['ท่าไม่ได้ทำให้เจ็บ ไม่ต้องรื้อ', 'รูปร่างแต่ละคนต่างกัน — ถ้าจะปรับ ปรับทีละอย่างช้า ๆ ระหว่างวิ่งเบา'],
  ['วอร์มอัพก่อนวันวิ่งเร็ว', 'จ็อก 10 นาที แล้วทำดริลล์ท่าละ ~20 ม. — ดูการ์ด "ดริลล์ก่อนวิ่ง" ด้านบน (มีเสียงนำ)'],
]

const tipsEn: [string, string][] = [
  ['Land close under your body', 'Don’t reach far ahead with your foot (it brakes every step) — if your stride feels long, try 5–10% shorter, quicker steps to reduce knee and hip load'],
  ['No need to force a forefoot strike', 'At slow paces a heel strike and roll-through is normal; you’ll land more midfoot as you speed up — research hasn’t found that changing foot strike improves economy or injury rates'],
  ['Steady trunk, relaxed arms', 'Look ahead, shoulders down, swing arms from the shoulder without crossing your body, loose hands, enough core tension to stop side-to-side sway'],
  ['If your form isn’t causing pain, don’t overhaul it', 'Everyone’s build differs — if you change anything, change one thing slowly during easy runs'],
  ['Warm up before fast days', 'Jog 10 min, then drills ~20 m each — see the "Pre-run drills" card above (voice-guided)'],
]

export function RunFormTips() {
  const tr = useT()
  const en = useLang()[0] === 'en'
  return (
    <Disclosure title={tr('ท่าวิ่งที่ควรรู้', 'Running form basics')} summary={tr('วางเท้าใต้ตัว ไม่ฝืนลงหน้าเท้า ลำตัวนิ่ง', 'Land under you, no forced forefoot, steady trunk')}>
      <ul className="space-y-3 text-sm">
        {(en ? tipsEn : tips).map(([t, d]) => (
          <li key={t}><div className="font-semibold">{t}</div><p className="text-muted">{d}</p></li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-muted">{tr('อ้างอิง: Heiderscheit 2011, Anderson 2020, Fradkin 2010 · คำแนะนำโค้ชใบพัน (บ้านพ่อพอดแคสต์ EP.29)', 'Refs: Heiderscheit 2011, Anderson 2020, Fradkin 2010 · coaching tips from a Thai running podcast (EP.29)')}</p>
    </Disclosure>
  )
}
