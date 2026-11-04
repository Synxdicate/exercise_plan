import { cx } from '../lib/cx'
import { useT } from '../lib/i18n'

// สเกล CR-10 ของ Borg ที่ใช้กับ session-RPE (Foster 2001)
const labels: Record<number, [string, string]> = { 1: ['สบายมาก', 'Very easy'], 3: ['ปานกลาง', 'Moderate'], 5: ['หนัก', 'Hard'], 7: ['หนักมาก', 'Very hard'], 10: ['สุดแรง', 'Max'] }

/** ให้คะแนนความเหนื่อยทั้งรอบ 1–10 หลังจบการฝึก */
export function RpePicker({ value, onPick }: { value?: number; onPick: (v: number) => void }) {
  const t = useT()
  return (
    <div>
      <div className="mb-1.5 text-sm font-semibold">{t('ทั้งรอบนี้เหนื่อยแค่ไหน?', 'How hard was this session?')} <span className="font-normal text-muted">{t('(ใช้คำนวณภาระการฝึก)', '(used for training load)')}</span></div>
      <div className="grid grid-cols-10 gap-1">
        {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
          <button key={n} onClick={() => onPick(n)} aria-label={t(`ความเหนื่อย ${n}`, `Effort ${n}`)}
            className={cx('rounded-lg py-2 text-sm font-bold tabular-nums transition-colors',
              value === n ? 'bg-accent-fill text-white' : n <= 3 ? 'bg-run/15 text-run' : n <= 6 ? 'bg-warn/15 text-warn' : 'bg-bad/15 text-bad')}>
            {n}
          </button>
        ))}
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-muted">{[1, 3, 5, 7, 10].map(n => <span key={n}>{t(...labels[n])}</span>)}</div>
    </div>
  )
}
