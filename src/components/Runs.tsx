import { lazy, Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { CalendarCheck, Check, CircleCheck, FileUp, Footprints, Gauge, Ghost, History, Map as MapIcon, Pause, Pencil, Play, Plus, Satellite, Share2, Trash2, TriangleAlert, Trophy, Volume2, VolumeX, X } from 'lucide-react'
import { GOOD_ACCURACY_M, useRunTracker, type Point } from '../lib/gps'
import { formatDuration, formatPace, runKinds, uid, useRuns, type Run } from '../lib/log'
import { criticalSpeed, estimate, paceHint, predictionTrend, type Estimate } from '../lib/pace'
import { useProgram } from '../lib/program'
import { parseGpx } from '../lib/gpx'
import { DEFAULT_LIMIT_KM, defaultShoe, shoeKm, shoeStatus, useShoes, type Shoe } from '../lib/shoes'
import { paceSeries, personalBests, splitAnalysis } from '../lib/analysis'
import { PaceChart, ZoneBar, ZoneLegend } from './Charts'
import { zoneInfo, zoneOf } from '../lib/zones'
import { RpePicker } from './RpePicker'
import { isNative } from '../lib/native'
import { speak, splitAnnouncement } from '../lib/voice'
import { useGuide } from '../lib/useGuide'
import { guides, paceSec } from '../lib/guide'
import { cueText, easyBand, PaceCoach, workBand } from '../lib/coach'
import { useBackClose } from '../lib/back'
import { App } from '@capacitor/app'
import { GuideCard } from './Guide'
import { usePersisted } from '../lib/storage'
import { RunTypeCard } from './RunTypes'
import { CooldownSheet } from './Cooldown'
import { ShareRunSheet } from './ShareRun'
import { PhotoStrip } from './Photos'
import { useRemovePhotosFor } from '../lib/photos'
import { HeatCard } from './Heat'
import { ReadinessSheet } from './Readiness'
import { addDays, daysBetween, niceDate, shortDate, today, weekStart } from '../lib/date'
import { Badge, Button, Card, Collapse, Portal, Segmented, Stat } from './ui'
import { RunHistory } from './RunHistory'
import { JourneyCard } from './Journey'
import { MatchedRuns } from './Matched'
import { CrossTrainingCard } from './CrossTraining'
import { heatmapRoutes } from '../lib/matched'
import { useRaceGoals } from '../lib/useGoals'
import { useCountUp } from '../lib/useCountUp'
import { ghostLead, ghostMeters, ghostText, raceGhost, trialGhost, type Ghost as GhostTarget } from '../lib/ghost'
import { raceKeyOf } from '../lib/racePlan'
import { parseDuration, raceKm, raceLabel, type RaceKey } from '../lib/goals'
import { DateInput, NumberInput, SelectInput, TextInput } from './Form'
import { cx } from '../lib/cx'
import { ask, notify } from '../lib/dialog'

// วิ่งทดสอบ 5K (เลือกชนิด "แข่ง" ในวันที่ไม่ใช่วันแข่ง)
const TRIAL = guides.timeTrial()
// เรียกจาก callback ของ GPS เท่านั้น (ไม่ใช่ตอน render)
const clockNow = () => Date.now()

const RunMap = lazy(() => import('./RunMap'))
const RouteHeatmap = lazy(() => import('./RouteHeatmap'))

function Map(props: { route: Point[]; position?: Point | null; follow?: boolean; className?: string; interactive?: boolean }) {
  return (
    <Suspense fallback={<div className={cx('w-full animate-pulse rounded-2xl bg-raised', props.className ?? 'h-64')} />}>
      <RunMap {...props} />
    </Suspense>
  )
}

export function Runs() {
  const [runs, setRuns] = useRuns()
  const p = useProgram()
  const [todayIdx] = useState(() => (new Date().getDay() + 6) % 7) // 0 = จันทร์
  const todayRun = p.plan().filter((d, i) => i === todayIdx && d.type === 'run')[0]
  const kmToday = runs.filter(r => r.date === today()).reduce((s, r) => s + r.km, 0)
  const [kind, setKind] = useState<Run['kind']>(todayRun?.runKind ?? 'easy')
  const est = useMemo(() => estimate(runs), [runs])
  const [detail, setDetail] = useState<string | null>(null)
  const [manual, setManual] = useState(false)
  const [checking, setChecking] = useState(false)
  const [cooldown, setCooldown] = useState<Run | null>(null)
  const [voice, setVoice] = usePersisted('voiceCues', true)
  // แท็บย่อยของหน้าวิ่ง (ค่าของเครื่อง) — แยกเริ่มวิ่ง/ประวัติ/สถิติ ไม่ให้หน้าเดียวยาวเกินไป
  const [view, setView] = usePersisted<'start' | 'history' | 'stats'>('runsView', 'start')
  const [guideOn, setGuideOn] = usePersisted('guideOn', true)
  // เสียงนำใช้กับชุดซ้อมของวันนี้ เมื่อเลือกชนิดการวิ่งตรงกับแผน
  // วันแข่งตามแผนไม่มีชุดซ้อม — เลือก "แข่ง" ในวันอื่นคือวิ่งทดสอบ 5K
  const steps = todayRun?.guide && kind === todayRun.runKind ? todayRun.guide : kind === 'race' && todayRun?.runKind !== 'race' ? TRIAL : null
  const guide = useGuide(guideOn ? steps : null, est?.paces, voice)
  // นักวิ่งเงา: เฉพาะวิ่งทดสอบ 5K (ช่วง 5 กม.) และวันแข่งตามแผน
  const [ghostOn, setGhostOn] = usePersisted('ghostOn', true)
  const [raceGoals] = useRaceGoals()
  const raceKey = kind === 'race' && todayRun?.runKind === 'race' ? raceKeyOf(todayRun.targetKm) : null
  const best5k = useMemo(() => personalBests(runs).find(e => e.km === 5)?.best?.seconds, [runs])
  const ghost: GhostTarget | null = raceKey ? raceGhost(raceKey, raceGoals[raceKey], est?.[raceKey])
    : steps === TRIAL && guideOn ? trialGhost(best5k, est?.fiveK) : null
  const [ghostNow, setGhostNow] = useState<{ lead: number; m: number; ghostM: number } | null>(null)
  const ghostKm = useRef(0)
  const tRef = useRef<{ elapsed: number } | null>(null)
  const ghostTick = (meters: number) => {
    if (!ghost || !ghostOn) return
    const r = guide.runner
    let m: number, sec: number
    if (r) {
      if (!r.state.started || r.state.done || r.steps[r.state.index]?.kind !== 'work') return
      m = meters - r.state.stepM
      sec = (r.state.clock - r.state.stepT) / 1000
    } else {
      m = meters
      sec = tRef.current?.elapsed ?? 0
    }
    if (m > ghost.km * 1000) return
    const lead = ghostLead(ghost, m, sec)
    setGhostNow({ lead, m, ghostM: ghostMeters(ghost, sec) })
    // บอกทุก กม. ที่ +250 ม. ไม่ให้ชนกับเสียงบอกระยะทุก กม.
    const k = Math.floor((m - 250) / 1000) + 1
    if (k > ghostKm.current) {
      ghostKm.current = k
      if (voice) void speak(ghostText(lead))
    }
  }
  const resetGhost = () => { setGhostNow(null); ghostKm.current = 0 }
  // โค้ชเสียงคุมเพซ — เรียกจาก onTick (callback ของ GPS) จึงเตือนได้แม้ปิดจอ
  const [coachOn, setCoachOn] = usePersisted('paceCoach', true)
  const coach = useRef(new PaceCoach())
  const coachStep = useRef<{ index: number; at: number }>({ index: -1, at: 0 })
  const onTick = (meters: number, active: boolean, pace: number | null) => {
    guide.onTick(meters, active)
    ghostTick(meters)
    if (!voice || !coachOn || !est) return
    const r = guide.runner
    const step = r && r.state.started && !r.state.done ? r.steps[r.state.index] : null
    const now = clockNow()
    if (step && coachStep.current.index !== r!.state.index) {
      // เปลี่ยนช่วง: เพซ 30 วิล่าสุดยังเป็นของช่วงก่อน — รอให้นิ่งก่อนค่อยประเมิน
      coachStep.current = { index: r!.state.index, at: now }
      coach.current.reset()
    }
    const target = step?.kind === 'work' ? paceSec(step, est.paces) : null
    const settling = step && now - coachStep.current.at < 25_000
    const band = settling ? null
      : target ? workBand(target)
      : (step ? step.pace === 'easy' : kind === 'easy' || kind === 'long') ? easyBand(est.paces.easy[0])
      : null
    const cue = coach.current.update(now, pace, band, target ? 20_000 : 45_000)
    if (cue) void speak(cueText(cue, !!target))
  }
  const eventText = { autopause: 'หยุดอัตโนมัติ', resume: 'วิ่งต่อ', gpsLost: 'สัญญาณ GPS หาย ระยะช่วงนี้อาจคลาดเคลื่อน', gpsBack: 'สัญญาณ GPS กลับมาแล้ว' }
  const t = useRunTracker({
    onSplit: (km, split, total) => { if (voice) void speak(splitAnnouncement(km, total, split)) },
    onTick,
    onEvent: e => { if (voice) void speak(eventText[e]) },
  })
  useEffect(() => { tRef.current = t })

  const [shoes] = useShoes()
  const removePhotos = useRemovePhotosFor()
  // การวิ่งใหม่ผูกกับรองเท้าคู่หลักอัตโนมัติ (เปลี่ยนได้ในหน้ารายละเอียด)
  const save = (r: Run) => setRuns(prev => [...prev, { ...r, shoeId: r.shoeId ?? defaultShoe(shoes)?.id }].sort((a, b) => a.date.localeCompare(b.date)))

  const finish = () => {
    guide.reset()
    if (ghostNow && ghostOn) notify(ghostNow.lead >= 0 ? `ชนะเงา ${Math.round(ghostNow.lead)} วินาที` : `ช้ากว่าเงา ${Math.round(-ghostNow.lead)} วินาที — ครั้งหน้าเอาใหม่`, ghostNow.lead >= 0 ? 'good' : 'info')
    resetGhost()
    const r = t.finish()
    if (r.km < 0.05) return notify('ระยะสั้นเกินไป ไม่ได้บันทึก', 'bad')
    const run: Run = { id: uid(), date: today(), kind, source: 'gps', ...r }
    save(run)
    setCooldown(run)
  }

  const importGpx = async (file: File) => {
    try {
      const g = parseGpx(await file.text())
      if (!g.seconds && !(await ask('ไฟล์นี้ไม่มีข้อมูลเวลา จะบันทึกแค่ระยะและเส้นทาง', { title: 'นำเข้าต่อไหม?', ok: 'นำเข้า' }))) return
      const run: Run = { id: uid(), date: g.date ?? today(), km: g.km, seconds: g.seconds, elapsedSeconds: g.elapsedSeconds, splits: g.splits, route: g.route, times: g.times, kind, source: 'gpx' }
      save(run)
      setDetail(run.id)
    } catch (e) {
      notify(e instanceof Error ? e.message : 'อ่านไฟล์ไม่ได้', 'bad')
    }
  }

  if (t.status !== 'idle') return (
    <ActiveRun t={t} kind={kind} target={todayRun?.targetKm} fiveK={est?.paces.interval} voice={voice} setVoice={setVoice} onFinish={finish}
      coachOn={coachOn && !!est} setCoachOn={est ? setCoachOn : undefined}
      onDiscard={() => { guide.reset(); resetGhost(); t.discard() }}
      ghost={ghost && <GhostCard ghost={ghost} now={ghostNow} on={ghostOn} setOn={setGhostOn} />}
      guide={steps && (
        <GuideCard steps={steps} runner={guide.runner} meters={t.meters} paces={est?.paces}
          on={guideOn} setOn={setGuideOn} onSkip={() => guide.skip(t.meters)} />
      )} />
  )

  const thisWeek = weekStart(today())
  const kmThisWeek = runs.filter(r => weekStart(r.date) === thisWeek).reduce((s, r) => s + r.km, 0)
  const target = p.kmTarget()
  const open = runs.find(r => r.id === detail)

  return (
    <div className="space-y-4">
      <Segmented value={view} onChange={setView} options={[
        { value: 'start', label: <><Play size={14} /> วิ่ง</> },
        { value: 'history', label: <><History size={14} /> ประวัติ</> },
        { value: 'stats', label: <><Gauge size={14} /> สถิติ</> },
      ]} />

      {view === 'start' && (
      <section className="space-y-3 rounded-2xl bg-gradient-to-br from-run to-accent p-4 text-white shadow-sm">
        <div>
          <div className="text-sm opacity-80">สัปดาห์นี้</div>
          <div className="text-4xl font-extrabold tabular-nums">{kmThisWeek.toFixed(1)}<span className="ml-1 text-xl font-semibold opacity-80">{target ? `/ ${target} กม.` : 'กม.'}</span></div>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-white/25">
          <div className="h-full rounded-full bg-white" style={{ width: `${target ? Math.min(100, (kmThisWeek / target) * 100) : 0}%` }} />
        </div>
        {todayRun && kmToday > 0 && (
          <div className="flex items-center gap-2 rounded-2xl bg-white/15 p-3 text-sm font-bold">
            <CircleCheck size={18} className="shrink-0" /> วันนี้วิ่งแล้ว {kmToday.toFixed(2)} กม. · {todayRun.title}
          </div>
        )}
        {todayRun && !kmToday && (
          <div className="flex items-start gap-2 rounded-2xl bg-white/15 p-3 text-sm">
            <CalendarCheck size={18} className="mt-0.5 shrink-0" />
            <div>
              <div className="font-bold">แผนวันนี้: {todayRun.title} · {todayRun.targetKm} กม.</div>
              <div className="opacity-85">{todayRun.exercises[0]?.cue}</div>
              {paceHint(est, todayRun.runKind, todayRun.title) && <div className="font-semibold">{paceHint(est, todayRun.runKind, todayRun.title)}</div>}
            </div>
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          {(Object.keys(runKinds) as Run['kind'][]).map(k => (
            <button key={k} onClick={() => setKind(k)}
              className={cx('rounded-full px-3 py-1 text-sm font-semibold', kind === k ? 'bg-white text-accent' : 'bg-white/15')}>
              {runKinds[k]}
            </button>
          ))}
        </div>
        <button onClick={() => setChecking(true)} className="flex w-full items-center justify-center gap-2 rounded-full bg-white py-3 text-base font-bold text-accent shadow-lg active:scale-[.98]">
          <Play size={22} fill="currentColor" /> {kmToday ? 'วิ่งอีกรอบ' : 'เริ่มวิ่ง'}
        </button>
        {t.error && <p className="rounded-xl bg-black/20 p-2 text-sm">{t.error}</p>}
      </section>
      )}

      {view === 'start' && (
        <>
          <JourneyCard runs={runs} est={est} />
          <HeatCard />
          <RunTypeCard kind={kind} />
        </>
      )}

      {view === 'history' && (
        <>
        <Card title="ประวัติการวิ่ง" action={
          <div className="flex gap-1.5">
            <label className="inline-flex cursor-pointer items-center gap-1 rounded-full bg-raised px-3 py-1.5 text-sm font-semibold ring-1 ring-line">
              <FileUp size={14} /> GPX
              <input type="file" accept=".gpx,application/gpx+xml" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) void importGpx(f); e.target.value = '' }} />
            </label>
            <Button variant="soft" size="sm" onClick={() => setManual(!manual)}><Plus size={14} /> กรอกเอง</Button>
          </div>
        }>
          <Collapse open={manual}><ManualEntry onSave={r => { save(r); setManual(false) }} /></Collapse>
          <RunHistory runs={runs} onOpen={setDetail} />
        </Card>
        <CrossTrainingCard />
        </>
      )}

      {view === 'stats' && (
        <>
          <PaceCard est={est} runs={runs} onTrial={() => { setKind('race'); setView('start'); window.scrollTo({ top: 0, behavior: 'smooth' }) }} />
          <BestEfforts runs={runs} />
          <Card title="8 สัปดาห์ล่าสุด">
            <WeeklyBars runs={runs} target={target} />
          </Card>
          <HeatmapCard runs={runs} />
          <ShoesCard runs={runs} />
        </>
      )}

      <p className="px-2 text-xs text-muted">
        {isNative
          ? 'ถ้าบันทึกหยุดเองตอนปิดจอ ให้ตั้งแบตเตอรี่ของแอปเป็น "ไม่จำกัด"'
          : 'บนเว็บ GPS ทำงานเฉพาะตอนเปิดหน้านี้ค้างไว้ — ปิดจอได้ต้องใช้แอป Android'}
      </p>

      {cooldown && <CooldownSheet km={cooldown.km} onDone={() => { setDetail(cooldown.id); setCooldown(null) }} />}

      {checking && (
        <ReadinessSheet kind="run" onClose={() => setChecking(false)}
          onProceed={light => { if (light) setKind('easy'); setChecking(false); t.acquire() }} />
      )}

      {open && <RunDetail run={open} runs={runs} fiveK={est?.paces.interval} onClose={() => setDetail(null)} onUpdate={patch => setRuns(prev => prev.map(x => (x.id === open.id ? { ...x, ...patch } : x)).sort((a, b) => a.date.localeCompare(b.date)))} onDelete={() => { setRuns(prev => prev.filter(x => x.id !== open.id)); removePhotos(open.id); setDetail(null) }} />}
    </div>
  )
}

