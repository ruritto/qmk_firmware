-- =============================================================
-- 0003: 全体予定 (events)
-- ガントチャートの日付ヘッダー直下に赤字で表示する短い予定。
-- 1日につき1件、タイトルは全角6文字 (半角12文字) まで。
-- =============================================================

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  date date not null unique,
  -- 幅ベースの制限 (全角=2) はアプリ側で実施。ここでは文字数の上限のみ
  title text not null check (char_length(title) between 1 and 12),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists events_set_updated_at on public.events;
create trigger events_set_updated_at
  before update on public.events
  for each row execute function public.set_updated_at();

alter table public.events enable row level security;

drop policy if exists "events_select" on public.events;
create policy "events_select" on public.events
  for select to authenticated using (public.is_school_member());

drop policy if exists "events_insert" on public.events;
create policy "events_insert" on public.events
  for insert to authenticated with check (public.is_school_member());

drop policy if exists "events_update" on public.events;
create policy "events_update" on public.events
  for update to authenticated
  using (public.is_school_member()) with check (public.is_school_member());

drop policy if exists "events_delete" on public.events;
create policy "events_delete" on public.events
  for delete to authenticated using (public.is_school_member());

do $$
begin
  alter publication supabase_realtime add table public.events;
exception when duplicate_object then null;
end $$;
