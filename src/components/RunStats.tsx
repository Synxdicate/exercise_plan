import { lazy, Suspense, useMemo, useState } from 'react'
import { planGoal } from '../lib/racePlan'
import { Footprints, Gauge, Map as MapIcon, Plus, Trophy } from 'lucide-react'
import { formatDuration, formatPace, uid, type Run } from '../lib/log'
import { useT } from '../lib/i18n'
import { runsOnly } from '../lib/walk'
import { criticalSpeed, predictionTrend, type Estimate } from '../lib/pace'
import { DEFAULT_LIMIT_KM, defaultShoe, shoeKm, shoeStatus, useShoes, type Shoe } from '../lib/shoes'
import { personalBests } from '../lib/analysis'
import { intensitySplit } from '../lib/intensity'
import { ZoneLegend } from './Charts'
import { daysBetween, shortDate, today } from '../lib/date'
import { Badge, Button, Card, Collapse, Segmented, Stat } from './ui'
import { heatmapRoutes } from '../lib/matched'
import { useRaceGoals } from '../lib/useGoals'
import { parseDuration, raceKm, raceLabel, raceLabelEn, type RaceKey } from '../lib/goals'
import { NumberInput, TextInput } from './Form'
import { cx } from '../lib/cx'

// การ์ดสถิติในแท็บวิ่ง (แยกจาก Runs.tsx): ระยะรายสัปดาห์ เวลาคาดการณ์ เวลาเร็วสุด รองเท้า แผนที่รวม
const RouteHeatmap = lazy(() => import('./RouteHeatmap'))

