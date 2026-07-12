-- =============================================================
-- 0002: ドメイン制限の DB レベル強制
-- アプリ側 (hd パラメータ + コールバック検証) に加え、
-- 万一 @jec.ac.jp 以外のアカウントでセッションが発行されても
-- RLS でデータへのアクセスを拒否する。
-- =============================================================

create or replace function public.is_school_member()
returns boolean
language sql
stable
as $$
  select coalesce(auth.jwt() ->> 'email', '') ilike '%@jec.ac.jp'
$$;

-- profiles
drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select" on public.profiles
  for select to authenticated using (public.is_school_member());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using (auth.uid() = id and public.is_school_member())
  with check (auth.uid() = id and public.is_school_member());

-- tasks
drop policy if exists "tasks_select" on public.tasks;
create policy "tasks_select" on public.tasks
  for select to authenticated using (public.is_school_member());

drop policy if exists "tasks_insert" on public.tasks;
create policy "tasks_insert" on public.tasks
  for insert to authenticated with check (public.is_school_member());

drop policy if exists "tasks_update" on public.tasks;
create policy "tasks_update" on public.tasks
  for update to authenticated
  using (public.is_school_member()) with check (public.is_school_member());

drop policy if exists "tasks_delete" on public.tasks;
create policy "tasks_delete" on public.tasks
  for delete to authenticated using (public.is_school_member());

-- notes
drop policy if exists "notes_select" on public.notes;
create policy "notes_select" on public.notes
  for select to authenticated using (public.is_school_member());

drop policy if exists "notes_insert" on public.notes;
create policy "notes_insert" on public.notes
  for insert to authenticated with check (public.is_school_member());

drop policy if exists "notes_delete_own" on public.notes;
create policy "notes_delete_own" on public.notes
  for delete to authenticated
  using (auth.uid() = created_by and public.is_school_member());

-- storage (画像アップロード / 削除)
drop policy if exists "note_images_insert" on storage.objects;
create policy "note_images_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'note-images' and public.is_school_member());

drop policy if exists "note_images_delete_own" on storage.objects;
create policy "note_images_delete_own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'note-images' and owner = auth.uid() and public.is_school_member());
