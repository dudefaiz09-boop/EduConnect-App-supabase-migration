create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  school_id text not null,
  title text not null,
  description text,
  subject_id text,
  class_ids text[] not null default '{}',
  teacher_id uuid references auth.users(id) on delete set null,
  status text not null default 'active' check (status in ('active', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.enrollments (
  id uuid primary key default gen_random_uuid(),
  school_id text not null,
  course_id uuid not null references public.courses(id) on delete cascade,
  student_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'completed', 'dropped')),
  enrolled_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (course_id, student_id)
);

create index if not exists courses_school_status_idx on public.courses (school_id, status);
create index if not exists enrollments_student_status_idx on public.enrollments (student_id, status);
create index if not exists enrollments_course_status_idx on public.enrollments (course_id, status);

alter table public.courses enable row level security;
alter table public.enrollments enable row level security;

drop policy if exists "authenticated read courses" on public.courses;
create policy "authenticated read courses" on public.courses
for select to authenticated using (true);

drop policy if exists "admin teacher write courses" on public.courses;
create policy "admin teacher write courses" on public.courses
for all to authenticated using (
  coalesce((auth.jwt() -> 'app_metadata' ->> 'isAdmin')::boolean, false)
  or (auth.jwt() -> 'app_metadata' -> 'roles') ?| array['admin', 'principal', 'teacher']
)
with check (
  coalesce((auth.jwt() -> 'app_metadata' ->> 'isAdmin')::boolean, false)
  or (auth.jwt() -> 'app_metadata' -> 'roles') ?| array['admin', 'principal', 'teacher']
);

drop policy if exists "authenticated read own enrollments" on public.enrollments;
create policy "authenticated read own enrollments" on public.enrollments
for select to authenticated using (
  student_id = auth.uid()
  or coalesce((auth.jwt() -> 'app_metadata' ->> 'isAdmin')::boolean, false)
  or (auth.jwt() -> 'app_metadata' -> 'roles') ?| array['principal', 'teacher']
);

drop policy if exists "admin teacher write enrollments" on public.enrollments;
create policy "admin teacher write enrollments" on public.enrollments
for all to authenticated using (
  coalesce((auth.jwt() -> 'app_metadata' ->> 'isAdmin')::boolean, false)
  or (auth.jwt() -> 'app_metadata' -> 'roles') ?| array['admin', 'principal', 'teacher']
)
with check (
  coalesce((auth.jwt() -> 'app_metadata' ->> 'isAdmin')::boolean, false)
  or (auth.jwt() -> 'app_metadata' -> 'roles') ?| array['admin', 'principal', 'teacher']
);

drop trigger if exists courses_updated_at on public.courses;
create trigger courses_updated_at before update on public.courses
for each row execute function public.set_updated_at();

drop trigger if exists enrollments_updated_at on public.enrollments;
create trigger enrollments_updated_at before update on public.enrollments
for each row execute function public.set_updated_at();
