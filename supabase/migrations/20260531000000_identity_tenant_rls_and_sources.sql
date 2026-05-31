-- Lock down identity/tenant reads now that profile and tenant routes prefer normalized tables.
-- This keeps the legacy documents compatibility table available without allowing tenant-wide
-- reads of user profile documents for students and parents.

create schema if not exists private;

grant usage on schema private to authenticated;

create or replace function private.auth_is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.is_super_admin = true
    ),
    false
  )
$$;

create or replace function private.auth_managed_tenant_ids()
returns text[]
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(p.managed_tenant_ids, array[]::text[])
  from public.profiles p
  where p.id = auth.uid()
  limit 1
$$;

create or replace function private.auth_active_tenant_ids()
returns text[]
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(array_agg(ut.tenant_id), array[]::text[])
  from public.user_tenants ut
  where ut.user_id = auth.uid()
    and ut.is_active = true
$$;

create or replace function private.document_has_any_role(document jsonb, allowed_roles text[])
returns boolean
language sql
immutable
set search_path = public
as $$
  select coalesce(document ->> 'role' = any(allowed_roles), false)
    or coalesce(private.document_text_array(document, 'roles') && allowed_roles, false)
$$;

grant execute on all functions in schema private to authenticated;

drop policy if exists "profiles self or admin read" on public.profiles;
drop policy if exists "profiles admin write" on public.profiles;
drop policy if exists "role scoped profiles read" on public.profiles;

create policy "role scoped profiles read"
on public.profiles
for select
to authenticated
using (
  id = auth.uid()
  or private.auth_is_super_admin()
  or (
    private.auth_same_school(school_id)
    and (
      private.auth_has_any_role(array['admin', 'principal'])
      or (
        role = 'student'
        and (
          private.auth_has_any_role(array['librarian', 'staff', 'accountant'])
          or (
            private.auth_has_any_role(array['teacher'])
            and class_ids && private.auth_profile_class_ids()
          )
          or id = any(private.auth_profile_linked_student_ids())
        )
      )
    )
  )
);

drop policy if exists "Super admins can manage all tenants" on public.tenants;
drop policy if exists "Users can view their own tenants" on public.tenants;
drop policy if exists "role scoped tenants read" on public.tenants;

create policy "role scoped tenants read"
on public.tenants
for select
to authenticated
using (
  private.auth_is_super_admin()
  or id = private.auth_profile_school_id()
  or id = any(private.auth_active_tenant_ids())
  or id = any(private.auth_managed_tenant_ids())
);

drop policy if exists "Super admins can manage all user_tenants" on public.user_tenants;
drop policy if exists "Users can view their own tenant memberships" on public.user_tenants;
drop policy if exists "role scoped user_tenants read" on public.user_tenants;

create policy "role scoped user_tenants read"
on public.user_tenants
for select
to authenticated
using (
  user_id = auth.uid()
  or email = auth.jwt() ->> 'email'
  or private.auth_is_super_admin()
  or tenant_id = any(private.auth_managed_tenant_ids())
  or (
    tenant_id = private.auth_profile_school_id()
    and private.auth_has_any_role(array['admin', 'principal'])
  )
);

drop policy if exists "authenticated reads role scoped documents" on public.documents;