export function PaceCard({ est, runs, onTrial }: { est: Estimate | null; runs: Run[]; onTrial: () => void }) {
  const tr = useT()
  const trend = useMemo(() => predictionTrend(runs, 12), [runs])
  const cs = useMemo(() => criticalSpeed(runs), [runs])
  const [pick, setPick] = useState<RaceKey>('tenK')
  const [goals, setGoal] = useRaceGoals()
  const [draft, setDraft] = useState('')
  if (!est)
    return (
      <Card title={<span className="flex items-center gap-2"><Gauge size={18} className="text-run" /> {tr('เพซแนะนำ', 'Suggested paces')}</span>}>
        <p className="text-sm text-muted">{tr('เวลาคาดการณ์ 5K–มาราธอนและโซนเพซต้องใช้การวิ่งต่อเนื่อง ≥3 กม. ที่เพซเร็วกว่า 10:00/กม. (วิ่งสลับเดินและวิ่งช้ากว่านี้ไม่นับ เพราะจะคำนวณผิด) ระหว่างนี้ดูเวลาจบงานแข่งโดยประมาณด้านบน', '5K–marathon predictions and pace zones need a continuous run of ≥3 km faster than 10:00/km (run-walk and slower runs would give wrong numbers) — meanwhile see the estimated race finish above')}</p>
      </Card>
    )
  // เทียบกับ 4 สัปดาห์ก่อน: ติดลบ = เร็วขึ้น
  const before = trend.at(-5)
  const goal = goals[pick]
  const saveGoal = () => { setGoal(pick, parseDuration(draft)); setDraft('') }
  return (
    <Card title={<span className="flex items-center gap-2"><Gauge size={18} className="text-run" /> {tr('เวลาคาดการณ์ & โซนเพซ', 'Predictions & pace zones')}</span>}>
      {/* ยังไม่มีผลวิ่งเต็มที่: ตัวเลขคิดจากวิ่งเบา (ช้ากว่าจริง) บอกก่อน และไม่แสดงโซน/ความเร็ววิกฤตที่จะผิด */}
      {est.from.easy && (
        <div className="mb-3 flex items-center gap-2 rounded-xl bg-warn/10 p-3 text-sm text-warn">
          <span className="flex-1">{tr('ยังไม่มีผลวิ่งเต็มที่ เวลาด้านล่างคิดจากวิ่งเบา เวลาจริงน่าจะเร็วกว่านี้ วิ่งทดสอบ 5K เมื่อวิ่งต่อเนื่องได้แล้ว', 'No all-out run yet — times below come from an easy run, so you’re probably faster. Do a 5K test once you can run continuously')}</span>
          <Button size="sm" variant="soft" onClick={onTrial}>{tr('ทดสอบ 5K', '5K test')}</Button>
        </div>
      )}
      {!est.from.easy && daysBetween(est.from.date, today()) > 42 && (
        <div className="mb-3 flex items-center gap-2 rounded-xl bg-run/10 p-3 text-sm text-run">
          <span className="flex-1">{tr('ผลที่ใช้คำนวณเก่าเกิน 6 สัปดาห์ วิ่งทดสอบ 5K เพื่ออัปเดตโซนและเวลาคาดการณ์', 'The source result is over 6 weeks old — run a 5K test to update zones and predictions')}</span>
          <Button size="sm" variant="run" onClick={onTrial}>{tr('ทดสอบ 5K', '5K test')}</Button>
        </div>
      )}
      <div className="grid grid-cols-2 gap-2">
        {(Object.keys(raceLabel) as RaceKey[]).map(k => {
          const prev = before?.[k]
          const diff = prev ? est[k] - prev : 0
          const g = goals[k]
          return (
            <button key={k} onClick={() => setPick(k)}
              className={cx('rounded-xl px-3 py-2 text-left ring-1 transition-colors', pick === k ? 'bg-run/10 ring-run/40' : 'bg-raised ring-transparent')}>
              <div className="text-xs text-muted">{tr(raceLabel[k], raceLabelEn[k])}{k === 'full' && !est.fullReliable && tr(' (ค่าคร่าว ๆ)', ' (rough)')}</div>
              <div className="text-lg font-bold tabular-nums">{formatDuration(est[k])}</div>
              {g ? (
                <div className={cx('text-[11px] font-semibold tabular-nums', est[k] <= g ? 'text-good' : 'text-warn')}>
                  {est[k] <= g ? tr(`ถึงเป้า ${formatDuration(g)} แล้ว`, `Goal ${formatDuration(g)} reached`) : tr(`ขาดอีก ${formatDuration(est[k] - g)} ถึงเป้า`, `${formatDuration(est[k] - g)} off the goal`)}
                </div>
              ) : Math.abs(diff) >= 1 && (
                <div className={cx('text-[11px] font-semibold tabular-nums', diff < 0 ? 'text-good' : 'text-warn')}>
                  {tr(`${diff < 0 ? 'เร็วขึ้น' : 'ช้าลง'} ${formatDuration(Math.abs(diff))} ใน 4 สัปดาห์`, `${formatDuration(Math.abs(diff))} ${diff < 0 ? 'faster' : 'slower'} in 4 weeks`)}
                </div>
              )}
            </button>
          )
        })}
      </div>
      <TrendLine points={trend.map(t => ({ date: t.date, v: t[pick] }))} goal={goal} />
      <div className="mt-3 rounded-xl bg-raised p-3">
        <div className="text-xs font-semibold text-muted">{tr('เป้าหมาย', 'Goal')} {tr(raceLabel[pick], raceLabelEn[pick])}</div>
        {goal ? (
          <div className="mt-1 flex items-center justify-between gap-2 text-sm">
            <span><b className="tabular-nums">{formatDuration(goal)}</b> · {tr('ต้องวิ่งเพซ', 'needs')} <b className="tabular-nums">{formatPace(goal, raceKm[pick])}</b> {tr('/กม.', '/km')}</span>
            <button onClick={() => setGoal(pick, null)} className="text-xs font-semibold text-muted">{tr('ลบเป้า', 'Remove goal')}</button>
          </div>
        ) : null}
        {/* เป้าเร็วกว่าคาดการณ์เกิน 10%: แผนวันแข่ง/โค้ชใช้เป้าที่ปรับแล้วอยู่แล้ว บอกตรงนี้ด้วย และให้เปลี่ยนเป็นเป้านั้นในแตะเดียว */}
        {goal && (() => {
          const pg = planGoal(goal, est[pick])
          return pg?.capped ? (
            <div className="mt-2 flex items-center gap-2 rounded-lg bg-warn/10 p-2.5 text-xs text-warn">
              <span className="flex-1">{tr(`เป้านี้เร็วกว่าเวลาคาดการณ์เกิน 10% แผนวันแข่งจึงใช้ ${formatDuration(pg.sec)} แทน ตั้งเป้าก้าวละขั้นช่วยให้ไม่ออกตัวเร็วเกิน`, `This goal is over 10% faster than your prediction, so race plans use ${formatDuration(pg.sec)} instead. Stepwise goals help avoid going out too fast.`)}</span>
              <Button size="sm" variant="soft" onClick={() => setGoal(pick, pg.sec)}>{tr(`ใช้ ${formatDuration(pg.sec)}`, `Use ${formatDuration(pg.sec)}`)}</Button>
            </div>
          ) : null
        })()}
        {goal ? null : (
          <div className="mt-1.5 flex items-end gap-2">
            <TextInput className="flex-1" value={draft} onChange={setDraft} placeholder={pick === 'half' || pick === 'full' ? tr('เช่น 1:59:59', 'e.g. 1:59:59') : tr('เช่น 55:00', 'e.g. 55:00')} />
            <Button disabled={!parseDuration(draft)} onClick={saveGoal}>{tr('ตั้งเป้า', 'Set goal')}</Button>
          </div>
        )}
      </div>
      {cs && !est.from.easy && (
        <div className="mt-3 rounded-xl bg-raised p-3 text-sm">
          <div className="flex items-baseline justify-between gap-2">
            <span className="font-semibold">{tr('ความเร็ววิกฤต (Critical Speed)', 'Critical Speed')}</span>
            <b className="tabular-nums">{formatPace(cs.pace, 1)} {tr('/กม.', '/km')}</b>
          </div>
          <p className="mt-1 text-xs text-muted">
            {tr(`เพดานที่ร่างกายยังวิ่งแบบ "คงที่" ได้ (≈ ขอบบนของโซนแอโรบิก) คำนวณจากช่วงที่เร็วที่สุด ${cs.points} ระยะใน 90 วัน · มาราธอน: ครึ่งแรกอย่าเร็วกว่า ~${formatPace(cs.marathonFirstHalfPace, 1)} /กม. (94% ของ CS)`,
              `The fastest pace you can hold in a "steady state" (≈ top of the aerobic zone), from your best efforts at ${cs.points} distances in 90 days · marathon: first half no faster than ~${formatPace(cs.marathonFirstHalfPace, 1)} /km (94% of CS)`)}
          </p>
        </div>
      )}
      {!est.from.easy && (
        <>
          <div className="mt-3 text-xs font-semibold text-muted">{tr('โซนเพซของคุณ (นาที/กม.)', 'Your pace zones (min/km)')}</div>
          <div className="mt-1.5"><ZoneLegend fiveK={est.paces.interval} /></div>
        </>
      )}
      <p className="mt-2 text-xs text-muted">
        {tr(`จาก${est.from.segment ? `ช่วง ${est.from.km} กม. ที่เร็วที่สุดในการวิ่ง` : `การวิ่ง ${est.from.km} กม.`} วันที่ ${shortDate(est.from.date)}`, `From ${est.from.segment ? `your fastest ${est.from.km} km inside a run` : `a ${est.from.km} km run`} on ${shortDate(est.from.date)}`)}
        {est.stale && tr(' (เกิน 2 เดือนแล้ว วิ่งเต็มที่สักครั้งเพื่ออัปเดต)', ' (over 2 months old — do one hard run to update)')}
        {est.from.easy && tr(' (เป็นวิ่งเบา เวลาจริงน่าจะเร็วกว่านี้ วิ่งทดสอบ 5K เพื่อให้แม่นขึ้น)', ' (an easy run — you’re probably faster; a 5K test makes it accurate)')} · {tr(`ฟูลคิดจากระยะซ้อม ~${Math.round(est.weeklyKm)} กม./สัปดาห์ด้วย`, `marathon also uses your ~${Math.round(est.weeklyKm)} km/week`)}
      </p>
    </Card>
  )
}

