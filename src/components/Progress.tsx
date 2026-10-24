import { useState } from 'react'
import { usePersisted } from '../lib/storage'
import { today, weekStart } from '../lib/date'
import { useSessions } from '../lib/log'

type Entry = { date: string; weight: number; waist?: number }

export function Progress() {
  const [log, setLog] = usePersisted<Entry[]>('log', [])
  const [date, setDate] = useState(today())
  const [weight, setWeight] = useState('')
  const [waist, setWaist] = useState('')

  const add = () => {
    const w = parseFloat(weight)
    if (!w) return
    const entry: Entry = { date, weight: w, waist: parseFloat(waist) || undefined }
    setLog(prev => [...prev.filter(e => e.date !== date), entry].sort((a, b) => a.date.localeCompare(b.date)))
    setWeight('')
    setWaist('')
  }

  const weeks = weeklyAverages(log)

  return (
    <>
      <WorkoutHistory />

      <section className="card">
        <h2>บันทึกน้ำหนัก</h2>
        <p className="muted small">ชั่งตอนเช้าหลังเข้าห้องน้ำ วัดรอบเอวระดับสะดือ (ดีกว่าดูน้ำหนักอย่างเดียว เพราะ recomp อาจทำให้น้ำหนักนิ่งแต่เอวลด) ข้อมูลเก็บในเบราว์เซอร์นี้เท่านั้น</p>
        <div className="form">
          <label>วันที่<input type="date" value={date} onChange={e => setDate(e.target.value)} /></label>
          <label>น้ำหนัก (กก.)<input type="number" inputMode="decimal" step="0.1" value={weight} onChange={e => setWeight(e.target.value)} /></label>
          <label>รอบเอว (ซม.)<input type="number" inputMode="decimal" step="0.5" value={waist} onChange={e => setWaist(e.target.value)} /></label>
          <button className="primary" onClick={add}>บันทึก</button>
        </div>
      </section>

      {weeks.length > 0 && (
        <section className="card">
          <h2>ค่าเฉลี่ยรายสัปดาห์</h2>
          <div className="table-wrap">
            <table>
              <thead><tr><th>สัปดาห์เริ่ม</th><th>น้ำหนักเฉลี่ย</th><th>เปลี่ยนแปลง</th><th>รอบเอว</th></tr></thead>
              <tbody>
                {weeks.map((w, i) => {
                  const diff = i > 0 ? w.avg - weeks[i - 1].avg : 0
                  return (
                    <tr key={w.start}>
                      <td>{w.start}</td>
                      <td>{w.avg.toFixed(1)} กก.</td>
                      <td className={diff < 0 ? 'down' : diff > 0 ? 'up' : ''}>{i > 0 ? `${diff > 0 ? '+' : ''}${diff.toFixed(2)}` : '-'}</td>
                      <td>{w.waist ? `${w.waist.toFixed(1)} ซม.` : '-'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <p className="muted small">เป้า recomp: น้ำหนักลด ~0.1–0.3 กก./สัปดาห์ หรือคงที่แต่รอบเอวลดและแรงเพิ่ม</p>
        </section>
      )}

      {log.length > 0 && (
        <section className="card">
          <h2>น้ำหนักทั้งหมด</h2>
          <ul className="log">
            {[...log].reverse().map(e => (
              <li key={e.date}>
                <span>{e.date}</span>
                <span>{e.weight} กก.{e.waist ? ` · เอว ${e.waist} ซม.` : ''}</span>
                <button className="ghost" onClick={() => setLog(prev => prev.filter(x => x.date !== e.date))}>ลบ</button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  )
}

function WorkoutHistory() {
  const [sessions, setSessions] = useSessions()
  const [open, setOpen] = useState<string | null>(null)

  return (
    <section className="card">
      <h2>ประวัติการฝึกเวท</h2>
      {sessions.length === 0 ? (
        <p className="muted">ยังไม่มีบันทึก — ไปที่แท็บ "ตารางฝึก" แล้วกด "บันทึกการฝึกวันนี้" ในวันเวท</p>
      ) : (
        <ul className="history">
          {[...sessions].reverse().map(s => {
            const totalSets = s.entries.reduce((n, e) => n + e.sets.length, 0)
            const volume = s.entries.reduce((n, e) => n + e.sets.reduce((v, x) => v + x.kg * x.reps, 0), 0)
            return (
              <li key={s.id} className="session">
                <div className="grow" onClick={() => setOpen(open === s.id ? null : s.id)}>
                  <b>{s.title}</b> <span className="badge">{s.mode === 'gym' ? 'ยิม' : 'สวน'}</span>
                  <div className="muted small">{s.date} · {totalSets} เซ็ต{volume ? ` · ปริมาณรวม ${Math.round(volume).toLocaleString()} กก.` : ''}</div>
                  {open === s.id && (
                    <ul className="session-detail">
                      {s.entries.map(e => (
                        <li key={e.name}><span>{e.name}</span><span className="muted">{e.sets.map(x => (x.kg ? `${x.kg}×${x.reps}` : `${x.reps}`)).join(' · ')}</span></li>
                      ))}
                    </ul>
                  )}
                </div>
                <button className="ghost" onClick={() => confirm('ลบบันทึกนี้?') && setSessions(prev => prev.filter(x => x.id !== s.id))}>ลบ</button>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

function weeklyAverages(log: Entry[]) {
  const groups = new Map<string, Entry[]>()
  for (const e of log) groups.set(weekStart(e.date), [...(groups.get(weekStart(e.date)) ?? []), e])
  return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([start, es]) => {
    const waists = es.filter(e => e.waist).map(e => e.waist!)
    return {
      start,
      avg: es.reduce((s, e) => s + e.weight, 0) / es.length,
      waist: waists.length ? waists.reduce((s, w) => s + w, 0) / waists.length : undefined,
    }
  })
}
