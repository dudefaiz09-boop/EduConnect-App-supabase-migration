-- Keep library borrow records and resource copy counts consistent while the
-- legacy document compatibility table is still serving the library module.

create or replace function public.borrow_library_resource_document(
  p_resource_id text,
  p_tenant_id text,
  p_student_id text,
  p_student_name text,
  p_borrow_record_id text,
  p_borrowed_at text,
  p_due_at text
)
returns jsonb
language plpgsql
set search_path = public
as $$
declare
  v_resource_data jsonb;
  v_available_copies integer;
  v_borrowed_count integer;
  v_record_data jsonb;
begin
  select data
  into v_resource_data
  from public.documents
  where collection = 'library'
    and id = p_resource_id
    and (
      data ->> 'tenantId' = p_tenant_id
      or data ->> 'schoolId' = p_tenant_id
    )
  for update;

  if not found then
    raise exception 'LIBRARY_RESOURCE_NOT_FOUND';
  end if;

  if coalesce(v_resource_data ->> 'status', 'active') = 'archived' then
    raise exception 'LIBRARY_RESOURCE_ARCHIVED';
  end if;

  v_available_copies := case
    when v_resource_data ? 'availableCopies'
      and nullif(v_resource_data ->> 'availableCopies', '') is not null
    then greatest((v_resource_data ->> 'availableCopies')::integer, 0)
    else null
  end;
  v_borrowed_count := greatest(coalesce((v_resource_data ->> 'borrowedCount')::integer, 0), 0);

  if v_available_copies is not null and v_borrowed_count >= v_available_copies then
    raise exception 'LIBRARY_NO_COPIES_AVAILABLE';
  end if;

  if exists (
    select 1
    from public.documents
    where collection = 'borrowRecords'
      and data ->> 'tenantId' = p_tenant_id
      and data ->> 'resourceId' = p_resource_id
      and data ->> 'studentId' = p_student_id
      and data ->> 'status' = 'borrowed'
  ) then
    raise exception 'LIBRARY_ALREADY_BORROWED';
  end if;

  v_record_data := jsonb_build_object(
    'tenantId', p_tenant_id,
    'schoolId', p_tenant_id,
    'resourceId', p_resource_id,
    'studentId', p_student_id,
    'studentName', p_student_name,
    'borrowedAt', p_borrowed_at,
    'dueAt', p_due_at,
    'status', 'borrowed',
    'returnedAt', null
  );

  insert into public.documents (collection, id, data, created_at, updated_at)
  values ('borrowRecords', p_borrow_record_id, v_record_data, now(), now());

  update public.documents
  set data = jsonb_set(
      v_resource_data || jsonb_build_object('updatedAt', p_borrowed_at),
      '{borrowedCount}',
      to_jsonb(v_borrowed_count + 1),
      true
    ),
    updated_at = now()
  where collection = 'library'
    and id = p_resource_id;

  return v_record_data || jsonb_build_object('id', p_borrow_record_id);
exception
  when unique_violation then
    raise exception 'LIBRARY_ALREADY_BORROWED';
end;
$$;

create or replace function public.return_library_resource_document(
  p_record_id text,
  p_tenant_id text,
  p_actor_id text,
  p_returned_at text
)
returns jsonb
language plpgsql
set search_path = public
as $$
declare
  v_record_data jsonb;
  v_resource_data jsonb;
  v_resource_id text;
  v_borrowed_count integer;
begin
  select data
  into v_record_data
  from public.documents
  where collection = 'borrowRecords'
    and id = p_record_id
    and (
      data ->> 'tenantId' = p_tenant_id
      or data ->> 'schoolId' = p_tenant_id
    )
  for update;

  if not found then
    raise exception 'LIBRARY_BORROW_RECORD_NOT_FOUND';
  end if;

  if v_record_data ->> 'status' = 'returned' then
    return jsonb_build_object('success', true, 'id', p_record_id, 'status', 'returned');
  end if;

  v_resource_id := v_record_data ->> 'resourceId';

  update public.documents
  set data = v_record_data || jsonb_build_object(
      'status', 'returned',
      'returnedAt', p_returned_at,
      'updatedAt', p_returned_at,
      'updatedBy', p_actor_id
    ),
    updated_at = now()
  where collection = 'borrowRecords'
    and id = p_record_id;

  select data
  into v_resource_data
  from public.documents
  where collection = 'library'
    and id = v_resource_id
    and (
      data ->> 'tenantId' = p_tenant_id
      or data ->> 'schoolId' = p_tenant_id
    )
  for update;

  if found then
    v_borrowed_count := greatest(coalesce((v_resource_data ->> 'borrowedCount')::integer, 0), 0);

    update public.documents
    set data = jsonb_set(
        v_resource_data || jsonb_build_object('updatedAt', p_returned_at),
        '{borrowedCount}',
        to_jsonb(greatest(v_borrowed_count - 1, 0)),
        true
      ),
      updated_at = now()
    where collection = 'library'
      and id = v_resource_id;
  end if;

  return jsonb_build_object('success', true, 'id', p_record_id, 'status', 'returned');
end;
$$;

revoke all on function public.borrow_library_resource_document(
  text,
  text,
  text,
  text,
  text,
  text,
  text
) from public, anon, authenticated;
revoke all on function public.return_library_resource_document(text, text, text, text) from public,
anon,
authenticated;
grant execute on function public.borrow_library_resource_document(
  text,
  text,
  text,
  text,
  text,
  text,
  text
) to service_role;
grant execute on function public.return_library_resource_document(text, text, text, text) to service_role;
