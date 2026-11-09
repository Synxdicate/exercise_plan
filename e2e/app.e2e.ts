import { expect, test } from '@playwright/test'
import { idb, loopRoute, nav, seed, ymd } from './helpers'

test('โหมดไม่ล็อกอิน: onboarding, บันทึกลง IndexedDB, เตือนสำรอง, กลับไปหน้าล็อกอินได้', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: /ใช้แบบไม่ล็อกอิน/ }).click()
  await expect(page.getByText('เช็กสุขภาพ').first()).toBeVisible()
  for (let i = 0; i < 4; i++) await page.getByRole('button', { name: 'ถัดไป' }).click()
  await page.getByRole('button', { name: 'เริ่มใช้งาน' }).click()
  await expect(page.getByText(/เป้าเดือน/)).toBeVisible()
  expect(await idb(page, 'onboarded')).toBe(true)

  // กรอกการวิ่งเอง → อยู่ใน IndexedDB หลังรีโหลด ไม่อยู่ใน localStorage
  await nav(page, 'วิ่ง')
  await page.getByRole('button', { name: 'ประวัติ' }).click()
  await page.getByRole('button', { name: 'กรอกเอง' }).click()
  // เฉพาะฟอร์มในการ์ดประวัติการวิ่ง (ฟอร์มคาร์ดิโอที่พับอยู่ก็มีช่องตัวเลขเหมือนกัน)
  const history = page.locator('section', { hasText: 'ประวัติการวิ่ง' })
  const nums = history.locator('input[type=number]:visible')
  await nums.nth(-2).fill('5')
  await nums.nth(-1).fill('30')
  await history.getByRole('button', { name: 'บันทึก', exact: true }).click()
  // รอให้เขียนลง IndexedDB เสร็จก่อนรีโหลด (การเขียนเป็นแบบ async)
  await expect.poll(() => idb(page, 'runs').then(r => (r as unknown[] | null)?.length)).toBe(1)
  await page.reload()
  await expect.poll(() => idb(page, 'runs').then(r => (r as unknown[] | null)?.length)).toBe(1)
  expect(await page.evaluate(() => localStorage.getItem('runs'))).toBeNull()

  // ยังไม่เคยสำรอง → มีแถบเตือน, กดแล้วดาวน์โหลดไฟล์และแถบหาย
  await nav(page, 'หน้าหลัก')
  await expect(page.getByText('ยังไม่เคยสำรองข้อมูล')).toBeVisible()
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'สำรองเลย' }).click()
  expect((await download).suggestedFilename()).toMatch(/^kao-backup-.*\.json$/)
  await expect(page.getByText('ยังไม่เคยสำรองข้อมูล')).toBeHidden()

  // เมนูบัญชี → ล็อกอิน → กลับมาโหมดไม่ล็อกอิน ข้อมูลยังอยู่
  await page.getByRole('button', { name: 'เมนูบัญชี' }).click()
  await expect(page.getByText('เก็บในเครื่องนี้')).toBeVisible()
  await page.getByRole('button', { name: /ล็อกอินเพื่อซิงก์/ }).click()
  await expect(page.getByText('ดำเนินการต่อด้วย Google')).toBeVisible()
  await page.getByRole('button', { name: /ใช้แบบไม่ล็อกอิน/ }).click()
  expect(((await idb(page, 'runs')) as unknown[]).length).toBe(1)
})

test('ย้ายข้อมูลจากเวอร์ชันเก่า (localStorage) เข้า IndexedDB และธีมยังทำงาน', async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => {
    localStorage.setItem('localMode', '1')
    localStorage.setItem('onboarded', 'true')
    localStorage.setItem('theme', '"dark"')
    localStorage.setItem('runs', JSON.stringify([{ id: 'old', date: '2026-10-01', km: 7, seconds: 2400, kind: 'easy', source: 'manual' }]))
  })
  await page.reload()
  await expect(page.getByText(/เป้าเดือน/)).toBeVisible()
  expect(((await idb(page, 'runs')) as unknown[]).length).toBe(1)
  expect(await page.evaluate(() => localStorage.getItem('runs'))).toBeNull()
  expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe('dark')
})

test('แผ่นที่เลื่อนขึ้นมา: ปิดด้วย X, ลากลง, ลากนิดเดียวไม่ปิด', async ({ page }) => {
  await seed(page, { runs: [{ id: 'r', date: ymd(1), km: 5.2, seconds: 1800, kind: 'easy', source: 'manual' }] })
  const open = async () => {
    await page.getByRole('button', { name: /เหรียญรางวัล/ }).click()
    await page.waitForTimeout(450) // รอแอนิเมชันเลื่อนขึ้นจบ ตำแหน่งแถบลากจะได้นิ่ง
  }
  const sheet = page.getByText(/สรุปปี 25/)
  await open()
  await expect(sheet).toBeVisible()
  await page.getByRole('button', { name: 'ปิด' }).last().click()
  await expect(sheet).toBeHidden()

  const drag = async (dy: number) => {
    const box = (await page.locator('.touch-none').last().boundingBox())!
    await page.mouse.move(box.x + 40, box.y + 15)
    await page.mouse.down()
    await page.mouse.move(box.x + 40, box.y + 15 + dy, { steps: 8 })
    await page.mouse.up()
  }
  await open()
  await drag(220)
  await expect(sheet).toBeHidden()
  await open()
  await drag(30)
  await expect(sheet).toBeVisible()
})

test('ประวัติวิ่งแบ่งเดือน + ลบการวิ่งแล้วลบรูปที่แนบ', async ({ page }) => {
  await seed(page, {
    runs: [{ id: 'r1', date: ymd(2), km: 5.2, seconds: 1800, kind: 'easy', source: 'manual' }],
    photos: [{ id: 'p1', date: ymd(2), path: 'local:p1', kind: 'run', refId: 'r1' }, { id: 'p2', date: ymd(1), path: 'local:p2', kind: 'progress' }],
  })
  await nav(page, 'วิ่ง')
  await page.getByRole('button', { name: 'ประวัติ' }).click()
  await expect(page.getByText(/ครั้ง · 5\.2 กม\./)).toBeVisible()
  await page.locator('main li button', { hasText: '5.20' }).click()
  await page.getByRole('button', { name: 'ลบ', exact: true }).click()
  await page.getByRole('alertdialog').getByRole('button', { name: 'ลบ' }).click()
  await expect.poll(async () => ((await idb(page, 'photos')) as { id: string }[]).map(p => p.id)).toEqual(['p2'])
})

