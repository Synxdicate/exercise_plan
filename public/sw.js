// Service worker แบบง่าย: ให้แอปเปิดได้ตอนออฟไลน์ (ข้อมูลอยู่ใน localStorage แล้วซิงก์ทีหลัง)
// - หน้า HTML: network-first แล้วค่อยใช้ cache (ได้เวอร์ชันใหม่ทันทีหลัง deploy)
// - ไฟล์ใน /assets/ มีชื่อแบบ hash: cache-first
const CACHE = 'exercise-plan-v1'

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(['/', '/manifest.webmanifest', '/favicon.svg'])))
  self.skipWaiting()
})

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))))
  self.clients.claim()
})

self.addEventListener('fetch', e => {
  const req = e.request
  const url = new URL(req.url)
  if (req.method !== 'GET' || url.origin !== self.location.origin) return

  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then(res => {
          const copy = res.clone()
          caches.open(CACHE).then(c => c.put('/', copy))
          return res
        })
        .catch(() => caches.match('/')),
    )
    return
  }

  if (url.pathname.startsWith('/assets/')) {
    e.respondWith(
      caches.match(req).then(hit => hit ?? fetch(req).then(res => {
        const copy = res.clone()
        caches.open(CACHE).then(c => c.put(req, copy))
        return res
      })),
    )
  }
})
