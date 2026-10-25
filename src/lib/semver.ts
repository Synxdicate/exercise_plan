/** "2.10.0" ใหม่กว่า "2.9.3" — เทียบเป็นตัวเลขทีละส่วน (โมดูลล้วน ทดสอบได้) */
export function newerVersion(a: string, b: string) {
  const pa = a.split('.').map(Number), pb = b.split('.').map(Number)
  for (let i = 0; i < 3; i++) if ((pa[i] ?? 0) !== (pb[i] ?? 0)) return (pa[i] ?? 0) > (pb[i] ?? 0)
  return false
}
