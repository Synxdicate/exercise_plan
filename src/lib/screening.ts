import { usePersisted } from './storage'

// คัดกรองก่อนออกกำลังกายตามแนวทาง ACSM 2015 (Riebe et al.) + คำถามข้อต่อ/กระดูกจาก PAR-Q
export type Screening = {
  exercising: boolean // ออกกำลังกายปานกลางขึ้นไป ≥30 นาที ≥3 วัน/สัปดาห์ ต่อเนื่อง ≥3 เดือน
  disease: boolean // เป็นโรคหัวใจ/หลอดเลือด เบาหวาน หรือโรคไต (ที่แพทย์วินิจฉัย)
  symptoms: boolean // เจ็บแน่นหน้าอก หน้ามืด/เป็นลม หอบผิดปกติ ใจสั่น ข้อเท้าบวม ตอนออกแรงหรือพัก
  joint: boolean // ปัญหากระดูก/ข้อที่ออกกำลังแล้วแย่ลง
  date?: string
}

export type Clearance = 'clear' | 'moderate-only' | 'see-doctor'

export function clearance(s: Screening): Clearance {
  if (s.symptoms) return 'see-doctor'
  if (s.disease) return s.exercising ? 'moderate-only' : 'see-doctor'
  return 'clear'
}

export const clearanceText: Record<Clearance, { title: string; text: string }> = {
  'clear': { title: 'เริ่มได้เลย', text: 'ไม่มีข้อห้าม เริ่มจากเบาไปหนักตามแผน' },
  'moderate-only': { title: 'ออกกำลังกายระดับปานกลางได้', text: 'ควรให้แพทย์ประเมินก่อนเพิ่มเป็นการฝึกหนัก (วิ่ง tempo/interval, ซ้อมมาราธอน)' },
  'see-doctor': { title: 'ควรพบแพทย์ก่อนเริ่ม', text: 'อาการ/โรคที่ตอบมาควรได้รับการประเมินจากแพทย์ก่อนเริ่มโปรแกรม เพื่อความปลอดภัยของหัวใจ' },
}

export const emptyScreening: Screening = { exercising: true, disease: false, symptoms: false, joint: false }

export const useScreening = () => usePersisted<Screening | null>('screening', null)
