import { lazy, Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { CalendarCheck, Check, CircleCheck, FileDown, FileUp, Footprints, Gauge, Ghost, History, ListChecks, Map as MapIcon, Pause, Pencil, Play, Plus, Satellite, Share2, Trash2, TriangleAlert, Trophy, Volume2, VolumeX, X } from 'lucide-react'
import { GOOD_ACCURACY_M, useRunTracker, type Point } from '../lib/gps'
import { useDayText } from '../lib/dayText'
import { useTodayIdx } from '../lib/useToday'
import { formatDuration, formatPace, runKinds, runKindsEn, uid, useRuns, type Run } from '../lib/log'
import { trNow, useT } from '../lib/i18n'
import { looksLikeWalk, runsOnly } from '../lib/walk'
import { criticalSpeed, estimate, paceHint, predictionTrend, type Estimate } from '../lib/pace'
import { useProgram } from '../lib/program'
import { parseGpx } from '../lib/gpx'
import { saveGpx } from '../lib/gpxFile'
import { DEFAULT_LIMIT_KM, defaultShoe, shoeKm, shoeStatus, useShoes, type Shoe } from '../lib/shoes'
import { paceSeries, personalBests, remeasure, splitAnalysis } from '../lib/analysis'
import { easyTooFast } from '../lib/recovery'
import { PaceChart, ZoneBar, ZoneLegend } from './Charts'
import { zoneInfo, zoneOf } from '../lib/zones'
import { RpePicker } from './RpePicker'
import { isNative } from '../lib/native'
import { speak, splitAnnouncement } from '../lib/voice'
import { useGuide } from '../lib/useGuide'
import { guideResult, guides, paceSec } from '../lib/guide'
import { cueText, easyBand, PaceCoach, workBand } from '../lib/coach'
import { useBackClose } from '../lib/back'
import { App } from '@capacitor/app'
import { GuideCard } from './Guide'
import { usePersisted } from '../lib/storage'
import { RunFormTips } from './RunForm'
import { SweatCard } from './Sweat'
import { CooldownSheet } from './Cooldown'
import { CapNote } from './MissedRun'
import { FinishCard } from './Finish'
import { longRunCap } from '../lib/missed'
import { ShareRunSheet } from './ShareRun'
import { PhotoStrip } from './Photos'
import { useRemovePhotosFor } from '../lib/photos'
import { HeatCard } from './Heat'
import { ReadinessSheet } from './Readiness'
import { addDays, daysBetween, niceDate, shortDate, today, weekStart } from '../lib/date'
import { Badge, Button, Card, Collapse, Portal, Segmented, Stat } from './ui'
import { RunHistory } from './RunHistory'
import { MatchedRuns } from './Matched'
import { CrossTrainingCard } from './CrossTraining'
import { heatmapRoutes } from '../lib/matched'
import { useRaceGoals } from '../lib/useGoals'
import { useCountUp } from '../lib/useCountUp'
import { ghostLead, ghostMeters, ghostText, ghostTextEn, raceGhost, trialGhost, type Ghost as GhostTarget } from '../lib/ghost'
import { raceKeyOf } from '../lib/racePlan'
import { parseDuration, raceKm, raceLabel, raceLabelEn, type RaceKey } from '../lib/goals'
import { DateInput, NumberInput, SelectInput, TextInput } from './Form'
import { cx } from '../lib/cx'
import { ask, notify } from '../lib/dialog'
import { ErrorBoundary } from './ErrorBoundary'
import { ElevationCard, RunAchievements, TrainingLog } from './RunExtras'

// วิ่งทดสอบ 5K (เลือกชนิด "แข่ง" ในวันที่ไม่ใช่วันแข่ง)
const TRIAL = guides.timeTrial()
// เรียกจาก callback ของ GPS เท่านั้น (ไม่ใช่ตอน render)
const clockNow = () => Date.now()

const RunMap = lazy(() => import('./RunMap'))
const RouteHeatmap = lazy(() => import('./RouteHeatmap'))

function Map(props: { route: Point[]; position?: Point | null; follow?: boolean; className?: string; interactive?: boolean }) {
  return (
    <ErrorBoundary fallback={<div className={cx('grid w-full place-items-center rounded-2xl bg-raised text-sm text-muted', props.className ?? 'h-64')}>{trNow('แสดงแผนที่ไม่ได้', 'Couldn’t show the map')}</div>}>
      <Suspense fallback={<div className={cx('w-full animate-pulse rounded-2xl bg-raised', props.className ?? 'h-64')} />}>
        <RunMap {...props} />
      </Suspense>
    </ErrorBoundary>
  )
}

export function Runs() {
  const [runs, setRuns] = useRuns()
  const tr = useT()
  const dt = useDayText()
  const p = useProgram()
  const todayIdx = useTodayIdx() // 0 = จันทร์ — เปลี่ยนเองเมื่อข้ามวัน
  const todayRun = p.finished ? undefined : p.plan().filter((d, i) => i === todayIdx && d.type === 'run')[0]
  const kmToday = runsOnly(runs).filter(r => r.date === today()).reduce((s, r) => s + r.km, 0)
  const [kind, setKind] = useState<Run['kind']>(todayRun?.runKind ?? 'easy')
  const est = useMemo(() => estimate(runs), [runs])
  // โซนเพซคิดจากเพซ 5K — ถ้าได้มาจากวิ่งเบา โซนจะผิด (วิ่งเบาปกติถูกจัดเป็น Speed) จึงไม่แสดงโซน
  const zoneRef = est && !est.from.easy ? est.paces.interval : undefined
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
  const ghost: GhostTarget | null = raceKey ? raceGhost(raceKey, raceGoals[raceKey], est?.[raceKey], todayRun?.targetKm)
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
  // วิ่งตามระยะในแผน (เช่น วิ่งสลับเดิน 3 กม.): ถึงระยะแล้วจบชุดซ้อม ไม่ต้องสลับวิ่ง/เดินต่อจนครบรอบที่ประมาณไว้
  // พลาดวิ่งยาวมาก่อน → แผนวันนี้อาจกระโดดเกิน 110% ของครั้งที่ยาวที่สุด: จบชุดซ้อมที่เพดานแทน
  const cap = longRunCap(runs, today(), todayRun)
  const planKm = steps && steps !== TRIAL ? (cap?.cap ?? todayRun?.targetKm) : undefined
  const onTick = (meters: number, active: boolean, pace: number | null) => {
    guide.onTick(meters, active)
    if (planKm && meters >= planKm * 1000 && guide.runner?.state.started && !guide.runner.state.done) guide.complete()
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
      // คำนวณจากวิ่งเบา: โซน Easy จะช้ากว่าเพซวิ่งเบาจริงของเรา — ไม่เตือนให้ช้าลง
      : !est.from.easy && (step ? step.pace === 'easy' : kind === 'easy' || kind === 'long') ? easyBand(est.paces.easy[0])
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
    const done = guide.runner ? guideResult(guide.runner.steps, guide.runner.state) : null
    guide.reset()
    if (ghostNow && ghostOn) notify(ghostNow.lead >= 0 ? tr(`ชนะเงา ${Math.round(ghostNow.lead)} วินาที`, `Beat the ghost by ${Math.round(ghostNow.lead)} s`) : tr(`ช้ากว่าเงา ${Math.round(-ghostNow.lead)} วินาที — ครั้งหน้าเอาใหม่`, `${Math.round(-ghostNow.lead)} s behind the ghost — next time`), ghostNow.lead >= 0 ? 'good' : 'info')
    resetGhost()
    const r = t.finish()
    if (r.km < 0.05) return notify(tr('ระยะสั้นเกินไป ไม่ได้บันทึก', 'Too short — not saved'), 'bad')
    const run: Run = { id: uid(), date: today(), kind, source: 'gps', ...r, ...(done && { guide: done }) }
    save(run)
    setCooldown(run)
  }

  const importGpx = async (file: File) => {
    try {
      const g = parseGpx(await file.text())
      if (!g.seconds && !(await ask(tr('ไฟล์นี้ไม่มีข้อมูลเวลา จะบันทึกแค่ระยะและเส้นทาง', 'This file has no timing data — only distance and route will be saved'), { title: tr('นำเข้าต่อไหม?', 'Import anyway?'), ok: tr('นำเข้า', 'Import') }))) return
      const run: Run = { id: uid(), date: g.date ?? today(), km: g.km, seconds: g.seconds, elapsedSeconds: g.elapsedSeconds, splits: g.splits, route: g.route, times: g.times, kind, source: 'gpx' }
      save(run)
      setDetail(run.id)
    } catch (e) {
      notify(e instanceof Error ? e.message : tr('อ่านไฟล์ไม่ได้', 'Couldn’t read the file'), 'bad')
    }
  }

  if (t.status !== 'idle') return (
    <ActiveRun t={t} kind={kind} target={todayRun?.targetKm} fiveK={zoneRef} voice={voice} setVoice={setVoice} onFinish={finish}
      coachOn={coachOn && !!est} setCoachOn={est ? setCoachOn : undefined}
      onDiscard={() => { guide.reset(); resetGhost(); t.discard() }}
      ghost={ghost && <GhostCard ghost={ghost} now={ghostNow} on={ghostOn} setOn={setGhostOn} />}
      guide={steps && (
        <GuideCard steps={steps} runner={guide.runner} meters={t.meters} paces={est?.paces}
          on={guideOn} setOn={setGuideOn} onSkip={() => guide.skip(t.meters)} />
      )} />
  )

  const thisWeek = weekStart(today())
  const kmThisWeek = runsOnly(runs).filter(r => weekStart(r.date) === thisWeek).reduce((s, r) => s + r.km, 0)
  const target = p.kmTarget()
  const open = runs.find(r => r.id === detail)

  return (
    <div className="space-y-4">
      <Segmented value={view} onChange={setView} options={[
        { value: 'start', label: <><Play size={14} /> {tr('วิ่ง', 'Run')}</> },
        { value: 'history', label: <><History size={14} /> {tr('ประวัติ', 'History')}</> },
        { value: 'stats', label: <><Gauge size={14} /> {tr('สถิติ', 'Stats')}</> },
      ]} />

      {view === 'start' && (
      <section className="space-y-3 rounded-2xl bg-gradient-to-br from-run-fill to-accent-fill p-4 text-white shadow-sm">
        <div>
          <div className="text-sm opacity-80">{tr('สัปดาห์นี้', 'This week')}</div>
          <div className="text-4xl font-extrabold tabular-nums">{kmThisWeek.toFixed(1)}<span className="ml-1 text-xl font-semibold opacity-80">{target ? `/ ${target} ${tr('กม.', 'km')}` : tr('กม.', 'km')}</span></div>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-white/25">
          <div className="h-full rounded-full bg-white" style={{ width: `${target ? Math.min(100, (kmThisWeek / target) * 100) : 0}%` }} />
        </div>
        {todayRun && kmToday > 0 && (
          <div className="flex items-center gap-2 rounded-2xl bg-white/15 p-3 text-sm font-bold">
            <CircleCheck size={18} className="shrink-0" /> {tr(`วันนี้วิ่งแล้ว ${kmToday.toFixed(2)} กม.`, `Ran ${kmToday.toFixed(2)} km today`)} · {dt.title(todayRun)}
          </div>
        )}
        {todayRun && !kmToday && (
          <div className="flex items-start gap-2 rounded-2xl bg-white/15 p-3 text-sm">
            <CalendarCheck size={18} className="mt-0.5 shrink-0" />
            <div>
              <div className="font-bold">{tr('แผนวันนี้', "Today's plan")}: {dt.title(todayRun)} · {todayRun.targetKm ? `${todayRun.targetKm} ${tr('กม.', 'km')}` : dt.duration(todayRun)}</div>
              <div className="opacity-85">{todayRun.exercises[0]?.cue}</div>
              {paceHint(est, todayRun.runKind, todayRun.title) && <div className="font-semibold">{paceHint(est, todayRun.runKind, todayRun.title)}</div>}
              <CapNote day={todayRun} date={today()} className="mt-1.5 flex items-start gap-1.5 rounded-xl bg-white/20 p-2 font-semibold" />
            </div>
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          {(Object.keys(runKinds) as Run['kind'][]).map(k => (
            <button key={k} onClick={() => setKind(k)}
              className={cx('rounded-full px-3 py-1 text-sm font-semibold', kind === k ? 'bg-white text-accent-fill' : 'bg-white/15')}>
              {tr(runKinds[k], runKindsEn[k])}
            </button>
          ))}
        </div>
        <button onClick={() => setChecking(true)} className="flex w-full items-center justify-center gap-2 rounded-full bg-white py-3 text-base font-bold text-accent-fill shadow-lg active:scale-[.98]">
          <Play size={22} fill="currentColor" /> {kmToday ? tr('วิ่งอีกรอบ', 'Run again') : tr('เริ่มวิ่ง', 'Start run')}
        </button>
        {t.error && <p className="rounded-xl bg-black/20 p-2 text-sm">{t.error}</p>}
      </section>
      )}

      {view === 'start' && (
        <>
          <HeatCard />
          <RunFormTips />
        </>
      )}

      {view === 'history' && (
        <>
        <Card title={tr('ประวัติการวิ่ง', 'Run history')} action={
          <div className="flex gap-1.5">
            <label className="inline-flex cursor-pointer items-center gap-1 rounded-full bg-raised px-3 py-1.5 text-sm font-semibold ring-1 ring-line">
              <FileUp size={14} /> GPX
              <input type="file" accept=".gpx,application/gpx+xml" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) void importGpx(f); e.target.value = '' }} />
            </label>
            <Button variant="soft" size="sm" onClick={() => setManual(!manual)}><Plus size={14} /> {tr('กรอกเอง', 'Add manually')}</Button>
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
          <FinishCard />
          <PaceCard est={est} runs={runs} onTrial={() => { setKind('race'); setView('start'); window.scrollTo({ top: 0, behavior: 'smooth' }) }} />
          <BestEfforts runs={runs} />
          <Card title={tr('บันทึกรายสัปดาห์', 'Training log')}><TrainingLog runs={runs} /></Card>
          <Card title={tr('8 สัปดาห์ล่าสุด', 'Last 8 weeks')}>
            <WeeklyBars runs={runs} target={target} />
          </Card>
          <HeatmapCard runs={runs} />
          <SweatCard />
          <ShoesCard runs={runs} />
        </>
      )}

      <p className="px-2 text-xs text-muted">
        {isNative
          ? tr('ถ้าบันทึกหยุดเองตอนปิดจอ ให้ตั้งแบตเตอรี่ของแอปเป็น "ไม่จำกัด"', 'If recording stops when the screen is off, set the app battery usage to "Unrestricted"')
          : tr('บนเว็บ GPS ทำงานเฉพาะตอนเปิดหน้านี้ค้างไว้ — ปิดจอได้ต้องใช้แอป Android', 'On the web, GPS only works while this page stays open — use the Android app to record with the screen off')}
      </p>

      {cooldown && <CooldownSheet run={runs.find(r => r.id === cooldown.id) ?? cooldown} onUpdate={patch => setRuns(prev => prev.map(x => (x.id === cooldown.id ? { ...x, ...patch } : x)))} onDone={() => { setDetail(cooldown.id); setCooldown(null) }} />}

      {checking && (
        <ReadinessSheet kind="run" onClose={() => setChecking(false)}
          onProceed={light => { if (light) setKind('easy'); setChecking(false); t.acquire() }} />
      )}

      {open && <RunDetail run={open} runs={runs} fiveK={zoneRef} onClose={() => setDetail(null)} onUpdate={patch => setRuns(prev => prev.map(x => (x.id === open.id ? { ...x, ...patch } : x)).sort((a, b) => a.date.localeCompare(b.date)))} onDelete={() => { setRuns(prev => prev.filter(x => x.id !== open.id)); removePhotos(open.id); setDetail(null) }} />}
    </div>
  )
}

function ActiveRun({ t, kind, target, fiveK, voice, setVoice, coachOn, setCoachOn, onFinish, onDiscard, guide, ghost }: { t: ReturnType<typeof useRunTracker>; kind: Run['kind']; target?: number; fiveK?: number; voice: boolean; setVoice: (v: boolean) => void; coachOn: boolean; setCoachOn?: (v: boolean) => void; onFinish: () => void; onDiscard: () => void; guide?: ReactNode; ghost?: ReactNode }) {
  const km = t.meters / 1000
  const tr = useT()
  // ระหว่างวิ่ง ปุ่มย้อนกลับแค่ย่อแอป (GPS บันทึกต่อ) ไม่ออกจากหน้าวิ่ง
  useBackClose(() => void App.minimizeApp())
  const weak = t.accuracy === null || t.accuracy > GOOD_ACCURACY_M
  const banner =
    t.status === 'acquiring' ? (weak ? tr('กำลังหาสัญญาณ GPS… ออกไปที่โล่ง', 'Finding GPS… move to open sky') : tr('GPS พร้อมแล้ว', 'GPS ready')) :
    // GPS หายมาก่อนหยุดอัตโนมัติ — ไม่มีจุดใหม่ก็ดูเหมือน "หยุดนิ่ง" ทั้งที่ยังวิ่งอยู่
    t.signalLost ? tr('สัญญาณ GPS หาย — ออกไปที่โล่ง ระยะช่วงนี้อาจคลาดเคลื่อน', 'GPS signal lost — move to open sky; distance here may be off') :
    t.status === 'autopaused' ? tr('หยุดอัตโนมัติ — เริ่มวิ่งต่อแล้วจะนับเวลาเอง', 'Auto-paused — timing resumes when you move') :
    t.status === 'paused' ? tr('พักอยู่', 'Paused') : null

  return (
    <Portal>
    <div className="fixed inset-0 z-50 animate-sheet-up overflow-y-auto bg-bg">
      <div className="mx-auto flex min-h-full max-w-lg flex-col gap-4 p-4 pb-[calc(var(--sab)+1rem)] pt-[calc(var(--sat)+1rem)]">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Badge tone="run">{tr(runKinds[kind], runKindsEn[kind])}</Badge>
            <button onClick={() => { setVoice(!voice); if (!voice) void speak('เปิดเสียงบอกทุกกิโลเมตร') }} aria-label={voice ? tr('ปิดเสียงบอกกิโล', 'Mute km cues') : tr('เปิดเสียงบอกกิโล', 'Unmute km cues')}
              className={cx('grid size-8 place-items-center rounded-full ring-1 ring-line', voice ? 'bg-run/15 text-run' : 'text-muted')}>
              {voice ? <Volume2 size={15} /> : <VolumeX size={15} />}
            </button>
            {setCoachOn && voice && (
              <button onClick={() => { setCoachOn(!coachOn); if (!coachOn) void speak('เปิดโค้ชเพซ') }} aria-label={coachOn ? tr('ปิดโค้ชเพซ', 'Pace coach off') : tr('เปิดโค้ชเพซ', 'Pace coach on')}
                className={cx('flex h-8 items-center gap-1 rounded-full px-2.5 text-xs font-semibold ring-1 ring-line', coachOn ? 'bg-run/15 text-run' : 'text-muted')}>
                <Gauge size={14} /> {tr('โค้ชเพซ', 'Pace coach')}
              </button>
            )}
          </span>
          <span className={cx('inline-flex items-center gap-1 text-xs font-semibold', weak ? 'text-warn' : 'text-good')}>
            <Satellite size={14} /> GPS {t.accuracy !== null ? `±${Math.round(t.accuracy)} ${tr('ม.', 'm')}` : '…'}
          </span>
        </div>

        <Map route={t.route} position={t.position} follow className="h-[38vh]" />

        {banner && <div className={cx('rounded-2xl px-4 py-2 text-center text-sm font-semibold', t.status === 'acquiring' && !weak ? 'bg-good/15 text-good' : 'bg-warn/15 text-warn')}>{banner}</div>}

        <div className="text-center">
          <div className="text-7xl font-extrabold leading-none tabular-nums">{km.toFixed(2)}</div>
          <div className="mt-1 text-sm text-muted">{tr('กิโลเมตร', 'kilometers')}{target ? tr(` จากเป้า ${target}`, ` of ${target}`) : ''}</div>
          {target && (
            <div className="mx-auto mt-2 h-2 max-w-60 overflow-hidden rounded-full bg-body">
              <div className={cx('h-full rounded-full transition-all duration-700', km >= target ? 'bg-good-fill' : 'bg-run-fill')} style={{ width: `${Math.min(100, (km / target) * 100)}%` }} />
            </div>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2 text-center">
          <Stat label={tr('เวลา', 'Time')} value={formatDuration(t.elapsed)} />
          <Stat label={tr('เพซเฉลี่ย', 'Avg pace')} value={formatPace(t.elapsed, km)} />
          <Stat label={tr('เพซตอนนี้', 'Current pace')} value={t.currentPace ? formatPace(t.currentPace, 1) : '--:--'} />
        </div>

        {guide}
        {ghost}

        {t.lastGap && (
          <div className="flex animate-fade-up items-start gap-2 rounded-2xl bg-warn/15 p-3 text-sm text-warn">
            <TriangleAlert size={18} className="mt-0.5 shrink-0" />
            <span className="flex-1">{tr('ปิดจอไป', 'Screen was off for')} <b>{formatDuration(t.lastGap)}</b> — {tr('ช่วงนั้นนับระยะเป็นเส้นตรง (อาจน้อยกว่าจริง)', 'that stretch is counted as a straight line (may be short)')}</span>
            <button onClick={t.dismissGap} aria-label={tr('ปิด', 'Close')} className="shrink-0"><X size={16} /></button>
          </div>
        )}
        {t.splits.length > 0 && <Splits splits={t.splits} fiveK={fiveK} />}
        {t.error && <p className="text-center text-sm text-bad">{t.error}</p>}

        <div className="mt-auto flex items-center justify-center gap-4 pt-2">
          {t.status === 'acquiring' && (
            <>
              <Button variant="soft" size="lg" onClick={onDiscard}><X size={20} /> {tr('ยกเลิก', 'Cancel')}</Button>
              <Button size="lg" onClick={t.begin}><Play size={20} fill="currentColor" /> {weak ? tr('เริ่มเลย', 'Start anyway') : tr('เริ่มจับเวลา', 'Start')}</Button>
            </>
          )}
          {(t.status === 'running' || t.status === 'autopaused') && (
            <button onClick={t.pause} aria-label={tr('พัก', 'Pause')} className="grid size-20 place-items-center rounded-full bg-accent-fill text-white shadow-lg active:scale-95">
              <Pause size={32} fill="currentColor" />
            </button>
          )}
          {t.status === 'paused' && (
            <>
              <button onClick={t.resume} aria-label={tr('วิ่งต่อ', 'Resume')} className="grid size-20 place-items-center rounded-full bg-accent-fill text-white shadow-lg active:scale-95">
                <Play size={32} fill="currentColor" />
              </button>
              <button onClick={onFinish} aria-label={tr('จบและบันทึก', 'Finish & save')} className="grid size-20 place-items-center rounded-full bg-good-fill text-white shadow-lg active:scale-95">
                <Check size={32} />
              </button>
            </>
          )}
        </div>
        {t.status === 'paused' && (
          <div className="flex items-center justify-between text-sm">
            <label className="flex items-center gap-2 text-muted">
              <input type="checkbox" className="size-4 accent-accent" checked={t.autoPause} onChange={e => t.setAutoPause(e.target.checked)} /> {tr('หยุดอัตโนมัติ', 'Auto-pause')}
            </label>
            <button className="text-bad" onClick={async () => (await ask(tr('ระยะและเวลาที่บันทึกไว้จะหายไป', 'The recorded distance and time will be lost.'), { title: tr('ทิ้งการวิ่งนี้?', 'Discard this run?'), ok: tr('ทิ้ง', 'Discard'), danger: true })) && onDiscard()}>{tr('ทิ้งการวิ่งนี้', 'Discard run')}</button>
          </div>
        )}
      </div>
    </div>
    </Portal>
  )
}

function Splits({ splits, fiveK }: { splits: number[]; fiveK?: number }) {
  const tr = useT()
  const fastest = Math.min(...splits)
  const slowest = Math.max(...splits)
  return (
    <div className="rounded-2xl bg-raised p-3">
      <div className="mb-2 flex justify-between text-xs text-muted"><span>{tr('เพซรายกิโล', 'Pace per km')}</span><span>{tr('นาที/กม.', 'min/km')}</span></div>
      <ul className="space-y-1.5">
        {splits.map((s, i) => (
          <li key={i} className="grid grid-cols-[3rem_1fr_1.25rem_3rem] items-center gap-2 text-sm">
            <span className="text-muted">{tr('กม.', 'km')} {i + 1}</span>
            <span className="h-2.5 overflow-hidden rounded-full bg-body">
              {/* แท่งยาว = เร็ว, สี = โซนเพซ */}
              <span className={cx('block h-full rounded-full', !fiveK && (s === fastest ? 'bg-good-fill' : 'bg-run-fill'))}
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
  const tr = useT()
  const kmUp = useCountUp(run.km)
  const fix = remeasure(run)
  const secUp = useCountUp(run.seconds)
  const [editing, setEditing] = useState(false)
  const [sharing, setSharing] = useState(false)
  useBackClose(onClose)
  const series = run.route && run.times ? paceSeries(run.route, run.times) : []
  const sa = splitAnalysis(run.splits)
  // "หลงความเร็ว" (ครูดิน): วิ่งเบาเร็วกว่าโซนเบา — เทียบเฉพาะเมื่อโซนคิดจากผลวิ่งเต็มที่ (fiveK มาจาก zoneRef)
  const tooFast = easyTooFast(run, fiveK ? fiveK * 1.2 : undefined)
  const saText = sa && {
    // เร็วขึ้นเกิน 10% มักแปลว่าช่วงแรกเดิน/วอร์มอัพ มากกว่าการคุมแรง
    negative: sa.diffPct < -10
      ? { t: tr('ครึ่งหลังเร็วขึ้นมาก', 'Much faster second half'), c: 'text-run', d: tr(`เร็วขึ้น ${Math.abs(sa.diffPct).toFixed(1)}% — ช่วงแรกน่าจะเป็นการวอร์มอัพหรือเดิน`, `${Math.abs(sa.diffPct).toFixed(1)}% faster — the start was probably a warm-up or walk`) }
      : { t: 'Negative split', c: 'text-good', d: tr(`ครึ่งหลังเร็วกว่าครึ่งแรก ${Math.abs(sa.diffPct).toFixed(1)}% — คุมแรงได้ดี`, `Second half ${Math.abs(sa.diffPct).toFixed(1)}% faster — well paced`) },
    even: { t: 'Even split', c: 'text-run', d: tr('สองครึ่งเพซใกล้กัน — สม่ำเสมอดี', 'Both halves at a similar pace — nicely even') },
    positive: { t: 'Positive split', c: 'text-warn', d: tr(`ครึ่งหลังช้าลง ${sa.diffPct.toFixed(1)}% — ลองออกตัวช้าลงอีกนิด`, `Second half ${sa.diffPct.toFixed(1)}% slower — try starting a bit easier`) },
  }[sa.kind]
  return (
    <Portal>
    <div className="fixed inset-0 z-50 flex animate-fade-in items-end justify-center bg-black/50 sm:items-center" onClick={onClose}>
      <div className="max-h-[92dvh] w-full max-w-lg animate-sheet-up overflow-y-auto rounded-t-3xl bg-card p-4 pb-[calc(var(--sab)+1rem)] sm:animate-fade-up sm:rounded-3xl" onClick={e => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <div className="font-bold">{tr(runKinds[run.kind], runKindsEn[run.kind])} · {niceDate(run.date)}</div>
            <div className="text-xs text-muted">{run.source === 'gps' ? tr('บันทึกด้วย GPS', 'Recorded with GPS') : run.source === 'gpx' ? tr('นำเข้าจากไฟล์ GPX', 'Imported from GPX') : tr('กรอกเอง', 'Entered manually')}</div>
          </div>
          <span className="flex gap-2">
            {run.route && run.route.length > 1 && (
              <button onClick={() => void saveGpx(run).catch(() => notify(tr('ส่งออกไม่สำเร็จ', 'Export failed'), 'bad'))} aria-label={tr('ส่งออก GPX (Strava)', 'Export GPX (Strava)')} title={tr('ส่งออก GPX (Strava)', 'Export GPX (Strava)')} className="grid size-9 place-items-center rounded-full bg-raised"><FileDown size={17} /></button>
            )}
            <button onClick={() => setSharing(true)} aria-label={tr('แชร์เป็นรูป', 'Share as image')} className="grid size-9 place-items-center rounded-full bg-raised"><Share2 size={17} /></button>
            <button onClick={onClose} aria-label={tr('ปิด', 'Close')} className="grid size-9 place-items-center rounded-full bg-raised"><X size={18} /></button>
          </span>
        </div>
        {sharing && <ShareRunSheet run={run} onClose={() => setSharing(false)} />}
        {run.route && run.route.length > 1 && <Map route={run.route} className="mb-3 h-56" />}
        <div className="mb-3 grid grid-cols-3 gap-2 text-center">
          <Stat label={tr('ระยะ', 'Distance')} value={kmUp.toFixed(2)} sub={tr('กม.', 'km')} accent />
          <Stat label={tr('เวลาเคลื่อนที่', 'Moving time')} value={formatDuration(secUp)} sub={run.elapsedSeconds ? `${tr('รวม', 'total')} ${formatDuration(run.elapsedSeconds)}` : undefined} />
          <Stat label={tr('เพซเฉลี่ย', 'Avg pace')} value={formatPace(run.seconds, run.km)} sub={tr('นาที/กม.', 'min/km')} />
        </div>
        {run.guide && (
          <p className={cx('mb-3 flex items-center gap-2 rounded-xl p-2.5 text-sm font-semibold', run.guide.finished ? 'bg-good/15 text-good' : 'bg-raised text-ink')}>
            <ListChecks size={16} className="shrink-0" />
            {run.guide.finished ? tr(`ทำครบตามแผน (วิ่ง ${run.guide.work} ช่วง)`, `Workout completed (${run.guide.work} reps)`) : tr(`ทำชุดซ้อมได้ ${run.guide.work}/${run.guide.total} ช่วง — ร่างกายไม่พร้อมก็หยุดได้ ไม่ต้องฝืน วันหลังยังมี`, `${run.guide.work}/${run.guide.total} reps done — stopping when your body says no is fine`)}
          </p>
        )}
        {tooFast && (
          <p className="mb-3 rounded-xl bg-warn/15 p-2.5 text-sm text-warn">{tr(`วิ่งเบาเร็วกว่าโซนเบา ~${tooFast} วิ/กม. — วันเบาควรเบาจริง วันวิ่งเร็วจะได้มีแรง ("หลงความเร็ว" เป็นสาเหตุเจ็บที่พบบ่อย)`, `Easy run ~${tooFast} s/km faster than the easy zone — keep easy days easy so fast days have quality (chasing pace is a common injury cause)`)}</p>
        )}
        {fix && (
          <div className="mb-3 rounded-xl bg-warn/15 p-3 text-sm text-warn">
            <p>{tr(`ระยะตามเส้นทางคือ ${fix.km.toFixed(2)} กม. แต่บันทึกไว้ ${run.km.toFixed(2)} กม. — แอปก่อน v2.26 นับช่วงเดินขาด`, `The route measures ${fix.km.toFixed(2)} km but ${run.km.toFixed(2)} km was saved — versions before v2.26 missed walking sections`)}</p>
            <Button size="sm" className="mt-2" onClick={() => onUpdate({ km: fix.km, splits: fix.splits })}>{tr('ใช้ระยะตามเส้นทาง', 'Use route distance')}</Button>
          </div>
        )}
        {/* วัดระยะใหม่ก่อน — ระยะที่ขาดทำให้เพซดูช้าเหมือนเดิน */}
        {!fix && looksLikeWalk(run) && (
          <div className="mb-3 rounded-xl bg-warn/15 p-3 text-sm text-warn">
            <p>{tr(`เพซเฉลี่ย ${formatPace(run.seconds, run.km)} /กม. ช้ากว่าการวิ่ง — ถ้ารอบนี้คือการเดิน บันทึกเป็น "เดิน" จะไม่นับรวมเป็นระยะวิ่ง (ยังนับเป็นวันที่ได้ออกกำลังกาย)`, `Average pace ${formatPace(run.seconds, run.km)} /km is slower than running — if this was a walk, mark it so it won't count as running distance (still an active day)`)}</p>
            <Button size="sm" className="mt-2" onClick={() => onUpdate({ kind: 'walk' })}>{tr('เปลี่ยนเป็นเดิน', 'Mark as walk')}</Button>
          </div>
        )}
        {run.gapSeconds ? <p className="mb-3 rounded-xl bg-warn/15 p-2 text-xs text-warn">{tr(`ปิดจอรวม ${formatDuration(run.gapSeconds)} — ระยะช่วงนั้นเป็นค่าประมาณ`, `Screen off for ${formatDuration(run.gapSeconds)} — distance there is estimated`)}</p> : null}
        <RunAchievements run={run} runs={runs} />
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
              <div className="text-sm font-bold">{tr('ความสม่ำเสมอ', 'Consistency')} {sa.cv < 3 ? tr('ดีมาก', 'great') : sa.cv < 6 ? tr('ดี', 'good') : tr('แกว่ง', 'uneven')}</div>
              <div className="text-[11px] leading-snug text-muted">{tr(`เพซรายกิโลต่างกันเฉลี่ย ${sa.cv.toFixed(1)}% · เร็วสุด กม. ${sa.fastest + 1}`, `Km paces vary ${sa.cv.toFixed(1)}% on average · fastest km ${sa.fastest + 1}`)}</div>
            </div>
          </div>
        )}
        {run.splits && run.splits.length > 0 && <Splits splits={run.splits} fiveK={fiveK} />}
        <div className="mt-3"><ElevationCard run={run} onUpdate={onUpdate} /></div>
        <MatchedRuns run={run} runs={runs} />
        <div className="mt-3 rounded-2xl bg-raised p-3"><RpePicker value={run.rpe} onPick={rpe => onUpdate({ rpe })} /></div>
        <div className="mt-3"><PhotoStrip kind="run" refId={run.id} date={run.date} label={tr('รูปการวิ่ง', 'Run photos')} /></div>
        <Collapse open={editing}>
          <EditRun run={run} onSave={patch => { onUpdate(patch); setEditing(false) }} />
        </Collapse>
        <div className="mt-3 flex gap-2">
          <Button variant="soft" size="sm" onClick={() => setEditing(!editing)}><Pencil size={14} /> {editing ? tr('ยกเลิกแก้ไข', 'Cancel edit') : tr('แก้ไข', 'Edit')}</Button>
          <Button variant="danger" size="sm" onClick={async () => (await ask(tr('ลบการวิ่งนี้ออกจากประวัติ?', 'Delete this run from history?'), { ok: tr('ลบ', 'Delete'), danger: true })) && onDelete()}><Trash2 size={14} /> {tr('ลบ', 'Delete')}</Button>
        </div>
      </div>
    </div>
    </Portal>
  )
}

function ManualEntry({ onSave }: { onSave: (r: Run) => void }) {
  const tr = useT()
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
      <DateInput label={tr('วันที่', 'Date')} value={date} onChange={setDate} />
      <SelectInput label={tr('ประเภท', 'Type')} value={kind} onChange={setKind} options={Object.entries(runKinds).map(([k, v]) => ({ value: k as Run['kind'], label: tr(v, runKindsEn[k as Run['kind']]) }))} />
      <NumberInput label={tr('ระยะ', 'Distance')} unit={tr('กม.', 'km')} step={0.1} value={km} onChange={setKm} placeholder="5.0" />
      <NumberInput label={tr('เวลา', 'Time')} unit={tr('นาที', 'min')} step={1} value={min} onChange={setMin} placeholder="30" />
      <Button className="col-span-2" onClick={add}>{tr('บันทึก', 'Save')}</Button>
    </div>
  )
}

function WeeklyBars({ runs, target }: { runs: Run[]; target: number }) {
  const tr = useT()
  const [hover, setHover] = useState<number | null>(null)
  const current = weekStart(today())
  const weeks = Array.from({ length: 8 }, (_, i) => addDays(current, (i - 7) * 7))
  const totals = weeks.map(w => runsOnly(runs).filter(r => weekStart(r.date) === w).reduce((s, r) => s + r.km, 0))
  const max = Math.max(target, 1, ...totals) * 1.15
  const W = 320, H = 140, pad = 22, bw = (W - pad) / weeks.length
  const y = (v: number) => H - pad - (v / max) * (H - pad - 8)

  return (
    <div>
      <div className="mb-1 h-5 text-right text-sm tabular-nums">{hover !== null ? tr(`สัปดาห์ ${shortDate(weeks[hover])}: ${totals[hover].toFixed(1)} กม.`, `Week of ${shortDate(weeks[hover])}: ${totals[hover].toFixed(1)} km`) : ''}</div>
      <svg viewBox={`0 0 ${W} ${H}`} className="block w-full" role="img" aria-label={tr('กราฟระยะวิ่งรายสัปดาห์', 'Weekly running distance chart')}>
        {target > 0 && (
          <g>
            <line x1={pad} x2={W} y1={y(target)} y2={y(target)} className="stroke-muted" strokeDasharray="4 4" />
            <text x={W - 2} y={y(target) - 4} textAnchor="end" className="fill-muted text-[9px]">{tr('เป้า', 'Goal')} {target}</text>
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
  const tr = useT()
  const trend = useMemo(() => predictionTrend(runs, 12), [runs])
  const cs = useMemo(() => criticalSpeed(runs), [runs])
  const [pick, setPick] = useState<RaceKey>('tenK')
  const [goals, setGoal] = useRaceGoals()
  const [draft, setDraft] = useState('')
  if (!est)
    return (
      <Card title={<span className="flex items-center gap-2"><Gauge size={18} className="text-run" /> {tr('เพซแนะนำ', 'Suggested paces')}</span>}>
        <p className="text-sm text-muted">{tr('เวลาคาดการณ์ 5K–มาราธอนและโซนเพซต้องใช้การวิ่งต่อเนื่อง ≥3 กม. ที่เพซเร็วกว่า 10:00/กม. (วิ่งสลับเดินและวิ่งช้ากว่านี้ไม่นับ เพราะจะคำนวณผิด) — ระหว่างนี้ดูเวลาจบงานแข่งโดยประมาณด้านบน', '5K–marathon predictions and pace zones need a continuous run of ≥3 km faster than 10:00/km (run-walk and slower runs would give wrong numbers) — meanwhile see the estimated race finish above')}</p>
      </Card>
    )
  // เทียบกับ 4 สัปดาห์ก่อน: ติดลบ = เร็วขึ้น
  const before = trend.at(-5)
  const goal = goals[pick]
  const saveGoal = () => { setGoal(pick, parseDuration(draft)); setDraft('') }
  return (
    <Card title={<span className="flex items-center gap-2"><Gauge size={18} className="text-run" /> {tr('เวลาคาดการณ์ & โซนเพซ', 'Predictions & pace zones')}</span>}>
      {/* ยังไม่มีผลวิ่งเต็มที่: ตัวเลขคิดจากวิ่งเบา (ช้ากว่าจริง) — บอกก่อน และไม่แสดงโซน/ความเร็ววิกฤตที่จะผิด */}
      {est.from.easy && (
        <div className="mb-3 flex items-center gap-2 rounded-xl bg-warn/10 p-3 text-sm text-warn">
          <span className="flex-1">{tr('ยังไม่มีผลวิ่งเต็มที่ — เวลาด้านล่างคิดจากวิ่งเบา เวลาจริงน่าจะเร็วกว่านี้ วิ่งทดสอบ 5K เมื่อวิ่งต่อเนื่องได้แล้ว', 'No all-out run yet — times below come from an easy run, so you’re probably faster. Do a 5K test once you can run continuously')}</span>
          <Button size="sm" variant="soft" onClick={onTrial}>{tr('ทดสอบ 5K', '5K test')}</Button>
        </div>
      )}
      {!est.from.easy && daysBetween(est.from.date, today()) > 42 && (
        <div className="mb-3 flex items-center gap-2 rounded-xl bg-run/10 p-3 text-sm text-run">
          <span className="flex-1">{tr('ผลที่ใช้คำนวณเก่าเกิน 6 สัปดาห์ — วิ่งทดสอบ 5K เพื่ออัปเดตโซนและเวลาคาดการณ์', 'The source result is over 6 weeks old — run a 5K test to update zones and predictions')}</span>
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
        ) : (
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
        {est.stale && tr(' (เกิน 2 เดือนแล้ว — วิ่งเต็มที่สักครั้งเพื่ออัปเดต)', ' (over 2 months old — do one hard run to update)')}
        {est.from.easy && tr(' (เป็นวิ่งเบา เวลาจริงน่าจะเร็วกว่านี้ — วิ่งทดสอบ 5K เพื่อให้แม่นขึ้น)', ' (an easy run — you’re probably faster; a 5K test makes it accurate)')} · {tr(`ฟูลคิดจากระยะซ้อม ~${Math.round(est.weeklyKm)} กม./สัปดาห์ด้วย`, `marathon also uses your ~${Math.round(est.weeklyKm)} km/week`)}
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

function BestEfforts({ runs }: { runs: Run[] }) {
  const tr = useT()
  const [openPb, setOpenPb] = useState<string | null>(null)
  if (!runs.length) return null
  const pbs = personalBests(runs).filter(p => p.best)
  const longest = runsOnly(runs).reduce((m, r) => Math.max(m, r.km), 0)
  return (
    <Card title={<span className="flex items-center gap-2"><Trophy size={18} className="text-warn" /> {tr('สถิติของฉัน', 'My stats')}</span>}>
      <div className="grid grid-cols-3 gap-2 text-center">
        <Stat label={tr('ระยะรวม', 'Total')} value={runsOnly(runs).reduce((s, r) => s + r.km, 0).toFixed(1)} sub={tr('กม.', 'km')} />
        <Stat label={tr('จำนวนครั้ง', 'Runs')} value={runsOnly(runs).length} sub={tr('ครั้ง', 'times')} />
        <Stat label={tr('ไกลสุด', 'Longest')} value={longest.toFixed(1)} sub={tr('กม.', 'km')} />
      </div>
      {pbs.length > 0 && <div className="mt-3 text-xs font-semibold text-muted">{tr('เวลาเร็วสุดแต่ละระยะ', 'Best efforts')}</div>}
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

// แก้ไขข้อมูลการวิ่ง — ระยะ/เวลาแก้ได้เฉพาะที่กรอกเอง (การวิ่งที่มีเส้นทางคำนวณจาก GPS อยู่แล้ว)
function EditRun({ run, onSave }: { run: Run; onSave: (patch: Partial<Run>) => void }) {
  const tr = useT()
  const [date, setDate] = useState(run.date)
  const [kind, setKind] = useState(run.kind)
  const [km, setKm] = useState(String(run.km))
  const [min, setMin] = useState(String(Math.round((run.seconds / 60) * 10) / 10))
  const [shoes] = useShoes()
  const [shoeId, setShoeId] = useState(run.shoeId ?? '')
  const manual = run.source === 'manual'
  return (
    <div className="mt-3 grid grid-cols-2 gap-2 rounded-2xl bg-raised p-3">
      <DateInput label={tr('วันที่', 'Date')} value={date} onChange={setDate} />
      <SelectInput label={tr('ประเภท', 'Type')} value={kind} onChange={setKind} options={Object.entries(runKinds).map(([k, v]) => ({ value: k as Run['kind'], label: tr(v, runKindsEn[k as Run['kind']]) }))} />
      {manual && <NumberInput label={tr('ระยะ', 'Distance')} unit={tr('กม.', 'km')} step={0.1} value={km} onChange={setKm} />}
      {manual && <NumberInput label={tr('เวลา', 'Time')} unit={tr('นาที', 'min')} value={min} onChange={setMin} />}
      {shoes.length > 0 && (
        <SelectInput label={tr('รองเท้า', 'Shoes')} className="col-span-2" value={shoeId} onChange={setShoeId}
          options={[{ value: '', label: tr('ไม่ระบุ', 'None') }, ...shoes.map(s => ({ value: s.id, label: s.name + (s.retired ? tr(' (เลิกใช้)', ' (retired)') : '') }))]} />
      )}
      <Button className="col-span-2" onClick={() => onSave({
        date, kind, shoeId: shoeId || undefined,
        ...(manual && +km > 0 && +min > 0 ? { km: +km, seconds: Math.round(+min * 60) } : {}),
      })}>{tr('บันทึกการแก้ไข', 'Save changes')}</Button>
    </div>
  )
}

function ShoesCard({ runs }: { runs: Run[] }) {
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
              {st !== 'good' && <p className={cx('mt-1 text-xs', st === 'bad' ? 'text-bad' : 'text-warn')}>{st === 'bad' ? tr('ถึงระยะที่ควรเปลี่ยนแล้ว — ดูพื้นรองเท้าและความรู้สึกตอนวิ่งประกอบ', 'Replacement distance reached — check the soles and how they feel') : tr('ใกล้ถึงระยะเปลี่ยน เริ่มมองหาคู่ใหม่', 'Nearly due — start looking for a new pair')}</p>}
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

/** แผนที่รวมทุกการวิ่ง — ทางที่วิ่งบ่อยเข้มขึ้น */
function HeatmapCard({ runs }: { runs: Run[] }) {
  const tr = useT()
  const { routes, hidden } = useMemo(() => heatmapRoutes(runs), [runs])
  if (routes.length < 2) return null
  return (
    <Card title={<span className="flex items-center gap-2"><MapIcon size={18} className="text-run" /> {tr('แผนที่การวิ่งทั้งหมด', 'All-runs map')}</span>}>
      <Suspense fallback={<div className="h-72 w-full animate-pulse rounded-2xl bg-raised" />}>
        <RouteHeatmap routes={routes} />
      </Suspense>
      <p className="mt-2 text-xs text-muted">{tr(`${routes.length} เส้นทาง — ทางที่วิ่งบ่อยเส้นจะเข้มขึ้น`, `${routes.length} routes — frequent paths are darker`)}{hidden ? tr(` (ไม่รวม ${hidden} ครั้งที่วิ่งที่อื่น)`, ` (excluding ${hidden} runs elsewhere)`) : ''}</p>
    </Card>
  )
}

/** นักวิ่งเงา: ตำแหน่งเราเทียบเงาบนเส้นระยะ + นำ/ตามหลังกี่วินาที */
function GhostCard({ ghost, now, on, setOn }: { ghost: GhostTarget; now: { lead: number; m: number; ghostM: number } | null; on: boolean; setOn: (v: boolean) => void }) {
  const tr = useT()
  const total = ghost.km * 1000
  const pos = (m: number) => `${Math.min(100, Math.max(0, (m / total) * 100))}%`
  const ahead = now && now.lead >= 2
  const behind = now && now.lead <= -2
  return (
    <div className="rounded-2xl bg-card p-3 ring-1 ring-line">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-sm font-bold"><Ghost size={15} className="text-accent" /> {tr('นักวิ่งเงา', 'Ghost runner')}</div>
          <div className="truncate text-xs text-muted">{tr(ghost.label, ghost.labelEn ?? ghost.label)}</div>
        </div>
        <label className="flex shrink-0 items-center gap-1.5 text-xs text-muted">
          <input type="checkbox" className="size-4 accent-accent" checked={on} onChange={e => setOn(e.target.checked)} /> {tr('แข่ง', 'Race')}
        </label>
      </div>
      {on && (
        <>
          <div className={cx('mt-2 text-center text-2xl font-extrabold tabular-nums', ahead ? 'text-good' : behind ? 'text-bad' : 'text-ink')}>
            {now ? tr(ghostText(now.lead), ghostTextEn(now.lead)) : tr('เริ่มเมื่อถึงช่วงวัดเวลา', 'Starts with the timed section')}
          </div>
          <div className="relative mt-3 h-2 rounded-full bg-raised">
            {now && <span className="absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-muted/60 ring-2 ring-card transition-[left] duration-1000 ease-linear" style={{ left: pos(now.ghostM) }} />}
            {now && <span className="absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent-fill ring-2 ring-card transition-[left] duration-1000 ease-linear" style={{ left: pos(now.m) }} />}
          </div>
          <div className="mt-1 flex justify-between text-[10px] text-muted"><span>0</span><span>{ghost.km} {tr('กม.', 'km')}</span></div>
        </>
      )}
    </div>
  )
}
