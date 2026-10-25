// ภาพลายเส้นท่าที่ไม่มีรูปถ่ายที่ตรงพอ — มุมมองด้านข้าง viewBox 120×80, พื้นที่ y = 72
// แต่ละท่ามี 2 ท่วงท่า (เริ่ม/จบ) ระบุตำแหน่งข้อต่อ: หัว ไหล่ ศอก มือ สะโพก เข่า เท้า
export type Pt = [number, number]
export type Pose = { head: Pt; shoulder: Pt; elbow: Pt; hand: Pt; hip: Pt; knee: Pt; foot: Pt }
export type Prop = { kind: 'wall'; x: number } | { kind: 'floor' }
export type StickDemo = { poses: [Pose, Pose]; props: Prop[] }

export const stickDemos: Record<string, StickDemo> = {
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
}
