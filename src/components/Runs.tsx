import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { CalendarCheck, Check, CircleCheck, FileUp, Gauge, Ghost, History, Pause, Play, Plus, Satellite, TriangleAlert, Volume2, VolumeX, X } from 'lucide-react'
import { GOOD_ACCURACY_M, useRunTracker } from '../lib/gps'
import { useDayText } from '../lib/dayText'
import { useTodayIdx, useDateField } from '../lib/useToday'
import { formatDuration, formatPace, runKinds, runKindsEn, uid, useRuns, type Run } from '../lib/log'
import { useT } from '../lib/i18n'
import { runsOnly } from '../lib/walk'
import { estimate, paceHint } from '../lib/pace'
import { useProgram } from '../lib/program'
import { parseGpx } from '../lib/gpx'
import { defaultShoe, useShoes } from '../lib/shoes'
import { personalBests } from '../lib/analysis'
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
import { DrillsCard } from './Drills'
import { SweatCard } from './Sweat'
import { CooldownSheet } from './Cooldown'
import { CapNote } from './MissedRun'
import { FinishCard } from './Finish'
import { longRunCap } from '../lib/missed'
import { useRemovePhotosFor } from '../lib/photos'
import { HeatCard } from './Heat'
import { heatSlowdown, useWbgtNow } from '../lib/weather'
import { ReadinessSheet } from './Readiness'
import { today, weekStart } from '../lib/date'
import { Badge, Button, Card, Collapse, Portal, Segmented, Stat } from './ui'
import { RunHistory } from './RunHistory'
import { CrossTrainingCard } from './CrossTraining'
import { useRaceGoals } from '../lib/useGoals'
import { ghostLead, ghostMeters, ghostText, ghostTextEn, raceGhost, trialGhost, type Ghost as GhostTarget } from '../lib/ghost'
import { raceKeyOf } from '../lib/racePlan'
import { DateInput, NumberInput, SelectInput } from './Form'
import { cx } from '../lib/cx'
import { ask, notify } from '../lib/dialog'
import { TrainingLog } from './RunExtras'
import { Map, RunDetail, Splits } from './RunDetail'
import { BestEfforts, HeatmapCard, PaceCard, ShoesCard, WeeklyBars } from './RunStats'

// วิ่งทดสอบ 5K (เลือกชนิด "แข่ง" ในวันที่ไม่ใช่วันแข่ง)
const TRIAL = guides.timeTrial()
// เรียกจาก callback ของ GPS เท่านั้น (ไม่ใช่ตอน render)
const clockNow = () => Date.now()

