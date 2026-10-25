import { yt } from './workouts'

export const channels = [
  { name: 'Jeff Nippard', lang: 'EN', url: 'https://www.youtube.com/@JeffNippard', why: 'เวทเทรนนิ่งอิงงานวิจัย อธิบายฟอร์มท่าละเอียด' },
  { name: 'Jeremy Ethier', lang: 'EN', url: 'https://www.youtube.com/@JeremyEthier', why: 'โปรแกรมและเทคนิคท่า มีอ้างอิงงานวิจัยในคลิป' },
  { name: 'Renaissance Periodization', lang: 'EN', url: 'https://www.youtube.com/@RenaissancePeriodization', why: 'Dr. Mike Israetel — ปริมาณการฝึก โภชนาการ การลดไขมัน' },
  { name: 'FitnessFAQs', lang: 'EN', url: 'https://www.youtube.com/@FitnessFAQs', why: 'Calisthenics แบบมีลำดับขั้น เหมาะกับฝึกที่สวน' },
  { name: 'The Running Channel', lang: 'EN', url: 'https://www.youtube.com/@TheRunningChannel', why: 'เทคนิควิ่ง Zone 2, interval, ป้องกันบาดเจ็บ' },
  { name: 'BODY HERO', lang: 'TH', url: yt('BODY HERO ฟิตเนส'), why: 'ความรู้ฟิตเนสและคุมอาหารภาษาไทย เข้าใจง่าย' },
  { name: 'โค้ชปุ๊กกี้ (Coach Pukkie)', lang: 'TH', url: yt('โค้ชปุ๊กกี้ ลดไขมัน เพิ่มกล้าม'), why: 'โค้ชที่มีใบรับรอง ACE เน้นโภชนาการ' },
  { name: 'SOLID Magazine', lang: 'TH', url: yt('SOLID Magazine เล่นเวท'), why: 'เล่นเวทและโภชนาการสำหรับผู้ชาย' },
]

// level = ระดับหลักฐาน: แนวทาง/position stand และ meta-analysis น่าเชื่อถือที่สุด สื่อทั่วไปใช้แค่เล่าเรื่องคนดัง
export type Level = 'guideline' | 'meta' | 'trial' | 'cohort' | 'database' | 'media'
export const levelLabel: Record<Level, string> = {
  guideline: 'แนวทางวิชาการ',
  meta: 'Meta-analysis / Review',
  trial: 'งานทดลอง (RCT)',
  cohort: 'งานติดตามกลุ่ม',
  database: 'ฐานข้อมูลทางการ',
  media: 'สื่อ (ไม่ใช่งานวิจัย)',
}

const pm = (id: string) => `https://pubmed.ncbi.nlm.nih.gov/${id}/`

