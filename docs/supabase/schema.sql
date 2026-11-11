-- Cermin Wicara: Supabase schema (SPEC §9). Numbers only: no video or audio is ever stored here.
--
-- HOW TO RUN (once per project)
--   1. supabase.com -> New project.
--   2. Authentication -> Sign In / Providers -> turn ON "Allow anonymous sign-ins".
--      (The app signs in anonymously; every row belongs to that anonymous user: user_id = auth.uid().)
--   3. SQL Editor -> New query -> paste this whole file -> Run. It can be run again safely.
--   4. Project Settings -> API: copy "Project URL" and the "anon" / publishable key into app/.env:
--        EXPO_PUBLIC_SUPABASE_URL=...      EXPO_PUBLIC_SUPABASE_ANON_KEY=...
--      then restart Expo with `npx expo start -c`. The anon key is public by design; RLS below protects the data.
--
-- Anonymous users use the `authenticated` Postgres role like permanent users do, so every policy ties
-- the row to auth.uid(). (Supabase docs: Auth -> Anonymous Sign-Ins -> Access control.)

-- ---------- profiles ----------
create table if not exists public.profiles (
  user_id      uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  created_at   timestamptz not null default now()
);

-- ---------- attempts: one scored attempt (retry results are not stored) ----------
create table if not exists public.attempts (
  id             uuid primary key,  -- made on the phone: re-sending the same attempt is an upsert
  user_id        uuid not null references auth.users (id) on delete cascade,
  session_id     text not null,
  item_id        text not null,
  level          int  not null check (level between 0 and 4),
  status         text not null check (status in ('ok', 'retry')),
  overall        text check (overall in ('hijau', 'kuning', 'merah')),
  score          real check (score between 0 and 1),
  indicators     jsonb,
  hint_id        text,
  scorer         text,
  engine_version text,
  created_at     timestamptz not null default now()
);
create index if not exists attempts_user_item_idx on public.attempts (user_id, item_id, created_at desc);

-- ---------- progress: derived summary per item (SPEC §8.4) ----------
create table if not exists public.progress (
  user_id         uuid not null references auth.users (id) on delete cascade,
  item_id         text not null,
  stage           text not null check (stage in ('terkunci', 'berlatih', 'lulus', 'ulasan', 'macet')),
  last_10         jsonb,
  sessions_count  int not null default 0,
  passed_at       timestamptz,
  next_review_at  timestamptz,
  primary key (user_id, item_id)
);

-- ---------- listen_checks: Uji Dengar by the companion ----------
create table if not exists public.listen_checks (
  id         uuid primary key,
  user_id    uuid not null references auth.users (id) on delete cascade,
  item_id    text not null,
  result     text not null check (result in ('jelas', 'belum_jelas')),
  created_at timestamptz not null default now()
);

-- ---------- row level security: a user reads and writes only their own rows ----------
-- No delete policy: the app never deletes; a user can only add and correct their own rows.
alter table public.profiles      enable row level security;
alter table public.attempts      enable row level security;
alter table public.progress      enable row level security;
alter table public.listen_checks enable row level security;

drop policy if exists "profiles: select own" on public.profiles;
drop policy if exists "profiles: insert own" on public.profiles;
drop policy if exists "profiles: update own" on public.profiles;
create policy "profiles: select own" on public.profiles for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "profiles: insert own" on public.profiles for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "profiles: update own" on public.profiles for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "attempts: select own" on public.attempts;
drop policy if exists "attempts: insert own" on public.attempts;
drop policy if exists "attempts: update own" on public.attempts;
create policy "attempts: select own" on public.attempts for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "attempts: insert own" on public.attempts for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "attempts: update own" on public.attempts for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "progress: select own" on public.progress;
drop policy if exists "progress: insert own" on public.progress;
drop policy if exists "progress: update own" on public.progress;
create policy "progress: select own" on public.progress for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "progress: insert own" on public.progress for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "progress: update own" on public.progress for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "listen_checks: select own" on public.listen_checks;
drop policy if exists "listen_checks: insert own" on public.listen_checks;
drop policy if exists "listen_checks: update own" on public.listen_checks;
create policy "listen_checks: select own" on public.listen_checks for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "listen_checks: insert own" on public.listen_checks for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "listen_checks: update own" on public.listen_checks for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
