// ภาพลายเส้นท่าที่ไม่มีรูปถ่ายที่ตรงพอ มุมมองด้านข้าง viewBox 120×80, พื้นที่ y = 72
// แต่ละท่ามี 2 ท่วงท่า (เริ่ม/จบ) ระบุตำแหน่งข้อต่อ: หัว ไหล่ ศอก มือ สะโพก เข่า เท้า
export type Pt = [number, number]
export type Pose = { head: Pt; shoulder: Pt; elbow: Pt; hand: Pt; hip: Pt; knee: Pt; foot: Pt; elbow2?: Pt; hand2?: Pt; knee2?: Pt; foot2?: Pt } // *2 = แขน/ขาข้างไกล (วาดจาง)
export type Prop = { kind: 'wall'; x: number } | { kind: 'floor' } | { kind: 'bench'; x: number; y: number; w: number }
export type StickDemo = { poses: [Pose, Pose]; props: Prop[] }

export const stickDemos: Record<string, StickDemo> = {
  // แพลงก์ข้างวางขาบนบนม้านั่ง (มองจากด้านหน้า) ศอกอยู่ใต้ไหล่ ยกสะโพกจนลำตัวตรง ขาล่างห้อยใต้ม้านั่ง (วาดจาง)
  'Copenhagen Plank': {
    props: [{ kind: 'floor' }, { kind: 'bench', x: 88, y: 50, w: 26 }],
    poses: [
      { head: [17, 57], shoulder: [25, 60], elbow: [25, 72], hand: [36, 72], hip: [58, 66], knee: [79, 57], foot: [99, 49], knee2: [77, 70], foot2: [92, 72] },
      { head: [16, 53], shoulder: [25, 58], elbow: [25, 72], hand: [36, 72], hip: [61, 53], knee: [80, 51], foot: [99, 49], knee2: [79, 60], foot2: [93, 68] },
    ],
  },
  // ดริลล์ก่อนวิ่ง (หันขวา) ขาข้างไกลวาดจาง
  'Leg Swing': {
    props: [{ kind: 'wall', x: 82 }, { kind: 'floor' }],
    poses: [
      { head: [60, 12], shoulder: [60, 21], elbow: [68, 25], hand: [77, 27], hip: [60, 44], knee: [50, 54], foot: [42, 64], knee2: [60, 58], foot2: [60, 72] },
      { head: [59, 12], shoulder: [59, 21], elbow: [67, 25], hand: [77, 27], hip: [60, 44], knee: [70, 54], foot: [80, 63], knee2: [60, 58], foot2: [60, 72] },
    ],
  },
  'Lateral Leg Swing': {
    props: [{ kind: 'floor' }],
    poses: [
      { head: [60, 12], shoulder: [60, 21], elbow: [52, 30], hand: [47, 38], hip: [60, 44], knee: [71, 55], foot: [81, 66], knee2: [57, 58], foot2: [56, 72], elbow2: [68, 30], hand2: [73, 38] },
      { head: [60, 12], shoulder: [60, 21], elbow: [52, 30], hand: [47, 38], hip: [60, 44], knee: [53, 57], foot: [46, 69], knee2: [57, 58], foot2: [56, 72], elbow2: [68, 30], hand2: [73, 38] },
    ],
  },
  Ankling: {
    props: [{ kind: 'floor' }],
    poses: [
      { head: [61, 12], shoulder: [61, 21], elbow: [57, 31], hand: [62, 38], hip: [60, 44], knee: [64, 58], foot: [66, 71], knee2: [57, 58], foot2: [55, 72], elbow2: [65, 31], hand2: [70, 36] },
      { head: [61, 11], shoulder: [61, 20], elbow: [65, 30], hand: [70, 35], hip: [60, 43], knee: [65, 56], foot: [64, 66], knee2: [60, 57], foot2: [60, 72], elbow2: [56, 30], hand2: [60, 38] },
    ],
  },
  'A-March': {
    props: [{ kind: 'floor' }],
    poses: [
      { head: [60, 12], shoulder: [60, 21], elbow: [55, 31], hand: [62, 37], hip: [60, 44], knee: [60, 58], foot: [60, 72], knee2: [73, 44], foot2: [73, 58], elbow2: [66, 31], hand2: [73, 25] },
      { head: [60, 12], shoulder: [60, 21], elbow: [66, 31], hand: [73, 25], hip: [60, 44], knee: [73, 44], foot: [73, 58], knee2: [60, 58], foot2: [60, 72], elbow2: [55, 31], hand2: [62, 37] },
    ],
  },
  'Butt Kicks': {
    props: [{ kind: 'floor' }],
    poses: [
      { head: [61, 12], shoulder: [61, 21], elbow: [56, 31], hand: [62, 37], hip: [60, 44], knee: [61, 58], foot: [52, 47], knee2: [61, 58], foot2: [61, 72], elbow2: [66, 31], hand2: [72, 26] },
      { head: [61, 12], shoulder: [61, 21], elbow: [66, 31], hand: [72, 26], hip: [60, 44], knee: [61, 58], foot: [61, 72], knee2: [61, 58], foot2: [52, 47], elbow2: [56, 31], hand2: [62, 37] },
    ],
  },
  'A-Skip': {
    props: [{ kind: 'floor' }],
    poses: [
      { head: [60, 8], shoulder: [60, 17], elbow: [55, 27], hand: [62, 33], hip: [60, 40], knee: [61, 54], foot: [62, 67], knee2: [73, 40], foot2: [73, 54], elbow2: [66, 27], hand2: [73, 21] },
      { head: [60, 12], shoulder: [60, 21], elbow: [66, 31], hand: [73, 25], hip: [60, 44], knee: [73, 44], foot: [73, 58], knee2: [60, 58], foot2: [60, 72], elbow2: [55, 31], hand2: [62, 37] },
    ],
  },
  'Straight-Leg Bound': {
    props: [{ kind: 'floor' }],
    poses: [
      { head: [60, 9], shoulder: [60, 18], elbow: [53, 27], hand: [49, 36], hip: [60, 41], knee: [68, 52], foot: [76, 63], knee2: [53, 53], foot2: [47, 65], elbow2: [67, 27], hand2: [72, 36] },
      { head: [60, 12], shoulder: [60, 21], elbow: [67, 30], hand: [72, 39], hip: [60, 44], knee: [62, 58], foot: [63, 72], knee2: [66, 56], foot2: [72, 67], elbow2: [53, 30], hand2: [49, 39] },
    ],
  },
  'Wall Sit': {
    props: [{ kind: 'wall', x: 30 }, { kind: 'floor' }],
    poses: [
      { head: [37, 15], shoulder: [37, 24], elbow: [41, 34], hand: [43, 44], hip: [37, 46], knee: [40, 59], foot: [42, 72] },
      { head: [37, 29], shoulder: [37, 38], elbow: [46, 46], hand: [55, 52], hip: [37, 56], knee: [57, 56], foot: [57, 72] },
    ],
  },
  'Hollow Body Hold': {
    props: [{ kind: 'floor' }],
    poses: [
      { head: [20, 66], shoulder: [27, 69], elbow: [15, 69], hand: [5, 69], hip: [57, 69], knee: [77, 69], foot: [97, 69] },
      { head: [25, 57], shoulder: [32, 62], elbow: [21, 57], hand: [11, 53], hip: [57, 69], knee: [77, 64], foot: [96, 58] },
    ],
  },
  'Pike Push-up': {
    props: [{ kind: 'floor' }],
    poses: [
      { head: [43, 58], shoulder: [48, 53], elbow: [45, 62], hand: [42, 72], hip: [66, 34], knee: [78, 53], foot: [90, 72] },
      { head: [40, 67], shoulder: [47, 62], elbow: [53, 68], hand: [42, 72], hip: [64, 40], knee: [77, 56], foot: [90, 72] },
    ],
  },
  'Prone Y-T-W Raise': {
    props: [{ kind: 'floor' }],
    poses: [
      { head: [20, 64], shoulder: [27, 67], elbow: [37, 69], hand: [47, 69], hip: [57, 68], knee: [77, 69], foot: [97, 69] },
      { head: [19, 61], shoulder: [27, 65], elbow: [18, 59], hand: [9, 54], hip: [57, 68], knee: [77, 69], foot: [97, 69] },
    ],
  },
  'Isometric Calf Hold': {
    props: [{ kind: 'floor' }],
    poses: [
      { head: [58, 12], shoulder: [58, 21], elbow: [61, 32], hand: [62, 42], hip: [58, 43], knee: [58, 57], foot: [60, 69] },
      { head: [58, 12], shoulder: [58, 21], elbow: [61, 32], hand: [62, 42], hip: [58, 43], knee: [58, 57], foot: [60, 69] },
    ],
  },
  // ขาเดียวบนพื้น เข่าตึง รูปจากคลังเป็นเครื่องยกน่องในยิม ดูไม่ตรงกับท่าบอดี้เวท
  'Single-leg Calf Raise': {
    props: [{ kind: 'floor' }],
    poses: [
      { head: [58, 14], shoulder: [58, 23], elbow: [61, 34], hand: [62, 44], hip: [58, 45], knee: [58, 58], foot: [58, 72] },
      { head: [58, 9], shoulder: [58, 18], elbow: [61, 29], hand: [62, 39], hip: [58, 40], knee: [58, 53], foot: [60, 68] },
    ],
  },
  'Bent-knee Calf Raise': {
    props: [{ kind: 'floor' }],
    poses: [
      { head: [58, 17], shoulder: [58, 26], elbow: [61, 37], hand: [62, 47], hip: [56, 48], knee: [60, 60], foot: [57, 72] },
      { head: [58, 12], shoulder: [58, 21], elbow: [61, 32], hand: [62, 42], hip: [56, 43], knee: [60, 55], foot: [60, 69] },
    ],
  },
  'Pogo Jumps': {
    props: [{ kind: 'floor' }],
    poses: [
      { head: [60, 14], shoulder: [60, 23], elbow: [56, 34], hand: [60, 43], hip: [60, 46], knee: [61, 59], foot: [60, 71] },
      { head: [60, 6], shoulder: [60, 15], elbow: [56, 26], hand: [60, 35], hip: [60, 38], knee: [61, 51], foot: [61, 63] },
    ],
  },
  'Side-lying Hip Abduction': {
    props: [{ kind: 'floor' }],
    poses: [
      { head: [18, 63], shoulder: [26, 66], elbow: [22, 56], hand: [18, 62], hip: [56, 68], knee: [76, 69], foot: [96, 69] },
      { head: [18, 63], shoulder: [26, 66], elbow: [22, 56], hand: [18, 62], hip: [56, 68], knee: [75, 60], foot: [93, 50] },
    ],
  },
}