test('แชร์การวิ่ง: การ์ดทึบ และสติกเกอร์ PNG พื้นหลังโปร่ง', async ({ page }) => {
  await seed(page, { runs: [{ id: 'g', date: ymd(1), km: 3.02, seconds: 1800, kind: 'easy', source: 'gps', ...loopRoute() }] })
  await nav(page, 'วิ่ง')
  await page.getByRole('button', { name: 'ประวัติ' }).click()
  await page.locator('main li button', { hasText: '3.02' }).click()
  await page.getByRole('button', { name: 'แชร์เป็นรูป' }).click()
  // ตารางพรีวิว: การ์ดสี + สติกเกอร์ 8 แบบ (รอบนี้ไม่มีเพซรายกิโล จึงไม่มีแบบ splits)
  await expect(page.locator('[role=radio] img')).toHaveCount(9)
  const alpha = () => page.locator('[role=radio][aria-checked=true] img').evaluate(async (img: HTMLImageElement) => {
    await img.decode()
    const c = document.createElement('canvas')
    c.width = img.naturalWidth
    c.height = img.naturalHeight
    const g = c.getContext('2d')!
    g.drawImage(img, 0, 0)
    return { w: c.width, a: g.getImageData(5, 5, 1, 1).data[3] }
  })
  // ค่าเริ่มต้นคือสติกเกอร์โปร่งใส
  await expect.poll(alpha).toEqual({ w: 1080, a: 0 })
  await page.getByRole('radio', { name: 'การ์ดสี' }).click()
  await expect.poll(alpha).toEqual({ w: 1080, a: 255 })
  await page.getByRole('radio', { name: 'ตั๋ววันวิ่ง' }).click()
  await expect.poll(alpha).toEqual({ w: 1080, a: 0 })
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'บันทึกรูป' }).click()
  expect((await download).suggestedFilename()).toMatch(/-sticker\.png$/)
})

test('เป้าเวลา + แผนวันแข่ง + เตือนเจ็บซ้ำ', async ({ page }) => {
  await seed(page, {
    runs: [
      { id: 'a', date: ymd(60), km: 5.1, seconds: 1900, kind: 'easy', source: 'manual' },
      { id: 'b', date: ymd(50), km: 10.2, seconds: 3500, kind: 'race', source: 'manual' },
    ],
    program: 'half', week: 16,
    readiness: { [ymd(1)]: { sleep: 0, sore: 1, pain: true, level: 'red' }, [ymd(3)]: { sleep: 0, sore: 0, pain: true, level: 'red' } },
  })
  await nav(page, 'วิ่ง')
  await page.getByRole('button', { name: 'สถิติ' }).click()
  await expect(page.getByRole('button', { name: 'ทดสอบ 5K' })).toBeVisible() // ผลเก่าเกิน 6 สัปดาห์
  await page.getByRole('button', { name: /^ฮาล์ฟ/ }).click()
  await page.getByPlaceholder('เช่น 1:59:59').fill('1:59:59')
  await page.getByRole('button', { name: 'ตั้งเป้า' }).click()
  await expect(page.getByText('ต้องวิ่งเพซ')).toBeVisible()
  expect(await idb(page, 'goals')).toMatchObject({ race: { half: 7199 } })

  await nav(page, 'ฝึก')
  await expect(page.getByText(/เจ็บ 2 วันใน 7 วัน/)).toBeVisible()
  await page.locator('button', { has: page.locator('.sr-only', { hasText: /^อาทิตย์:/ }) }).click()
  await expect(page.getByText('แผนเพซ ฮาล์ฟ')).toBeVisible()
  await expect(page.getByText('เช็กลิสต์สัปดาห์แข่ง')).toBeVisible()
})

test('อาหาร: ค้นหาแบบไทย (ไข่ต้ม → ไข่ไก่ต้ม) และบันทึกชุดอาหาร', async ({ page }) => {
  await seed(page)
  await nav(page, 'อาหาร')
  await page.getByPlaceholder(/ค้นหาเมนู เช่น/).fill('ไข่ต้ม')
  await page.locator('main li button', { hasText: 'ไข่ไก่ต้ม' }).click()
  await page.getByPlaceholder(/ค้นหาเมนู เช่น/).fill('กะเพรา')
  await page.locator('main li button', { hasText: 'กะเพรา' }).first().click()
  await page.getByRole('button', { name: /บันทึกรายการวันนี้เป็นชุด/ }).click()
  await page.getByPlaceholder(/ชื่อชุด/).fill('มื้อเช้า')
  await page.locator('main').getByRole('button', { name: 'บันทึก', exact: true }).click()
  await page.getByRole('button', { name: /มื้อเช้า/ }).first().click()
  await expect.poll(async () => Object.values((await idb(page, 'foodLog')) as Record<string, unknown[]>)[0].length).toBe(4)
})

test('สลับท่าและเพิ่มท่า', async ({ page }) => {
  await seed(page)
  await nav(page, 'ฝึก')
  await page.locator('button', { has: page.locator('.sr-only', { hasText: /^จันทร์:/ }) }).click()
  await page.locator('main li button', { hasText: 'Bench Press' }).click()
  await page.getByRole('button', { name: 'สลับท่า' }).click()
  await page.getByRole('button', { name: /DB Bench Press/ }).click()
  await expect(page.getByText('สลับแล้ว').first()).toBeVisible()
  expect(await idb(page, 'exerciseSwaps')).toEqual({ 'Bench Press': 'DB Bench Press' })
  await page.getByRole('button', { name: 'เพิ่มท่า' }).click()
  await page.getByRole('button', { name: /Hammer Curl/ }).click()
  await expect(page.locator('main').getByText('Hammer Curl')).toBeVisible()
})

test('เส้นทางเดิม: เทียบกับครั้งก่อนบนเส้นทางเดียวกัน', async ({ page }) => {
  const a = loopRoute(), b = loopRoute()
  await seed(page, {
    runs: [
      { id: 'm1', date: ymd(9), km: 4.0, seconds: 1560, kind: 'easy', source: 'gps', ...a },
      { id: 'm2', date: ymd(2), km: 4.0, seconds: 1480, kind: 'easy', source: 'gps', ...b },
    ],
  })
  await nav(page, 'วิ่ง')
  await page.getByRole('button', { name: 'ประวัติ' }).click()
  await page.locator('main li button').first().click()
  await expect(page.getByText('เส้นทางนี้วิ่งมาแล้ว 2 ครั้ง')).toBeVisible()
  await expect(page.getByText(/เร็วกว่าครั้งก่อน 0:20 \/กม\./)).toBeVisible()
})

test('รูปสาธิตท่าในตารางฝึก', async ({ page }) => {
  await seed(page)
  await nav(page, 'ฝึก')
  await page.locator('button', { has: page.locator('.sr-only', { hasText: /^จันทร์:/ }) }).click()
  await page.locator('main li button', { hasText: 'Bench Press' }).click()
  const img = page.getByAltText('Bench Press ท่าเริ่ม')
  await expect(img).toBeVisible()
  expect(await img.evaluate((i: HTMLImageElement) => i.complete && i.naturalWidth)).toBe(360)
})

