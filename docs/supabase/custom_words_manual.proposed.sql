-- REVIEW ONLY: do not run on Supabase Cloud without approval.
-- Preserve existing tables, required instructions, FKs, unique positions,
-- partial video indexes, ownership RLS, Storage policies and default videos.
-- References: https://supabase.com/docs/guides/database/functions
--             https://www.postgresql.org/docs/current/sql-revoke.html

select conrelid::regclass as table_name, conname, pg_get_constraintdef(oid) as definition
from pg_constraint where conrelid in ('public.custom_words'::regclass,
 'public.custom_syllables'::regclass,'public.custom_videos'::regclass);
select schemaname,tablename,policyname,cmd,roles,qual,with_check from pg_policies
where (schemaname = 'public' and tablename in ('custom_words','custom_syllables','custom_videos'))
   or (schemaname = 'storage' and tablename = 'objects');

begin;
set local lock_timeout = '5s';
set local statement_timeout = '60s';
lock table public.custom_words,public.custom_syllables,public.custom_videos in access exclusive mode;
-- Child replacement must not cascade unrelated data.
do $$ begin
 if exists (select 1 from pg_constraint where contype = 'f' and (
   (confrelid = 'public.custom_syllables'::regclass and conrelid <> 'public.custom_videos'::regclass)
   or confrelid = 'public.custom_videos'::regclass)) then
   raise exception 'Review additional custom material foreign-key dependents first';
 end if;
end $$;

alter table public.custom_words add column if not exists status text;
alter table public.custom_words add column if not exists revision integer not null default 1;
alter table public.custom_words add column if not exists pending_video_paths text[] not null default '{}';
-- Keep all legacy data. Only complete, in-limit words become published.
update public.custom_words w set status = case when
 w.word ~ '^[A-Za-z]{1,30}$' and w.instruction ~ '[^[:space:]]'
 and (select count(*) from public.custom_syllables s where s.word_id = w.id) <= 6
 and (select count(distinct v.storage_path) from public.custom_videos v
      where v.word_id = w.id or v.syllable_id in
       (select s.id from public.custom_syllables s where s.word_id = w.id))
     = 1 + (select count(*) from public.custom_syllables s where s.word_id = w.id)
 and exists (select 1 from public.custom_videos v join storage.objects o
   on o.bucket_id = 'rekan-wicara-tutorials' and o.name = v.storage_path
   where v.word_id = w.id and v.syllable_id is null
   and starts_with(v.storage_path,w.user_id::text || '/')
   and case when o.metadata->>'size' ~ '^[0-9]+$'
            then (o.metadata->>'size')::numeric > 0 else false end
   and o.metadata->>'mimetype' = 'video/mp4')
 and not exists (select 1 from public.custom_syllables s where s.word_id = w.id and (
   s.syllable !~ '^[A-Za-z]{1,30}$' or s.instruction !~ '[^[:space:]]' or s.position < 1
   or s.position > (select count(*) from public.custom_syllables t where t.word_id = w.id)
   or not exists (select 1 from public.custom_videos v join storage.objects o
     on o.bucket_id = 'rekan-wicara-tutorials' and o.name = v.storage_path
     where v.syllable_id = s.id and v.word_id is null
     and starts_with(v.storage_path,w.user_id::text || '/')
     and case when o.metadata->>'size' ~ '^[0-9]+$'
              then (o.metadata->>'size')::numeric > 0 else false end
     and o.metadata->>'mimetype' = 'video/mp4')
 )) then 'published' else 'draft' end where status is null;
alter table public.custom_words alter column status set default 'draft';
alter table public.custom_words alter column status set not null;
do $$ begin
 if not exists (select 1 from pg_constraint where conname = 'custom_words_manual_status'
                and conrelid = 'public.custom_words'::regclass) then
  alter table public.custom_words add constraint custom_words_manual_status
   check (status in ('draft','published','deleting'));
 end if;
end $$;

-- Client DML would bypass validation. Table REVOKE also removes corresponding
-- column grants. Keep SELECT and all existing ownership RLS policies.
revoke insert,update,delete,truncate on public.custom_words,public.custom_syllables,
 public.custom_videos from public,anon,authenticated;
