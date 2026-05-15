grant usage on schema public to anon, authenticated, service_role;
grant select, insert, update, delete on public.documents to service_role;
grant select on public.documents to authenticated;