/** เส้นแนวโน้มเวลาคาดการณ์ 12 สัปดาห์ (ต่ำลง = เร็วขึ้น จึงกลับแกนให้ดีขึ้นอยู่ด้านบน) */
function TrendLine({ points, goal }: { points: { date: string; v: number | null }[]; goal?: number }) {
  const tr = useT()
  const pts = points.filter((p): p is { date: string; v: number } => p.v !== null)
  if (pts.length < 2) return null
  const W = 320, H = 70, pad = 6
  const vs = pts.map(p => p.v)
  const lo = Math.min(...vs, goal ?? Infinity), hi = Math.max(...vs, goal ?? -Infinity)
  const x = (i: number) => pad + (i / (points.length - 1)) * (W - pad * 2)
  const y = (v: number) => (hi === lo ? H / 2 : pad + ((v - lo) / (hi - lo)) * (H - pad * 2))
  const idx = (d: string) => points.findIndex(p => p.date === d)
  const path = pts.map((p, i) => `${i ? 'L' : 'M'}${x(idx(p.date)).toFixed(1)} ${y(p.v).toFixed(1)}`).join(' ')
  const last = pts.at(-1)!
  return (
    <div className="mt-3">
      <div className="mb-1 flex justify-between text-[11px] text-muted"><span>{tr('12 สัปดาห์ก่อน', '12 weeks ago')}</span><span>{tr('วันนี้', 'Today')}</span></div>
      <svg viewBox={`0 0 ${W} ${H}`} className="block w-full" role="img" aria-label={tr('แนวโน้มเวลาคาดการณ์', 'Prediction trend')}>
        {goal ? (
          <g>
            <line x1={0} x2={W} y1={y(goal)} y2={y(goal)} className="stroke-good" strokeDasharray="5 4" strokeWidth={1.5} />
            <text x={W - 2} y={y(goal) - 4} textAnchor="end" className="fill-good text-[9px] font-semibold">{tr('เป้า', 'Goal')}</text>
          </g>
        ) : <line x1={0} x2={W} y1={H / 2} y2={H / 2} className="stroke-line" strokeDasharray="3 4" />}
        <path d={path} fill="none" className="stroke-run" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
        <circle cx={x(idx(last.date))} cy={y(last.v)} r={4.5} className="fill-run stroke-card" strokeWidth={2} />
      </svg>
    </div>
  )
}

