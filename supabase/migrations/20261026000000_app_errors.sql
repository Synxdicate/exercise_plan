-- รายงาน error จากแอป (แทน Sentry): แอปเก็บไว้ในเครื่องก่อน แล้วส่งขึ้นเมื่อล็อกอินอยู่
create table if not exists public.app_errors (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  at timestamptz not null,
  version text not null,
  platform text not null,
  message text not null check (char_length(message) <= 500),
  stack text check (char_length(stack) <= 4000),
  context text check (char_length(context) <= 500)
);

create index if not exists app_errors_user_at on public.app_errors (user_id, at desc);

alter table public.app_errors enable row level security;

create policy "app_errors: insert own" on public.app_errors
  for insert to authenticated with check ((select auth.uid()) = user_id);

create policy "app_errors: select own" on public.app_errors
  for select to authenticated using ((select auth.uid()) = user_id);
