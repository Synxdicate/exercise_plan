// ท่าเวทที่ควรใส่น้ำหนักจริง (บาร์ ดัมเบล เครื่อง) ถ้าบันทึก 0 กก. suggest() เพิ่มน้ำหนักให้ไม่ได้
const LOADED = /squat|deadlift|bench|press|row|curl|raise|lunge|pulldown|cable|dumbbell|machine|goblet|rdl|hip thrust|extension|fly/i
const BODYWEIGHT = /pull-up|chin-up|dips|dip\b|push-up|plank|bug|hold|pogo|jump|nordic|walk|bird|superman|hollow|leg raise|hanging|pistol|australian|single-leg calf|glute bridge|prone/i
export const needsKg = (name: string) => LOADED.test(name) && !BODYWEIGHT.test(name)
