-- ข้อมูลของแอปเก็บแบบ key/value ต่อผู้ใช้ (mirror ของ localStorage keys ใน src/lib/sync.ts)
create table if not exists public.user_data (
  user_id uuid not null references auth.users (id) on delete cascade,
  key text not null,
  value jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, key)
);

alter table public.user_data enable row level security;

create policy "user_data: select own" on public.user_data
  for select to authenticated using ((select auth.uid()) = user_id);

create policy "user_data: insert own" on public.user_data
  for insert to authenticated with check ((select auth.uid()) = user_id);

create policy "user_data: update own" on public.user_data
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy "user_data: delete own" on public.user_data
  for delete to authenticated using ((select auth.uid()) = user_id);
