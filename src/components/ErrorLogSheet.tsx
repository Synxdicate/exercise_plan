import { Copy } from 'lucide-react'
import type { ErrorEntry } from '../lib/errors'
import { usePersisted } from '../lib/storage'
import { notify } from '../lib/dialog'
import { useT } from '../lib/i18n'
import { Button, Sheet } from './ui'

/** รายการปัญหาที่แอปบันทึกไว้ คัดลอกส่งให้คนแก้ได้ */
export function ErrorLogSheet({ onClose }: { onClose: () => void }) {
  const [log, setLog] = usePersisted<ErrorEntry[]>('errorLog', [])
  const t = useT()
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(log, null, 2))
      notify(t('คัดลอกรายงานแล้ว', 'Report copied'), 'good')
    } catch {
      notify(t('คัดลอกไม่ได้', 'Couldn’t copy'), 'bad')
    }
  }
  return (
    <Sheet onClose={onClose} title={t('ปัญหาที่พบ', 'Problems')}>
      {!log.length ? (
        <p className="py-6 text-center text-sm text-muted">{t('ยังไม่มีปัญหาที่บันทึกไว้', 'No problems logged')}</p>
      ) : (
        <>
          <p className="-mt-1 mb-2 text-xs text-muted">{t('ถ้าล็อกอินอยู่ แอปส่งรายงานขึ้นบัญชีให้อัตโนมัติ', 'When logged in, reports are uploaded automatically')}</p>
          <ul className="divide-y divide-line">
            {[...log].reverse().map(e => (
              <li key={e.at} className="py-2 text-xs">
                <div className="flex justify-between gap-2 text-muted">
                  <span>{new Date(e.at).toLocaleString('th-TH')}</span>
                  <span>v{e.version} · {e.platform}{e.sent ? t(' · ส่งแล้ว', ' · sent') : ''}</span>
                </div>
                <div className="mt-0.5 break-words font-semibold">{e.message}</div>
                {e.context && <div className="break-words text-muted">{e.context}</div>}
              </li>
            ))}
          </ul>
          <div className="mt-3 flex gap-2">
            <Button variant="soft" className="flex-1" onClick={copy}><Copy size={15} /> {t('คัดลอก', 'Copy')}</Button>
            <Button variant="soft" className="flex-1" onClick={() => setLog([])}>{t('ล้างรายการ', 'Clear')}</Button>
          </div>
        </>
      )}
    </Sheet>
  )
}
