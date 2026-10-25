import { describe, expect, it } from 'vitest'
import { programs, variants, weekKm, weekPlan } from '../../data/programs'
import { weeklySets } from '../../data/muscles'

const race = ['ten', 'half', 'full'] as const
const running = ['base', ...race] as const

describe('โปรแกรมวิ่ง', () => {
  for (const p of running) {
    const n = programs[p].weeks

    it(`${p}: ระยะต่อสัปดาห์ไม่เพิ่มเกิน 20% จากสัปดาห์ที่มากที่สุดก่อนหน้า (งานวิจัยพบความเสี่ยงที่ >30%)`, () => {
      let peak = 0
      for (let w = 1; w <= n; w++) {
        const km = weekKm(p, w)
        if (peak) expect(km / peak).toBeLessThanOrEqual(1.2)
        peak = Math.max(peak, km)
      }
    })

    if (p !== 'base') it(`${p}: สัปดาห์สุดท้ายคือวันแข่งระยะเต็ม และมี taper ก่อนแข่ง`, () => {
      const race = variants(p, n).gym.at(-1)!
      expect(race.runKind).toBe('race')
      expect(race.targetKm).toBe(programs[p].raceKm)
      const peak = Math.max(...Array.from({ length: n }, (_, i) => weekKm(p, i + 1)))
      // สัปดาห์ก่อนแข่งลดปริมาณ ≥20% และสัปดาห์แข่ง (ไม่รวมวันแข่ง) เหลือไม่เกินครึ่งของพีค
      expect(weekKm(p, n - 1)).toBeLessThanOrEqual(peak * 0.8)
      expect(weekKm(p, n) - race.targetKm!).toBeLessThanOrEqual(peak * 0.5)
    })

    it(`${p}: วิ่งหนัก (tempo/interval) ไม่เกิน 1 ครั้งต่อสัปดาห์ ที่เหลือเป็นวิ่งเบา (Seiler 2010)`, () => {
      for (let w = 1; w <= n; w++) {
        const hard = variants(p, w).gym.filter(d => d.runKind === 'tempo' || d.runKind === 'interval')
        expect(hard.length).toBeLessThanOrEqual(1)
      }
    })

    it(`${p}: ทุกสัปดาห์มี 7 วัน มีวันพักอย่างน้อย 1 วัน และเวทไม่เกิน 2 วัน`, () => {
      for (let w = 1; w <= n; w++) {
        const days = weekPlan(p, w, () => 'gym')
        expect(days).toHaveLength(7)
        expect(days.some(d => d.type === 'rest')).toBe(true)
        expect(days.filter(d => d.type === 'strength').length).toBeLessThanOrEqual(2)
      }
    })
  }

  it('base: วนรอบได้ — ข้ามจากสัปดาห์ลดกลับไปสัปดาห์ 1 เพิ่มไม่เกิน 20% และไม่มีวันแข่ง', () => {
    const n = programs.base.weeks
    expect(weekKm('base', 1) / weekKm('base', n)).toBeLessThanOrEqual(1.2)
    for (let w = 1; w <= n; w++) expect(variants('base', w).gym.some(d => d.runKind === 'race')).toBe(false)
  })

  it('วิ่งแต่ละครั้งไม่ยาวเกิน 110% ของครั้งที่ยาวที่สุดใน 30 วันก่อนหน้า ยกเว้นวันแข่ง (Frandsen 2025)', () => {
    // ระยะวิ่งยาวที่ควรทำได้ก่อนเริ่มแต่ละโปรแกรม (ตามที่เขียนใน summary)
    const base = { base: 5, ten: 5, half: 7, full: 18 } as const
    for (const p of running) {
      const cycles = programs[p].ongoing ? 2 : 1 // โปรแกรมวนรอบ ตรวจรอยต่อรอบด้วย
      const sessions: { day: number; km: number; race: boolean }[] = [{ day: -1, km: base[p], race: false }]
      for (let c = 0; c < cycles; c++) for (let w = 1; w <= programs[p].weeks; w++)
        variants(p, w).gym.forEach((d, i) => { if (d.type === 'run' && d.targetKm) sessions.push({ day: (c * programs[p].weeks + w - 1) * 7 + i, km: d.targetKm, race: d.runKind === 'race' }) })
      for (const s of sessions.slice(1)) {
        if (s.race) continue
        const prev = Math.max(...sessions.filter(x => x.day < s.day && x.day >= s.day - 30).map(x => x.km))
        expect(s.km, `${p} day ${s.day}: ${s.km} vs ${prev}`).toBeLessThanOrEqual(prev * 1.1 + 1e-9)
      }
    }
  })

  it('ไม่วิ่งหนัก/วิ่งยาวในวันถัดจากเวทขา — ผลกระทบอยู่ราว 6–48 ชม. (Doma 2017)', () => {
    const legs = /squat|deadlift|rdl|split|lunge|leg curl|pistol|bridge/i
    for (const p of ['physique', ...running] as const) {
      const weeks = programs[p].weeks
      for (let w = 1; w <= weeks; w++) for (const m of ['gym', 'park'] as const) {
        const days = variants(p, w)[m]
        days.forEach((d, i) => {
          if (d.type !== 'strength' || !d.exercises.some(e => legs.test(e.name))) return
          for (const next of [days[i + 1]].filter(Boolean)) {
            expect(['tempo', 'interval', 'long', 'race'].includes(next.runKind ?? ''), `${p} w${w} ${m}: ${d.day} → ${next.day}`).toBe(false)
          }
        })
      }
    }
  })

  it('โปรแกรมหุ่นในยิม: กล้ามหลักได้ ~10 เซ็ต/สัปดาห์ (Schoenfeld 2017: ≥10 ดีกว่า)', () => {
    const sets = weeklySets(variants('physique', 1).gym)
    for (const m of ['chest', 'lats', 'upperBack', 'quads', 'glutes'] as const) expect(sets[m] ?? 0, m).toBeGreaterThanOrEqual(10)
    for (const m of ['hamstrings', 'sideDelts'] as const) expect(sets[m] ?? 0, m).toBeGreaterThanOrEqual(9)
  })

  it('โปรแกรมหุ่นในสวน: กล้ามใหญ่ได้ ≥ 8 เซ็ต/สัปดาห์', () => {
    const sets = weeklySets(variants('physique', 1).park)
    for (const m of ['chest', 'lats', 'upperBack', 'quads', 'glutes', 'hamstrings'] as const) expect(sets[m] ?? 0, m).toBeGreaterThanOrEqual(8)
  })

  it('ยิมกับสวนต่างกันแค่วันเวท', () => {
    for (const p of ['physique', ...running] as const) {
      const v = variants(p, 3)
      v.gym.forEach((g, i) => {
        if (g.type !== 'strength') expect(v.park[i]).toEqual(g)
        else expect(v.park[i].type).toBe('strength')
      })
    }
  })

  it('weekPlan ใส่ location ตามที่เลือกทีละวัน', () => {
    const days = weekPlan('physique', 1, i => (i === 4 ? 'park' : 'gym'))
    expect(days[0].location).toBe('gym')
    expect(days[4].location).toBe('park')
    expect(days[1].location).toBeUndefined()
  })
})
