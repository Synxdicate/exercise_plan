import { describe, expect, it } from 'vitest'
import { aidPlan, longestAidGap, parseAid } from '../aid'
import { climateFrom, climateRanges, raceHours } from '../raceClimate'
import { longestWaterGap, overpassQuery, stopsAlong, type OsmElement } from '../stops'
import type { Point } from '../geo'

// เส้นตรงไปทางตะวันออก ~5 กม. (0.009° ≈ 1 กม. ที่ละติจูด 13.7)
const line: Point[] = Array.from({ length: 51 }, (_, i) => [13.7, 100.5 + i * 0.000925])

describe('stops along a route (OSM)', () => {
  it('places each POI at its km along the route, drops far ones, sorts', () => {
    const els: OsmElement[] = [
      { type: 'node', id: 1, lat: 13.7005, lon: 100.5 + 0.0185, tags: { shop: 'convenience', brand: '7-Eleven' } },
      { type: 'node', id: 2, lat: 13.7, lon: 100.5 + 0.0037, tags: { amenity: 'toilets' } },
      { type: 'way', id: 3, center: { lat: 13.7, lon: 100.5 + 0.04 }, tags: { amenity: 'drinking_water', name: 'ตู้น้ำ' } },
      { type: 'node', id: 4, lat: 13.71, lon: 100.51, tags: { amenity: 'drinking_water' } }, // ~1 กม. จากเส้นทาง
      { type: 'node', id: 5, lat: 13.7, lon: 100.51, tags: { amenity: 'bench' } },
    ]
    const s = stopsAlong(line, els)
    expect(s.map(x => x.kind)).toEqual(['toilet', 'shop', 'water'])
    expect(s[1]).toMatchObject({ name: '7-Eleven', off: 60 })
    expect(s[1].km).toBeCloseTo(2, 0)
    expect(s[2].name).toBe('ตู้น้ำ')
  })

  it('longest stretch without water counts start and finish; toilets are not water', () => {
    expect(longestWaterGap([], 5)).toEqual({ from: 0, to: 5, km: 5 })
    const stops = [{ kind: 'toilet' as const, km: 0.4, off: 0, name: '', at: line[0] }, { kind: 'shop' as const, km: 2, off: 0, name: '', at: line[0] }, { kind: 'water' as const, km: 3, off: 0, name: '', at: line[0] }]
    expect(longestWaterGap(stops, 8)).toEqual({ from: 3, to: 8, km: 5 })
  })

  it('builds a line query with the 150 m radius', () => {
    const q = overpassQuery(line)
    expect(q).toContain('around:150,13.70000,100.50000')
    expect(q).toContain('[amenity=drinking_water]')
    expect(q).toContain('[shop=convenience]')
  })
})

describe('race aid stations', () => {
  it('parses km lists in any separator, keeps them on course', () => {
    expect(parseAid('2.5, 5 7.5;10 5', 10)).toEqual([2.5, 5, 7.5])
    expect(parseAid('กม. 3 / 6', 10)).toEqual([3, 6])
  })
  it('drinks enough at each station for the stretch to the next one', () => {
    // 10 กม. ใน 60 นาที ต้องดื่ม 500 มล./ชม.: 2.5 กม. = 15 นาที = 125 → 150 (ปัด 50) · 5 กม. ถึงเส้นชัย = 250
    expect(aidPlan([2.5, 5], 10, 3600, 500)).toEqual([{ km: 2.5, ml: 150, untilKm: 5 }, { km: 5, ml: 250, untilKm: 10 }])
    expect(longestAidGap([2.5, 5], 10)).toEqual({ from: 5, to: 10, km: 5 })
    expect(longestAidGap([], 10).km).toBe(10)
  })
})

describe('race-day climate', () => {
  it('fetches the same dates ±2 days in each of the last 5 years', () => {
    const r = climateRanges('2027-01-10')
    expect(r).toHaveLength(5)
    expect(r[0]).toEqual(['2026-01-08', '2026-01-12'])
    expect(r[4]).toEqual(['2022-01-08', '2022-01-12'])
  })
  it('race hours cover the start to the expected finish', () => {
    expect(raceHours('05:30', 65)).toEqual([5, 6])
    expect(raceHours('06:00', 20)).toEqual([6])
  })
  it('averages only the race hours and adds WBGT + slowdown', () => {
    const day = (t: number, rh: number) => ({
      time: Array.from({ length: 24 }, (_, h) => `2026-01-10T${String(h).padStart(2, '0')}:00`),
      temperature_2m: Array.from({ length: 24 }, (_, h) => (h === 6 ? t : 35)),
      relative_humidity_2m: Array.from({ length: 24 }, () => rh),
    })
    const c = climateFrom([day(24, 80), day(26, 80)], [6])!
    expect(c).toMatchObject({ temp: 25, rh: 80, years: 2 })
    expect(c.wbgt).toBeGreaterThan(22)
    expect(c.wbgt).toBeLessThan(25)
    expect(climateFrom([day(24, 80)], [23])).toMatchObject({ temp: 35 })
    expect(climateFrom([], [6])).toBeNull()
  })
})