test('ระหว่างวิ่ง: สัญญาณ GPS หายเกิน 20 วิ → แจ้งเตือน', async ({ page, context }) => {
  await context.grantPermissions(['geolocation'])
  await context.setGeolocation({ latitude: 16.4419, longitude: 102.8359, accuracy: 8 })
  await seed(page, { readiness: { [ymd(0)]: { sleep: 0, sore: 0, pain: false, level: 'green' } } })
  await nav(page, 'วิ่ง')
  await page.getByRole('button', { name: 'เริ่มวิ่ง' }).click()
  await page.getByRole('button', { name: /เริ่มจับเวลา|เริ่มเลย/ }).click()
  // ไม่มีจุด GPS ใหม่เข้ามาอีก
  await expect(page.getByText(/สัญญาณ GPS หาย/)).toBeVisible({ timeout: 30_000 })
  await context.setGeolocation({ latitude: 16.4420, longitude: 102.8360, accuracy: 8 })
  await expect(page.getByText(/สัญญาณ GPS หาย/)).toBeHidden({ timeout: 10_000 })
})

test('นักวิ่งเงา: วิ่งทดสอบ 5K แข่งกับ 5K ที่ดีที่สุดเร็วขึ้น 1.5%', async ({ page, context }) => {
  await context.grantPermissions(['geolocation'])
  await context.setGeolocation({ latitude: 16.4419, longitude: 102.8359, accuracy: 8 })
  await seed(page, {
    program: 'physique',
    runs: [{ id: 'b', date: ymd(3), km: 5, seconds: 1800, kind: 'race', source: 'manual' }],
    readiness: { [ymd(0)]: { sleep: 0, sore: 0, pain: false, level: 'green' } },
  })
  await nav(page, 'วิ่ง')
  await page.getByRole('button', { name: 'แข่ง', exact: true }).click()
  await page.getByRole('button', { name: /^(เริ่มวิ่ง|วิ่งอีกรอบ)$/ }).click()
  await page.getByRole('button', { name: /เริ่มจับเวลา|เริ่มเลย/ }).click()
  await expect(page.getByText('นักวิ่งเงา')).toBeVisible()
  await expect(page.getByText('5K ที่ดีที่สุด เร็วขึ้น 1.5% (29:33)')).toBeVisible()
})

test('ทดสอบขา: กระโดดขาเดียวต่างกันเกิน 10% → บอกขาที่อ่อนกว่า', async ({ page }) => {
  await seed(page)
  await nav(page, 'บันทึก')
  await page.getByRole('button', { name: /ฟิตเนส/ }).click()
  await page.getByLabel('กระโดด ซ้าย').fill('120')
  await page.getByLabel('กระโดด ขวา').fill('150')
  await page.getByRole('button', { name: 'บันทึกผลทดสอบ' }).click()
  await expect(page.getByText(/ขาซ้ายได้ 80% ของอีกข้าง/)).toBeVisible()
  expect(((await idb(page, 'legTests')) as unknown[]).length).toBe(1)
})

test('โปรแกรมเริ่มวิ่ง: วิ่งสลับเดินในตารางฝึก', async ({ page }) => {
  await seed(page, { program: 'start', week: 1 })
  await nav(page, 'ฝึก')
  await expect(page.getByText('เริ่มวิ่ง (วิ่งสลับเดิน)')).toBeVisible()
  await expect(page.getByText('วิ่งสลับเดิน (วิ่งรวม 8 นาที)').first()).toBeVisible()
})

test('ตารางฝึก: กดดูสัปดาห์อื่นไม่เปลี่ยนสัปดาห์ปัจจุบัน และเปลี่ยนได้ด้วยปุ่ม', async ({ page }) => {
  await seed(page, { program: 'start', week: 1 })
  await nav(page, 'ฝึก')
  await expect(page.getByText('สัปดาห์ 1 · สัปดาห์นี้')).toBeVisible()
  await page.getByRole('button', { name: /^สัปดาห์\s*3$/ }).click()
  await expect(page.getByText('สัปดาห์ 3 · อีก 2 สัปดาห์')).toBeVisible()
  await page.getByRole('button', { name: 'กลับไปสัปดาห์นี้ (1)' }).click()
  await expect(page.getByText('สัปดาห์ 1 · สัปดาห์นี้')).toBeVisible()
  await page.getByRole('button', { name: /^สัปดาห์\s*3$/ }).click()
  await page.getByRole('button', { name: 'ข้ามไปสัปดาห์ 3' }).click()
  await expect(page.getByText('สัปดาห์ 3 · สัปดาห์นี้')).toBeVisible()
  expect(await idb(page, 'programStart')).toBeTruthy()
})

test('การวิ่งเก่าที่ระยะขาด: แก้เป็นระยะตามเส้นทางได้', async ({ page }) => {
  await seed(page, { runs: [{ id: 'g', date: ymd(1), km: 2, seconds: 1800, kind: 'easy', source: 'gps', ...loopRoute() }] })
  await nav(page, 'วิ่ง')
  await page.getByRole('button', { name: 'ประวัติ' }).click()
  await page.locator('main li button', { hasText: '2.00' }).click()
  await page.getByRole('button', { name: 'ใช้ระยะตามเส้นทาง' }).click()
  await expect.poll(async () => ((await idb(page, 'runs')) as { km: number }[])[0].km).toBeGreaterThan(3)
  await expect(page.getByRole('button', { name: 'ใช้ระยะตามเส้นทาง' })).toHaveCount(0)  // เส้นทางเก่าที่อยู่ใน runs ถูกย้ายไปเก็บแยกใน routes (v2.44)
  expect(((await idb(page, 'runs')) as { route?: unknown }[])[0].route).toBeUndefined()
  expect(((await idb(page, 'routes')) as Record<string, { route: unknown[] }>).g.route.length).toBeGreaterThan(10)
})

test('รายละเอียดการวิ่ง: ผลชุดซ้อม และส่งออก GPX', async ({ page }) => {
  await seed(page, { runs: [{ id: 'g', date: ymd(1), km: 3.4, seconds: 1800, kind: 'easy', source: 'gps', guide: { work: 5, total: 8, finished: false }, ...loopRoute() }] })
  await nav(page, 'วิ่ง')
  await page.getByRole('button', { name: 'ประวัติ' }).click()
  await page.locator('main li button', { hasText: '3.40' }).click()
  await expect(page.getByText(/ทำชุดซ้อมได้ 5\/8 ช่วง/)).toBeVisible()
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'ส่งออก GPX (Strava)' }).click()
  expect((await download).suggestedFilename()).toMatch(/^kao-.*\.gpx$/)
})

