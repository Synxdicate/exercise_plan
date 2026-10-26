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
  await page.reload()
  await expect.poll(() => idb(page, 'runs').then(r => (r as unknown[] | null)?.length)).toBe(1)
  expect(await page.evaluate(() => localStorage.getItem('runs'))).toBeNull()

  // ยังไม่เคยสำรอง → มีแถบเตือน, กดแล้วดาวน์โหลดไฟล์และแถบหาย
  await nav(page, 'หน้าหลัก')
  await expect(page.getByText('ยังไม่เคยสำรองข้อมูล')).toBeVisible()
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'สำรองเลย' }).click()
  expect((await download).suggestedFilename()).toMatch(/^exercise-plan-backup-.*\.json$/)
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
  const alpha = () => page.locator('img[alt="รูปสรุปการวิ่ง"]').evaluate(async (img: HTMLImageElement) => {
    await img.decode()
    const c = document.createElement('canvas')
    c.width = img.naturalWidth
    c.height = img.naturalHeight
    const g = c.getContext('2d')!
    g.drawImage(img, 0, 0)
    return { w: c.width, a: g.getImageData(5, 5, 1, 1).data[3] }
  })
  await expect.poll(alpha).toEqual({ w: 1080, a: 255 })
  await page.getByRole('button', { name: 'โปร่ง · ขาว' }).click()
  await expect.poll(alpha).toEqual({ w: 1080, a: 0 })
})

test('เป้าเวลา + เส้นทางสู่มาราธอน + แผนวันแข่ง + เตือนเจ็บซ้ำ', async ({ page }) => {
  await seed(page, {
    runs: [
      { id: 'a', date: ymd(60), km: 5.1, seconds: 1900, kind: 'easy', source: 'manual' },
      { id: 'b', date: ymd(50), km: 10.2, seconds: 3500, kind: 'race', source: 'manual' },
    ],
    program: 'half', week: 16,
    readiness: { [ymd(1)]: { sleep: 0, sore: 1, pain: true, level: 'red' }, [ymd(3)]: { sleep: 0, sore: 0, pain: true, level: 'red' } },
  })
  await nav(page, 'วิ่ง')
  await page.getByRole('button', { name: 'วิ่ง', exact: true }).first().click()
  await expect(page.getByText('ด่านต่อไป: บอสฮาล์ฟ')).toBeVisible()

  await page.getByRole('button', { name: 'สถิติ' }).click()
  await expect(page.getByRole('button', { name: 'ทดสอบ 5K' })).toBeVisible() // ผลเก่าเกิน 6 สัปดาห์
  await page.getByRole('button', { name: /^ฮาล์ฟ/ }).click()
  await page.getByPlaceholder('เช่น 1:59:59').fill('1:59:59')
  await page.getByRole('button', { name: 'ตั้งเป้า' }).click()
  await expect(page.getByText('ต้องวิ่งเพซ')).toBeVisible()
  expect(await idb(page, 'goals')).toMatchObject({ race: { half: 7199 } })

  await nav(page, 'ฝึก')
  await expect(page.getByText(/เจ็บ 2 วันใน 7 วัน/)).toBeVisible()
  await page.locator('button[aria-label^="อาทิตย์"]').click()
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
  await page.locator('button[aria-label^="จันทร์"]').click()
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
  await page.locator('button[aria-label^="จันทร์"]').click()
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
  await page.getByRole('button', { name: 'วันนี้', exact: true }).click()
  await expect(page.getByText('Easy 5.30 กม. · 31:40')).toBeVisible()
})

test('แผนที่รวมทุกการวิ่ง (heatmap)', async ({ page }) => {
  await seed(page, {
    runs: [
      { id: 'h1', date: ymd(3), km: 3, seconds: 1200, kind: 'easy', source: 'gps', ...loopRoute() },
      { id: 'h2', date: ymd(1), km: 3, seconds: 1150, kind: 'easy', source: 'gps', ...loopRoute() },
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
    await page.locator(`button[aria-label^="${d}"]`).click()
    if (await target.count()) break
  }
  await target.first().click()
  await expect(page.getByRole('img', { name: /Hollow Body Hold ภาพลายเส้น/ })).toBeVisible()
})

test('คาร์ดิโออื่น: บันทึกปั่นจักรยานแล้วแสดงในปฏิทิน', async ({ page }) => {
  await seed(page)
  await nav(page, 'วิ่ง')
  await page.getByRole('button', { name: 'ประวัติ' }).click()
  await page.locator('main').getByRole('button', { name: 'เพิ่ม', exact: true }).click()
  await page.locator('main').getByRole('button', { name: 'บันทึก', exact: true }).last().click()
  await expect(page.getByText('ปั่นจักรยาน · 40 นาที')).toBeVisible()
  expect(((await idb(page, 'cross')) as unknown[]).length).toBe(1)
  await nav(page, 'บันทึก')
  await expect(page.getByText(/ออกกำลังกาย 1 วัน/)).toBeVisible()
})
