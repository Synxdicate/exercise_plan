import { expect, test } from '@playwright/test'
import { loopRoute, seed } from './helpers'

// เปิดทุกแท็บ (และแท็บย่อย) ในทุกโปรแกรม หลายช่วงเวลา — ก่อนเริ่ม/ระหว่าง/วันแข่ง/หลังแข่ง ต้องไม่มี error
const { route, times } = loopRoute()
const runs = ['2026-12-20', '2026-12-27', '2027-01-03', '2027-01-10'].map((date, i) => ({ id: `r${i}`, date, km: 4 + i, seconds: (4 + i) * 400, kind: i === 3 ? 'race' : i === 2 ? 'walk' : 'easy', source: 'gps', route, times, splits: [400, 400, 400, 400] }))
const cases: [string, string, string?][] = [
  ['mini', '2026-10-28', '2027-01-10'], ['mini', '2027-01-10T06:00', '2027-01-10'], ['mini', '2027-01-20', '2027-01-10'],
  ['ten', '2026-12-15', '2027-01-10'], ['half', '2026-12-15'], ['full', '2026-12-15', '2027-03-01'],
  ['five', '2026-12-15'], ['start', '2026-12-15'], ['physique', '2026-12-15'], ['base', '2026-12-15'], ['strength', '2026-12-15'],
]
for (const [program, at, raceDate] of cases) test(`smoke ${program} @ ${at}${raceDate ? ` race ${raceDate}` : ''}`, async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', e => errors.push(e.message))
  await page.clock.install({ time: new Date(`${at.length > 10 ? at : `${at}T08:00`}:00+07:00`) })
  await seed(page, { program, programStart: '2026-11-02', ...(raceDate && { raceDate }), runs: runs.filter(r => r.date <= at.slice(0, 10)) })
  let clicked = 0
  for (const i of [0, 1, 2, 3, 4]) {
    await page.locator('nav button').nth(i).click()
    await expect(page.locator('[data-tab-loading]')).toHaveCount(0) // แท็บโหลดแยกไฟล์
    // แท็บย่อยชุดแรกของหน้า (วิ่ง: เริ่ม/ประวัติ/สถิติ, บันทึก: ปฏิทิน/เวท/ฟิตเนส/น้ำหนัก, อาหาร: เมนู/ร้าน/วัตถุดิบ)
    const subs = page.locator('main [data-segmented]').first().locator('button')
    for (let j = 0; j < await subs.count(); j++) { await subs.nth(j).click(); clicked++ }
  }
  expect(clicked).toBeGreaterThan(8)
  await expect(page.getByText('มีบางอย่างผิดพลาด')).toHaveCount(0)
  expect(errors).toEqual([])
})

// ภาษาอังกฤษ: ทุกแท็บและแท็บย่อยต้องไม่พัง และหน้าแหล่งอ้างอิงเป็นภาษาอังกฤษ
test('smoke English', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', e => errors.push(e.message))
  await page.clock.install({ time: new Date('2027-01-03T08:00:00+07:00') })
  await seed(page, { lang: 'en', program: 'mini', programStart: '2026-11-02', raceDate: '2027-01-10', runs: runs.filter(r => r.date <= '2027-01-03') })
  for (const i of [0, 1, 2, 3, 4]) {
    await page.locator('nav button').nth(i).click()
    await expect(page.locator('[data-tab-loading]')).toHaveCount(0)
    const subs = page.locator('main [data-segmented]').first().locator('button')
    for (let j = 0; j < await subs.count(); j++) await subs.nth(j).click()
  }
  await expect(page.getByText('Something went wrong')).toHaveCount(0)
  expect(errors).toEqual([])
})
