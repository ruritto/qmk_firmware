-- =============================================================
-- VR プロジェクト タスク管理アプリ 初期スキーマ
-- Supabase ダッシュボードの SQL Editor に貼り付けて実行するか、
-- `supabase db push` で適用してください。
-- =============================================================

-- ---------------------------------------------------------------
-- profiles: ログインユーザーのプロフィール (所属チームを保持)
-- auth.users への INSERT をトリガーに自動作成される
-- ---------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  display_name text not null default '',
  team text check (team in ('climb', 'wheelchair', 'fishing_bike')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------
-- tasks: ガントチャートに表示するタスク
-- ---------------------------------------------------------------
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  team text not null check (team in ('climb', 'wheelchair', 'fishing_bike')),
  device text not null check (device in ('climb', 'wheelchair', 'fishing', 'bike')),
  assignee text not null default '',
  start_date date not null,
  end_date date not null,
  status text not null default 'todo' check (status in ('todo', 'in_progress', 'done')),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tasks_date_order check (end_date >= start_date)
);

create index if not exists tasks_team_idx on public.tasks (team);
create index if not exists tasks_start_date_idx on public.tasks (start_date);

-- ---------------------------------------------------------------
-- notes: 議事録・記録 (画像は Storage の note-images バケットへ)
-- ---------------------------------------------------------------
create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null default '',
  image_path text,
  author_name text not null default '',
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists notes_created_at_idx on public.notes (created_at desc);

-- ---------------------------------------------------------------
-- updated_at 自動更新トリガー
-- ---------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists tasks_set_updated_at on public.tasks;
create trigger tasks_set_updated_at
  before update on public.tasks
  for each row execute function public.set_updated_at();

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------
-- 新規ユーザー登録時に profiles 行を自動作成
-- ---------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(coalesce(new.email, ''), '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------
-- RLS: ログイン済みユーザー (= 学校ドメイン検証済み) はチーム横断で読み書き可
-- ---------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.tasks enable row level security;
alter table public.notes enable row level security;

drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select" on public.profiles
  for select to authenticated using (true);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "tasks_select" on public.tasks;
create policy "tasks_select" on public.tasks
  for select to authenticated using (true);

drop policy if exists "tasks_insert" on public.tasks;
create policy "tasks_insert" on public.tasks
  for insert to authenticated with check (true);

drop policy if exists "tasks_update" on public.tasks;
create policy "tasks_update" on public.tasks
  for update to authenticated using (true) with check (true);

drop policy if exists "tasks_delete" on public.tasks;
create policy "tasks_delete" on public.tasks
  for delete to authenticated using (true);

drop policy if exists "notes_select" on public.notes;
create policy "notes_select" on public.notes
  for select to authenticated using (true);

drop policy if exists "notes_insert" on public.notes;
create policy "notes_insert" on public.notes
  for insert to authenticated with check (true);

drop policy if exists "notes_delete_own" on public.notes;
create policy "notes_delete_own" on public.notes
  for delete to authenticated using (auth.uid() = created_by);

-- ---------------------------------------------------------------
-- Realtime: tasks / notes の変更を全クライアントへ配信
-- ---------------------------------------------------------------
do $$
begin
  alter publication supabase_realtime add table public.tasks;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.notes;
exception when duplicate_object then null;
end $$;

-- ---------------------------------------------------------------
-- Storage: 議事録の画像用バケット
-- (公開読み取り / アップロードはログインユーザーのみ)
-- ---------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('note-images', 'note-images', true)
on conflict (id) do nothing;

drop policy if exists "note_images_read" on storage.objects;
create policy "note_images_read" on storage.objects
  for select using (bucket_id = 'note-images');

drop policy if exists "note_images_insert" on storage.objects;
create policy "note_images_insert" on storage.objects
  for insert to authenticated with check (bucket_id = 'note-images');

drop policy if exists "note_images_delete_own" on storage.objects;
create policy "note_images_delete_own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'note-images' and owner = auth.uid());