export function Runs() {
  const [runs, setRuns] = useRuns()
  const tr = useT()
  const dt = useDayText()
  const p = useProgram()
  const todayIdx = useTodayIdx() // 0 = จันทร์ เปลี่ยนเองเมื่อข้ามวัน
  const todayRun = p.finished ? undefined : p.plan().filter((d, i) => i === todayIdx && d.type === 'run')[0]
  const kmToday = runsOnly(runs).filter(r => r.date === today()).reduce((s, r) => s + r.km, 0)
  const [kind, setKind] = useState<Run['kind']>(todayRun?.runKind ?? 'easy')
  const est = useMemo(() => estimate(runs), [runs])
  // โซนเพซคิดจากเพซ 5K — ถ้าได้มาจากวิ่งเบา โซนจะผิด (วิ่งเบาปกติถูกจัดเป็น Speed) จึงไม่แสดงโซน
  const zoneRef = est && !est.from.easy ? est.paces.interval : undefined
  // ร้อนกว่าเช้าปกติ: เป้าเพซของโค้ชช้าลงตาม WBGT ตอนนี้ (Ely 2007)
  const wbgtNow = useWbgtNow()
  const heatPct = wbgtNow !== undefined ? heatSlowdown(wbgtNow) : 0
  const heatF = 1 + heatPct / 100
  const paces = useMemo(() => {
    if (!est) return undefined
    if (heatF === 1) return est.paces
    const p: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(est.paces)) p[k] = typeof v === 'number' ? v * heatF : Array.isArray(v) ? v.map(x => x * heatF) : v
    return p as typeof est.paces
  }, [est, heatF])
  const [detail, setDetail] = useState<string | null>(null)
  const [manual, setManual] = useState(false)
  const [checking, setChecking] = useState(false)
  const [cooldown, setCooldown] = useState<Run | null>(null)
  const [voice, setVoice] = usePersisted('voiceCues', true)
  // แท็บย่อยของหน้าวิ่ง (ค่าของเครื่อง) แยกเริ่มวิ่ง/ประวัติ/สถิติ ไม่ให้หน้าเดียวยาวเกินไป
  const [view, setView] = usePersisted<'start' | 'history' | 'stats'>('runsView', 'start')
  const [guideOn, setGuideOn] = usePersisted('guideOn', true)
  // เสียงนำใช้กับชุดซ้อมของวันนี้ เมื่อเลือกชนิดการวิ่งตรงกับแผน
  // วันแข่งตามแผนไม่มีชุดซ้อม เลือก "แข่ง" ในวันอื่นคือวิ่งทดสอบ 5K
  const steps = todayRun?.guide && kind === todayRun.runKind ? todayRun.guide : kind === 'race' && todayRun?.runKind !== 'race' ? TRIAL : null
  const guide = useGuide(guideOn ? steps : null, paces, voice)
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
  // โค้ชเสียงคุมเพซ เรียกจาก onTick (callback ของ GPS) จึงเตือนได้แม้ปิดจอ
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
      // เปลี่ยนช่วง: เพซ 30 วิล่าสุดยังเป็นของช่วงก่อน รอให้นิ่งก่อนค่อยประเมิน
      coachStep.current = { index: r!.state.index, at: now }
      coach.current.reset()
    }
    const target = step?.kind === 'work' ? paceSec(step, paces) : null
    const settling = step && now - coachStep.current.at < 25_000
    const band = settling ? null
      : target ? workBand(target)
      // คำนวณจากวิ่งเบา: โซน Easy จะช้ากว่าเพซวิ่งเบาจริงของเรา ไม่เตือนให้ช้าลง
      : !est.from.easy && (step ? step.pace === 'easy' : kind === 'easy' || kind === 'long') ? easyBand(paces!.easy[0])
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
    if (ghostNow && ghostOn) notify(ghostNow.lead >= 0 ? tr(`ชนะเงา ${Math.round(ghostNow.lead)} วินาที`, `Beat the ghost by ${Math.round(ghostNow.lead)} s`) : tr(`ช้ากว่าเงา ${Math.round(-ghostNow.lead)} วินาที ครั้งหน้าเอาใหม่`, `${Math.round(-ghostNow.lead)} s behind the ghost — next time`), ghostNow.lead >= 0 ? 'good' : 'info')
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
        <GuideCard steps={steps} runner={guide.runner} meters={t.meters} paces={paces}
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
      <section className="space-y-3 rounded-2xl bg-run-fill p-4 text-white shadow-sm">
        <div>
          <div className="text-sm">{tr('สัปดาห์นี้', 'This week')}</div>
          <div className="text-4xl font-extrabold tabular-nums">{kmThisWeek.toFixed(1)}<span className="ml-1 text-xl font-semibold">{target ? `/ ${target} ${tr('กม.', 'km')}` : tr('กม.', 'km')}</span></div>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-white/25">
          <div className="h-full rounded-full bg-white" style={{ width: `${target ? Math.min(100, (kmThisWeek / target) * 100) : 0}%` }} />
        </div>
        {todayRun && kmToday > 0 && (
          <div className="flex items-center gap-2 rounded-2xl bg-black/15 p-3 text-sm font-bold">
            <CircleCheck size={18} className="shrink-0" /> {tr(`วันนี้วิ่งแล้ว ${kmToday.toFixed(2)} กม.`, `Ran ${kmToday.toFixed(2)} km today`)} · {dt.title(todayRun)}
          </div>
        )}
        {todayRun && !kmToday && (
          <div className="flex items-start gap-2 rounded-2xl bg-black/15 p-3 text-sm">
            <CalendarCheck size={18} className="mt-0.5 shrink-0" />
            <div>
              <div className="font-bold">{tr('แผนวันนี้', "Today's plan")}: {dt.title(todayRun)} · {todayRun.targetKm ? `${todayRun.targetKm} ${tr('กม.', 'km')}` : dt.duration(todayRun)}</div>
              <div className="">{dt.cue(todayRun.exercises[0]?.cue ?? '')}</div>
              {paceHint(est, todayRun.runKind, todayRun.title) && <div className="font-semibold">{paceHint(est, todayRun.runKind, todayRun.title)}</div>}
              <CapNote day={todayRun} date={today()} className="mt-1.5 flex items-start gap-1.5 rounded-xl bg-white/20 p-2 font-semibold" />
            </div>
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          {(Object.keys(runKinds) as Run['kind'][]).map(k => (
            <button key={k} onClick={() => setKind(k)}
              className={cx('rounded-full px-3 py-1 text-sm font-semibold', kind === k ? 'bg-white text-accent-fill' : 'bg-black/15')}>
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
          {heatPct > 0 && kind !== 'walk' && est && (
            <p className="-mt-1 rounded-xl bg-warn/10 px-3 py-2 text-sm text-warn">
              {tr(`ร้อนกว่าปกติ (WBGT ${Math.round(wbgtNow!)}°) วันนี้โค้ชเพซตั้งเป้าช้าลง ${heatPct}% ให้ได้ผลการซ้อมเท่าเดิม`, `Hotter than usual (WBGT ${Math.round(wbgtNow!)}°) — the pace coach targets ${heatPct}% slower today for the same training effect`)}
            </p>
          )}
          {kind !== 'walk' && <DrillsCard kind={kind} />}
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
          : tr('บนเว็บ GPS ทำงานเฉพาะตอนเปิดหน้านี้ค้างไว้ ปิดจอได้ต้องใช้แอป Android', 'On the web, GPS only works while this page stays open — use the Android app to record with the screen off')}
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
    // GPS หายมาก่อนหยุดอัตโนมัติ ไม่มีจุดใหม่ก็ดูเหมือน "หยุดนิ่ง" ทั้งที่ยังวิ่งอยู่
    t.signalLost ? tr('สัญญาณ GPS หาย ออกไปที่โล่ง ระยะช่วงนี้อาจคลาดเคลื่อน', 'GPS signal lost — move to open sky; distance here may be off') :
    t.status === 'autopaused' ? tr('หยุดอัตโนมัติ เริ่มวิ่งต่อแล้วจะนับเวลาเอง', 'Auto-paused — timing resumes when you move') :
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

function ManualEntry({ onSave }: { onSave: (r: Run) => void }) {
  const tr = useT()
  const [date, setDate] = useDateField()
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
