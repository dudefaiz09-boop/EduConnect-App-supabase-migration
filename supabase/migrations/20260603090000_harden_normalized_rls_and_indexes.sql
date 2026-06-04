-- Follow-up production hardening for normalized ERP tables and storage.
-- This migration closes the remaining Supabase advisor gaps after the role-scoped
-- RLS migrations and keeps legacy storage private while Firebase Storage handles
-- new uploads.

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

update storage.buckets
set public = false
where id = 'educonnect-uploads';

create index if not exists announcements_author_id_idx on public.announcements (author_id);
create index if not exists assignments_created_by_idx on public.assignments (created_by);
create index if not exists attendance_marked_by_idx on public.attendance (marked_by);
create index if not exists borrowed_books_book_id_idx on public.borrowed_books (book_id);
create index if not exists borrowed_books_borrower_id_idx on public.borrowed_books (borrower_id);
create index if not exists chats_created_by_idx on public.chats (created_by);
create index if not exists courses_teacher_id_idx on public.courses (teacher_id);
create index if not exists messages_sender_id_idx on public.messages (sender_id);
create index if not exists payments_fee_id_idx on public.payments (fee_id);
create index if not exists payments_student_id_idx on public.payments (student_id);
create index if not exists performance_student_id_idx on public.performance (student_id);
create index if not exists submissions_student_id_idx on public.submissions (student_id);
create index if not exists user_tenants_tenant_id_idx on public.user_tenants (tenant_id);
create index if not exists user_tenants_user_id_idx on public.user_tenants (user_id);

drop policy if exists "role scoped fees insert" on public.fees;
create policy "role scoped fees insert"
on public.fees
for insert
to authenticated
with check (
  private.auth_same_school(school_id)
  and private.auth_has_any_role(array['admin', 'principal', 'accountant'])
);

drop policy if exists "role scoped fees update" on public.fees;
create policy "role scoped fees update"
on public.fees
for update
to authenticated
using (
  private.auth_same_school(school_id)
  and private.auth_has_any_role(array['admin', 'principal', 'accountant'])
)
with check (
  private.auth_same_school(school_id)
  and private.auth_has_any_role(array['admin', 'principal', 'accountant'])
);

drop policy if exists "role scoped fees delete" on public.fees;
create policy "role scoped fees delete"
on public.fees
for delete
to authenticated
using (
  private.auth_same_school(school_id)
  and private.auth_has_any_role(array['admin', 'principal', 'accountant'])
);

drop policy if exists "role scoped payments insert" on public.payments;
create policy "role scoped payments insert"
on public.payments
for insert
to authenticated
with check (
  private.auth_has_any_role(array['admin', 'principal', 'accountant'])
  and exists (
    select 1
    from public.fees fee
    where fee.id = public.payments.fee_id
      and fee.student_id = public.payments.student_id
      and private.auth_same_school(fee.school_id)
  )
);

drop policy if exists "role scoped payments update" on public.payments;
create policy "role scoped payments update"
on public.payments
for update
to authenticated
using (
  private.auth_has_any_role(array['admin', 'principal', 'accountant'])
  and exists (
    select 1
    from public.fees fee
    where fee.id = public.payments.fee_id
      and private.auth_same_school(fee.school_id)
  )
)
with check (
  private.auth_has_any_role(array['admin', 'principal', 'accountant'])
  and exists (
    select 1
    from public.fees fee
    where fee.id = public.payments.fee_id
      and fee.student_id = public.payments.student_id
      and private.auth_same_school(fee.school_id)
  )
);

drop policy if exists "role scoped payments delete" on public.payments;
create policy "role scoped payments delete"
on public.payments
for delete
to authenticated
using (
  private.auth_has_any_role(array['admin', 'principal', 'accountant'])
  and exists (
    select 1
    from public.fees fee
    where fee.id = public.payments.fee_id
      and private.auth_same_school(fee.school_id)
  )
);

