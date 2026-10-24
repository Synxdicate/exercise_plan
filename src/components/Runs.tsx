import { useState } from 'react'
import { Check, Footprints, Pause, Play } from 'lucide-react'
import { useRunTracker, type Point } from '../lib/gps'
import { formatDuration, formatPace, runKinds, uid, useRuns, weeklyKmTarget, type Run } from '../lib/log'
import { addDays, shortDate, today, weekStart } from '../lib/date'
import { usePersisted } from '../lib/storage'

export function Runs() {
  const [runs, setRuns] = useRuns()
  const [week] = usePersisted('week', 1)
  const save = (r: Run) => setRuns(prev => [...prev, r].sort((a, b) => a.date.localeCompare(b.date)))

  const thisWeek = weekStart(today())
  const kmThisWeek = runs.filter(r => weekStart(r.date) === thisWeek).reduce((s, r) => s + r.km, 0)
  const target = weeklyKmTarget(week)
  const best = runs.filter(r => r.km >= 1).reduce<Run | null>((b, r) => (!b || r.seconds / r.km < b.seconds / b.km ? r : b), null)

  return (
    <>
      <LiveTracker onSave={save} />

      <section className="card">
        <h2>สัปดาห์นี้</h2>
        <div className="ring-row">
          <Ring value={kmThisWeek} max={target} />
          <div className="stats compact">
            <div className="stat"><span className="label">วิ่งแล้ว</span><span className="value">{kmThisWeek.toFixed(1)} กม.</span><span className="sub">เป้าสัปดาห์ {week}: {target} กม.</span></div>
            <div className="stat"><span className="label">ทั้งหมด</span><span className="value">{runs.reduce((s, r) => s + r.km, 0).toFixed(1)} กม.</span><span className="sub">{runs.length} ครั้ง</span></div>
            <div className="stat"><span className="label">เพซดีที่สุด</span><span className="value">{best ? formatPace(best.seconds, best.km) : '--:--'}</span><span className="sub">นาที/กม. (≥1 กม.)</span></div>
          </div>
        </div>
        <WeeklyBars runs={runs} target={target} />
      </section>

      <ManualEntry onSave={save} />

      {runs.length > 0 && (
        <section className="card">
          <h2>ประวัติการวิ่ง</h2>
          <ul className="history">
            {[...runs].reverse().map(r => (
              <li key={r.id}>
                {r.route && r.route.length > 1 ? <RouteSvg route={r.route} small /> : <span className="route-ph"><Footprints size={22} /></span>}
                <div className="grow">
                  <b>{r.km.toFixed(2)} กม.</b> <span className="badge">{runKinds[r.kind]}</span>
                  <div className="muted small">{r.date} · {formatDuration(r.seconds)} · {formatPace(r.seconds, r.km)} /กม. · {r.source === 'gps' ? 'GPS' : 'กรอกเอง'}</div>
                </div>
                <button className="ghost" onClick={() => confirm('ลบรายการนี้?') && setRuns(runs.filter(x => x.id !== r.id))}>ลบ</button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  )
}

function LiveTracker({ onSave }: { onSave: (r: Run) => void }) {
  const t = useRunTracker()
  const [kind, setKind] = useState<Run['kind']>('easy')
  const km = t.meters / 1000

  const finish = () => {
    if (km >= 0.05) onSave({ id: uid(), date: today(), km: +km.toFixed(2), seconds: Math.round(t.elapsed), kind, source: 'gps', route: t.route })
    t.reset()
  }

  return (
    <section className="card tracker">
      <h2>วัดระยะด้วย GPS</h2>
      <div className="live">
        <div><span className="big">{km.toFixed(2)}</span><span className="unit">กม.</span></div>
        <div><span className="big">{formatDuration(t.elapsed)}</span><span className="unit">เวลา</span></div>
        <div><span className="big">{formatPace(t.elapsed, km)}</span><span className="unit">นาที/กม.</span></div>
      </div>
      {t.route.length > 1 && <RouteSvg route={t.route} />}
      <div className="controls">
        {t.status === 'idle' && (
          <>
            <select value={kind} onChange={e => setKind(e.target.value as Run['kind'])}>
              {Object.entries(runKinds).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <button className="primary big-btn" onClick={t.start}><Play size={18} fill="currentColor" /> เริ่มวิ่ง</button>
          </>
        )}
        {t.status === 'running' && <button className="primary big-btn" onClick={t.pause}><Pause size={18} fill="currentColor" /> พัก</button>}
        {t.status === 'paused' && (
          <>
            <button className="primary big-btn" onClick={t.resume}><Play size={18} fill="currentColor" /> วิ่งต่อ</button>
            <button className="secondary big-btn" onClick={finish}><Check size={18} /> จบและบันทึก</button>
            <button className="ghost" onClick={() => confirm('ทิ้งการวิ่งนี้?') && t.reset()}>ทิ้ง</button>
          </>
        )}
      </div>
      {t.error && <p className="error">{t.error}</p>}
      {t.status === 'running' && t.accuracy !== null && (
        <p className="muted small">ความแม่นยำ GPS ±{Math.round(t.accuracy)} ม. {t.accuracy > 25 ? '— รอสัญญาณ (ออกที่โล่ง)' : ''}</p>
      )}
      <p className="muted small">เปิดหน้านี้ค้างไว้ระหว่างวิ่ง เพราะเบราว์เซอร์จะหยุดอ่าน GPS เมื่อปิดจอหรือสลับแอป (แอปพยายามกันจอดับให้แล้ว) ถ้าอยากได้ค่าแม่นที่สุด ใช้ Strava/นาฬิกาแล้วมากรอกเองด้านล่าง</p>
    </section>
  )
}

function ManualEntry({ onSave }: { onSave: (r: Run) => void }) {
  const [date, setDate] = useState(today())
  const [km, setKm] = useState('')
  const [min, setMin] = useState('')
  const [kind, setKind] = useState<Run['kind']>('easy')

  const add = () => {
    const k = parseFloat(km)
    const m = parseFloat(min)
    if (!k || !m) return
    onSave({ id: uid(), date, km: k, seconds: Math.round(m * 60), kind, source: 'manual' })
    setKm('')
    setMin('')
  }

  return (
    <section className="card">
      <h2>กรอกระยะเอง</h2>
      <div className="form">
        <label>วันที่<input type="date" value={date} onChange={e => setDate(e.target.value)} /></label>
        <label>ระยะ (กม.)<input type="number" inputMode="decimal" step="0.01" value={km} onChange={e => setKm(e.target.value)} /></label>
        <label>เวลา (นาที)<input type="number" inputMode="decimal" step="0.5" value={min} onChange={e => setMin(e.target.value)} /></label>
        <label>ประเภท
          <select value={kind} onChange={e => setKind(e.target.value as Run['kind'])}>
            {Object.entries(runKinds).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </label>
        <button className="primary" onClick={add}>บันทึก</button>
      </div>
    </section>
  )
}

function Ring({ value, max }: { value: number; max: number }) {
  const r = 42
  const c = 2 * Math.PI * r
  const pct = Math.min(1, value / max)
  return (
    <svg className="ring" viewBox="0 0 100 100" role="img" aria-label={`${Math.round(pct * 100)}% ของเป้า`}>
      <circle cx="50" cy="50" r={r} className="ring-track" />
      {pct > 0 && <circle cx="50" cy="50" r={r} className="ring-fill" strokeDasharray={`${c * pct} ${c}`} transform="rotate(-90 50 50)" />}
      <text x="50" y="55" textAnchor="middle" className="ring-text">{Math.round(pct * 100)}%</text>
    </svg>
  )
}

function WeeklyBars({ runs, target }: { runs: Run[]; target: number }) {
  const [hover, setHover] = useState<number | null>(null)
  const current = weekStart(today())
  const weeks = Array.from({ length: 8 }, (_, i) => addDays(current, (i - 7) * 7))
  const totals = weeks.map(w => runs.filter(r => weekStart(r.date) === w).reduce((s, r) => s + r.km, 0))
  const max = Math.max(target, ...totals) * 1.15
  const W = 320, H = 140, pad = 22, bw = (W - pad) / weeks.length
  const y = (v: number) => H - pad - (v / max) * (H - pad - 8)

  return (
    <div className="chart">
      <div className="chart-head">
        <span className="muted small">ระยะต่อสัปดาห์ (8 สัปดาห์ล่าสุด)</span>
        <span className="small">{hover !== null ? `สัปดาห์ ${shortDate(weeks[hover])}: ${totals[hover].toFixed(1)} กม.` : ''}</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="กราฟระยะวิ่งรายสัปดาห์">
        <line x1={pad} x2={W} y1={y(target)} y2={y(target)} className="target-line" />
        <text x={W - 2} y={y(target) - 4} textAnchor="end" className="axis-text">เป้า {target}</text>
        <line x1={pad} x2={W} y1={H - pad} y2={H - pad} className="axis" />
        {weeks.map((w, i) => {
          const x = pad + i * bw + 4
          const h = H - pad - y(totals[i])
          return (
            <g key={w} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} onClick={() => setHover(i)}>
              <rect x={pad + i * bw} y={0} width={bw} height={H - pad} fill="transparent" />
              {h > 0 && <path className={`bar${hover === i ? ' hover' : ''}`} d={roundedTop(x, y(totals[i]), bw - 8, h)} />}
              <text x={x + (bw - 8) / 2} y={H - 6} textAnchor="middle" className="axis-text">{shortDate(w)}</text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

const roundedTop = (x: number, y: number, w: number, h: number) => {
  const r = Math.min(4, h, w / 2)
  return `M${x} ${y + h} V${y + r} Q${x} ${y} ${x + r} ${y} H${x + w - r} Q${x + w} ${y} ${x + w} ${y + r} V${y + h} Z`
}

function RouteSvg({ route, small }: { route: Point[]; small?: boolean }) {
  const lats = route.map(p => p[0])
  const lons = route.map(p => p[1])
  const cos = Math.cos((lats[0] * Math.PI) / 180)
  const minX = Math.min(...lons) * cos, maxX = Math.max(...lons) * cos
  const minY = Math.min(...lats), maxY = Math.max(...lats)
  const span = Math.max(maxX - minX, maxY - minY) || 1e-5
  const S = 100
  const pts = route.map(([la, lo]) => `${(((lo * cos - minX) / span) * 0.9 + 0.05) * S},${((1 - (la - minY) / span) * 0.9 + 0.05) * S}`).join(' ')
  const [sx, sy] = pts.split(' ')[0].split(',')
  const [ex, ey] = pts.split(' ').at(-1)!.split(',')
  return (
    <svg className={`route${small ? ' small' : ''}`} viewBox={`0 0 ${S} ${S}`} preserveAspectRatio="xMidYMid meet">
      <polyline points={pts} className="route-line" />
      <circle cx={sx} cy={sy} r={small ? 4 : 3} className="route-start" />
      <circle cx={ex} cy={ey} r={small ? 4 : 3} className="route-end" />
    </svg>
  )
}
