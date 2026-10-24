// ไล่สีจากสีกล้ามว่าง → สี accent ตามความเข้ม 0–1 (ไม่ใช้ความโปร่งใส จะได้ไม่เห็นพื้นหลังทะลุ)
export const heat = (v: number) =>
  v <= 0 ? 'var(--c-body-line)' : `color-mix(in oklab, var(--c-accent) ${Math.round(30 + 70 * Math.min(v, 1))}%, var(--c-body-line))`
