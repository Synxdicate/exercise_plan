import { supabase } from './supabase'

/** ลบข้อมูลของผู้ใช้บน server: รูปในโฟลเดอร์ของบัญชี แล้วทุกแถวใน user_data (RLS อนุญาตลบเฉพาะของตัวเอง) */
export async function deleteServerData(uid: string) {
  for (;;) {
    const { data: files, error } = await supabase.storage.from('photos').list(uid, { limit: 100 })
    if (error) throw error
    if (!files?.length) break
    const { error: rm } = await supabase.storage.from('photos').remove(files.map(f => `${uid}/${f.name}`))
    if (rm) throw rm
    if (files.length < 100) break
  }
  const { error } = await supabase.from('user_data').delete().eq('user_id', uid)
  if (error) throw error
}