do $$ declare relation regclass; begin
 foreach relation in array array['public.custom_words'::regclass,
  'public.custom_syllables'::regclass,'public.custom_videos'::regclass] loop
  if has_table_privilege('authenticated',relation,'INSERT,UPDATE,DELETE,TRUNCATE')
   or has_any_column_privilege('authenticated',relation,'INSERT,UPDATE')
   or has_table_privilege('anon',relation,'INSERT,UPDATE,DELETE,TRUNCATE')
   or has_any_column_privilege('anon',relation,'INSERT,UPDATE') then
   raise exception 'Inherited write grants remain on %. Review privileges first',relation;
  end if;
 end loop;
end $$;

-- DEFINER is needed after revoking client DML. RLS does NOT filter automatically
-- inside it: every branch explicitly scopes the parent to the verified JWT UID.
-- External reads and Storage HTTP requests still use caller RLS.
-- No user-supplied UID, service key, GUC bypass guard or dynamic SQL.
create or replace function public.manage_custom_word(
 p_action text,p_id uuid,p_revision integer default null,
 p_payload jsonb default '{}'::jsonb,p_cleaned text[] default '{}'
) returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
 owner_id uuid := auth.uid();
 current_word public.custom_words%rowtype;
 old_parts jsonb;
 old_videos jsonb;
 part jsonb;
 part_id uuid;
 old_video jsonb;
 word_path text;
 part_path text;
 paths text[] := '{}';
 old_paths text[];
 part_paths jsonb := '{}';
 ids uuid[] := '{}';
 positions integer[] := '{}';
 label text;
 manual_instruction text;
 prefix text;
 version_pattern constant text := '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.mp4$';
