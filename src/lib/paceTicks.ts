/** เส้นแกนเพซเป็นตัวเลขกลม ๆ (ทุก 15/30/60 วิ ให้ได้ 2–4 เส้น) แทนค่าต่ำสุด/กลาง/สูงสุดที่เป็นเลขแปลก เช่น 9:01 */
export function paceTicks(lo: number, hi: number) {
  const span = hi - lo
  const step = [15, 30, 60, 120].find(s => span / s <= 4) ?? 300
  const out: number[] = []
  for (let v = Math.ceil(lo / step) * step; v <= hi; v += step) out.push(v)
  return out.length ? out : [Math.round((lo + hi) / 2)]
}