function ActiveRun({ t, kind, target, fiveK, voice, setVoice, coachOn, setCoachOn, onFinish, onDiscard, guide, ghost }: { t: ReturnType<typeof useRunTracker>; kind: Run['kind']; target?: number; fiveK?: number; voice: boolean; setVoice: (v: boolean) => void; coachOn: boolean; setCoachOn?: (v: boolean) => void; onFinish: () => void; onDiscard: () => void; guide?: ReactNode; ghost?: ReactNode }) {
  const km = t.meters / 1000
  // ระหว่างวิ่ง ปุ่มย้อนกลับแค่ย่อแอป (GPS บันทึกต่อ) ไม่ออกจากหน้าวิ่ง
  useBackClose(() => void App.minimizeApp())
  const weak = t.accuracy === null || t.accuracy > GOOD_ACCURACY_M
  const banner =
    t.status === 'acquiring' ? (weak ? 'กำลังหาสัญญาณ GPS… ออกไปที่โล่ง' : 'GPS พร้อมแล้ว') :
    // GPS หายมาก่อนหยุดอัตโนมัติ — ไม่มีจุดใหม่ก็ดูเหมือน "หยุดนิ่ง" ทั้งที่ยังวิ่งอยู่
    t.signalLost ? 'สัญญาณ GPS หาย — ออกไปที่โล่ง ระยะช่วงนี้อาจคลาดเคลื่อน' :
    t.status === 'autopaused' ? 'หยุดอัตโนมัติ — เริ่มวิ่งต่อแล้วจะนับเวลาเอง' :
    t.status === 'paused' ? 'พักอยู่' : null

  return (
    <Portal>
    <div className="fixed inset-0 z-50 animate-sheet-up overflow-y-auto bg-bg">
      <div className="mx-auto flex min-h-full max-w-lg flex-col gap-4 p-4 pb-[calc(var(--sab)+1rem)] pt-[calc(var(--sat)+1rem)]">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Badge tone="run">{runKinds[kind]}</Badge>
            <button onClick={() => { setVoice(!voice); if (!voice) void speak('เปิดเสียงบอกทุกกิโลเมตร') }} aria-label={voice ? 'ปิดเสียงบอกกิโล' : 'เปิดเสียงบอกกิโล'}
              className={cx('grid size-8 place-items-center rounded-full ring-1 ring-line', voice ? 'bg-run/15 text-run' : 'text-muted')}>
              {voice ? <Volume2 size={15} /> : <VolumeX size={15} />}
            </button>
            {setCoachOn && voice && (
              <button onClick={() => { setCoachOn(!coachOn); if (!coachOn) void speak('เปิดโค้ชเพซ') }} aria-label={coachOn ? 'ปิดโค้ชเพซ' : 'เปิดโค้ชเพซ'}
                className={cx('flex h-8 items-center gap-1 rounded-full px-2.5 text-xs font-semibold ring-1 ring-line', coachOn ? 'bg-run/15 text-run' : 'text-muted')}>
                <Gauge size={14} /> โค้ชเพซ
              </button>
            )}
          </span>
          <span className={cx('inline-flex items-center gap-1 text-xs font-semibold', weak ? 'text-warn' : 'text-good')}>
            <Satellite size={14} /> GPS {t.accuracy !== null ? `±${Math.round(t.accuracy)} ม.` : '…'}
          </span>
        </div>

        <Map route={t.route} position={t.position} follow className="h-[38vh]" />

        {banner && <div className={cx('rounded-2xl px-4 py-2 text-center text-sm font-semibold', t.status === 'acquiring' && !weak ? 'bg-good/15 text-good' : 'bg-warn/15 text-warn')}>{banner}</div>}

        <div className="text-center">
          <div className="text-7xl font-extrabold leading-none tabular-nums">{km.toFixed(2)}</div>
          <div className="mt-1 text-sm text-muted">กิโลเมตร{target ? ` จากเป้า ${target}` : ''}</div>
          {target && (
            <div className="mx-auto mt-2 h-2 max-w-60 overflow-hidden rounded-full bg-body">
              <div className={cx('h-full rounded-full transition-all duration-700', km >= target ? 'bg-good' : 'bg-run')} style={{ width: `${Math.min(100, (km / target) * 100)}%` }} />
            </div>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2 text-center">
          <Stat label="เวลา" value={formatDuration(t.elapsed)} />
          <Stat label="เพซเฉลี่ย" value={formatPace(t.elapsed, km)} />
          <Stat label="เพซตอนนี้" value={t.currentPace ? formatPace(t.currentPace, 1) : '--:--'} />
        </div>

        {guide}
        {ghost}

        {t.lastGap && (
          <div className="flex animate-fade-up items-start gap-2 rounded-2xl bg-warn/15 p-3 text-sm text-warn">
            <TriangleAlert size={18} className="mt-0.5 shrink-0" />
            <span className="flex-1">ปิดจอไป <b>{formatDuration(t.lastGap)}</b> — ช่วงนั้นนับระยะเป็นเส้นตรง (อาจน้อยกว่าจริง)</span>
            <button onClick={t.dismissGap} aria-label="ปิด" className="shrink-0"><X size={16} /></button>
          </div>
        )}
        {t.splits.length > 0 && <Splits splits={t.splits} fiveK={fiveK} />}
        {t.error && <p className="text-center text-sm text-bad">{t.error}</p>}

        <div className="mt-auto flex items-center justify-center gap-4 pt-2">
          {t.status === 'acquiring' && (
            <>
              <Button variant="soft" size="lg" onClick={onDiscard}><X size={20} /> ยกเลิก</Button>
              <Button size="lg" onClick={t.begin}><Play size={20} fill="currentColor" /> {weak ? 'เริ่มเลย' : 'เริ่มจับเวลา'}</Button>
            </>
          )}
          {(t.status === 'running' || t.status === 'autopaused') && (
            <button onClick={t.pause} aria-label="พัก" className="grid size-20 place-items-center rounded-full bg-accent text-white shadow-lg active:scale-95">
              <Pause size={32} fill="currentColor" />
            </button>
          )}
          {t.status === 'paused' && (
            <>
              <button onClick={t.resume} aria-label="วิ่งต่อ" className="grid size-20 place-items-center rounded-full bg-accent text-white shadow-lg active:scale-95">
                <Play size={32} fill="currentColor" />
              </button>
              <button onClick={onFinish} aria-label="จบและบันทึก" className="grid size-20 place-items-center rounded-full bg-good text-white shadow-lg active:scale-95">
                <Check size={32} />
              </button>
            </>
          )}
        </div>
        {t.status === 'paused' && (
          <div className="flex items-center justify-between text-sm">
            <label className="flex items-center gap-2 text-muted">
              <input type="checkbox" className="size-4 accent-accent" checked={t.autoPause} onChange={e => t.setAutoPause(e.target.checked)} /> หยุดอัตโนมัติ
            </label>
            <button className="text-bad" onClick={async () => (await ask('ระยะและเวลาที่บันทึกไว้จะหายไป', { title: 'ทิ้งการวิ่งนี้?', ok: 'ทิ้ง', danger: true })) && onDiscard()}>ทิ้งการวิ่งนี้</button>
          </div>
        )}
      </div>
    </div>
    </Portal>
  )
}

function Splits({ splits, fiveK }: { splits: number[]; fiveK?: number }) {
  const fastest = Math.min(...splits)
  const slowest = Math.max(...splits)
  return (
    <div className="rounded-2xl bg-raised p-3">
      <div className="mb-2 flex justify-between text-xs text-muted"><span>เพซรายกิโล</span><span>นาที/กม.</span></div>
      <ul className="space-y-1.5">
        {splits.map((s, i) => (
          <li key={i} className="grid grid-cols-[3rem_1fr_1.25rem_3rem] items-center gap-2 text-sm">
            <span className="text-muted">กม. {i + 1}</span>
            <span className="h-2.5 overflow-hidden rounded-full bg-body">
              {/* แท่งยาว = เร็ว, สี = โซนเพซ */}
              <span className={cx('block h-full rounded-full', !fiveK && (s === fastest ? 'bg-good' : 'bg-run'))}
                style={{ width: `${slowest === fastest ? 100 : 40 + 60 * ((slowest - s) / (slowest - fastest))}%`, background: fiveK ? zoneInfo(zoneOf(s, fiveK)).color : undefined }} />
            </span>
            <span className="text-center text-[10px] font-bold" style={{ color: fiveK ? zoneInfo(zoneOf(s, fiveK)).color : undefined }}>{fiveK ? zoneOf(s, fiveK) : ''}</span>
            <span className={cx('text-right tabular-nums', s === fastest && 'font-bold')}>{formatPace(s, 1)}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function RunDetail({ run, runs, fiveK, onClose, onDelete, onUpdate }: { run: Run; runs: Run[]; fiveK?: number; onClose: () => void; onDelete: () => void; onUpdate: (patch: Partial<Run>) => void }) {
  const kmUp = useCountUp(run.km)
  const secUp = useCountUp(run.seconds)
  const [editing, setEditing] = useState(false)
  const [sharing, setSharing] = useState(false)
  useBackClose(onClose)
  const series = run.route && run.times ? paceSeries(run.route, run.times) : []
  const sa = splitAnalysis(run.splits)
  const saText = sa && {
    // เร็วขึ้นเกิน 10% มักแปลว่าช่วงแรกเดิน/วอร์มอัพ มากกว่าการคุมแรง
    negative: sa.diffPct < -10
      ? { t: 'ครึ่งหลังเร็วขึ้นมาก', c: 'text-run', d: `เร็วขึ้น ${Math.abs(sa.diffPct).toFixed(1)}% — ช่วงแรกน่าจะเป็นการวอร์มอัพหรือเดิน` }
      : { t: 'Negative split', c: 'text-good', d: `ครึ่งหลังเร็วกว่าครึ่งแรก ${Math.abs(sa.diffPct).toFixed(1)}% — คุมแรงได้ดี` },
    even: { t: 'Even split', c: 'text-run', d: 'สองครึ่งเพซใกล้กัน — สม่ำเสมอดี' },
    positive: { t: 'Positive split', c: 'text-warn', d: `ครึ่งหลังช้าลง ${sa.diffPct.toFixed(1)}% — ลองออกตัวช้าลงอีกนิด` },
  }[sa.kind]
  return (
    <Portal>
    <div className="fixed inset-0 z-50 flex animate-fade-in items-end justify-center bg-black/50 sm:items-center" onClick={onClose}>
      <div className="max-h-[92dvh] w-full max-w-lg animate-sheet-up overflow-y-auto rounded-t-3xl bg-card p-4 pb-[calc(var(--sab)+1rem)] sm:animate-fade-up sm:rounded-3xl" onClick={e => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <div className="font-bold">{runKinds[run.kind]} · {niceDate(run.date)}</div>
            <div className="text-xs text-muted">{run.source === 'gps' ? 'บันทึกด้วย GPS' : run.source === 'gpx' ? 'นำเข้าจากไฟล์ GPX' : 'กรอกเอง'}</div>
          </div>
          <span className="flex gap-2">
            <button onClick={() => setSharing(true)} aria-label="แชร์เป็นรูป" className="grid size-9 place-items-center rounded-full bg-raised"><Share2 size={17} /></button>
            <button onClick={onClose} aria-label="ปิด" className="grid size-9 place-items-center rounded-full bg-raised"><X size={18} /></button>
          </span>
        </div>
        {sharing && <ShareRunSheet run={run} onClose={() => setSharing(false)} />}
        {run.route && run.route.length > 1 && <Map route={run.route} className="mb-3 h-56" />}
        <div className="mb-3 grid grid-cols-3 gap-2 text-center">
          <Stat label="ระยะ" value={kmUp.toFixed(2)} sub="กม." accent />
          <Stat label="เวลาเคลื่อนที่" value={formatDuration(secUp)} sub={run.elapsedSeconds ? `รวม ${formatDuration(run.elapsedSeconds)}` : undefined} />
          <Stat label="เพซเฉลี่ย" value={formatPace(run.seconds, run.km)} sub="นาที/กม." />
        </div>
        {run.gapSeconds ? <p className="mb-3 rounded-xl bg-warn/15 p-2 text-xs text-warn">ปิดจอรวม {formatDuration(run.gapSeconds)} — ระยะช่วงนั้นเป็นค่าประมาณ</p> : null}
        {series.length > 2 && (
          <div className="mb-3 space-y-3 rounded-2xl bg-raised p-3">
            <PaceChart series={series} avg={run.seconds / run.km} fiveK={fiveK} />
            {fiveK && <ZoneBar series={series} fiveK={fiveK} />}
          </div>
        )}
        {sa && saText && (
          <div className="mb-3 grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-raised px-3 py-2">
              <div className={cx('text-sm font-bold', saText.c)}>{saText.t}</div>
              <div className="text-[11px] leading-snug text-muted">{saText.d}</div>
            </div>
            <div className="rounded-xl bg-raised px-3 py-2">
              <div className="text-sm font-bold">ความสม่ำเสมอ {sa.cv < 3 ? 'ดีมาก' : sa.cv < 6 ? 'ดี' : 'แกว่ง'}</div>
              <div className="text-[11px] leading-snug text-muted">เพซรายกิโลต่างกันเฉลี่ย {sa.cv.toFixed(1)}% · เร็วสุด กม. {sa.fastest + 1}</div>
            </div>
          </div>
        )}
        {run.splits && run.splits.length > 0 && <Splits splits={run.splits} fiveK={fiveK} />}
        <MatchedRuns run={run} runs={runs} />
        <div className="mt-3 rounded-2xl bg-raised p-3"><RpePicker value={run.rpe} onPick={rpe => onUpdate({ rpe })} /></div>
        <div className="mt-3"><PhotoStrip kind="run" refId={run.id} date={run.date} label="รูปการวิ่ง" /></div>
        <Collapse open={editing}>
          <EditRun run={run} onSave={patch => { onUpdate(patch); setEditing(false) }} />
        </Collapse>
        <div className="mt-3 flex gap-2">
          <Button variant="soft" size="sm" onClick={() => setEditing(!editing)}><Pencil size={14} /> {editing ? 'ยกเลิกแก้ไข' : 'แก้ไข'}</Button>
          <Button variant="danger" size="sm" onClick={async () => (await ask('ลบการวิ่งนี้ออกจากประวัติ?', { ok: 'ลบ', danger: true })) && onDelete()}><Trash2 size={14} /> ลบ</Button>
        </div>
      </div>
    </div>
    </Portal>
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
  }

  return (
    <div className="mb-3 grid grid-cols-2 gap-2 rounded-2xl bg-raised p-3">
      <DateInput label="วันที่" value={date} onChange={setDate} />
      <SelectInput label="ประเภท" value={kind} onChange={setKind} options={Object.entries(runKinds).map(([k, v]) => ({ value: k as Run['kind'], label: v }))} />
      <NumberInput label="ระยะ" unit="กม." step={0.1} value={km} onChange={setKm} placeholder="5.0" />
      <NumberInput label="เวลา" unit="นาที" step={1} value={min} onChange={setMin} placeholder="30" />
      <Button className="col-span-2" onClick={add}>บันทึก</Button>
    </div>
  )
}

function WeeklyBars({ runs, target }: { runs: Run[]; target: number }) {
  const [hover, setHover] = useState<number | null>(null)
  const current = weekStart(today())
  const weeks = Array.from({ length: 8 }, (_, i) => addDays(current, (i - 7) * 7))
  const totals = weeks.map(w => runs.filter(r => weekStart(r.date) === w).reduce((s, r) => s + r.km, 0))
  const max = Math.max(target, 1, ...totals) * 1.15
  const W = 320, H = 140, pad = 22, bw = (W - pad) / weeks.length
  const y = (v: number) => H - pad - (v / max) * (H - pad - 8)

  return (
    <div>
      <div className="mb-1 h-5 text-right text-sm tabular-nums">{hover !== null ? `สัปดาห์ ${shortDate(weeks[hover])}: ${totals[hover].toFixed(1)} กม.` : ''}</div>
      <svg viewBox={`0 0 ${W} ${H}`} className="block w-full" role="img" aria-label="กราฟระยะวิ่งรายสัปดาห์">
        {target > 0 && (
          <g>
            <line x1={pad} x2={W} y1={y(target)} y2={y(target)} className="stroke-muted" strokeDasharray="4 4" />
            <text x={W - 2} y={y(target) - 4} textAnchor="end" className="fill-muted text-[9px]">เป้า {target}</text>
          </g>
        )}
        <line x1={pad} x2={W} y1={H - pad} y2={H - pad} className="stroke-line" />
        {weeks.map((w, i) => {
          const x = pad + i * bw + 4
          const h = H - pad - y(totals[i])
          return (
            <g key={w} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} onClick={() => setHover(i)}>
              <rect x={pad + i * bw} y={0} width={bw} height={H - pad} fill="transparent" />
              {h > 0 && <path className={cx('fill-run', hover === i ? 'opacity-100' : 'opacity-80')} d={roundedTop(x, y(totals[i]), bw - 8, h)} />}
              <text x={x + (bw - 8) / 2} y={H - 6} textAnchor="middle" className="fill-muted text-[9px]">{shortDate(w)}</text>
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

function PaceCard({ est, runs, onTrial }: { est: Estimate | null; runs: Run[]; onTrial: () => void }) {
  const trend = useMemo(() => predictionTrend(runs, 12), [runs])
  const cs = useMemo(() => criticalSpeed(runs), [runs])
  const [pick, setPick] = useState<RaceKey>('tenK')
  const [goals, setGoal] = useRaceGoals()
  const [draft, setDraft] = useState('')
  if (!est)
    return (
      <Card title={<span className="flex items-center gap-2"><Gauge size={18} className="text-run" /> เพซแนะนำ</span>}>
        <p className="text-sm text-muted">วิ่งให้ได้ ≥3 กม. สักครั้ง แล้วแอปจะคำนวณเพซซ้อมและเวลาคาดการณ์ให้</p>
      </Card>
    )
  // เทียบกับ 4 สัปดาห์ก่อน: ติดลบ = เร็วขึ้น
  const before = trend.at(-5)
  const goal = goals[pick]
  const saveGoal = () => { setGoal(pick, parseDuration(draft)); setDraft('') }
  return (
    <Card title={<span className="flex items-center gap-2"><Gauge size={18} className="text-run" /> เวลาคาดการณ์ & โซนเพซ</span>}>
      {daysBetween(est.from.date, today()) > 42 && (
        <div className="mb-3 flex items-center gap-2 rounded-xl bg-run/10 p-3 text-sm text-run">
          <span className="flex-1">ผลที่ใช้คำนวณเก่าเกิน 6 สัปดาห์ — วิ่งทดสอบ 5K เพื่ออัปเดตโซนและเวลาคาดการณ์</span>
          <Button size="sm" variant="run" onClick={onTrial}>ทดสอบ 5K</Button>
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
              <div className="text-xs text-muted">{raceLabel[k]}{k === 'full' && !est.fullReliable && ' (ค่าคร่าว ๆ)'}</div>
              <div className="text-lg font-bold tabular-nums">{formatDuration(est[k])}</div>
              {g ? (
                <div className={cx('text-[11px] font-semibold tabular-nums', est[k] <= g ? 'text-good' : 'text-warn')}>
                  {est[k] <= g ? `ถึงเป้า ${formatDuration(g)} แล้ว` : `ขาดอีก ${formatDuration(est[k] - g)} ถึงเป้า`}
                </div>
              ) : Math.abs(diff) >= 1 && (
                <div className={cx('text-[11px] font-semibold tabular-nums', diff < 0 ? 'text-good' : 'text-warn')}>
                  {diff < 0 ? 'เร็วขึ้น' : 'ช้าลง'} {formatDuration(Math.abs(diff))} ใน 4 สัปดาห์
                </div>
              )}
            </button>
          )
        })}
      </div>
      <TrendLine points={trend.map(t => ({ date: t.date, v: t[pick] }))} goal={goal} />
      <div className="mt-3 rounded-xl bg-raised p-3">
        <div className="text-xs font-semibold text-muted">เป้าหมาย {raceLabel[pick]}</div>
        {goal ? (
          <div className="mt-1 flex items-center justify-between gap-2 text-sm">
            <span><b className="tabular-nums">{formatDuration(goal)}</b> · ต้องวิ่งเพซ <b className="tabular-nums">{formatPace(goal, raceKm[pick])}</b> /กม.</span>
            <button onClick={() => setGoal(pick, null)} className="text-xs font-semibold text-muted">ลบเป้า</button>
          </div>
        ) : (
          <div className="mt-1.5 flex items-end gap-2">
            <TextInput className="flex-1" value={draft} onChange={setDraft} placeholder={pick === 'half' || pick === 'full' ? 'เช่น 1:59:59' : 'เช่น 55:00'} />
            <Button disabled={!parseDuration(draft)} onClick={saveGoal}>ตั้งเป้า</Button>
          </div>
        )}
      </div>
      {cs && (
        <div className="mt-3 rounded-xl bg-raised p-3 text-sm">
          <div className="flex items-baseline justify-between gap-2">
            <span className="font-semibold">ความเร็ววิกฤต (Critical Speed)</span>
            <b className="tabular-nums">{formatPace(cs.pace, 1)} /กม.</b>
          </div>
          <p className="mt-1 text-xs text-muted">
            เพดานที่ร่างกายยังวิ่งแบบ "คงที่" ได้ (≈ ขอบบนของโซนแอโรบิก) คำนวณจากช่วงที่เร็วที่สุด {cs.points} ระยะใน 90 วัน ·
            มาราธอน: ครึ่งแรกอย่าเร็วกว่า ~{formatPace(cs.marathonFirstHalfPace, 1)} /กม. (94% ของ CS)
          </p>
        </div>
      )}
      <div className="mt-3 text-xs font-semibold text-muted">โซนเพซของคุณ (นาที/กม.)</div>
      <div className="mt-1.5"><ZoneLegend fiveK={est.paces.interval} /></div>
      <p className="mt-2 text-xs text-muted">
        จาก{est.from.segment ? `ช่วง ${est.from.km} กม. ที่เร็วที่สุดในการวิ่ง` : `การวิ่ง ${est.from.km} กม.`} วันที่ {shortDate(est.from.date)}
        {est.stale && ' (เกิน 2 เดือนแล้ว — วิ่งเต็มที่สักครั้งเพื่ออัปเดต)'} · ฟูลคิดจากระยะซ้อม ~{Math.round(est.weeklyKm)} กม./สัปดาห์ด้วย
      </p>
    </Card>
  )
}

/** เส้นแนวโน้มเวลาคาดการณ์ 12 สัปดาห์ (ต่ำลง = เร็วขึ้น จึงกลับแกนให้ดีขึ้นอยู่ด้านบน) */
function TrendLine({ points, goal }: { points: { date: string; v: number | null }[]; goal?: number }) {
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
      <div className="mb-1 flex justify-between text-[11px] text-muted"><span>12 สัปดาห์ก่อน</span><span>วันนี้</span></div>
      <svg viewBox={`0 0 ${W} ${H}`} className="block w-full" role="img" aria-label="แนวโน้มเวลาคาดการณ์">
        {goal ? (
          <g>
            <line x1={0} x2={W} y1={y(goal)} y2={y(goal)} className="stroke-good" strokeDasharray="5 4" strokeWidth={1.5} />
            <text x={W - 2} y={y(goal) - 4} textAnchor="end" className="fill-good text-[9px] font-semibold">เป้า</text>
          </g>
        ) : <line x1={0} x2={W} y1={H / 2} y2={H / 2} className="stroke-line" strokeDasharray="3 4" />}
        <path d={path} fill="none" className="stroke-run" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
        <circle cx={x(idx(last.date))} cy={y(last.v)} r={4.5} className="fill-run stroke-card" strokeWidth={2} />
      </svg>
    </div>
  )
}

function BestEfforts({ runs }: { runs: Run[] }) {
  if (!runs.length) return null
  const pbs = personalBests(runs).filter(p => p.best)
  const longest = runs.reduce((m, r) => Math.max(m, r.km), 0)
  return (
    <Card title={<span className="flex items-center gap-2"><Trophy size={18} className="text-warn" /> สถิติของฉัน</span>}>
      <div className="grid grid-cols-3 gap-2 text-center">
        <Stat label="ระยะรวม" value={runs.reduce((s, r) => s + r.km, 0).toFixed(1)} sub="กม." />
        <Stat label="จำนวนครั้ง" value={runs.length} sub="ครั้ง" />
        <Stat label="ไกลสุด" value={longest.toFixed(1)} sub="กม." />
      </div>
      {pbs.length > 0 && <div className="mt-3 text-xs font-semibold text-muted">เวลาเร็วสุดแต่ละระยะ</div>}
      <ul className="divide-y divide-line text-sm">
        {pbs.map(p => (
          <li key={p.label} className="flex items-center justify-between gap-2 py-2">
            <span className="w-12 font-bold">{p.label}</span>
            <span className="flex-1 text-xs text-muted">{p.best!.date}</span>
            <span className="tabular-nums text-muted">{formatPace(p.best!.seconds, p.km)} /กม.</span>
            <span className="w-16 text-right font-bold tabular-nums">{formatDuration(p.best!.seconds)}</span>
          </li>
        ))}
      </ul>
      <p className="mt-1 text-[11px] text-muted">ช่วงที่เร็วที่สุดจากทุกการวิ่ง ไม่ต้องวิ่งระยะนั้นพอดี</p>
    </Card>
  )
}

// แก้ไขข้อมูลการวิ่ง — ระยะ/เวลาแก้ได้เฉพาะที่กรอกเอง (การวิ่งที่มีเส้นทางคำนวณจาก GPS อยู่แล้ว)
function EditRun({ run, onSave }: { run: Run; onSave: (patch: Partial<Run>) => void }) {
  const [date, setDate] = useState(run.date)
  const [kind, setKind] = useState(run.kind)
  const [km, setKm] = useState(String(run.km))
  const [min, setMin] = useState(String(Math.round((run.seconds / 60) * 10) / 10))
  const [shoes] = useShoes()
  const [shoeId, setShoeId] = useState(run.shoeId ?? '')
  const manual = run.source === 'manual'
  return (
    <div className="mt-3 grid grid-cols-2 gap-2 rounded-2xl bg-raised p-3">
      <DateInput label="วันที่" value={date} onChange={setDate} />
      <SelectInput label="ประเภท" value={kind} onChange={setKind} options={Object.entries(runKinds).map(([k, v]) => ({ value: k as Run['kind'], label: v }))} />
      {manual && <NumberInput label="ระยะ" unit="กม." step={0.1} value={km} onChange={setKm} />}
      {manual && <NumberInput label="เวลา" unit="นาที" value={min} onChange={setMin} />}
      {shoes.length > 0 && (
        <SelectInput label="รองเท้า" className="col-span-2" value={shoeId} onChange={setShoeId}
          options={[{ value: '', label: 'ไม่ระบุ' }, ...shoes.map(s => ({ value: s.id, label: s.name + (s.retired ? ' (เลิกใช้)' : '') }))]} />
      )}
      <Button className="col-span-2" onClick={() => onSave({
        date, kind, shoeId: shoeId || undefined,
        ...(manual && +km > 0 && +min > 0 ? { km: +km, seconds: Math.round(+min * 60) } : {}),
      })}>บันทึกการแก้ไข</Button>
    </div>
  )
}

function ShoesCard({ runs }: { runs: Run[] }) {
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
  const tone = { good: 'bg-good', warn: 'bg-warn', bad: 'bg-bad' }
  return (
    <Card title={<span className="flex items-center gap-2"><Footprints size={18} className="text-run" /> รองเท้าวิ่ง</span>}
      action={<Button variant="soft" size="sm" onClick={() => setAdding(!adding)}><Plus size={14} /> เพิ่ม</Button>}>
      <Collapse open={adding}>
        <div className="mb-3 grid grid-cols-2 gap-2 rounded-2xl bg-raised p-3">
          <TextInput label="ชื่อรองเท้า" className="col-span-2" value={name} onChange={setName} placeholder="เช่น Nike Pegasus 41" />
          <NumberInput label="วิ่งมาแล้ว" unit="กม." value={start} onChange={setStart} />
          <NumberInput label="ควรเปลี่ยนที่" unit="กม." step={50} value={limit} onChange={setLimit} />
          <Button className="col-span-2" onClick={add}>บันทึกรองเท้า</Button>
        </div>
      </Collapse>
      {active.length === 0 && !adding && <p className="text-sm text-muted">เพิ่มรองเท้า แอปจะนับระยะและเตือนเมื่อควรเปลี่ยน</p>}
      <ul className="space-y-3">
        {active.map(s => {
          const km = shoeKm(s, runs)
          const st = shoeStatus(km, s.limitKm)
          return (
            <li key={s.id}>
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className="min-w-0 truncate font-semibold">{s.name}{s.id === def?.id && <Badge tone="run">คู่หลัก</Badge>}</span>
                <span className="shrink-0 tabular-nums text-muted">{Math.round(km)} / {s.limitKm} กม.</span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-body">
                <div className={cx('h-full rounded-full', tone[st])} style={{ width: `${Math.min(100, (km / s.limitKm) * 100)}%` }} />
              </div>
              {st !== 'good' && <p className={cx('mt-1 text-xs', st === 'bad' ? 'text-bad' : 'text-warn')}>{st === 'bad' ? 'ถึงระยะที่ควรเปลี่ยนแล้ว — ดูพื้นรองเท้าและความรู้สึกตอนวิ่งประกอบ' : 'ใกล้ถึงระยะเปลี่ยน เริ่มมองหาคู่ใหม่'}</p>}
              <div className="mt-1 flex gap-3 text-xs">
                {s.id !== def?.id && <button className="font-semibold text-run" onClick={() => setShoes(prev => prev.map(x => ({ ...x, isDefault: x.id === s.id })))}>ตั้งเป็นคู่หลัก</button>}
                <button className="text-muted" onClick={() => update(s.id, { retired: true, isDefault: false })}>เลิกใช้</button>
              </div>
            </li>
          )
        })}
      </ul>
    </Card>
  )
}

/** แผนที่รวมทุกการวิ่ง — ทางที่วิ่งบ่อยเข้มขึ้น */
function HeatmapCard({ runs }: { runs: Run[] }) {
  const { routes, hidden } = useMemo(() => heatmapRoutes(runs), [runs])
  if (routes.length < 2) return null
  return (
    <Card title={<span className="flex items-center gap-2"><MapIcon size={18} className="text-run" /> แผนที่การวิ่งทั้งหมด</span>}>
      <Suspense fallback={<div className="h-72 w-full animate-pulse rounded-2xl bg-raised" />}>
        <RouteHeatmap routes={routes} />
      </Suspense>
      <p className="mt-2 text-xs text-muted">{routes.length} เส้นทาง — ทางที่วิ่งบ่อยเส้นจะเข้มขึ้น{hidden ? ` (ไม่รวม ${hidden} ครั้งที่วิ่งที่อื่น)` : ''}</p>
    </Card>
  )
}

/** นักวิ่งเงา: ตำแหน่งเราเทียบเงาบนเส้นระยะ + นำ/ตามหลังกี่วินาที */
function GhostCard({ ghost, now, on, setOn }: { ghost: GhostTarget; now: { lead: number; m: number; ghostM: number } | null; on: boolean; setOn: (v: boolean) => void }) {
  const total = ghost.km * 1000
  const pos = (m: number) => `${Math.min(100, Math.max(0, (m / total) * 100))}%`
  const ahead = now && now.lead >= 2
  const behind = now && now.lead <= -2
  return (
    <div className="rounded-2xl bg-card p-3 ring-1 ring-line">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-sm font-bold"><Ghost size={15} className="text-accent" /> นักวิ่งเงา</div>
          <div className="truncate text-xs text-muted">{ghost.label}</div>
        </div>
        <label className="flex shrink-0 items-center gap-1.5 text-xs text-muted">
          <input type="checkbox" className="size-4 accent-accent" checked={on} onChange={e => setOn(e.target.checked)} /> แข่ง
        </label>
      </div>
      {on && (
        <>
          <div className={cx('mt-2 text-center text-2xl font-extrabold tabular-nums', ahead ? 'text-good' : behind ? 'text-bad' : 'text-ink')}>
            {now ? ghostText(now.lead) : 'เริ่มเมื่อถึงช่วงวัดเวลา'}
          </div>
          <div className="relative mt-3 h-2 rounded-full bg-raised">
            {now && <span className="absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-muted/60 ring-2 ring-card transition-[left] duration-1000 ease-linear" style={{ left: pos(now.ghostM) }} />}
            {now && <span className="absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent ring-2 ring-card transition-[left] duration-1000 ease-linear" style={{ left: pos(now.m) }} />}
          </div>
          <div className="mt-1 flex justify-between text-[10px] text-muted"><span>0</span><span>{ghost.km} กม.</span></div>
        </>
      )}
    </div>
  )
}
