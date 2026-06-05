# Supabase Release Hardening Runbook

Use this runbook before applying schema, RLS, or storage policy migrations to a shared demo,
staging, or production Supabase project.

## Goal

Prove that the repository migration stream can be applied safely before production state changes.
The production-readiness audit found that the live EduConnect project was behind the repository
migration history, so every release must verify migration parity and advisor output in a
non-production target first.

## Scope

This runbook covers:

- migration parity between `supabase/migrations` and the target Supabase project
- security and performance advisor checks
- tenant isolation smoke checks
- storage bucket policy checks
- release evidence to attach to a PR or launch checklist

It does not cover production data backfills, destructive schema rewrites, or live tenant cutovers.
Those require a separate rollback plan and operator approval.

## Required Access

The operator needs:

- Supabase dashboard access to the target organization
- permission to create a Supabase development branch or staging project
- access to project-level security and performance advisors
- service-role credentials only for local operator scripts or backend-only smoke checks

Never place `SUPABASE_SERVICE_ROLE_KEY` in web, mobile, or other public client env files.

## Preflight

From the repository root:

```powershell
git status --short --branch
corepack pnpm install --frozen-lockfile
corepack pnpm typecheck
corepack pnpm --filter @educonnect/functions test
corepack pnpm --filter @educonnect/functions build
```

Record:

- current branch
- latest commit SHA
- target Supabase project ref
- target environment name: development branch, staging, demo, or production

## Migration Parity Check

List repository migrations:

```powershell
Get-ChildItem supabase\migrations | Sort-Object Name | Select-Object -ExpandProperty Name
```

List target project migrations with the Supabase dashboard, Supabase MCP, or CLI:

```bash
supabase migration list --linked
```

Expected evidence:

- every migration in `supabase/migrations` is accounted for
- any missing target migration is explained before promotion
- no production-only migration exists without a matching repository file

If the target is behind the repository, stop and replay the migrations on a development branch or
staging project first.

## Staging Replay

Use one of these safe targets:

- Supabase development branch created from the project
- dedicated staging project with production-like configuration
- local Supabase stack, when available, for syntax and dependency validation

Apply migrations only to the safe target first. Then run:

```bash
supabase migration list --linked
supabase db lint --linked
supabase db advisors --linked
```

If the CLI is unavailable, capture the same evidence from Supabase security and performance
advisors in the dashboard or MCP connector.

Do not apply migrations to production until staging replay and advisors are clean or each warning
has a tracked exception.

## Advisor Gates

Security advisor must not report:

- RLS enabled with no policies on exposed tables
- public storage bucket listing for tenant-scoped files
- function search path mutable warnings
- leaked password protection disabled without an explicit launch exception

Performance advisor must not report unresolved high-impact items:

- missing indexes for foreign keys used by module queries
- RLS policies repeatedly calling `auth.uid()` or `auth.jwt()` without initplan-friendly wrappers
- duplicate permissive policies that can be consolidated safely

Warnings may be accepted only if the PR or launch checklist includes:

- advisor name
- affected table, policy, bucket, or function
- reason for deferral
- owner and follow-up issue

## Tenant Isolation Smoke

Use seeded demo tenants or equivalent staging tenants:

```powershell
$env:SUPABASE_URL="https://<staging-ref>.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY="<staging-service-role-key>"
$env:CONFIRM_RESET_DEMO_DATA="tenant-a,tenant-b"
corepack pnpm --filter @educonnect/functions seed:supabase
corepack pnpm --filter @educonnect/functions verify:demo-seed
```

Then verify:

- `tenant-a` users cannot read or mutate `tenant-b` records
- non-super-admin users cannot switch tenants with `x-school-id`
- inactive or missing tenants are rejected by the API
- super-admin tenant switching is limited to allowed managed/global flows
- storage keys are scoped under `schools/<tenant-id>/`

## Storage Checks

For `educonnect-uploads`:

- bucket should be private for release targets
- object select/delete policies should require tenant-scoped paths
- new uploads should follow the current storage provider decision
- signed URL generation should be backend-mediated

Evidence to capture:

- bucket public/private flag
- storage object policies
- upload-session smoke result for a tenant-scoped key
- failed access attempt for a cross-tenant key

## Production Promotion

Before production:

1. Confirm staging migration replay passed.
2. Confirm advisors are clean or exceptions are approved.
3. Confirm backup/rollback evidence exists.
4. Confirm demo or staging tenant isolation smoke passed.
5. Confirm deploy branches and PRs are merged in the intended order.

Only then apply production migrations using the approved operator path.

After production:

```bash
supabase migration list --linked
supabase db advisors --linked
```

Also rerun:

```powershell
corepack pnpm smoke:web-api
```

If authenticated smoke is configured:

```text
SMOKE_TENANT_ID
SMOKE_ACCESS_TOKEN
```

Use a low-privilege test token, not a service-role key.

## Release Evidence Template

Attach this to the PR, launch checklist, or release notes:

```text
Supabase project ref:
Environment:
Repo commit:
Migration list captured:
Security advisor result:
Performance advisor result:
Tenant isolation smoke:
Storage policy smoke:
Backup/rollback evidence:
Production migration applied by:
Production post-checks:
Open exceptions:
```

## Stop Conditions

Stop the release if:

- production migration history differs from the repository without explanation
- staging replay fails
- RLS advisor reports exposed tables with no policies
- tenant isolation smoke fails
- public storage listing is enabled for tenant files
- service-role credentials are found in public client configuration
- rollback or backup evidence is missing for a production change
