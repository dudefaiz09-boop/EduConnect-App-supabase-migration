# Documents Compatibility Retirement Plan

The `public.documents` table is still a compatibility layer, not the target data model.
New application code should use normalized tables or backend services unless it is one of
the explicitly allowed compatibility adapters below.

## Allowed Direct Clients

- `apps/web/src/lib/documents.ts`: web compatibility adapter for legacy module pages.
- `apps/functions/src/lib/documents.ts`: backend compatibility adapter and auth bridge.
- `apps/functions/src/lib/identity-profile.ts`: normalized-first profile lookup with legacy user fallback.
- `apps/functions/src/lib/profile-service.ts`: own-profile compatibility sync.
- `apps/functions/src/features/documents/documents.controller.ts`: upload-session and attachment metadata.
- `apps/functions/src/features/users/users.repository.ts`: tenant onboarding `schools` compatibility row.
- `apps/functions/scripts/seed-supabase.ts`: demo seed data.
- `apps/functions/scripts/seed-demo-extras.ts`: demo extras seed data.
- `apps/functions/scripts/verify-demo-seed.ts`: demo seed verification.

## Active Compatibility Collections

- Identity and tenant compatibility: `users`, `schools`
- Classroom structure: `classes`, `sections`, `subjects`, `timetable`
- Assignments: `assignments`, `submissions`
- Attendance: `attendance`
- Fees and performance: `fees`, `payments`, `performance`, `performance_records`
- Library: `library`, `library_books`, `borrowRecords`
- Communication: `announcements`, `notifications`, `conversations`
- Files: `uploadSessions`, `attachments`

## Migration Order

1. Keep auth, tenant lookup, and admin user lists on normalized `profiles`, `tenants`, and `user_tenants`.
2. Move files to normalized upload-session and attachment tables while preserving backend-signed Firebase Storage sessions.
3. Move assignments and submissions together so submission counts and teacher notifications remain consistent.
4. Move attendance, fees, performance, and library modules with module-specific RLS policies.
5. Move communication collections after role and audience targeting policies have normalized equivalents.
6. Remove compatibility reads only after the relevant module has a migration, seed path, tests, and rollback plan.

## Guardrails

- Do not add new direct frontend Supabase `documents` queries outside `apps/web/src/lib/documents.ts`.
- Do not add direct `documents` clients to the admin console.
- Backend feature code should use repositories or compatibility adapters instead of adding ad hoc `documents` queries.
- Every normalized replacement needs tenant-scoped tests and role-boundary tests before legacy reads are removed.
