import { Flag } from 'lucide-react'
import { formatDuration } from '../lib/log'
import { shortDate } from '../lib/date'
import { useFinish } from '../lib/useFinish'
import { useT } from '../lib/i18n'
import { cx } from '../lib/cx'
import { Card } from './ui'

export function FinishCard() {
  const t = useT()
  const { f, km, cutoff, margin, show } = useFinish()
  if (!show || !km) return null
  return (
    <Card title={<span className="flex items-center gap-2"><Flag size={18} className="text-run" /> {t(`เวลาจบโดยประมาณ ${km} กม.`, `Estimated finish ${km} km`)}</span>}>
      {!f ? (
        <p className="text-sm text-muted">{t('วิ่ง (รวมวิ่งสลับเดิน) ให้ได้ 3 กม. ขึ้นไปสักครั้ง แล้วแอปจะประมาณเวลาจบให้', 'Do one run (run-walk counts) of 3 km or more and the app will estimate your finish time')}</p>
      ) : (
        <>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold tabular-nums">~{formatDuration(f.sec)}</span>
            {f.best < f.sec - 60 && <span className="text-sm text-muted tabular-nums">({t('ดีสุด', 'best case')} {formatDuration(f.best)})</span>}
          </div>
          <p className="mt-1 text-xs text-muted">{t(`คิดจากรอบที่ไกลที่สุดใน 60 วัน: ${f.from.km.toFixed(1)} กม. (${shortDate(f.from.date)}) ค่าคร่าว ๆ ยิ่งวิ่งยาวใกล้ระยะแข่งยิ่งแม่น`, `From your longest run in 60 days: ${f.from.km.toFixed(1)} km (${shortDate(f.from.date)}) — rough; gets more accurate as long runs approach race distance`)}</p>
          {cutoff && margin !== null && (
            <p className={cx('mt-2 rounded-xl p-2.5 text-sm font-semibold', margin >= 5 * 60 ? 'bg-good/15 text-good' : 'bg-warn/15 text-warn')}>
              {margin >= 0
                ? t(`ทันเวลาตัดตัว ${cutoff} นาที เผื่อ ~${Math.round(margin / 60)} นาที`, `Within the ${cutoff}-min cutoff — ~${Math.round(margin / 60)} min to spare`)
                : t(`ช้ากว่าเวลาตัดตัว ~${Math.round(-margin / 60)} นาที ซ้อมตามแผนต่อ วิ่งยาวที่ไกลขึ้นจะทำให้ตัวเลขนี้ดีขึ้น`, `~${Math.round(-margin / 60)} min over the cutoff — keep following the plan; longer long runs will bring this down`)}
              <span className="mt-0.5 block text-xs font-normal">{t(`เพซเฉลี่ยที่ต้องทำ (รวมเดิน): ${formatDuration((cutoff * 60) / km)} /กม.`, `Average pace needed (incl. walking): ${formatDuration((cutoff * 60) / km)} /km`)}</span>
            </p>
          )}
          {!cutoff && <p className="mt-2 text-xs text-muted">{t('ใส่เวลาตัดตัวของงานได้ที่ ตั้งค่าโปรแกรม', 'Add the race cutoff in program settings')}</p>}
        </>
      )}
    </Card>
  )
}
