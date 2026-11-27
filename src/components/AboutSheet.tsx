import { useState, type ReactNode } from 'react'
import { ShieldCheck, Stethoscope, Trash2 } from 'lucide-react'
import { APP_VERSION } from '../lib/update'
import { useT } from '../lib/i18n'
import { Button, Sheet } from './ui'

function Section({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <section className="space-y-1.5">
      <h3 className="flex items-center gap-2 font-bold">{icon} {title}</h3>
      <div className="space-y-1.5 text-sm text-muted">{children}</div>
    </section>
  )
}

/**
 * เกี่ยวกับแอป ข้อจำกัดด้านสุขภาพ และความเป็นส่วนตัว (เก็บอะไร เก็บที่ไหน ใครเห็น ส่งให้บริการไหนบ้าง)
 * onDelete: ลบข้อมูลของผู้ใช้ (ล็อกอิน = บน server, ไม่ล็อกอิน = ในเครื่อง) ไม่มี = ไม่แสดงปุ่ม (เช่น หน้าล็อกอิน)
 */
export function AboutSheet({ onClose, onDelete, signedIn = false }: { onClose: () => void; onDelete?: () => Promise<void>; signedIn?: boolean }) {
  const t = useT()
  const [busy, setBusy] = useState(false)
  return (
    <Sheet onClose={onClose} title={t('เกี่ยวกับ Kao และความเป็นส่วนตัว', 'About Kao & privacy')}>
      <div className="space-y-5 pb-2">
        <p className="text-sm">{t(
          'Kao (ก้าว) แอปวางแผนวิ่ง เวทเทรนนิ่ง และโภชนาการ แผนและคำแนะนำอ้างอิงงานวิจัยที่ตรวจสอบได้ (ดูรายการที่ "ความรู้และแหล่งข้อมูล")',
          'Kao is a running, strength and nutrition planner. Plans and advice are based on research you can check (see "Knowledge & sources").')}
          <span className="block text-xs text-muted">{t('เวอร์ชัน', 'Version')} {APP_VERSION}</span>
        </p>

        <Section icon={<Stethoscope size={16} className="text-warn" />} title={t('ข้อจำกัดด้านสุขภาพ', 'Health disclaimer')}>
          <p>{t('ข้อมูลในแอปเพื่อการศึกษาและวางแผนการฝึก ไม่ใช่คำแนะนำทางการแพทย์ และไม่ใช้วินิจฉัยหรือรักษาอาการบาดเจ็บ',
            'Content is for education and training planning. It is not medical advice and does not diagnose or treat injuries.')}</p>
          <p>{t('มีโรคประจำตัว เจ็บหน้าอก หน้ามืด หรือเจ็บที่ไม่ดีขึ้นใน 1–2 สัปดาห์ ให้ปรึกษาแพทย์หรือนักกายภาพบำบัดก่อนฝึกต่อ',
            'If you have a medical condition, chest pain, dizziness, or pain that does not improve in 1–2 weeks, see a doctor or physiotherapist before training on.')}</p>
        </Section>

        <Section icon={<ShieldCheck size={16} className="text-good" />} title={t('ข้อมูลของคุณ', 'Your data')}>
          <p>{t('สิ่งที่เก็บ: ข้อมูลร่างกายที่กรอก การวิ่ง (รวมเส้นทาง GPS) การฝึก อาหาร น้ำหนัก รูปที่เพิ่ม และรายงานข้อผิดพลาดของแอป',
            'What is stored: the body details you enter, runs (including GPS routes), workouts, food, weight, photos you add, and app error reports.')}</p>
          <p>{t('ไม่ล็อกอิน: ทุกอย่างอยู่ในเครื่องนี้เท่านั้น ล็อกอิน: ซิงก์ขึ้นฐานข้อมูล Supabase ที่ตั้งสิทธิ์ให้บัญชีของคุณอ่านและแก้ได้เฉพาะข้อมูลของตัวเอง รูปเก็บในพื้นที่ส่วนตัวของบัญชี',
            'Not signed in: everything stays on this device. Signed in: data syncs to a Supabase database whose access rules let each account read and change only its own data; photos go to a private folder for your account.')}</p>
          <p>{t('ผู้ดูแลแอปเข้าถึงฐานข้อมูลได้ในฐานะผู้ดูแลระบบ ใช้เพื่อแก้ปัญหาเท่านั้น ไม่ขาย ไม่แชร์ ไม่มีโฆษณา และไม่มีตัวติดตามการใช้งาน',
            'The app administrator can access the database as system admin, only to fix problems. Nothing is sold or shared, there are no ads and no usage trackers.')}</p>
          <p>{t('บริการภายนอกที่แอปเรียกใช้: Google (ล็อกอิน) · Open-Meteo (อากาศ ฝุ่น ความสูงเส้นทาง ส่งพิกัดโดยประมาณ) · OpenStreetMap (แผนที่ และจุดน้ำบนเส้นทางเมื่อกดค้นหา) · GitHub (เช็กเวอร์ชันใหม่ของแอป Android)',
            'Outside services the app calls: Google (sign-in) · Open-Meteo (weather, air quality, route elevation; receives approximate coordinates) · OpenStreetMap (maps, and water stops on a route when you search) · GitHub (Android update check).')}</p>
        </Section>

        {onDelete && (
          <section className="space-y-2 rounded-2xl bg-bad/10 p-3">
            <h3 className="flex items-center gap-2 font-bold text-bad"><Trash2 size={16} /> {t('ลบข้อมูลของฉัน', 'Delete my data')}</h3>
            <p className="text-sm text-muted">{signedIn
              ? t('ลบข้อมูลทั้งหมดของบัญชีนี้บน server รวมรูป และข้อมูลในเครื่องนี้ แล้วออกจากระบบ ย้อนกลับไม่ได้ ถ้าต้องการเก็บไว้ ให้สำรองเป็นไฟล์ก่อน บัญชีล็อกอินยังอยู่ ถ้าต้องการลบบัญชีด้วยแจ้งผู้ดูแลแอป',
                'Deletes all of this account’s data on the server, including photos, and the data on this device, then signs out. This can’t be undone; back up to a file first if you want to keep it. The sign-in account itself remains; ask the app administrator to remove it too.')
              : t('ลบข้อมูลทั้งหมดในเครื่องนี้ ย้อนกลับไม่ได้ ถ้าต้องการเก็บไว้ ให้สำรองเป็นไฟล์ก่อน', 'Deletes all data on this device. This can’t be undone; back up to a file first if you want to keep it.')}</p>
            <Button size="sm" variant="danger" disabled={busy} onClick={() => void (async () => { setBusy(true); try { await onDelete() } finally { setBusy(false) } })()}>
              <Trash2 size={15} /> {t('ลบข้อมูลทั้งหมด', 'Delete all data')}
            </Button>
          </section>
        )}
      </div>
    </Sheet>
  )
}
