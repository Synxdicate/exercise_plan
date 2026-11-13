import { describe, expect, it, vi } from 'vitest'
vi.mock('../sync', () => ({ exportData: () => ({ data: {} }) }))
import { missingItems } from '../snapshots'
import type { Run, Session } from '../log'

const run = (id: string, date: string) => ({ id, date, km: 3, seconds: 1200, kind: 'easy', source: 'gps' }) as Run
const sess = (id: string, date: string) => ({ id, date, mode: 'gym', dayKey: 'a', title: '', entries: [] }) as Session

describe('missingItems', () => {
  it('lists only runs, sessions and weigh-ins that are gone from current data', () => {
    const cur = { runs: [run('a', '2026-11-08')], sessions: [sess('s1', '2026-11-01')], log: [{ date: '2026-11-01', weight: 64.5 }] }
    const snap = { runs: [run('a', '2026-11-08'), run('lost', '2026-11-10')], sessions: [sess('s1', '2026-11-01'), sess('s2', '2026-11-05')], log: [{ date: '2026-11-01', weight: 64 }, { date: '2026-11-03', weight: 64.2 }] }
    const m = missingItems(cur, snap)
    expect(m.runs.map(r => r.id)).toEqual(['lost'])
    expect(m.sessions.map(s => s.id)).toEqual(['s2'])
    expect(m.log.map(e => e.date)).toEqual(['2026-11-03'])
  })
  it('handles snapshots without some keys', () => {
    expect(missingItems({ runs: [], sessions: [], log: [] }, { runs: null })).toEqual({ runs: [], sessions: [], log: [] })
  })
})
