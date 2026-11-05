import { ExternalLink, Play } from 'lucide-react'
import { catEn, channels, levelLabel, levelLabelEn, references } from '../data/sources'
import { useLang, useT } from '../lib/i18n'
import { Badge, Card } from './ui'
import { Guide } from './Overview'

export function Sources() {
  const t = useT()
  const en = useLang()[0] === 'en'
  return (
    <>
      <Guide />
      <Card title={t('ช่อง YouTube ที่แนะนำ', 'Recommended YouTube channels')}>
        <p className="-mt-1 mb-3 text-xs text-muted">{t('ช่องที่อิงงานวิจัยหรือโค้ชที่มีใบรับรอง', 'Evidence-based channels or certified coaches')}</p>
        <ul className="divide-y divide-line">
          {channels.map(c => (
            <li key={c.name}>
              <a href={c.url} target="_blank" rel="noreferrer" className="flex items-center gap-3 py-3 text-ink!">
                <div className="grid size-10 shrink-0 place-items-center rounded-full bg-accent-fill text-white"><Play size={16} fill="currentColor" /></div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 font-semibold">{c.name} <Badge tone={c.lang === 'TH' ? 'good' : 'run'}>{c.lang}</Badge></div>
                  <div className="text-xs text-muted">{en ? c.whyEn : c.why}</div>
                </div>
                <ExternalLink size={16} className="shrink-0 text-muted" />
              </a>
            </li>
          ))}
        </ul>
      </Card>

      <Card title={t('แหล่งอ้างอิง', 'References')}>
        <p className="-mt-1 mb-3 text-xs text-muted">{t('ตัวเลขในแอปอ้างอิงจากรายการนี้ (ตรวจกับ PubMed แล้ว) — ข้อมูล Tom Holland มาจากสื่อ', 'Numbers in the app come from this list (checked on PubMed) — Tom Holland info comes from media')}</p>
        <div className="space-y-4">
          {[...new Set(references.map(r => r.cat))].map(cat => (
            <div key={cat}>
              <div className="mb-1.5 text-sm font-bold">{en ? catEn[cat] ?? cat : cat}</div>
              <ul className="space-y-2.5 text-sm">
                {references.filter(r => r.cat === cat).map(r => (
                  <li key={r.url}>
                    <a href={r.url} target="_blank" rel="noreferrer" className="font-semibold">{r.title}</a>
                    <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted">
                      <Badge tone={r.level === 'media' ? 'muted' : r.level === 'guideline' || r.level === 'meta' ? 'good' : 'run'}>{(en ? levelLabelEn : levelLabel)[r.level]}</Badge>
                      <span>{t('ใช้สำหรับ:', 'Used for:')} {en ? r.usedEn : r.used}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Card>

    </>
  )
}
