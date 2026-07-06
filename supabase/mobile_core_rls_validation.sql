-- EduConnect mobile core RLS validation.
-- Run this in the Supabase SQL editor after migrations to confirm the mobile
-- modules are protected by tenant and role scoped policies.

select
  schemaname,
  tablename,
  rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename in (
    'announcements',
    'attendance',
    'assignments',
    'library_books',
    'documents'
  )
order by tablename;

select
  schemaname,
  tablename,
  policyname,
  cmd,
  roles,
  qual
from pg_policies
where schemaname = 'public'
  and (
    (tablename = 'announcements' and policyname = 'role scoped announcements read')
    or (tablename = 'attendance' and policyname = 'role scoped attendance read')
    or (tablename = 'assignments' and policyname = 'role scoped assignments read')
    or (tablename = 'library_books' and policyname = 'school scoped library read')
    or (tablename = 'documents' and policyname = 'authenticated reads role scoped documents')
  )
order by tablename, policyname;

do $$
declare
  missing_count integer;
begin
  select count(*)
  into missing_count
  from (
    values
      ('announcements', 'role scoped announcements read'),
      ('attendance', 'role scoped attendance read'),
      ('assignments', 'role scoped assignments read'),
      ('library_books', 'school scoped library read'),
      ('documents', 'authenticated reads role scoped documents')
  ) as expected(tablename, policyname)
  left join pg_policies p
    on p.schemaname = 'public'
   and p.tablename = expected.tablename
   and p.policyname = expected.policyname
  where p.policyname is null;

  if missing_count > 0 then
    raise exception 'Missing % mobile core RLS policy/policies', missing_count;
  end if;
end $$;
