import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { GuideRunner, stepAnnouncement, type GuideEvent, type GuideState, type Paces, type Step } from './guide'
import { buzz, speak } from './voice'

const KEY = 'activeGuide'
type Saved = { sig: string; state: GuideState }

function load(sig: string): GuideState | null {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Saved | null
    return s?.sig === sig ? s.state : null
  } catch {
    return null
  }
}

/**
 * ตัวคุมเสียงนำระหว่างวิ่ง — ส่ง onTick ให้ useRunTracker แล้วชุดซ้อมจะเริ่มเมื่อเริ่มจับเวลา
 * สถานะเก็บใน localStorage ('activeGuide') ให้กู้ต่อได้ถ้าแอปถูกปิดกลางทาง เหมือน activeRun
 */
export function useGuide(steps: Step[] | null, paces: Paces | undefined, voice: boolean) {
  const sig = steps ? JSON.stringify(steps) : ''
  const runner = useMemo(() => (sig ? new GuideRunner(JSON.parse(sig) as Step[], load(sig)) : null), [sig])
  const [, rerender] = useState(0)
  const opts = useRef({ voice, paces })
  useEffect(() => { opts.current = { voice, paces } })

  const emit = useCallback((g: GuideRunner, events: GuideEvent[]) => {
    try {
      localStorage.setItem(KEY, JSON.stringify({ sig: JSON.stringify(g.steps), state: g.state } satisfies Saved))
    } catch {
      /* ignore */
    }
    if (!events.length) return
    rerender(n => n + 1)
    for (const e of events)
      buzz(e.type === 'done' ? 'done' : e.type === 'warn' ? 'warn' : g.steps[e.index]?.kind === 'work' ? 'hard' : 'easy')
    if (!opts.current.voice) return
    for (const e of events) {
      void speak(
        e.type === 'step' ? stepAnnouncement(g.steps, e.index, opts.current.paces)
          : e.type === 'warn' ? 'อีก 10 วินาที'
            : 'จบชุดซ้อมแล้ว เก่งมาก วิ่งเบา ๆ ต่อ หรือกดพักแล้วจบการวิ่งได้เลย',
      )
    }
  }, [])

  const onTick = useCallback((meters: number, active: boolean) => {
    if (!runner) return
    if (!runner.state.started) {
      if (active) emit(runner, runner.start(Date.now(), meters))
      return
    }
    emit(runner, runner.update(Date.now(), meters, active))
  }, [runner, emit])

  return {
    runner,
    onTick,
    skip: (meters: number) => { if (runner) emit(runner, runner.skip(meters)) },
    reset: () => {
      runner?.reset()
      try { localStorage.removeItem(KEY) } catch { /* ignore */ }
    },
  }
}
