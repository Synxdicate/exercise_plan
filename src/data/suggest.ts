// ท่าแนะนำตอน "เพิ่มท่า": คัดตามเป้าหมาย พร้อมเหตุผลที่อ้างอิงงานวิจัยใน sources.ts (โชว์ 3 ท่าที่ยังไม่มีในวันนั้นและทำได้ในที่นั้น)
export type Suggestion = { name: string; why: string; whyEn: string }

export const SUGGEST: Record<'runner' | 'lifter', Suggestion[]> = {
  runner: [
    { name: 'Copenhagen Plank', why: 'ต้นขาด้านในแข็งแรง ลดปัญหาขาหนีบ (RCT ในนักฟุตบอล ลดลง ~41%, Harøy 2019)', whyEn: 'Stronger adductors; ~41% fewer groin problems in an RCT (football players, Harøy 2019)' },
    { name: 'Nordic Curl', why: 'ลดการบาดเจ็บต้นขาหลังได้ราวครึ่งหนึ่ง (meta-analysis, Al Attar 2017)', whyEn: 'About half the hamstring injuries (meta-analysis, Al Attar 2017)' },
    { name: 'Bent-knee Calf Raise', why: 'น่องมัดใน (soleus) รับแรงตอนวิ่งมากที่สุด', whyEn: 'The soleus takes the most force in running' },
    { name: 'Step-up', why: 'แรงขาเดียวในท่าคล้ายขึ้นเนิน ช่วยสนามที่มีเนิน', whyEn: 'Single-leg strength in an uphill-like pattern' },
    { name: 'Single-leg RDL', why: 'ก้นและต้นขาหลังทีละข้าง ช่วยการทรงตัวขาเดียวแบบตอนวิ่ง', whyEn: 'Glutes and hamstrings one leg at a time, like running stance' },
  ],
  lifter: [
    { name: 'Face Pull', why: 'ไหล่หลังและสะบัก สมดุลกับท่าดันอก', whyEn: 'Rear delts and scapulae to balance pressing' },
    { name: 'Lateral Raise', why: 'ไหล่ข้างให้ไหล่กว้าง ท่าดันอกโดนน้อย', whyEn: 'Side delts for width; pressing barely hits them' },
    { name: 'Hip Thrust', why: 'ก้นได้แรงสุดตอนสะโพกเหยียด เสริมจากสควอท', whyEn: 'Glutes at full hip extension, complements squats' },
    { name: 'Pallof Press', why: 'แกนกลางต้านการบิด ไม่ต้องงอหลังซ้ำ ๆ', whyEn: 'Anti-rotation core without repeated spinal flexion' },
    { name: 'Copenhagen Plank', why: 'ต้นขาด้านในที่โปรแกรมทั่วไปมักข้าม (Harøy 2019)', whyEn: 'Adductors most programs skip (Harøy 2019)' },
  ],
}