test('เปิดแล้วปิดรายละเอียดการวิ่งที่มีแผนที่ ไม่เกิด error (Leaflet _leaflet_pos)', async ({ page }) => {
  await seed(page, { runs: [{ id: 'm', date: ymd(1), km: 3.4, seconds: 1800, kind: 'easy', source: 'gps', ...loopRoute() }] })
  await nav(page, 'วิ่ง')
  await page.getByRole('button', { name: 'ประวัติ' }).click()
  for (let i = 0; i < 3; i++) {
    await page.locator('main li button', { hasText: '3.40' }).click()
    await expect(page.locator('.leaflet-container').first()).toBeVisible()
    await page.getByRole('button', { name: 'ปิด', exact: true }).click()
  }
  await page.waitForTimeout(800)
  await expect(page.getByText('มีบางอย่างผิดพลาด')).toHaveCount(0)
  expect(await page.evaluate(() => localStorage.getItem('errorLog') ?? '[]')).not.toContain('_leaflet_pos')
  expect(JSON.stringify(await idb(page, 'errorLog') ?? [])).not.toContain('_leaflet_pos')
})

test('ทดสอบเหงื่อ: คำนวณอัตราเหงื่อและปริมาณที่ควรดื่ม', async ({ page }) => {
  await seed(page)
  await nav(page, 'วิ่ง')
  await page.locator('main button', { hasText: 'สถิติ' }).first().click()
  await page.getByLabel('ก่อนวิ่ง').fill('65')
  await page.getByLabel('หลังวิ่ง').fill('64.2')
  await page.getByLabel('ดื่มระหว่างวิ่ง').fill('400')
  await page.getByLabel('เวลาวิ่ง').fill('60')
  await page.getByRole('button', { name: 'บันทึกผลทดสอบ' }).click()
  await expect(page.getByText(/เสียเหงื่อ ~1\.2 ลิตร\/ชม\./)).toBeVisible()
  expect(((await idb(page, 'sweatTests')) as unknown[]).length).toBe(1)
})

test('รายงาน error: เก็บในเครื่องและดูได้จากเมนูบัญชี', async ({ page }) => {
  await seed(page)
  await expect(page.getByText(/เป้าเดือน/)).toBeVisible() // รอแอปโหลดเสร็จ (ตัวดัก error ติดตั้งหลังโหลดที่เก็บข้อมูล)
  // error จาก script ที่ inject เข้ามาถูกเบราว์เซอร์ปิดเป็น "Script error." — ใช้ promise ที่ไม่มีใคร catch แทน
  await page.evaluate(() => { void Promise.reject(new Error('e2e boom')) })
  await expect.poll(async () => ((await idb(page, 'errorLog')) as { message: string }[] | null)?.[0]?.message).toBe('e2e boom')
  await page.getByRole('button', { name: 'เมนูบัญชี' }).click()
  await page.getByRole('button', { name: /ปัญหาที่พบ \(1\)/ }).click()
  await expect(page.getByText('e2e boom')).toBeVisible()
})

test('ปฏิทินการฝึก: วันที่วิ่ง/เวท และแตะดูรายละเอียด', async ({ page }) => {
  await seed(page, {
    runs: [{ id: 'c1', date: ymd(0), km: 5.3, seconds: 1900, kind: 'easy', source: 'manual' }],
    sessions: [{ id: 's1', date: ymd(0), mode: 'gym', dayKey: 'upperA', title: 'Upper A', entries: [{ name: 'Bench Press', sets: [{ kg: 40, reps: 8 }] }] }],
  })
  await nav(page, 'บันทึก')
  await expect(page.getByText(/ออกกำลังกาย 1 วัน · วิ่ง 5\.3 กม\. · เวท 1 ครั้ง/)).toBeVisible()
  await page.getByRole('button', { name: /^\d+ วันนี้/ }).click()
  await expect(page.getByText('Easy 5.30 กม. · 31:40')).toBeVisible()
})

test('ปฏิทินการฝึก: วันที่ติ๊กทำแล้วในตารางฝึก (ไม่ได้บันทึก) นับเป็นวันที่ออกกำลังกาย', async ({ page }) => {
  const i = (new Date(ymd(0)).getUTCDay() + 6) % 7 // 0 = จันทร์
  await seed(page, { program: 'physique', week: 1, done: { [`physique-w1-d${i}`]: true } })
  await nav(page, 'บันทึก')
  await expect(page.getByText(/ออกกำลังกาย 1 วัน/)).toBeVisible()
  await page.getByRole('button', { name: /^\d+ วันนี้/ }).click()
  await expect(page.getByText('ทำแล้ว', { exact: true })).toBeVisible()
})

test('หน้าหลัก: วิ่ง/ฝึกเสร็จแล้ววันนี้ ไม่ขึ้นปุ่มเริ่มอีก', async ({ page }) => {
  await seed(page, {
    program: 'physique', week: 1,
    runs: [{ id: 'r1', date: ymd(0), km: 4.2, seconds: 1500, kind: 'easy', source: 'manual' }],
    sessions: [{ id: 's1', date: ymd(0), mode: 'gym', dayKey: 'upperA', title: 'Upper A', entries: [{ name: 'Bench Press', sets: [{ kg: 40, reps: 8 }] }] }],
  })
  await expect(page.getByText(/เป้าเดือน/)).toBeVisible()
  await expect(page.getByRole('button', { name: 'เริ่มวิ่ง' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: /เริ่มฝึกเลย/ })).toHaveCount(0)
})

test('แผนที่รวมทุกการวิ่ง (heatmap)', async ({ page }) => {
  await seed(page, {
    runs: [
      { id: 'h1', date: ymd(3), km: 3, seconds: 1200, kind: 'easy', source: 'gps', ...loopRoute() },
      { id: 'h2', date: ymd(1), km: 3, seconds: 1150, kind: 'race', source: 'gps', ...loopRoute() }, // ผลวิ่งเต็มที่ ความเร็ววิกฤต/โซนแสดงเมื่อไม่ได้คิดจากวิ่งเบา
    ],
  })
  await nav(page, 'วิ่ง')
  await page.getByRole('button', { name: 'สถิติ' }).click()
  await expect(page.getByText('แผนที่การวิ่งทั้งหมด')).toBeVisible()
  await expect(page.getByText(/2 เส้นทาง/)).toBeVisible()
  await expect(page.getByText('ความเร็ววิกฤต (Critical Speed)')).toBeVisible()
  await expect(page.locator('.leaflet-container canvas, .leaflet-container svg').first()).toBeAttached()
})

test('ท่าที่ไม่มีรูปถ่ายแสดงภาพลายเส้น', async ({ page }) => {
  await seed(page, { mode: 'park' })
  await nav(page, 'ฝึก')
  // หาวันในสัปดาห์ที่มีท่านี้ (วันขาในสวน)
  const target = page.locator('main li button', { hasText: 'Hollow Body Hold' })
  for (const d of ['จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์', 'อาทิตย์']) {
    await page.locator('button', { has: page.locator('.sr-only', { hasText: new RegExp(`^${d}:`) }) }).click()
    if (await target.count()) break
  }
  await target.first().click()
  await expect(page.getByRole('img', { name: /Hollow Body Hold ภาพลายเส้น/ })).toBeVisible()
})

