-- REVIEW ONLY: this proposal has NOT been applied to Supabase.
-- Inspect all existing policies first, including permissive FOR ALL policies.
-- Adding SELECT access does not restrict any existing INSERT/UPDATE/DELETE policy.
select policyname, permissive, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'storage' and tablename = 'objects'
order by policyname;

-- Apply only after approval and review of the query above.
-- Preserve the private bucket and all existing owner-scoped custom policies.
create policy "tutorial defaults: read by companion accounts"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'rekan-wicara-tutorials'
  and (storage.foldername(name))[1] = 'default'
  and (auth.jwt() ->> 'is_anonymous') = 'false'
);

-- This proposal grants no permission to upload, replace, or delete default files.
-- Confirm no existing write policy grants those permissions to companion accounts
-- before applying; do not drop or rewrite policies without reviewing their scope.
