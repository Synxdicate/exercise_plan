import { channels, references } from '../data/sources'

export function Sources() {
  return (
    <>
      <section className="card">
        <h2>ช่อง YouTube ที่แนะนำ</h2>
        <p className="muted small">เลือกช่องที่อธิบายโดยอิงงานวิจัยหรือโดยโค้ชที่มีใบรับรอง ปุ่มเล่นสีแดงในตารางฝึกจะเปิดผลค้นหา YouTube ของท่านั้น ให้เลือกคลิปจากช่องเหล่านี้</p>
        <div className="channels">
          {channels.map(c => (
            <a key={c.name} className="channel" href={c.url} target="_blank" rel="noreferrer">
              <span className="badge">{c.lang}</span>
              <b>{c.name}</b>
              <span className="muted small">{c.why}</span>
            </a>
          ))}
        </div>
      </section>

      <section className="card">
        <h2>แหล่งอ้างอิง</h2>
        <ul className="list">
          {references.map(r => (
            <li key={r.url}>
              <a href={r.url} target="_blank" rel="noreferrer">{r.title}</a>
              <div className="muted small">ใช้สำหรับ: {r.used}</div>
            </li>
          ))}
        </ul>
      </section>

      <section className="card">
        <h2>ข้อควรระวัง</h2>
        <ul className="list">
          <li>แผนนี้สำหรับคนสุขภาพดีทั่วไป ถ้ามีโรคประจำตัว เจ็บหน้าอก หน้ามืด หรือบาดเจ็บ ให้ปรึกษาแพทย์ก่อน</li>
          <li>ปวดเมื่อยกล้ามเนื้อหลังฝึกเป็นเรื่องปกติ แต่ปวดแปลบที่ข้อต่อหรือปวดไม่หายใน 3–4 วัน ควรหยุดท่านั้นและตรวจ</li>
          <li>ถ้าเพิ่งเริ่มเล่นท่าบาร์เบล ให้คนในยิมหรือเทรนเนอร์ช่วยดูฟอร์ม 1–2 ครั้งแรก</li>
        </ul>
      </section>
    </>
  )
}