test('คาร์ดิโออื่น: บันทึกปั่นจักรยานแล้วแสดงในปฏิทิน', async ({ page }) => {
  await seed(page)
  await nav(page, 'วิ่ง')
  await page.getByRole('button', { name: 'ประวัติ' }).click()
  // จำกัดในการ์ดคาร์ดิโอ (หน้าเดียวกันมีปุ่ม "บันทึก" ของฟอร์มกรอกการวิ่งเอง) และรอฟอร์มกางเสร็จก่อนกด
  const card = page.locator('section', { hasText: 'คาร์ดิโออื่น' })
  await card.getByRole('button', { name: 'เพิ่ม', exact: true }).click()
  const save = card.getByRole('button', { name: 'บันทึก', exact: true })
  await expect(save).toBeVisible()
  await save.click()
  await expect(page.getByText('ปั่นจักรยาน · 40 นาที')).toBeVisible()
  expect(((await idb(page, 'cross')) as unknown[]).length).toBe(1)
  await nav(page, 'บันทึก')
  await expect(page.getByText(/ออกกำลังกาย 1 วัน/)).toBeVisible()
})

test('เซอร์กิตแกนกลาง: เริ่ม ข้ามจนจบ แล้วบันทึก', async ({ page }) => {
  await seed(page)
  await nav(page, 'ฝึก')
  await page.getByRole('button', { name: /^2 รอบ/ }).click()
  await page.getByRole('button', { name: 'เริ่มเซอร์กิต' }).click()
  await expect(page.getByText('แพลงก์').first()).toBeVisible()
  for (let i = 0; i < 31; i++) await page.getByRole('button', { name: 'ข้าม' }).click()
  await expect(page.getByText('จบเซอร์กิตแล้ว')).toBeVisible()
  await page.getByRole('button', { name: 'บันทึก', exact: true }).last().click() // ไม่ใช่แท็บ "บันทึก" ด้านล่าง
  await expect.poll(async () => ((await idb(page, 'sessions')) as { dayKey: string }[] | null)?.[0]?.dayKey).toBe('circuit')
})

test('ฝึกคนเดียว: สลับ Bench Press/Back Squat เป็นท่าที่ไม่ต้องมีคนช่วย', async ({ page }) => {
  await seed(page)
  await nav(page, 'ฝึก')
  await page.locator('button', { has: page.locator('.sr-only', { hasText: /^จันทร์:/ }) }).click()
  await expect(page.locator('main li button', { hasText: 'Bench Press' }).first()).toBeVisible()
  await page.getByText('ไปคนเดียว (ไม่มีคนช่วยจับบาร์)').click()
  await expect(page.locator('main li button', { hasText: 'DB Bench Press' })).toBeVisible()
  await expect(page.getByText('ฝึกคนเดียว').first()).toBeVisible()
  expect(await idb(page, 'soloMode')).toBe(true)
})

test('โลโก้กลับหน้าหลัก, เมนูบัญชีปิดเมื่อกดข้างนอก, สลับภาษา', async ({ page }) => {
  await seed(page)
  await nav(page, 'ฝึก')
  await expect(page.locator('header h1')).toHaveText('ตารางฝึก')
  await page.getByRole('button', { name: /กลับหน้าหลัก/ }).click()
  await expect(page.locator('header h1')).toHaveText('ภาพรวม')

  await page.getByRole('button', { name: 'เมนูบัญชี' }).click()
  await expect(page.getByText('ตั้งค่าโปรแกรมและเป้าหมาย')).toBeVisible()
  // กดตรงเนื้อหาด้านล่าง (นอกกรอบ header) เดิม backdrop ถูกจำกัดอยู่ใน header เลยไม่ปิด
  await page.mouse.click(30, 600)
  await expect(page.getByText('ตั้งค่าโปรแกรมและเป้าหมาย')).toBeHidden()

  await page.getByRole('button', { name: 'เมนูบัญชี' }).click()
  await page.getByRole('button', { name: 'EN', exact: true }).click()
  await expect(page.getByText('Program & goals')).toBeVisible()
  await page.mouse.click(30, 600)
  await expect(page.locator('nav')).toContainText('Home')
  await expect(page.locator('header h1')).toHaveText('Overview')
  expect(await page.evaluate(() => document.documentElement.lang)).toBe('en')
  await page.reload()
  await expect(page.locator('nav')).toContainText('Train')
})

test('พลาดวิ่งยาว: ไม่ต้องชดเชย, เพดาน 110% วันวิ่งยาว, เปลี่ยนรอบเพซช้าเป็นเดิน', async ({ page }) => {
  // จันทร์ 2 พ.ย. 2026 มินิสัปดาห์ 2 (เริ่ม 26 ต.ค.) วิ่งยาว 5 กม. วันอาทิตย์ 1 พ.ย. ไม่ได้ทำ
  await page.clock.install({ time: new Date('2026-11-02T08:00:00+07:00') })
  const run = (date: string, km: number, min: number) => ({ id: date, date, km, seconds: km * min * 60, kind: 'easy', source: 'manual' })
  await seed(page, { program: 'mini', programStart: '2026-10-26', runs: [run('2026-10-27', 4.82, 10), run('2026-10-29', 3.13, 8.4), run('2026-10-31', 2.49, 14.2)] })
  await expect(page.getByText('วิ่งยาวสัปดาห์ที่แล้วไม่ได้ทำ')).toBeVisible()
  // ระยะสัปดาห์นับแต่การวิ่ง: เปลี่ยนรอบเพซ 14 นาทีเป็นเดิน
  await nav(page, 'วิ่ง')
  await page.getByRole('button', { name: 'ประวัติ' }).click()
  await page.getByText('2.49 กม.').click()
  await page.getByRole('button', { name: 'เปลี่ยนเป็นเดิน' }).click()
  await expect.poll(async () => ((await idb(page, 'runs')) as { id: string; kind: string }[]).find(r => r.id === '2026-10-31')?.kind).toBe('walk')
  await page.getByRole('button', { name: 'ปิด' }).first().click()
  // วันอาทิตย์สัปดาห์นี้: แผน 5.5 กม. > 110% ของ 4.82 → ไม่เกิน 5.3 กม.
  await nav(page, 'ฝึก')
  await page.getByRole('button', { name: /อาทิตย์/ }).last().click()
  await expect(page.getByText('5.3 กม.', { exact: true })).toBeVisible()
  await nav(page, 'หน้าหลัก')
  await page.getByRole('button', { name: 'รับทราบ' }).click()
  await expect(page.getByText('วิ่งยาวสัปดาห์ที่แล้วไม่ได้ทำ')).toBeHidden()
})