drop policy if exists "role scoped performance insert" on public.performance;
create policy "role scoped performance insert"
on public.performance
for insert
to authenticated
with check (
  private.auth_same_school(school_id)
  and private.auth_has_any_role(array['admin', 'principal', 'teacher'])
);

drop policy if exists "role scoped performance update" on public.performance;
create policy "role scoped performance update"
on public.performance
for update
to authenticated
using (
  private.auth_same_school(school_id)
  and private.auth_has_any_role(array['admin', 'principal', 'teacher'])
)
with check (
  private.auth_same_school(school_id)
  and private.auth_has_any_role(array['admin', 'principal', 'teacher'])
);

drop policy if exists "role scoped performance delete" on public.performance;
create policy "role scoped performance delete"
on public.performance
for delete
to authenticated
using (
  private.auth_same_school(school_id)
  and private.auth_has_any_role(array['admin', 'principal'])
);

drop policy if exists "role scoped submissions insert" on public.submissions;
create policy "role scoped submissions insert"
on public.submissions
for insert
to authenticated
with check (
  student_id = auth.uid()
  and exists (
    select 1
    from public.assignments assignment
    where assignment.id = public.submissions.assignment_id
      and private.auth_same_school(assignment.school_id)
      and assignment.class_ids && private.auth_profile_class_ids()
  )
);

drop policy if exists "role scoped submissions update" on public.submissions;
create policy "role scoped submissions update"
on public.submissions
for update
to authenticated
using (
  student_id = auth.uid()
  or exists (
    select 1
    from public.assignments assignment
    where assignment.id = public.submissions.assignment_id
      and private.auth_same_school(assignment.school_id)
      and (
        private.auth_has_any_role(array['admin', 'principal'])
        or (
          private.auth_has_any_role(array['teacher'])
          and assignment.class_ids && private.auth_profile_class_ids()
        )
      )
  )
)
with check (
  student_id = auth.uid()
  or exists (
    select 1
    from public.assignments assignment
    where assignment.id = public.submissions.assignment_id
      and private.auth_same_school(assignment.school_id)
      and (
        private.auth_has_any_role(array['admin', 'principal'])
        or (
          private.auth_has_any_role(array['teacher'])
          and assignment.class_ids && private.auth_profile_class_ids()
        )
      )
  )
);

drop policy if exists "role scoped submissions delete" on public.submissions;
create policy "role scoped submissions delete"
on public.submissions
for delete
to authenticated
using (
  exists (
    select 1
    from public.assignments assignment
    where assignment.id = public.submissions.assignment_id
      and private.auth_same_school(assignment.school_id)
      and private.auth_has_any_role(array['admin', 'principal'])
  )
);

drop policy if exists "role scoped chats read" on public.chats;
create policy "role scoped chats read"
on public.chats
for select
to authenticated
using (
  private.auth_same_school(school_id)
  and (
    auth.uid() = any(member_ids)
    or private.auth_has_any_role(array['admin', 'principal'])
  )
);

drop policy if exists "role scoped chats insert" on public.chats;
create policy "role scoped chats insert"
on public.chats
for insert
to authenticated
with check (
  private.auth_same_school(school_id)
  and created_by = auth.uid()
  and auth.uid() = any(member_ids)
);

drop policy if exists "role scoped chats update" on public.chats;
create policy "role scoped chats update"
on public.chats
for update
to authenticated
using (
  private.auth_same_school(school_id)
  and (
    created_by = auth.uid()
    or auth.uid() = any(member_ids)
    or private.auth_has_any_role(array['admin', 'principal'])
  )
)
with check (
  private.auth_same_school(school_id)
  and (
    created_by = auth.uid()
    or auth.uid() = any(member_ids)
    or private.auth_has_any_role(array['admin', 'principal'])
  )
);

drop policy if exists "role scoped chats delete" on public.chats;
create policy "role scoped chats delete"
on public.chats
for delete
to authenticated
using (
  private.auth_same_school(school_id)
  and (
    created_by = auth.uid()
    or private.auth_has_any_role(array['admin', 'principal'])
  )
);

