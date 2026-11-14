-- LOCAL DISPOSABLE TEST DATABASE ONLY. Never run this fixture on Supabase Cloud.
create role anon nologin;
create role authenticated nologin;
create schema auth;
create schema storage;
create function auth.jwt() returns jsonb language sql stable as
$$ select coalesce(nullif(current_setting('request.jwt.claims',true),'')::jsonb,'{}'::jsonb) $$;
create function auth.uid() returns uuid language sql stable as
$$ select (auth.jwt()->>'sub')::uuid $$;
create table auth.users(id uuid primary key);
insert into auth.users values
 ('11111111-1111-4111-8111-111111111111'),('22222222-2222-4222-8222-222222222222');
create table storage.objects (
 id uuid primary key default gen_random_uuid(), bucket_id text not null,
 name text not null, metadata jsonb not null, unique(bucket_id,name)
);
create table public.custom_words (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 word text not null check (btrim(word) <> ''),
 instruction text not null check (btrim(instruction) <> ''),
 created_at timestamptz not null default now()
);
create table public.custom_syllables (
 id uuid primary key default gen_random_uuid(),
 word_id uuid not null references public.custom_words(id) on delete cascade,
 syllable text not null check (btrim(syllable) <> ''),
 instruction text not null check (btrim(instruction) <> ''),
 position integer not null check (position between 1 and 6),
 created_at timestamptz not null default now(), unique(word_id,position)
);
create table public.custom_videos (
 id uuid primary key default gen_random_uuid(),
 word_id uuid references public.custom_words(id) on delete cascade,
 syllable_id uuid references public.custom_syllables(id) on delete cascade,
 storage_path text not null, sort_order integer not null default 1,
 created_at timestamptz not null default now(),
 check ((word_id is null) <> (syllable_id is null))
);
create unique index fixture_one_word_video on public.custom_videos(word_id) where word_id is not null;
create unique index fixture_one_syllable_video on public.custom_videos(syllable_id) where syllable_id is not null;
alter table public.custom_words enable row level security;
alter table public.custom_syllables enable row level security;
alter table public.custom_videos enable row level security;
create policy fixture_word_owner on public.custom_words to authenticated
 using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy fixture_syllable_owner on public.custom_syllables to authenticated
 using (exists(select 1 from public.custom_words w where w.id = word_id and w.user_id = auth.uid()))
 with check (exists(select 1 from public.custom_words w where w.id = word_id and w.user_id = auth.uid()));
create policy fixture_video_owner on public.custom_videos to authenticated
 using (exists(select 1 from public.custom_words w where w.id = word_id and w.user_id = auth.uid())
 or exists(select 1 from public.custom_syllables s join public.custom_words w on w.id = s.word_id
           where s.id = syllable_id and w.user_id = auth.uid()))
 with check (exists(select 1 from public.custom_words w where w.id = word_id and w.user_id = auth.uid())
 or exists(select 1 from public.custom_syllables s join public.custom_words w on w.id = s.word_id
           where s.id = syllable_id and w.user_id = auth.uid()));
grant usage on schema public,auth,storage to anon,authenticated;
grant execute on all functions in schema auth to anon,authenticated;
grant all on public.custom_words,public.custom_syllables,public.custom_videos to anon,authenticated;
grant update(word) on public.custom_words to authenticated;
grant select on storage.objects to authenticated;
alter table storage.objects enable row level security;
create policy fixture_storage_read on storage.objects for select to authenticated using (
 bucket_id = 'rekan-wicara-tutorials' and
 (starts_with(name,auth.uid()::text || '/') or starts_with(name,'default/'))
);
create policy fixture_storage_insert on storage.objects for insert to authenticated
 with check (bucket_id = 'rekan-wicara-tutorials' and starts_with(name,auth.uid()::text || '/'));
create policy fixture_storage_update on storage.objects for update to authenticated
 using (bucket_id = 'rekan-wicara-tutorials' and starts_with(name,auth.uid()::text || '/'))
 with check (bucket_id = 'rekan-wicara-tutorials' and starts_with(name,auth.uid()::text || '/'));
create policy fixture_storage_delete on storage.objects for delete to authenticated
 using (bucket_id = 'rekan-wicara-tutorials' and starts_with(name,auth.uid()::text || '/'));
grant insert,update,delete on storage.objects to authenticated;
-- An existing complete word and an incomplete word, both with required instructions.
insert into public.custom_words(id,user_id,word,instruction) values
 ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','11111111-1111-4111-8111-111111111111','LAMA','Ucapkan LAMA.'),
 ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','11111111-1111-4111-8111-111111111111','BELUM','Ucapkan BELUM.');
insert into storage.objects(bucket_id,name,metadata) values
 ('rekan-wicara-tutorials','11111111-1111-4111-8111-111111111111/words/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/word.mp4','{"size":20,"mimetype":"video/mp4"}'),
 ('rekan-wicara-tutorials','default/words/tolong.mp4','{"size":40,"mimetype":"video/mp4"}');
insert into public.custom_videos(word_id,storage_path) values
 ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','11111111-1111-4111-8111-111111111111/words/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/word.mp4');
-- Legacy reuse of one object across two materials remains a repairable draft.
insert into public.custom_words(id,user_id,word,instruction) values
 ('cccccccc-cccc-4ccc-8ccc-cccccccccccc','11111111-1111-4111-8111-111111111111','DUA','Ucapkan DUA.');
insert into public.custom_syllables(id,word_id,syllable,instruction,position) values
 ('dddddddd-dddd-4ddd-8ddd-dddddddddddd','cccccccc-cccc-4ccc-8ccc-cccccccccccc','DUA','Ucapkan DUA.',1);
insert into public.custom_videos(word_id,storage_path) values
 ('cccccccc-cccc-4ccc-8ccc-cccccccccccc','11111111-1111-4111-8111-111111111111/words/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/word.mp4');
insert into public.custom_videos(syllable_id,storage_path) values
 ('dddddddd-dddd-4ddd-8ddd-dddddddddddd','11111111-1111-4111-8111-111111111111/words/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/word.mp4');