begin
 if owner_id is null or auth.jwt()->>'role' is distinct from 'authenticated'
  or auth.jwt()->>'is_anonymous' is distinct from 'false'
  or coalesce(auth.jwt()->>'email','') = '' then
  raise sqlstate 'PT403' using message = 'FORBIDDEN';
 end if;
 if p_id is null or p_action is null or p_action not in
  ('create','save','begin_delete','cleanup','finish_delete') then
  raise sqlstate 'PT422' using message = 'INVALID_INPUT';
 end if;
 if p_action in ('create','save') and (
  jsonb_typeof(p_payload) is distinct from 'object'
  or jsonb_typeof(p_payload->'word') is distinct from 'string'
  or jsonb_typeof(p_payload->'instruction') is distinct from 'string'
  or jsonb_typeof(p_payload->'syllables') is distinct from 'array') then
  raise sqlstate 'PT422' using message = 'INVALID_INPUT';
 end if;
 if p_action = 'create' then
  label := btrim(p_payload->>'word');
  manual_instruction := btrim(p_payload->>'instruction');
  if label is null or label !~ '^[A-Za-z]{1,30}$'
   or coalesce(manual_instruction,'') !~ '[^[:space:]]' or length(manual_instruction) > 8000 then
   raise sqlstate 'PT422' using message = 'INVALID_INPUT';
  end if;
  -- All required text is valid on INSERT; draft is only visible inside this tx.
  insert into public.custom_words(id,user_id,word,instruction,status)
   values(p_id,owner_id,label,manual_instruction,'draft');
 end if;
 select * into current_word from public.custom_words
  where id = p_id and user_id = owner_id for update;
 if not found then raise sqlstate 'PT404' using message = 'ITEM_NOT_FOUND'; end if;

 if p_action = 'cleanup' then
  if p_cleaned is null or exists (select 1 from unnest(p_cleaned) path
   where path is null or not starts_with(path,owner_id::text || '/')
    or not (path = any(current_word.pending_video_paths)))
   or exists (select 1 from storage.objects o where o.bucket_id = 'rekan-wicara-tutorials'
    and o.name = any(p_cleaned)) then
   raise sqlstate 'PT409' using message = 'CLEANUP_PENDING';
  end if;
  update public.custom_words set pending_video_paths = array(
   select path from unnest(current_word.pending_video_paths) path
   where not (path = any(p_cleaned))) where id = p_id and user_id = owner_id;
  return jsonb_build_object('id',p_id);
 end if;
 if p_action = 'finish_delete' then
  if current_word.status <> 'deleting' or cardinality(current_word.pending_video_paths) > 0 then
   raise sqlstate 'PT409' using message = 'CLEANUP_PENDING';
  end if;
  delete from public.custom_videos where word_id = p_id or syllable_id in
   (select id from public.custom_syllables where word_id = p_id);
  delete from public.custom_syllables where word_id = p_id;
  delete from public.custom_words where id = p_id and user_id = owner_id;
  return jsonb_build_object('id',p_id,'deleted',true);
 end if;
 if p_action <> 'create' and p_revision is distinct from current_word.revision then
  raise sqlstate 'PT409' using message = 'REVISION_CONFLICT';
 end if;
 select coalesce(jsonb_agg(to_jsonb(s)),'[]') into old_parts
  from public.custom_syllables s where s.word_id = p_id;
 select coalesce(jsonb_agg(to_jsonb(v)),'[]') into old_videos
  from public.custom_videos v where v.word_id = p_id or v.syllable_id in
   (select id from public.custom_syllables where word_id = p_id);
 select coalesce(array_agg(v->>'storage_path'),'{}') into old_paths
  from jsonb_array_elements(old_videos) v
  where starts_with(v->>'storage_path',owner_id::text || '/');
 if p_action = 'begin_delete' then
  if current_word.status <> 'deleting' then
   update public.custom_words set status = 'deleting',revision = revision + 1,
    pending_video_paths = array(select distinct path from
     unnest(current_word.pending_video_paths || old_paths) path
     where not exists (
      select 1 from public.custom_videos v
      left join public.custom_syllables s on s.id = v.syllable_id
      join public.custom_words w on w.id = coalesce(v.word_id,s.word_id)
      where v.storage_path = path and w.user_id = owner_id and w.id <> p_id))
    where id = p_id and user_id = owner_id;
  end if;
  return jsonb_build_object('id',p_id);
 end if;
 if current_word.status = 'deleting' then
  raise sqlstate 'PT409' using message = 'CLEANUP_PENDING';
 end if;
 label := btrim(p_payload->>'word');
 manual_instruction := btrim(p_payload->>'instruction');
 if label is null or label !~ '^[A-Za-z]{1,30}$' or coalesce(manual_instruction,'') !~ '[^[:space:]]'
  or length(manual_instruction) > 8000
  or jsonb_typeof(p_payload->'syllables') is distinct from 'array'
  or jsonb_array_length(p_payload->'syllables') > 6
  or coalesce(p_payload->>'status','published') <> 'published' then
  raise sqlstate 'PT422' using message = 'INVALID_INPUT';
 end if;
 select v into old_video from jsonb_array_elements(old_videos) v where v->>'word_id' = p_id::text;
 word_path := coalesce(p_payload->>'video_path',old_video->>'storage_path');
 prefix := owner_id::text || '/words/' || p_id::text || '/word/';
 if word_path is null or not coalesce((p_payload->>'video')::boolean,true) then
  raise sqlstate 'PT422' using message = 'INCOMPLETE_MATERIAL';
 end if;
 if word_path is distinct from old_video->>'storage_path' and
  (not starts_with(word_path,prefix) or substr(word_path,length(prefix)+1) !~ version_pattern) then
  raise sqlstate 'PT422' using message = 'INVALID_MATERIAL';
 end if;
 paths := array_append(paths,word_path);
 for part in select value from jsonb_array_elements(p_payload->'syllables') loop
  if jsonb_typeof(part) is distinct from 'object' or part->>'id' is null
   or part->>'id' !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
   or coalesce(part->>'position','') !~ '^[1-6]$'
   or jsonb_typeof(part->'text') is distinct from 'string'
   or jsonb_typeof(part->'instruction') is distinct from 'string' then
   raise sqlstate 'PT422' using message = 'INVALID_INPUT';
  end if;
  part_id := (part->>'id')::uuid;
  if part_id = any(ids) or (part->>'position')::integer = any(positions)
   or (part->>'position')::integer < 1
   or (part->>'position')::integer > jsonb_array_length(p_payload->'syllables')
   or coalesce(btrim(part->>'text'),'') !~ '^[A-Za-z]{1,30}$'
   or coalesce(part->>'instruction','') !~ '[^[:space:]]' or length(part->>'instruction') > 8000 then
   raise sqlstate 'PT422' using message = 'INVALID_INPUT';
  end if;
  if exists (select 1 from public.custom_syllables where id = part_id and word_id <> p_id) then
   raise sqlstate 'PT404' using message = 'ITEM_NOT_FOUND';
  end if;
  ids := array_append(ids,part_id);
  positions := array_append(positions,(part->>'position')::integer);
  select v into old_video from jsonb_array_elements(old_videos) v where v->>'syllable_id' = part_id::text;
  part_path := coalesce(part->>'video_path',old_video->>'storage_path');
  prefix := owner_id::text || '/words/' || p_id::text || '/syllables/' || part_id::text || '/';
  if part_path is null or not coalesce((part->>'video')::boolean,true) then
   raise sqlstate 'PT422' using message = 'INCOMPLETE_MATERIAL';
  end if;
  if part_path is distinct from old_video->>'storage_path' and
   (not starts_with(part_path,prefix) or substr(part_path,length(prefix)+1) !~ version_pattern) then
   raise sqlstate 'PT422' using message = 'INVALID_MATERIAL';
  end if;
  paths := array_append(paths,part_path);
  part_paths := jsonb_set(part_paths,array[part_id::text],to_jsonb(part_path));
 end loop;
 if cardinality(paths) <> (select count(distinct path) from unnest(paths) path)
  or exists (select 1 from unnest(paths) path where not starts_with(path,owner_id::text || '/')) then
  raise sqlstate 'PT422' using message = 'INVALID_MATERIAL';
 end if;
 if paths && current_word.pending_video_paths then
  raise sqlstate 'PT409' using message = 'CLEANUP_PENDING';
 end if;
 if exists (select 1 from unnest(paths) path where not exists (
  select 1 from storage.objects o where o.bucket_id = 'rekan-wicara-tutorials' and o.name = path
   and case when o.metadata->>'size' ~ '^[0-9]+$'
            then (o.metadata->>'size')::numeric > 0 else false end
   and o.metadata->>'mimetype' = 'video/mp4')) then
  raise sqlstate 'PT422' using message = 'INCOMPLETE_MATERIAL';
 end if;

 -- Swap positions safely under existing immediate UNIQUE(word_id,position).
 -- Preserve UUIDs/created_at, never use out-of-range temporary positions.
 delete from public.custom_videos where word_id = p_id or syllable_id in
  (select id from public.custom_syllables where word_id = p_id);
 delete from public.custom_syllables where word_id = p_id;
 select v into old_video from jsonb_array_elements(old_videos) v where v->>'word_id' = p_id::text;
 insert into public.custom_videos(id,word_id,syllable_id,storage_path,sort_order,created_at)
  values(coalesce((old_video->>'id')::uuid,gen_random_uuid()),p_id,null,word_path,1,
   coalesce((old_video->>'created_at')::timestamptz,now()));
 for part in select value from jsonb_array_elements(p_payload->'syllables') loop
  part_id := (part->>'id')::uuid;
  insert into public.custom_syllables(id,word_id,syllable,position,instruction,created_at)
   values(part_id,p_id,btrim(part->>'text'),(part->>'position')::integer,btrim(part->>'instruction'),
    coalesce((select (s->>'created_at')::timestamptz from jsonb_array_elements(old_parts) s
     where s->>'id' = part_id::text),now()));
  select v into old_video from jsonb_array_elements(old_videos) v where v->>'syllable_id' = part_id::text;
  insert into public.custom_videos(id,word_id,syllable_id,storage_path,sort_order,created_at)
   values(coalesce((old_video->>'id')::uuid,gen_random_uuid()),null,part_id,part_paths->>part_id::text,1,
    coalesce((old_video->>'created_at')::timestamptz,now()));
 end loop;
 update public.custom_words set word = label,instruction = manual_instruction,
  status = 'published',revision = revision + 1,
  pending_video_paths = array(select distinct path from unnest(current_word.pending_video_paths || old_paths) path
   where not (path = any(paths)) and not exists (
    select 1 from public.custom_videos v
    left join public.custom_syllables s on s.id = v.syllable_id
    join public.custom_words w on w.id = coalesce(v.word_id,s.word_id)
    where v.storage_path = path and w.user_id = owner_id and w.id <> p_id))
   where id = p_id and user_id = owner_id;
 return jsonb_build_object('id',p_id);
end;
$$;
alter function public.manage_custom_word(text,uuid,integer,jsonb,text[]) owner to postgres;
revoke all on function public.manage_custom_word(text,uuid,integer,jsonb,text[]) from public,anon,authenticated;
grant execute on function public.manage_custom_word(text,uuid,integer,jsonb,text[]) to authenticated;
notify pgrst,'reload schema';
commit;

-- Camera client uploads NEW versions with upsert:false before one Simpan Kata:
-- <uid>/words/<word-id>/word/<recording-uuid>.mp4
-- <uid>/words/<word-id>/syllables/<syllable-id>/<recording-uuid>.mp4
-- Failed commits preserve active metadata/files. Client tracks uncommitted new
-- uploads for retry/owner cleanup; old committed paths are queued after commit.
-- Storage and SQL are not a distributed transaction. No Storage policy changes.