drop policy if exists "role scoped messages read" on public.messages;
create policy "role scoped messages read"
on public.messages
for select
to authenticated
using (
  exists (
    select 1
    from public.chats chat
    where chat.id = public.messages.chat_id
      and private.auth_same_school(chat.school_id)
      and (
        auth.uid() = any(chat.member_ids)
        or private.auth_has_any_role(array['admin', 'principal'])
      )
  )
);

drop policy if exists "role scoped messages insert" on public.messages;
create policy "role scoped messages insert"
on public.messages
for insert
to authenticated
with check (
  sender_id = auth.uid()
  and exists (
    select 1
    from public.chats chat
    where chat.id = public.messages.chat_id
      and private.auth_same_school(chat.school_id)
      and auth.uid() = any(chat.member_ids)
  )
);

drop policy if exists "role scoped messages update" on public.messages;
create policy "role scoped messages update"
on public.messages
for update
to authenticated
using (
  exists (
    select 1
    from public.chats chat
    where chat.id = public.messages.chat_id
      and private.auth_same_school(chat.school_id)
      and (
        auth.uid() = any(chat.member_ids)
        or private.auth_has_any_role(array['admin', 'principal'])
      )
  )
)
with check (
  exists (
    select 1
    from public.chats chat
    where chat.id = public.messages.chat_id
      and private.auth_same_school(chat.school_id)
      and (
        auth.uid() = any(chat.member_ids)
        or private.auth_has_any_role(array['admin', 'principal'])
      )
  )
);

drop policy if exists "role scoped messages delete" on public.messages;
create policy "role scoped messages delete"
on public.messages
for delete
to authenticated
using (
  sender_id = auth.uid()
  or exists (
    select 1
    from public.chats chat
    where chat.id = public.messages.chat_id
      and private.auth_same_school(chat.school_id)
      and private.auth_has_any_role(array['admin', 'principal'])
  )
);

drop policy if exists "role scoped borrowed books read" on public.borrowed_books;
create policy "role scoped borrowed books read"
on public.borrowed_books
for select
to authenticated
using (
  borrower_id = auth.uid()
  or borrower_id = any(private.auth_profile_linked_student_ids())
  or exists (
    select 1
    from public.library_books book
    where book.id = public.borrowed_books.book_id
      and private.auth_same_school(book.school_id)
      and private.auth_has_any_role(array['admin', 'principal', 'librarian'])
  )
);

drop policy if exists "role scoped borrowed books insert" on public.borrowed_books;
create policy "role scoped borrowed books insert"
on public.borrowed_books
for insert
to authenticated
with check (
  exists (
    select 1
    from public.library_books book
    where book.id = public.borrowed_books.book_id
      and private.auth_same_school(book.school_id)
      and private.auth_has_any_role(array['admin', 'principal', 'librarian'])
  )
);

drop policy if exists "role scoped borrowed books update" on public.borrowed_books;
create policy "role scoped borrowed books update"
on public.borrowed_books
for update
to authenticated
using (
  exists (
    select 1
    from public.library_books book
    where book.id = public.borrowed_books.book_id
      and private.auth_same_school(book.school_id)
      and private.auth_has_any_role(array['admin', 'principal', 'librarian'])
  )
)
with check (
  exists (
    select 1
    from public.library_books book
    where book.id = public.borrowed_books.book_id
      and private.auth_same_school(book.school_id)
      and private.auth_has_any_role(array['admin', 'principal', 'librarian'])
  )
);

drop policy if exists "role scoped borrowed books delete" on public.borrowed_books;
create policy "role scoped borrowed books delete"
on public.borrowed_books
for delete
to authenticated
using (
  exists (
    select 1
    from public.library_books book
    where book.id = public.borrowed_books.book_id
      and private.auth_same_school(book.school_id)
      and private.auth_has_any_role(array['admin', 'principal', 'librarian'])
  )
);
