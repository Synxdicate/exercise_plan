import { expect, test } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { loopRoute, seed, settled, ymd } from './helpers'

// เช็คการเข้าถึง (axe-core — ตัวเดียวกับคะแนน Accessibility ของ Lighthouse) ทุกแท็บ ทั้งธีมสว่างและมืด
const { route, times } = loopRoute()
const runs = [1, 3].map((d, i) => ({ id: `r${i}`, date: ymd(d), km: 4, seconds: 1600, kind: 'easy', source: 'gps', route, times, splits: [400, 400, 400, 400] }))
for (const scheme of ['light', 'dark'] as const) test(`a11y ${scheme}`, async ({ page }) => {
  await page.emulateMedia({ colorScheme: scheme, reducedMotion: 'reduce' })
  await seed(page, { runs, program: 'mini' })
  const found: string[] = []
  for (const i of [0, 1, 2, 3, 4]) {
    await page.locator('nav button').nth(i).click()
    await settled(page)
    await page.waitForTimeout(400)
    const r = await new AxeBuilder({ page }).exclude('.leaflet-container').analyze()
    for (const v of r.violations.filter(v => v.impact === 'serious' || v.impact === 'critical'))
      found.push(`tab${i} ${v.id} (${v.impact}) ×${v.nodes.length}: ${v.nodes.slice(0, 2).map(n => n.target.join(' ')).join(' | ')}`)
    if (process.env.A11Y_DEBUG) for (const v of r.violations.filter(v => v.id === 'color-contrast')) for (const n of v.nodes) console.log('CC', JSON.stringify((n.any[0]?.data ?? {}) as object), n.html.slice(0, 90))
  }
  console.log(found.join('\n'))
  expect(found).toEqual([])
})
