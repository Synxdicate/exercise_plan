import { expect, test } from '@playwright/test'
import { nav, seed } from './helpers'

test('ดริลล์ก่อนวิ่ง: เปิดการ์ด ดูวิธีทำ เล่นแล้วข้ามจนจบ', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', e => errors.push(e.message))
  await seed(page, { program: 'mini', programStart: '2026-11-02' })
  await nav(page, 'วิ่ง')
  await page.getByRole('button', { name: /ดริลล์ก่อนวิ่ง/ }).click()
  await page.getByRole('button', { name: 'ก่อนวิ่งเร็ว' }).click()
  await page.getByRole('button', { name: /สเตรตเลกบาวด์/ }).click()
  await expect(page.getByRole('img', { name: /Straight-Leg Bound/ })).toBeVisible()
  if (process.env.SHOTS) await page.screenshot({ path: 'screens/drills-card.png', fullPage: true })
  await page.getByRole('button', { name: /เริ่มดริลล์/ }).click()
  await expect(page.getByText('ดริลล์ก่อนวิ่ง · ขั้น 1/')).toBeVisible()
  if (process.env.SHOTS) await page.screenshot({ path: 'screens/drills-player.png' })
  for (let i = 0; i < 13; i++) await page.getByRole('button', { name: 'ข้าม' }).click()
  await expect(page.getByText('ดริลล์เสร็จแล้ว')).toBeVisible()
  await page.getByRole('button', { name: 'ไปเริ่มวิ่ง' }).click()
  await expect(page.getByRole('button', { name: /เริ่มวิ่ง/ }).first()).toBeVisible()
  expect(errors).toEqual([])
})
