# Lean & Athletic — แผนออกกำลังกาย 12 สัปดาห์

เว็บแอปแผนเวท + วิ่ง (ยิมหรือสวนสาธารณะ) พร้อมคำนวณแคลอรี่/โปรตีน แนะนำอาหารไทย และบันทึกน้ำหนัก

## รัน

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # ตรวจ type + build ไปที่ dist/
npm run lint
```

## Deploy ขึ้น Vercel

- **ผ่าน GitHub:** push repo ขึ้น GitHub → vercel.com → Add New Project → import repo (Vercel จะรู้ว่าเป็น Vite เอง)
- **ผ่าน CLI:** `npm i -g vercel` → `vercel` (preview) → `vercel --prod`

## แก้เนื้อหา

เนื้อหาทั้งหมดอยู่ใน `src/data/` — แก้ท่า/เซ็ตที่ `workouts.ts`, อาหารที่ `nutrition.ts`, ช่อง YouTube และแหล่งอ้างอิงที่ `sources.ts`