export function BestEfforts({ runs }: { runs: Run[] }) {
  const tr = useT()
  const [openPb, setOpenPb] = useState<string | null>(null)
  // ดีสุดตลอดกาล หรือดีสุดของปีนี้ (แบบ annual best efforts ของ Strava) ปีใหม่จะได้มีเป้าให้ไล่อีกครั้ง
  const [scope, setScope] = useState<'all' | 'year'>('all')
  const year = today().slice(0, 4)
  const pbs = useMemo(() => personalBests(scope === 'all' ? runs : runs.filter(r => r.date.startsWith(year))).filter(p => p.best), [runs, scope, year])
  if (!runs.length) return null
  const longest = runsOnly(runs).reduce((m, r) => Math.max(m, r.km), 0)
  return (
    <Card title={<span className="flex items-center gap-2"><Trophy size={18} className="text-warn" /> {tr('สถิติของฉัน', 'My stats')}</span>}>
      <div className="grid grid-cols-3 gap-2 text-center">
        <Stat label={tr('ระยะรวม', 'Total')} value={runsOnly(runs).reduce((s, r) => s + r.km, 0).toFixed(1)} sub={tr('กม.', 'km')} />
        <Stat label={tr('จำนวนครั้ง', 'Runs')} value={runsOnly(runs).length} sub={tr('ครั้ง', 'times')} />
        <Stat label={tr('ไกลสุด', 'Longest')} value={longest.toFixed(1)} sub={tr('กม.', 'km')} />
      </div>
      <div className="mt-3 flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-muted">{tr('เวลาเร็วสุดแต่ละระยะ', 'Best efforts')}</span>
        <div className="w-40"><Segmented value={scope} onChange={setScope} options={[{ value: 'all', label: tr('ตลอดกาล', 'All time') }, { value: 'year', label: tr(`ปี ${+year + 543}`, year) }]} /></div>
      </div>
      {!pbs.length && <p className="mt-2 text-xs text-muted">{tr('ปีนี้ยังไม่มีสถิติ', 'No efforts yet this year')}</p>}
      <ul className="divide-y divide-line text-sm">
        {pbs.map(p => (
          <li key={p.label} className="py-2">
            <button onClick={() => setOpenPb(openPb === p.label ? null : p.label)} aria-expanded={openPb === p.label} className="flex w-full items-center justify-between gap-2 text-left">
              <span className="w-12 font-bold">{p.label}</span>
              <span className="flex-1 text-xs text-muted">{shortDate(p.best!.date)}{p.top.length > 1 && <span className="ml-1 text-run">{tr(`· ดู ${p.top.length} อันดับ`, `· top ${p.top.length}`)}</span>}</span>
              <span className="tabular-nums text-muted">{formatPace(p.best!.seconds, p.km)} {tr('/กม.', '/km')}</span>
              <span className="w-16 text-right font-bold tabular-nums">{formatDuration(p.best!.seconds)}</span>
            </button>
            {openPb === p.label && (
              <ol className="mt-1.5 space-y-1 rounded-xl bg-raised p-2 text-xs">
                {p.top.map((x, i) => (
                  <li key={x.id} className="flex items-center gap-2">
                    <span className={cx('grid size-5 place-items-center rounded-full text-[10px] font-bold', i === 0 ? 'bg-warn text-white' : 'bg-body')}>{i + 1}</span>
                    <span className="flex-1 text-muted">{shortDate(x.date)}</span>
                    <span className="font-semibold tabular-nums">{formatDuration(x.seconds)}</span>
                  </li>
                ))}
              </ol>
            )}
          </li>
        ))}
      </ul>
      <p className="mt-1 text-[11px] text-muted">{tr('ช่วงที่เร็วที่สุดจากทุกการวิ่ง ไม่ต้องวิ่งระยะนั้นพอดี', 'Fastest segments from any run — no need to run that exact distance')}</p>
    </Card>
  )
}

