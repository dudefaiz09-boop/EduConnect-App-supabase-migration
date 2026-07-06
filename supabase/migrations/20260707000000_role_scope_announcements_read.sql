-- Replace the legacy broad announcements read policy with tenant and role scoped access.
-- The helper functions are defined by 20260528120000_role_scoped_documents_and_core_rls.sql.

drop policy if exists "authenticated read announcements" on public.announcements;
drop policy if exists "role scoped announcements read" on public.announcements;

create policy "role scoped announcements read"
on public.announcements
for select
to authenticated
using (
  private.auth_same_school(school_id)
  and status in ('published', 'scheduled')
  and (
    private.auth_has_any_role(array['admin', 'principal'])
    or 'all' = any(target_roles)
    or target_roles && private.auth_profile_roles()
  )
  and (
    private.auth_has_any_role(array['admin', 'principal'])
    or 'all' = any(target_classes)
    or target_classes && private.auth_profile_class_ids()
    or (
      private.auth_has_any_role(array['parent'])
      and target_classes && private.auth_profile_child_class_ids()
    )
  )
);
