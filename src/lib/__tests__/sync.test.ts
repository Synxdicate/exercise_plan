// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest'

// server ปลอม: ตาราง user_data ของผู้ใช้คนเดียว Postgres คืนเวลาแบบ "+00:00" (ไม่ใช่ "Z" ของ JS)
type Row = { key: string; value: unknown; updated_at: string }
const db = new Map<string, Row>()
const pg = (iso: string) => iso.replace('Z', '+00:00')
const upserts: Row[][] = []

vi.mock('../supabase', () => {
  const rows = (keys?: string[]) => [...db.values()].filter(r => !keys || keys.includes(r.key)).map(r => ({ ...r }))
  const select = () => {
    const all = Promise.resolve({ data: rows(), error: null })
    return Object.assign(all, { in: (_c: string, keys: string[]) => Promise.resolve({ data: rows(keys), error: null }) })
  }
  return {
    supabase: {
      from: () => ({
        select,
        upsert: (rs: Row[]) => {
          upserts.push(rs)
          for (const r of rs) db.set(r.key, { key: r.key, value: structuredClone(r.value), updated_at: pg(r.updated_at) })
          return Promise.resolve({ error: null })
        },
        delete: () => ({ eq: () => ({ in: (_c: string, keys: string[]) => { keys.forEach(k => db.delete(k)); return Promise.resolve({ error: null }) } }) }),
      }),
      storage: { from: () => ({}) },
    },
  }
})
vi.mock('../photos', () => ({ syncPhotos: () => Promise.resolve() }))
vi.mock('../errors', () => ({ sendErrors: () => Promise.resolve() }))

const run = (id: string, date: string, extra = {}) => ({ id, date, km: 3, seconds: 1200, kind: 'easy', source: 'gps', splits: [], ...extra })
const T1 = '2026-11-11T11:04:15.252Z'
const T2 = '2026-11-12T10:00:00.000Z'
// รอให้ส่ง (หน่วง 800 มิลลิวินาทีหลังเขียน) และงานต่อเนื่องเสร็จ
const flushAll = async () => { await new Promise(r => setTimeout(r, 900)); for (let i = 0; i < 20; i++) await new Promise(r => setTimeout(r, 0)) }

async function boot(local: Record<string, unknown>) {
  vi.resetModules()
  localStorage.clear()
  for (const [k, v] of Object.entries(local)) localStorage.setItem(k, JSON.stringify(v))
  const storage = await import('../storage')
  const sync = await import('../sync')
  return { ...storage, ...sync }
}

describe('sync: a stale device never overwrites newer server data', () => {
  beforeEach(() => { db.clear(); upserts.length = 0 })

  it('a write made from stale local data merges with runs another device added (the lost 10 Nov run)', async () => {
    db.set('runs', { key: 'runs', value: [run('a', '2026-11-08'), run('new', '2026-11-10')], updated_at: pg(T2) })
    // เครื่องนี้เห็น runs ล่าสุดตอน T1 (ยังไม่มีรอบ 10 พ.ย.) แล้วระบบแก้ขึ้นสะสมของรอบ a ในเครื่องก่อนดึงข้อมูลใหม่
    const s = await boot({ owner: 'u1', runs: [run('a', '2026-11-08')], syncBase: { runs: T1 } })
    await s.startSync('u1') // เปิดแอปทันทีจากข้อมูลในเครื่อง ดึงข้อมูลเบื้องหลัง
    s.setStored('runs', [run('a', '2026-11-08', { elev: { gain: 27, v: 2 } })]) // useCompactRuns เขียนก่อนดึงเสร็จ
    await flushAll()
    const ids = (db.get('runs')!.value as { id: string }[]).map(r => r.id)
    expect(ids).toEqual(['a', 'new'])
    expect((db.get('runs')!.value as { id: string; elev?: { v: number } }[])[0].elev?.v).toBe(2)
    expect((s.readStored('runs') as { id: string }[]).map(r => r.id)).toEqual(['a', 'new'])
  })

  it('when nobody else wrote, a local delete stays deleted (version compared as time, not text)', async () => {
    db.set('runs', { key: 'runs', value: [run('a', '2026-11-08'), run('b', '2026-11-09')], updated_at: pg(T2) })
    const s = await boot({ owner: 'u1', runs: [run('a', '2026-11-08'), run('b', '2026-11-09')], syncBase: { runs: T2 } })
    await s.startSync('u1')
    await flushAll()
    s.setStored('runs', [run('a', '2026-11-08')])
    await flushAll()
    expect((db.get('runs')!.value as { id: string }[]).map(r => r.id)).toEqual(['a'])
    // ลบอีกครั้งหลังการส่งรอบแรก (เวอร์ชันที่จำไว้ = เวลาที่เพิ่งส่ง) ก็ต้องไม่ฟื้น
    s.setStored('runs', [])
    await flushAll()
    expect(db.get('runs')!.value).toEqual([])
  })

  it('settings (single values) keep the local edit on conflict', async () => {
    db.set('raceKm', { key: 'raceKm', value: 10, updated_at: pg(T2) })
    const s = await boot({ owner: 'u1', raceKm: 10, syncBase: { raceKm: T1 } })
    await s.startSync('u1')
    s.setStored('raceKm', 11.55)
    await flushAll()
    expect(db.get('raceKm')!.value).toBe(11.55)
  })

  it('a run deleted on another device is not brought back by a stale device (3-way merge)', async () => {
    // อีกเครื่องลบรอบ b ไปตอน T2; เครื่องนี้เห็นล่าสุดตอน T1 (มี a, b) แล้วแก้ RPE ของ a พร้อมเพิ่มรอบ c
    db.set('runs', { key: 'runs', value: [run('a', '2026-11-08')], updated_at: pg(T2) })
    const s = await boot({ owner: 'u1', runs: [run('a', '2026-11-08'), run('b', '2026-11-09')], syncBase: { runs: T1 }, syncBaseIds: { runs: ['a', 'b'] } })
    await s.startSync('u1')
    s.setStored('runs', [run('a', '2026-11-08', { rpe: 5 }), run('b', '2026-11-09'), run('c', '2026-11-12')])
    await flushAll()
    const v = db.get('runs')!.value as { id: string; rpe?: number }[]
    expect(v.map(r => r.id)).toEqual(['a', 'c'])
    expect(v[0].rpe).toBe(5)
    expect(s.readStored('syncBaseIds')).toEqual({ runs: ['a', 'c'] })
  })
})