export function ShoesCard({ runs }: { runs: Run[] }) {
  const tr = useT()
  const [shoes, setShoes] = useShoes()
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const [start, setStart] = useState('0')
  const [limit, setLimit] = useState(String(DEFAULT_LIMIT_KM))
  const active = shoes.filter(s => !s.retired)
  const def = defaultShoe(shoes)
  const update = (id: string, patch: Partial<Shoe>) => setShoes(prev => prev.map(s => (s.id === id ? { ...s, ...patch } : s)))
  const add = () => {
    if (!name.trim()) return
    const s: Shoe = { id: uid(), name: name.trim(), startKm: +start || 0, limitKm: +limit || DEFAULT_LIMIT_KM, isDefault: !def }
    setShoes(prev => [...prev, s])
    setName(''); setStart('0'); setAdding(false)
  }
  const tone = { good: 'bg-good-fill', warn: 'bg-warn', bad: 'bg-bad-fill' }
  return (
    <Card title={<span className="flex items-center gap-2"><Footprints size={18} className="text-run" /> {tr('รองเท้าวิ่ง', 'Running shoes')}</span>}
      action={<Button variant="soft" size="sm" onClick={() => setAdding(!adding)}><Plus size={14} /> {tr('เพิ่ม', 'Add')}</Button>}>
      <Collapse open={adding}>
        <div className="mb-3 grid grid-cols-2 gap-2 rounded-2xl bg-raised p-3">
          <TextInput label={tr('ชื่อรองเท้า', 'Shoe name')} className="col-span-2" value={name} onChange={setName} placeholder={tr('เช่น Nike Pegasus 41', 'e.g. Nike Pegasus 41')} />
          <NumberInput label={tr('วิ่งมาแล้ว', 'Already run')} unit={tr('กม.', 'km')} value={start} onChange={setStart} />
          <NumberInput label={tr('ควรเปลี่ยนที่', 'Replace at')} unit={tr('กม.', 'km')} step={50} value={limit} onChange={setLimit} />
          <Button className="col-span-2" onClick={add}>{tr('บันทึกรองเท้า', 'Save shoes')}</Button>
        </div>
      </Collapse>
      {active.length === 0 && !adding && <p className="text-sm text-muted">{tr('เพิ่มรองเท้า แอปจะนับระยะและเตือนเมื่อควรเปลี่ยน', 'Add shoes and the app tracks distance and tells you when to replace them')}</p>}
      <ul className="space-y-3">
        {active.map(s => {
          const km = shoeKm(s, runs)
          const st = shoeStatus(km, s.limitKm)
          return (
            <li key={s.id}>
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className="min-w-0 truncate font-semibold">{s.name}{s.id === def?.id && <Badge tone="run">{tr('คู่หลัก', 'Main')}</Badge>}</span>
                <span className="shrink-0 tabular-nums text-muted">{Math.round(km)} / {s.limitKm} {tr('กม.', 'km')}</span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-body">
                <div className={cx('h-full rounded-full', tone[st])} style={{ width: `${Math.min(100, (km / s.limitKm) * 100)}%` }} />
              </div>
              {st !== 'good' && <p className={cx('mt-1 text-xs', st === 'bad' ? 'text-bad' : 'text-warn')}>{st === 'bad' ? tr('ถึงระยะที่ควรเปลี่ยนแล้ว ดูพื้นรองเท้าและความรู้สึกตอนวิ่งประกอบ', 'Replacement distance reached — check the soles and how they feel') : tr('ใกล้ถึงระยะเปลี่ยน เริ่มมองหาคู่ใหม่', 'Nearly due — start looking for a new pair')}</p>}
              <div className="mt-1 flex gap-3 text-xs">
                {s.id !== def?.id && <button className="font-semibold text-run" onClick={() => setShoes(prev => prev.map(x => ({ ...x, isDefault: x.id === s.id })))}>{tr('ตั้งเป็นคู่หลัก', 'Make main')}</button>}
                <button className="text-muted" onClick={() => update(s.id, { retired: true, isDefault: false })}>{tr('เลิกใช้', 'Retire')}</button>
              </div>
            </li>
          )
        })}
      </ul>
    </Card>
  )
}

