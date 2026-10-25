// IndexedDB แบบบาง ๆ — 'kv' เก็บค่าของ usePersisted (จุได้มากกว่า localStorage ~5 MB หลายเท่า)
// และ 'blobs' เก็บไฟล์รูป (ใช้ได้ตอนออฟไลน์/โหมดไม่ล็อกอิน)
const DB = 'exercise-plan'
type Store = 'kv' | 'blobs'

let opening: Promise<IDBDatabase> | null = null

export function openDb(): Promise<IDBDatabase> {
  if (opening) return opening
  opening = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') return reject(new Error('no indexedDB'))
    const req = indexedDB.open(DB, 1)
    req.onupgradeneeded = () => {
      req.result.createObjectStore('kv')
      req.result.createObjectStore('blobs')
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
  opening.catch(() => { opening = null })
  return opening
}

const done = (tx: IDBTransaction) => new Promise<void>((resolve, reject) => {
  tx.oncomplete = () => resolve()
  tx.onerror = () => reject(tx.error)
  tx.onabort = () => reject(tx.error)
})

/** อ่านทุกค่าใน store (ใช้ตอนเปิดแอป) */
export async function getAll(store: Store): Promise<Map<string, unknown>> {
  const db = await openDb()
  const tx = db.transaction(store, 'readonly')
  const os = tx.objectStore(store)
  const [keys, values] = await Promise.all([req(os.getAllKeys()), req(os.getAll())])
  return new Map(keys.map((k, i) => [String(k), values[i]]))
}

export async function put(store: Store, key: string, value: unknown) {
  const db = await openDb()
  const tx = db.transaction(store, 'readwrite')
  tx.objectStore(store).put(value, key)
  return done(tx)
}

export async function get<T>(store: Store, key: string): Promise<T | undefined> {
  const db = await openDb()
  return req(db.transaction(store, 'readonly').objectStore(store).get(key)) as Promise<T | undefined>
}

export async function clear(store: Store) {
  const db = await openDb()
  const tx = db.transaction(store, 'readwrite')
  tx.objectStore(store).clear()
  return done(tx)
}

export async function del(store: Store, key: string) {
  const db = await openDb()
  const tx = db.transaction(store, 'readwrite')
  tx.objectStore(store).delete(key)
  return done(tx)
}

function req<T>(r: IDBRequest<T>) {
  return new Promise<T>((resolve, reject) => {
    r.onsuccess = () => resolve(r.result)
    r.onerror = () => reject(r.error)
  })
}