export const references: { cat: string; title: string; url: string; used: string; level: Level }[] = [
  // เวท
  { cat: 'เวทเทรนนิ่ง', level: 'guideline', title: 'ACSM Position Stand: Progression Models in Resistance Training (2009)', url: pm('19204579'), used: 'ช่วงจำนวนครั้ง เวลาพัก และ progressive overload' },
  { cat: 'เวทเทรนนิ่ง', level: 'meta', title: 'Schoenfeld et al. 2017 — Dose-response of weekly training volume', url: pm('27433992'), used: 'จำนวนเซ็ตต่อกล้ามเนื้อต่อสัปดาห์ (~10+ เซ็ต)' },
  { cat: 'เวทเทรนนิ่ง', level: 'meta', title: 'Doma et al. 2017 — Impaired endurance performance after resistance training', url: pm('28702901'), used: 'วิ่งหนักห่างจากเวทขาอย่างน้อย 48 ชม.' },
  { cat: 'เวทเทรนนิ่ง', level: 'trial', title: 'Bickel et al. 2011 — Exercise dosing to retain resistance training adaptations', url: pm('21131862'), used: 'เวท 2 วัน/สัปดาห์พอรักษากล้ามช่วงซ้อมมาราธอน' },
  { cat: 'เวทเทรนนิ่ง', level: 'trial', title: 'Ribeiro et al. 2014 — Warm-up procedures and resistance exercise performance', url: pm('25153744'), used: 'เซ็ตวอร์มอัพเฉพาะท่าก่อนยกหนัก' },
  { cat: 'เวทเทรนนิ่ง', level: 'trial', title: 'Ribeiro et al. 2020 — Specific warm-up during bench press and squat', url: pm('32971729'), used: 'ไล่น้ำหนักวอร์มอัพ ~40/60/80% ด้วยครั้งน้อยลง' },
  { cat: 'เวทเทรนนิ่ง', level: 'meta', title: 'Schoenfeld et al. 2019 — Training frequency and muscle hypertrophy', url: pm('30558493'), used: 'ความถี่ไม่สำคัญเท่าปริมาณรวม (ขาฝึกวันเดียวได้)' },
  { cat: 'เวทเทรนนิ่ง', level: 'meta', title: 'Wilson et al. 2012 — Concurrent training: interference meta-analysis', url: pm('22002517'), used: 'เหตุผลที่ควรเน้นทีละเป้า (หุ่น vs มาราธอน)' },
  // วิ่ง
  { cat: 'วิ่ง', level: 'cohort', title: 'Frandsen et al. 2025 — How much running is too much? (5,200 runners, BJSM)', url: pm('40623829'), used: 'วิ่งยาวแต่ละครั้งไม่เกิน 110% ของครั้งที่ยาวที่สุดใน 30 วันก่อน (เกินแล้วเสี่ยงบาดเจ็บ ~1.6 เท่า)' },
  { cat: 'วิ่ง', level: 'cohort', title: 'Deaner et al. 2015 — Men are more likely than women to slow in the marathon', url: pm('24983344'), used: 'แผนเพซวันแข่ง: ออกตัวช้ากว่าเพซเป้าเล็กน้อย (นักวิ่งสมัครเล่นช้าลงมากในครึ่งหลัง)' },
  { cat: 'วิ่ง', level: 'cohort', title: 'Díaz et al. 2018 — The influence of pacing strategy on marathon world records', url: pm('29557279'), used: 'เพซคงที่หรือครึ่งหลังเร็วกว่าเป็นรูปแบบของสถิติที่ดีที่สุด' },
  { cat: 'วิ่ง', level: 'meta', title: 'Seiler 2010 — Training intensity distribution in endurance athletes', url: pm('20861519'), used: 'วิ่งเบาเป็นส่วนใหญ่ (~80%) วิ่งหนักส่วนน้อย' },
  { cat: 'วิ่ง', level: 'meta', title: 'Bosquet et al. 2007 — Effects of tapering on performance', url: pm('17762369'), used: 'ลดปริมาณ 2–3 สัปดาห์ก่อนแข่ง โดยคงความเร็วไว้' },
  { cat: 'วิ่ง', level: 'meta', title: 'Blagrove et al. 2018 — Strength training for distance runners', url: pm('29249083'), used: 'เวท 2 วัน/สัปดาห์ในโปรแกรมวิ่ง' },
  { cat: 'วิ่ง', level: 'cohort', title: 'Nielsen et al. 2014 — Excessive progression in weekly running distance and injury', url: pm('25155475'), used: 'เพิ่มระยะต่อสัปดาห์ทีละน้อย (การเพิ่มเกิน ~30% สัมพันธ์กับการบาดเจ็บบางชนิด)' },
  { cat: 'วิ่ง', level: 'trial', title: 'Buist et al. 2008 — Graded training program and injuries in novice runners (RCT)', url: pm('17940147'), used: 'กฎ "เพิ่ม 10%" ไม่ได้ลดการบาดเจ็บชัดเจน — ใช้เป็นแนวทางคร่าว ๆ ไม่ใช่กฎตายตัว' },
  { cat: 'วิ่ง', level: 'cohort', title: 'Riegel 1981 — Athletic records and human endurance', url: pm('7235349'), used: 'สูตรคาดการณ์เวลาและเพซจากการวิ่งจริง' },
  { cat: 'วิ่ง', level: 'cohort', title: 'Vickers & Vertosick 2016 — An empirical study of race times in recreational endurance runners', url: pm('27570626'), used: 'Riegel แม่นถึงฮาล์ฟแต่เร็วเกินจริงสำหรับฟูล → คาดการณ์ฟูลด้วยโมเดลที่ปรับตามระยะซ้อมต่อสัปดาห์' },
  { cat: 'วิ่ง', level: 'trial', title: 'Foster et al. 2001 — A new approach to monitoring exercise training (session-RPE)', url: pm('11708692'), used: 'ภาระการฝึก = ความเหนื่อย × นาที' },
  { cat: 'วิ่ง', level: 'meta', title: 'Haddad et al. 2017 — Session-RPE method: validity and usefulness', url: pm('29163016'), used: 'ยืนยันความน่าเชื่อถือของ session-RPE' },
  { cat: 'วิ่ง', level: 'cohort', title: 'Hellard et al. 2006 — Limitations of the Banister model', url: pm('16608765'), used: 'กราฟฟิต/ล้า/ฟอร์มใช้ดูแนวโน้ม ไม่ใช่ตัวเลขแม่นยำ' },
  { cat: 'วิ่ง', level: 'meta', title: 'Impellizzeri et al. 2020 — Acute:Chronic Workload Ratio: conceptual issues', url: pm('32502973'), used: 'เหตุผลที่ไม่ใช้อัตราส่วนภาระทำนายการบาดเจ็บ' },
  // โภชนาการ
  { cat: 'โภชนาการ', level: 'guideline', title: 'ISSN Position Stand: Protein and Exercise (Jäger et al., 2017)', url: 'https://jissn.biomedcentral.com/articles/10.1186/s12970-017-0177-8', used: 'โปรตีน 1.4–2.0 ก./กก./วัน' },
  { cat: 'โภชนาการ', level: 'meta', title: 'Schoenfeld & Aragon 2018 — Protein per meal for muscle building', url: pm('29497353'), used: 'แบ่งโปรตีน ~4 มื้อ มื้อละ ~0.4 ก./กก.' },
  { cat: 'โภชนาการ', level: 'guideline', title: 'ACSM/AND/DC Joint Position: Nutrition and Athletic Performance (2016)', url: pm('26891166'), used: 'คาร์บ 5–7 ก./กก. (ซ้อมปานกลาง) ถึง 6–10 ก./กก. (ซ้อม 1–3 ชม./วัน) และเติมคาร์บระหว่างวิ่งยาว' },
  { cat: 'โภชนาการ', level: 'meta', title: 'Jeukendrup 2014 — Carbohydrate intake during exercise', url: pm('24791914'), used: 'เติมคาร์บ 30–60 ก./ชม. เมื่อวิ่งนานกว่า ~1–2 ชม.' },
  { cat: 'โภชนาการ', level: 'guideline', title: 'ISSN Position Stand: Nutrient timing (Kerksick et al., 2017)', url: pm('28919842'), used: 'กินโปรตีน + คาร์บหลังออกกำลังกาย' },
  { cat: 'โภชนาการ', level: 'guideline', title: 'IOC Consensus: Relative Energy Deficiency in Sport (RED-S) 2018', url: pm('29773536'), used: 'ไม่กินขาดช่วงซ้อมมาราธอน' },
  { cat: 'โภชนาการ', level: 'guideline', title: 'ISSN Position Stand: Creatine supplementation (Kreider et al., 2017)', url: pm('28615996'), used: 'ครีเอทีน 3–5 ก./วัน ปลอดภัยและได้ผล' },
  { cat: 'โภชนาการ', level: 'trial', title: 'Mifflin et al. 1990 — Predictive equation for resting energy expenditure', url: pm('2305711'), used: 'สูตรคำนวณ BMR / TDEE' },
  { cat: 'โภชนาการ', level: 'guideline', title: 'WHO Expert Consultation 2004 — BMI for Asian populations', url: pm('14726171'), used: 'เกณฑ์ BMI ปกติของคนเอเชีย 18.5–22.9' },
  { cat: 'โภชนาการ', level: 'database', title: 'Thai Food Composition Database (สถาบันโภชนาการ ม.มหิดล)', url: 'https://inmu.mahidol.ac.th/thaifcd/home', used: 'ใช้ตรวจค่าพลังงาน/โปรตีนอาหารไทยเพิ่มเติม' },
  // ความปลอดภัย / ฟื้นตัว
  { cat: 'ความปลอดภัยและการฟื้นตัว', level: 'meta', title: 'Van Hooren & Peake 2018 — Do we need a cool-down after exercise?', url: pm('29663142'), used: 'เดิน/จ็อกเบาหลังวิ่งเพื่อให้ร่างกายกลับสู่ภาวะพัก (ไม่ได้ลดปวดเมื่อย)' },
  { cat: 'ความปลอดภัยและการฟื้นตัว', level: 'meta', title: 'Herbert et al. 2011 (Cochrane) — Stretching and muscle soreness', url: pm('21735398'), used: 'ยืดเหยียดเป็นทางเลือก ไม่ได้ลดปวดเมื่อยมากนัก' },
  { cat: 'ความปลอดภัยและการฟื้นตัว', level: 'meta', title: 'Afonso et al. 2021 — Strength training vs stretching for range of motion', url: pm('33917036'), used: 'ความยืดหยุ่นได้จากเวทพอ ๆ กับการยืด' },
  { cat: 'ความปลอดภัยและการฟื้นตัว', level: 'guideline', title: 'Riebe et al. 2015 — ACSM preparticipation health screening', url: pm('26473759'), used: 'คำถามคัดกรองก่อนเริ่มออกกำลังกายหนัก' },
  { cat: 'ความปลอดภัยและการฟื้นตัว', level: 'guideline', title: 'Warburton et al. 2011 — PAR-Q+ consensus on physical activity clearance', url: pm('21800945'), used: 'คำถามเรื่องกระดูก/ข้อในแบบคัดกรอง' },
  { cat: 'ความปลอดภัยและการฟื้นตัว', level: 'trial', title: 'Stull 2011 — Wet-bulb temperature from relative humidity and air temperature', url: 'https://doi.org/10.1175/JAMC-D-11-0143.1', used: 'คำนวณ WBGT ในที่ร่มจากพยากรณ์อากาศ' },
  { cat: 'ความปลอดภัยและการฟื้นตัว', level: 'guideline', title: 'Roberts et al. 2023 — ACSM Expert Consensus on Exertional Heat Illness', url: pm('37036463'), used: 'ปรับการวิ่งตามความร้อน (ปรับตามภูมิภาคได้)' },
  { cat: 'ความปลอดภัยและการฟื้นตัว', level: 'meta', title: 'Mujika & Padilla 2000 — Detraining Part I (short term)', url: pm('10966148'), used: 'หยุดฝึก 2–4 สัปดาห์ สมรรถภาพเริ่มลด → ย้อนแผนก่อนกลับมาฝึกเต็ม' },
  { cat: 'ความปลอดภัยและการฟื้นตัว', level: 'meta', title: 'Mujika & Padilla 2000 — Detraining Part II (long term)', url: pm('10999420'), used: 'หยุดเกิน 4 สัปดาห์ ย้อนแผนมากขึ้น' },
  { cat: 'ความปลอดภัยและการฟื้นตัว', level: 'guideline', title: 'ACSM Position Stand: Exercise and Fluid Replacement (2007)', url: pm('17277604'), used: 'ดื่มน้ำก่อนและระหว่างวิ่ง' },
  { cat: 'ความปลอดภัยและการฟื้นตัว', level: 'guideline', title: 'ACSM Position Stand: Exertional Heat Illness (2007)', url: pm('17473783'), used: 'อาการ heat stroke และการวิ่งในอากาศร้อน' },
  { cat: 'ความปลอดภัยและการฟื้นตัว', level: 'guideline', title: 'AASM/SRS 2015 — Recommended amount of sleep for adults', url: pm('25979105'), used: 'นอนอย่างน้อย 7 ชม./คืน' },
  { cat: 'ความปลอดภัยและการฟื้นตัว', level: 'guideline', title: 'WHO Guidelines on Physical Activity and Sedentary Behaviour (2020)', url: 'https://www.who.int/publications/i/item/9789240015128', used: 'ขั้นต่ำการออกกำลังกายแบบแอโรบิกและเวทต่อสัปดาห์' },
  // Tom Holland
  { cat: 'Tom Holland', level: 'media', title: "Men's Health AU — Tom Holland's 1,500-rep bodyweight ladder", url: 'https://menshealth.com.au/?p=79796', used: 'สไตล์การฝึกบอดี้เวท/ยิมนาสติก' },
  { cat: 'Tom Holland', level: 'media', title: "Men's Health AU — Tom Holland's CrossFit 'Cindy'", url: 'https://menshealth.com.au/?p=85030', used: 'ท่า Cindy ในแผนสวน' },
  { cat: 'Tom Holland', level: 'media', title: 'Fit & Well — Tom Holland bodyweight training', url: 'https://www.fitandwell.com/news/how-tom-holland-used-bodyweight-exercises-to-get-ripped-for-spider-man-3', used: 'ข้อมูลเทรนเนอร์และรูปแบบการฝึก' },
]