/** แผนที่รวมทุกการวิ่ง ทางที่วิ่งบ่อยเข้มขึ้น */
export function HeatmapCard({ runs }: { runs: Run[] }) {
  const tr = useT()
  const { routes, hidden } = useMemo(() => heatmapRoutes(runs), [runs])
  if (routes.length < 2) return null
  return (
    <Card title={<span className="flex items-center gap-2"><MapIcon size={18} className="text-run" /> {tr('แผนที่การวิ่งทั้งหมด', 'All-runs map')}</span>}>
      <Suspense fallback={<div className="h-72 w-full animate-pulse rounded-2xl bg-raised" />}>
        <RouteHeatmap routes={routes} />
      </Suspense>
      <p className="mt-2 text-xs text-muted">{tr(`${routes.length} เส้นทาง ทางที่วิ่งบ่อยเส้นจะเข้มขึ้น`, `${routes.length} routes — frequent paths are darker`)}{hidden ? tr(` (ไม่รวม ${hidden} ครั้งที่วิ่งที่อื่น)`, ` (excluding ${hidden} runs elsewhere)`) : ''}</p>
    </Card>
  )
}

/** วิ่งเบา : วิ่งหนัก 4 สัปดาห์ล่าสุด เทียบหลัก ~80/20 (Seiler 2010) */
export function IntensityCard({ runs, fiveK }: { runs: Run[]; fiveK?: number }) {
  const tr = useT()
  const s = useMemo(() => intensitySplit(runs, today(), fiveK ?? null), [runs, fiveK])
  if (!s) return null
  const verdict = s.easyPct >= 75 ? { tone: 'text-good', th: 'ดี ใกล้เคียง 80/20 วิ่งเบาเป็นส่วนใหญ่', en: 'Good: close to 80/20, mostly easy' }
    : s.easyPct >= 60 ? { tone: 'text-warn', th: 'วิ่งหนักค่อนข้างเยอะ ลองวิ่งวันเบาให้ช้าลงอีก (พูดเป็นประโยคได้)', en: 'Quite a lot of hard running; slow your easy days down (conversational)' }
    : { tone: 'text-bad', th: 'วิ่งหนักเกินครึ่ง เสี่ยงล้าสะสม วันเบาให้เบาจริง', en: 'Over half hard: fatigue risk; keep easy days truly easy' }
  return (
    <Card title={<span className="flex items-center gap-2"><Gauge size={18} className="text-run" /> {tr('วิ่งเบา : วิ่งหนัก', 'Easy : hard')}</span>}
      action={<span className="text-xs text-muted">{tr(`4 สัปดาห์ · ${s.runs} ครั้ง`, `4 weeks · ${s.runs} runs`)}</span>}>
      <div className="flex items-baseline justify-between text-sm">
        <span><b className="text-2xl tabular-nums">{s.easyPct}</b> : <b className="tabular-nums">{100 - s.easyPct}</b></span>
        <span className="text-xs text-muted">{tr('เป้าประมาณ 80 : 20', 'Aim for about 80 : 20')}</span>
      </div>
      <div className="relative mt-2 flex h-3 overflow-hidden rounded-full bg-raised" role="img" aria-label={tr(`วิ่งเบา ${s.easyPct}% วิ่งหนัก ${100 - s.easyPct}%`, `Easy ${s.easyPct}%, hard ${100 - s.easyPct}%`)}>
        <div className="h-full bg-good-fill" style={{ width: `${s.easyPct}%` }} />
        <div className="h-full flex-1 bg-accent-fill" />
        <div className="absolute inset-y-0 w-0.5 bg-ink" style={{ left: '80%' }} />
      </div>
      <div className="mt-1 flex justify-between text-[11px] text-muted">
        <span>{tr('เบา', 'Easy')} {formatDuration(s.easySec)}</span><span>{tr('หนัก', 'Hard')} {formatDuration(s.hardSec)}</span>
      </div>
      <p className={cx('mt-2 text-sm font-semibold', verdict.tone)}>{tr(verdict.th, verdict.en)}</p>
      <p className="mt-1 text-[11px] text-muted">{s.by === 'pace'
        ? tr('นับเวลาจริงในแต่ละโซนเพซจากเส้นทาง GPS (เบา = โซน E)', 'Real time in each pace zone from the GPS track (easy = zone E)')
        : tr('ตอนนี้นับตามชนิดการวิ่ง (tempo/interval/แข่ง = หนัก) เพราะยังไม่มีเพซ 5K ที่แม่น วิ่งทดสอบ 5K แล้วจะนับตามโซนเพซจริง', 'Counted by run type for now (tempo/interval/race = hard) — no reliable 5K pace yet; after a 5K test it uses real pace zones')}</p>
    </Card>
  )
}