test('ช่วงเตรียมตัวก่อนสัปดาห์ 1 (นับจากวันแข่ง): บอกชัด และติ๊กไม่ค้างไปสัปดาห์ 1 จริง', async ({ page }) => {
  // วันแข่ง 10 ม.ค. 2027 → มินิ 10 สัปดาห์ สัปดาห์ 1 เริ่ม 2 พ.ย. — 30 ต.ค. ยังเป็นช่วงเตรียมตัว
  await page.clock.install({ time: new Date('2026-10-30T08:00:00+07:00') })
  await seed(page, { program: 'mini', programStart: '2026-10-26', raceDate: '2027-01-10' })
  await expect(page.getByText(/ช่วงเตรียมตัว · สัปดาห์ 1 เริ่มในอีก 1 สัปดาห์/)).toBeVisible()
  await nav(page, 'ฝึก')
  await page.getByRole('button', { name: 'ยังไม่ทำ' }).click()
  await expect.poll(async () => Object.keys((await idb(page, 'done')) as object)).toEqual(['mini-pre2026-10-26-d4'])
})

test('ข้อมูลเก่า: ติ๊กช่วงเตรียมตัวที่ค้างเป็นสัปดาห์ 1 ถูกล้าง (เฉพาะวันที่ยังไม่ถึง)', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-11-02T08:00:00+07:00') })
  await seed(page, { program: 'mini', programStart: '2026-10-26', raceDate: '2027-01-10', done: { 'mini-w1-d0': true, 'mini-w1-d4': true, 'mini-w1-d6': false, 'ten-w1-d0': true } })
  await expect(page.getByText('สัปดาห์ที่ 1 จาก 10')).toBeVisible()
  await expect.poll(async () => idb(page, 'done')).toEqual({ 'mini-w1-d0': true, 'ten-w1-d0': true })
})

test('เช้าวันแข่งยังไม่ "จบโปรแกรม" และหลังวันแข่งไม่โชว์วันแข่งซ้ำ', async ({ page }) => {
  await page.clock.install({ time: new Date('2027-01-10T05:00:00+07:00') })
  await seed(page, { program: 'mini', programStart: '2026-11-02', raceDate: '2027-01-10' })
  await expect(page.getByText('วันนี้วันแข่ง!')).toBeVisible()
  await expect(page.getByText('จบมินิแล้ว', { exact: false })).toHaveCount(0)
  await page.clock.setFixedTime(new Date('2027-01-17T08:00:00+07:00'))
  await page.reload()
  await expect(page.getByText('จบโปรแกรมแล้ว', { exact: false })).toBeVisible()
  await expect(page.getByText(/จบมินิแล้ว/)).toBeVisible()
  await expect(page.getByRole('button', { name: 'เริ่มวิ่ง' })).toHaveCount(0)
})

test('ดูช่วงเตรียมตัวที่ผ่านมาได้ในแท็บฝึก (บันทึกยังขึ้นครบ)', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-11-02T08:00:00+07:00') })
  const run = (date: string, km: number) => ({ id: date, date, km, seconds: km * 600, kind: 'easy', source: 'manual' })
  const ses = (date: string, dayKey: string) => ({ id: date, date, mode: 'gym', dayKey, title: dayKey, entries: [{ name: 'Squat', sets: [{ kg: 20, reps: 8 }] }] })
  await seed(page, { program: 'mini', programStart: '2026-10-26', raceDate: '2027-01-10', runs: [run('2026-10-27', 4.82), run('2026-10-29', 3.13)], sessions: [ses('2026-10-26', 'strA'), ses('2026-10-30', 'strB')] })
  // วิ่งยาววันอาทิตย์ของช่วงเตรียมตัวไม่ได้ทำ → ไม่ต้องชดเชย
  await expect(page.getByText('วิ่งยาวสัปดาห์ที่แล้วไม่ได้ทำ')).toBeVisible()
  await nav(page, 'ฝึก')
  await page.getByRole('button', { name: /เตรียมตัว\s*26\/10/ }).click()
  await expect(page.getByText(/ช่วงเตรียมตัว 26\/10/)).toBeVisible()
  await expect(page.getByText('4/5 วัน', { exact: false })).toBeVisible()
})

test('สลับวัน: ทำแผนวันอังคารวันนี้ → หน้าวิ่งใช้แผนนั้น, คืนลำดับเดิมได้', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-11-02T08:00:00+07:00') })
  await seed(page, { program: 'mini', programStart: '2026-11-02', raceDate: '2027-01-10' })
  await nav(page, 'ฝึก')
  await page.getByRole('button', { name: /อังคาร: วิ่งสลับเดิน/ }).click()
  await page.getByRole('button', { name: /ทำวันนี้แทน/ }).click()
  await expect(page.getByText('สลับมาจากวันอังคาร')).toBeVisible()
  await expect.poll(async () => idb(page, 'dayMoves')).toEqual({ '2026-11-02': [[1, 0]] })
  await nav(page, 'วิ่ง')
  await expect(page.getByText(/แผนวันนี้: วิ่งสลับเดิน 3 กม/)).toBeVisible()
  // วิ่งยาววันอาทิตย์มาวันนี้ → เตือนวิ่งติดกัน (จันทร์–อังคาร) ไม่สลับถ้ากดยกเลิก
  await nav(page, 'ฝึก')
  await page.getByRole('button', { name: 'คืนลำดับเดิม' }).click()
  await page.getByRole('button', { name: /อาทิตย์: วิ่งยาวสลับเดิน/ }).click()
  await page.getByRole('button', { name: /ทำวันนี้แทน/ }).click()
  await expect(page.getByText('วิ่งติดกันสองวัน')).toBeVisible()
  await page.getByRole('button', { name: 'ยกเลิก' }).click()
  await expect.poll(async () => idb(page, 'dayMoves')).toEqual({})
})

test('พาฝึก: ปุ่มหลักทำเซ็ตเสร็จ และจับเวลาท่าค้างข้างละครั้งแล้วบันทึกเซ็ตเอง (วันที่บ้าน)', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-11-02T08:00:00+07:00') })
  await seed(page, { program: 'mini', programStart: '2026-11-02', dayLocation: { 'mini-w1-d0': 'home' }, voiceCues: false })
  await nav(page, 'ฝึก')
  await expect(page.getByText('Table Row').first()).toBeVisible() // ที่บ้าน: ดึงข้อ → Table Row
  await page.getByRole('button', { name: 'เริ่มฝึก', exact: true }).click()
  await page.getByRole('button', { name: 'เริ่มเลย' }).click()
  await page.getByRole('button', { name: /เสร็จเซ็ต 1\/2/ }).click()
  await page.getByRole('button', { name: 'ข้ามการพัก' }).click()
  await page.getByRole('button', { name: /^\d+\. Side Plank/ }).click()
  await page.getByRole('button', { name: /จับเวลา 30 วิ \/ ข้าง · เซ็ต 1\/2/ }).click()
  await expect(page.getByText('เตรียมตัว…')).toBeVisible()
  await page.clock.fastForward(34_000)
  await expect(page.getByText(/ข้างที่ 2\/2/)).toBeVisible()
  await page.clock.fastForward(34_000)
  await expect(page.getByRole('button', { name: 'ข้ามการพัก' })).toBeVisible() // ครบสองข้าง → บันทึกเซ็ตแล้วเข้าช่วงพัก
  await page.getByRole('button', { name: 'ข้ามการพัก' }).click()
  await expect(page.getByRole('button', { name: /จับเวลา 30 วิ \/ ข้าง · เซ็ต 2\/2/ })).toBeVisible()
})

