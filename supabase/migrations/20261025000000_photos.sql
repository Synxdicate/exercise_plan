-- รูปการออกกำลังกาย/ความคืบหน้า: bucket ส่วนตัว เก็บที่ photos/<user id>/<photo id>.jpg
-- ข้อมูลของรูป (วันที่ แนบกับอะไร) อยู่ใน user_data key 'photos'
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('photos', 'photos', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "photos: select own" on storage.objects
  for select to authenticated using (bucket_id = 'photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "photos: insert own" on storage.objects
  for insert to authenticated with check (bucket_id = 'photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "photos: delete own" on storage.objects
  for delete to authenticated using (bucket_id = 'photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
