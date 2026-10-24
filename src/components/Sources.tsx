import { ExternalLink, Play } from 'lucide-react'
import { channels, references } from '../data/sources'
import { Badge, Card } from './ui'

export function Sources() {
  return (
    <>
      <Card title="ช่อง YouTube ที่แนะนำ">
        <p className="-mt-1 mb-3 text-xs text-muted">เลือกช่องที่อธิบายโดยอิงงานวิจัยหรือโดยโค้ชที่มีใบรับรอง ปุ่มเล่นสีแดงในตารางฝึกจะเปิดผลค้นหา YouTube ของท่านั้น ให้เลือกคลิปจากช่องเหล่านี้</p>
        <ul className="divide-y divide-line">
          {channels.map(c => (
            <li key={c.name}>
              <a href={c.url} target="_blank" rel="noreferrer" className="flex items-center gap-3 py-3 text-ink!">
                <div className="grid size-10 shrink-0 place-items-center rounded-full bg-accent text-white"><Play size={16} fill="currentColor" /></div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 font-semibold">{c.name} <Badge tone={c.lang === 'TH' ? 'good' : 'run'}>{c.lang}</Badge></div>
                  <div className="text-xs text-muted">{c.why}</div>
                </div>
                <ExternalLink size={16} className="shrink-0 text-muted" />
              </a>
            </li>
          ))}
        </ul>
      </Card>

      <Card title="แหล่งอ้างอิง">
        <ul className="space-y-3 text-sm">
          {references.map(r => (
            <li key={r.url}>
              <a href={r.url} target="_blank" rel="noreferrer" className="font-semibold">{r.title}</a>
              <div className="text-xs text-muted">ใช้สำหรับ: {r.used}</div>
            </li>
          ))}
        </ul>
      </Card>

      <Card title="ข้อควรระวัง">
        <ul className="list-disc space-y-1.5 pl-5 text-sm">
          <li>แผนนี้สำหรับคนสุขภาพดีทั่วไป ถ้ามีโรคประจำตัว เจ็บหน้าอก หน้ามืด หรือบาดเจ็บ ให้ปรึกษาแพทย์ก่อน</li>
          <li>ปวดเมื่อยกล้ามเนื้อหลังฝึกเป็นเรื่องปกติ แต่ปวดแปลบที่ข้อต่อหรือปวดไม่หายใน 3–4 วัน ควรหยุดท่านั้นและตรวจ</li>
          <li>ถ้าเพิ่งเริ่มเล่นท่าบาร์เบล ให้คนในยิมหรือเทรนเนอร์ช่วยดูฟอร์ม 1–2 ครั้งแรก</li>
        </ul>
      </Card>
    </>
  )
}