test('เส้นทางแข่งมีเนิน: ติ๊กในตั้งค่าโปรแกรมแล้ววันแข่งมีวิธีคุมแรงบนเนิน', async ({ page }) => {
  await page.clock.install({ time: new Date('2027-01-10T06:00:00+07:00') })
  await seed(page, { program: 'mini', programStart: '2026-11-02', raceDate: '2027-01-10' })
  await page.getByRole('button', { name: 'เมนูบัญชี' }).click()
  await page.getByText('ตั้งค่าโปรแกรมและเป้าหมาย').click()
  await page.getByText('เส้นทางแข่งมีเนิน').click()
  await page.getByRole('button', { name: 'บันทึก', exact: true }).last().click()
  await expect.poll(() => idb(page, 'raceHills')).toBe(true)
  await nav(page, 'ฝึก')
  await expect(page.getByText(/คุมความเหนื่อย ไม่ใช่เพซ/).first()).toBeVisible()
})

test('รายละเอียดรอบวิ่ง: ความสำเร็จ (อันดับเวลา) และความสูงเส้นทาง', async ({ page }) => {
  await seed(page, { runs: [{ id: 'g', date: ymd(1), km: 3.4, seconds: 1800, kind: 'easy', source: 'gps', ...loopRoute() }] })
  await nav(page, 'วิ่ง')
  await page.getByRole('button', { name: 'ประวัติ' }).click()
  await page.locator('main li button', { hasText: '3.40' }).click()
  await expect(page.getByText('ความสำเร็จรอบนี้')).toBeVisible()
  await expect(page.getByText('1K เร็วที่สุดของคุณ')).toBeVisible()
  await expect(page.getByText('ความสูงเส้นทาง')).toBeVisible()
  await expect(page.getByText('20 ม.').first()).toBeVisible()
  await expect.poll(async () => ((await idb(page, 'runs')) as { elev?: { gain: number } }[])[0].elev?.gain).toBe(20)
  await expect.poll(async () => ((await idb(page, 'routes')) as Record<string, { elevProfile?: number[] }>).g.elevProfile?.length).toBeGreaterThan(100) // 3.4 กม. ทุก ~25 ม. (ส่ง 2 ครั้ง)
  await expect(page.getByText('GAP', { exact: true })).toBeVisible()
  await page.getByRole('img', { name: /กราฟความสูง/ }).click()
  await expect(page.getByText(/^กม\. \d\.\d\d · \d+ ม\./)).toBeVisible()
})

test('เว็บ: มีเวอร์ชันใหม่บน server → ป้ายให้โหลดใหม่', async ({ page }) => {
  await page.route('**/version.json', r => r.fulfill({ json: { version: '99.0.0' } }))
  await seed(page)
  await expect(page.getByText('มีแอปเวอร์ชันใหม่')).toBeVisible()
  await expect(page.getByRole('button', { name: 'โหลดใหม่' })).toBeVisible()
})

test('สลับวันแล้วเปลี่ยนสถานที่ของวันที่สลับมา → เปลี่ยนวันนั้นจริง', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-11-03T08:00:00+07:00') })
  // สัปดาห์ 1: เวท A (จันทร์) สลับไปวันอังคาร
  await seed(page, { program: 'mini', programStart: '2026-11-02', raceDate: '2027-01-10', mode: 'gym', dayMoves: { '2026-11-02': [[1, 0]] } })
  await nav(page, 'ฝึก')
  await page.locator('main .grid-cols-7 button[aria-pressed]').nth(1).click()
  await expect(page.getByText('สลับมาจากวันจันทร์')).toBeVisible()
  await page.getByRole('button', { name: 'ที่บ้าน' }).click()
  await expect.poll(() => idb(page, 'dayLocation')).toEqual({ 'mini-w1-d0': 'home' })
  await expect(page.getByRole('button', { name: 'ที่บ้าน' })).toHaveAttribute('aria-pressed', 'true')
})

test('เซอร์กิตแกนกลางไม่นับเป็นวันเวทในสรุปสัปดาห์ที่แล้ว', async ({ page }) => {
  const circuit = (id: string, date: string) => ({ id, date, mode: 'park', dayKey: 'circuit', title: 'เซอร์กิตแกนกลาง/สะโพก', entries: [], rpe: 5, minutes: 12 })
  await seed(page, { sessions: [circuit('c1', ymd(7))] })
  await page.getByRole('button', { name: /สรุปสัปดาห์ที่แล้ว/ }).click()
  await expect(page.getByText(/^0 \/ \d+ ครั้ง$/)).toBeVisible()
})

test('สภาพอากาศ: ดูพยากรณ์ของพรุ่งนี้ได้', async ({ page }) => {
  const day = (offset: number) => ymd(-offset)
  const hours = [0, 1].flatMap(o => Array.from({ length: 24 }, (_, h) => ({
    time: `${day(o)}T${String(h).padStart(2, '0')}:00`, hour: h, temp: 30, rh: 70,
    wbgt: o === 1 && h === 6 ? 22 : 31, pm25: 20,
  })))
  await seed(page, { heatCache: { at: Date.now(), v: 2, hours, place: { name: 'ขอนแก่น', precise: true } } })
  await nav(page, 'วิ่ง')
  await page.getByRole('button', { name: /WBGT/ }).first().click()
  await page.getByRole('button', { name: 'พรุ่งนี้', exact: true }).click()
  await expect(page.getByText('ช่วงเหมาะสุด 06:00')).toBeVisible()
})

test('โค้ช: ทวงเวทเมื่อไม่ได้เล่นมานาน และสรุปหลังวิ่ง', async ({ page }) => {
  const monday = (() => { const d = new Date(`${ymd(0)}T00:00:00`); d.setDate(d.getDate() - ((d.getDay() + 6) % 7) - 14); return d.toLocaleDateString('en-CA') })()
  await seed(page, {
    program: 'ten', programStart: monday,
    runs: [{ id: 'e', date: ymd(1), km: 5, seconds: 5 * 480, kind: 'easy', source: 'manual', rpe: 8 }],
  })
  await expect(page.getByText(/ยังไม่ได้เริ่มเวทเลย/)).toBeVisible()
  await page.getByRole('button', { name: 'ไว้ทีหลัง' }).click()
  await expect(page.getByText(/ยังไม่ได้เริ่มเวทเลย/)).toHaveCount(0)
  await nav(page, 'วิ่ง')
  await page.getByRole('button', { name: 'ประวัติ' }).click()
  await page.locator('main li button', { hasText: '5.00' }).click()
  await expect(page.getByText(/โค้ช: วันเบาแต่เหนื่อยมาก/)).toBeVisible()
})