create policy "authenticated reads role scoped documents"
on public.documents
for select
to authenticated
using (
  (
    collection = 'users'
    and (
      id = auth.uid()::text
      or (
        private.auth_same_school(coalesce(data ->> 'tenantId', data ->> 'schoolId'))
        and (
          private.auth_has_any_role(array['admin', 'principal'])
          or (
            private.document_has_any_role(data, array['student'])
            and (
              private.auth_has_any_role(array['librarian', 'staff', 'accountant'])
              or (
                private.auth_has_any_role(array['teacher'])
                and (
                  private.document_text_array(data, 'classIds') && private.auth_profile_class_ids()
                  or nullif(data ->> 'classId', '') = any(private.auth_profile_class_ids())
                )
              )
              or id = any(array(select unnest(private.auth_profile_linked_student_ids())::text))
              or data ->> 'uid' = any(array(select unnest(private.auth_profile_linked_student_ids())::text))
            )
          )
        )
      )
    )
  )
  or (
    collection in ('announcements', 'classes', 'sections', 'subjects', 'timetable', 'library')
    and private.auth_same_school(coalesce(data ->> 'tenantId', data ->> 'schoolId'))
  )
  or (
    collection = 'notifications'
    and private.auth_same_school(coalesce(data ->> 'tenantId', data ->> 'schoolId'))
    and coalesce(data ->> 'archived', 'false') <> 'true'
    and not (coalesce(data -> 'archivedBy', '[]'::jsonb) ? auth.uid()::text)
    and (
      private.auth_has_any_role(array['admin', 'principal'])
      or coalesce(data -> 'targetUserIds', '[]'::jsonb) = '[]'::jsonb
      or (data -> 'targetUserIds') ? auth.uid()::text
    )
    and (
      private.document_text_array(data, 'targetRoles') && private.auth_profile_roles()
      or coalesce(data -> 'targetRoles', '[]'::jsonb) = '[]'::jsonb
      or (data -> 'targetRoles') ? 'all'
    )
    and (
      private.document_text_array(data, 'targetClasses') && private.auth_profile_class_ids()
      or coalesce(data -> 'targetClasses', '[]'::jsonb) = '[]'::jsonb
      or (data -> 'targetClasses') ? 'all'
    )
  )
  or (
    collection = 'conversations'
    and (
      (data -> 'participants') ? auth.uid()::text
      or (data -> 'memberIds') ? auth.uid()::text
    )
  )
  or (
    collection like 'conversations/%/messages'
    and private.auth_same_school(coalesce(data ->> 'tenantId', data ->> 'schoolId'))
  )
  or (
    collection = 'attendance'
    and private.auth_same_school(coalesce(data ->> 'tenantId', data ->> 'schoolId'))
    and (
      private.auth_has_any_role(array['admin', 'principal'])
      or exists (
        select 1
        from jsonb_array_elements(coalesce(data -> 'records', '[]'::jsonb)) as record
        where record ->> 'studentId' = auth.uid()::text
           or record ->> 'studentId' = any(
             array(select unnest(private.auth_profile_linked_student_ids())::text)
           )
      )
      or (
        private.auth_has_any_role(array['teacher'])
        and data ->> 'classId' = any(private.auth_profile_class_ids())
      )
    )
  )
  or (
    collection = 'assignments'
    and private.auth_same_school(coalesce(data ->> 'tenantId', data ->> 'schoolId'))
    and (
      private.auth_has_any_role(array['admin', 'principal'])
      or (
        private.auth_has_any_role(array['teacher', 'student'])
        and (
          private.document_text_array(data, 'targetClasses') && private.auth_profile_class_ids()
          or private.document_text_array(data, 'classIds') && private.auth_profile_class_ids()
        )
      )
      or (
        private.auth_has_any_role(array['parent'])
        and (
          private.document_text_array(data, 'targetClasses') && private.auth_profile_child_class_ids()
          or private.document_text_array(data, 'classIds') && private.auth_profile_child_class_ids()
        )
      )
    )
  )
  or (
    collection = 'fees'
    and private.auth_same_school(coalesce(data ->> 'tenantId', data ->> 'schoolId'))
    and (
      private.auth_has_any_role(array['admin', 'principal', 'accountant'])
      or data ->> 'studentId' = auth.uid()::text
      or data ->> 'studentId' = any(array(select unnest(private.auth_profile_linked_student_ids())::text))
    )
  )
  or (
    collection = 'performance'
    and private.auth_same_school(coalesce(data ->> 'tenantId', data ->> 'schoolId'))
    and (
      private.auth_has_any_role(array['admin', 'principal'])
      or data ->> 'studentId' = auth.uid()::text
      or data ->> 'studentId' = any(array(select unnest(private.auth_profile_linked_student_ids())::text))
      or (
        private.auth_has_any_role(array['teacher'])
        and data ->> 'classId' = any(private.auth_profile_class_ids())
      )
    )
  )
  or (
    collection = 'submissions'
    and private.auth_same_school(coalesce(data ->> 'tenantId', data ->> 'schoolId'))
    and (
      private.auth_has_any_role(array['admin', 'principal'])
      or data ->> 'studentId' = auth.uid()::text
      or data ->> 'studentId' = any(array(select unnest(private.auth_profile_linked_student_ids())::text))
    )
  )
);
