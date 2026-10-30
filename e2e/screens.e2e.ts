import { test } from '@playwright/test'
import { loopRoute, seed, ymd } from './helpers'

// ภาพหน้าจอทุกแท็บ (สว่าง/มืด, ไทย/อังกฤษ) ไว้ตรวจ UI — รันด้วย `npm run shots` เท่านั้น (CI ข้าม)
test('screens', async ({ page }) => {
  test.skip(!process.env.SHOTS, 'run with npm run shots')
  const { route, times } = loopRoute()
  const runs = [1, 3, 6, 9].map((d, i) => ({ id: `r${i}`, date: ymd(d), km: 3.2 + i * 0.6, seconds: (3.2 + i * 0.6) * 400, kind: i === 2 ? 'long' : 'easy', route, times, splits: [400, 410, 395] }))
  for (const lang of ['th', 'en']) {
    await seed(page, { runs, program: 'mini', lang })
    for (const theme of ['light', 'dark'] as const) {
      await page.emulateMedia({ colorScheme: theme })
      for (const [i, name] of ['home', 'plan', 'runs', 'food', 'log'].entries()) {
        await page.locator('nav button').nth(i).click()
        await page.waitForTimeout(600)
        await page.screenshot({ path: `screens/${lang}-${theme}-${name}.png`, fullPage: true })
      }
    }
  }
})
