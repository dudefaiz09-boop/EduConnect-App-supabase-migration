-- Restrict legacy Supabase Storage access to tenant-scoped object paths.
-- New uploads are routed through Firebase Storage; Supabase Storage remains for
-- backward-compatible reads/deletes of existing objects only.

drop policy if exists "authenticated uploads educonnect files" on storage.objects;
drop policy if exists "authenticated updates own educonnect files" on storage.objects;
drop policy if exists "authenticated select educonnect files" on storage.objects;
drop policy if exists "authenticated delete educonnect files" on storage.objects;
drop policy if exists "tenant scoped select educonnect files" on storage.objects;
drop policy if exists "tenant scoped delete educonnect files" on storage.objects;

create policy "tenant scoped select educonnect files"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'educonnect-uploads'
  and (
    name like ('schools/' || private.auth_profile_school_id() || '/%')
    or exists (
      select 1
      from unnest(private.auth_managed_tenant_ids()) as managed_tenant_id
      where name like ('schools/' || managed_tenant_id || '/%')
    )
  )
);

create policy "tenant scoped delete educonnect files"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'educonnect-uploads'
  and (
    private.auth_is_super_admin()
    or private.auth_has_any_role(array['admin', 'principal'])
  )
  and (
    name like ('schools/' || private.auth_profile_school_id() || '/%')
    or exists (
      select 1
      from unnest(private.auth_managed_tenant_ids()) as managed_tenant_id
      where name like ('schools/' || managed_tenant_id || '/%')
    )
  )
);
