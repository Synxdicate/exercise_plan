import type { Page } from '@playwright/test'

export const ymd = (daysAgo = 0) => {
  const t = new Date()
  t.setDate(t.getDate() - daysAgo)
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`
}

/** เริ่มแอปในโหมดไม่ล็อกอิน พร้อมข้อมูลตั้งต้น (เขียนลง localStorage แล้วให้แอปย้ายเข้า IndexedDB เอง) */
export async function seed(page: Page, data: Record<string, unknown> = {}) {
  await page.goto('/')
  await page.evaluate(d => {
    localStorage.setItem('localMode', '1')
    localStorage.setItem('lastBackup', new Date().toISOString().slice(0, 10))
    localStorage.setItem('onboarded', 'true')
    for (const [k, v] of Object.entries(d)) localStorage.setItem(k, JSON.stringify(v))
  }, data)
  await page.reload()
}

/** อ่านค่าที่แอปเก็บใน IndexedDB */
export const idb = (page: Page, key: string) => page.evaluate(k => new Promise(res => {
  const r = indexedDB.open('exercise-plan')
  r.onsuccess = () => {
    const g = r.result.transaction('kv').objectStore('kv').get(k)
    g.onsuccess = () => res(g.result ?? null)
  }
}), key)

export const nav = (page: Page, name: string) => page.locator('nav button', { hasText: name }).click()

export const loopRoute = (n = 120) => {
  const route: [number, number][] = []
  const times: number[] = []
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2
    route.push([16.4419 + 0.004 * Math.sin(a), 102.8359 + 0.006 * Math.cos(a)])
    times.push(i * 15)
  }
  return { route, times }
}