test('อากาศร้อนกว่าปกติ: โค้ชเพซตั้งเป้าช้าลง', async ({ page }) => {
  const hours = [0, 1].flatMap(o => Array.from({ length: 24 }, (_, h) => ({ time: `${ymd(-o)}T${String(h).padStart(2, '0')}:00`, hour: h, temp: 33, rh: 70, wbgt: 30, pm25: 20 })))
  await seed(page, {
    heatCache: { at: Date.now(), v: 2, hours, place: { name: 'ขอนแก่น', precise: true } },
    runs: [{ id: 'a', date: ymd(3), km: 5, seconds: 1650, kind: 'race', source: 'manual' }],
  })
  await nav(page, 'วิ่ง')
  await expect(page.getByText(/ร้อนกว่าปกติ \(WBGT 30°\) วันนี้โค้ชเพซตั้งเป้าช้าลง 2\.4%/)).toBeVisible()
})

test('ช่วงนี้ไม่ไหว: ปรับแผนเบาลงชั่วคราวแล้วกลับแผนปกติ', async ({ page }) => {
  await seed(page, { program: 'mini' })
  await nav(page, 'ฝึก')
  await page.getByRole('button', { name: /ช่วงนี้ไม่ไหว\?/ }).click()
  await page.getByRole('button', { name: 'ไม่สบาย', exact: true }).click()
  await page.getByRole('button', { name: 'เริ่มแผนเบา' }).click()
  await expect(page.getByText(/แผนเบาลง \(ไม่สบาย\) ถึง/)).toBeVisible()
  await expect(page.getByText('พักฟื้น (ไม่สบาย)').first()).toBeVisible()
  await expect.poll(async () => ((await idb(page, 'easeOff')) as { reason: string }).reason).toBe('sick')
  await page.getByRole('button', { name: 'กลับแผนปกติ' }).click()
  await expect(page.getByText(/แผนเบาลง/)).toHaveCount(0)
})

test('ตัดท้ายเส้นทางที่ลืมกดหยุด', async ({ page }) => {
  await seed(page, { runs: [{ id: 'g', date: ymd(1), km: 3.4, seconds: 1800, kind: 'easy', source: 'gps', ...loopRoute() }] })
  await nav(page, 'วิ่ง')
  await page.getByRole('button', { name: 'ประวัติ' }).click()
  await page.locator('main li button', { hasText: '3.40' }).click()
  await page.getByRole('button', { name: 'ตัดต้น/ท้าย' }).click()
  await page.getByRole('slider', { name: 'จุดจบ' }).fill('60')
  await page.getByRole('button', { name: 'บันทึกเส้นทางที่ตัดแล้ว' }).click()
  await expect.poll(async () => ((await idb(page, 'runs')) as { km: number }[])[0].km).toBeLessThan(2)
  await expect.poll(async () => ((await idb(page, 'routes')) as Record<string, { route: unknown[] }>).g.route.length).toBe(61)
})

test('เส้นทางสนามแข่ง: นำเข้า GPX แล้วได้เพซรายกิโลตามเนิน', async ({ page }) => {
  // วงรอบ ~3.4 กม. ×3 รอบ ≈ 10 กม. (ความสูงจาก stub: ลง 20 ม. แล้วขึ้น 20 ม. ทุกรอบ)
  const { route } = loopRoute(120)
  const pts = [...route, ...route.slice(1), ...route.slice(1)].map(([la, lo]) => `<trkpt lat="${la}" lon="${lo}"></trkpt>`).join('')
  const gpx = `<?xml version="1.0"?><gpx version="1.1"><trk><name>Khon Kaen</name><trkseg>${pts}</trkseg></trk></gpx>`
  await seed(page, { program: 'mini', runs: [{ id: 'a', date: ymd(3), km: 5, seconds: 2100, kind: 'race', source: 'manual' }] })
  await nav(page, 'ฝึก')
  await page.getByRole('button', { name: /เส้นทางสนามแข่ง/ }).click()
  await page.locator('input[type=file][accept*=gpx]').setInputFiles({ name: 'khonkaen.gpx', mimeType: 'application/gpx+xml', buffer: Buffer.from(gpx) })
  await expect(page.getByText('เพซรายกิโลตามเนิน', { exact: false })).toBeVisible()
  await expect(page.getByText(/^ขึ้น \d+ ม\./).first()).toBeVisible()
  await expect.poll(async () => ((await idb(page, 'raceCourse')) as { profile: number[] }).profile.length).toBeGreaterThan(200)
})

test('จบโปรแกรมแข่ง: สรุปทั้งโปรแกรมในหน้าแรก', async ({ page }) => {
  await seed(page, {
    program: 'mini', raceDate: ymd(2), raceCutoff: 120, raceKm: 11.55,
    runs: [
      { id: 'a', date: ymd(30), km: 5, seconds: 2400, kind: 'easy', source: 'manual' },
      { id: 'r', date: ymd(2), km: 11.55, seconds: 6000, kind: 'race', source: 'manual' },
    ],
  })
  await expect(page.getByText('จบโปรแกรมมินิแล้ว')).toBeVisible()
  await expect(page.getByText(/วันแข่ง 11\.55 กม\. ใน 1:40:00/)).toBeVisible()
  await expect(page.getByText(/ทันเวลาตัด เหลือ 20:00/)).toBeVisible()
  await page.getByRole('button', { name: 'ปิด', exact: true }).click()
  await expect(page.getByText('จบโปรแกรมมินิแล้ว')).toHaveCount(0)
})

test('เริ่มโปรแกรมกลางทาง: สัปดาห์แรกไต่ระยะจากที่วิ่งจริง', async ({ page }) => {
  // วันแข่งอีก 9 สัปดาห์ (โปรแกรม 10K ยาว 12) → เริ่มที่สัปดาห์ 4 ซึ่งตารางมี 15 กม.; สัปดาห์ก่อนวิ่งจริง ~10 กม.
  const now = new Date()
  const back = (now.getDay() + 6) % 7
  const monday = ymd(back)
  const race = ymd(back - 62)
  await seed(page, {
    program: 'ten', raceDate: race, programStart: monday,
    runs: [3, 5, 2].map((km, i) => ({ id: `r${i}`, date: ymd(back + 1 + i * 2), km, seconds: km * 480, kind: 'easy', source: 'manual' })),
  })
  await nav(page, 'ฝึก')
  await expect(page.getByText(/วิ่ง 1[0-2] กม\./).first()).toBeVisible()
  await expect(page.getByText(/วิ่ง 15 กม\./)).toHaveCount(0)
})
