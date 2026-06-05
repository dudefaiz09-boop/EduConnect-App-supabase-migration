# Phase 7 Release Readiness Runbook

This phase prepares EduConnect for a release-candidate demo across web, API, Supabase, and Android.

## Goal

Create a repeatable release checklist so every demo build is validated the same way before sharing with schools or stakeholders.

## Generate release checklist

From the repository root:

```powershell
pnpm release:checklist
```

This writes:

```text
audit/generated/release-readiness-checklist.csv
```

## Recommended release-candidate command sequence

```powershell
pnpm install
pnpm format:check
pnpm lint
pnpm test
pnpm --filter @educonnect/shared build
pnpm --filter @educonnect/shared-api build
pnpm --filter @educonnect/functions build
pnpm --filter @educonnect/web build
pnpm --filter mobile lint
pnpm --filter mobile test
pnpm --filter mobile build:android
pnpm --filter @educonnect/functions demo:ready
pnpm qa:web-matrix
pnpm release:checklist
pnpm smoke:web-api
```

## Environment checklist

### Web

Required public web values:

```text
VITE_API_BASE_URL
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

### API

Required server-side values:

```text
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
CORS_ORIGINS
```

### Android

Required public mobile values:

```text
API_BASE_URL
SUPABASE_URL
SUPABASE_ANON_KEY
```

The Android `API_BASE_URL` must be an HTTPS deployed API URL for distributable APKs. Do not use localhost URLs for device builds.

## Vercel checks

If Vercel reports failures, classify them before blocking the release:

- Build failure from project code or env config: release blocker.
- Missing required env variable: release blocker.
- Build-rate-limit-only failure: wait/retry later or document as a platform-limit exception.

## Supabase checks

Before demo:

1. Confirm the project URL points to the intended demo Supabase project.
2. Complete the Supabase hardening flow in
   `docs/SUPABASE_RELEASE_HARDENING_RUNBOOK.md`.
3. Run the demo seed readiness command.
4. Verify tenant isolation between `tenant-a` and `tenant-b`.
5. Confirm service-role keys are only used in backend or local operator scripts.

## Web QA checks

Use:

```powershell
pnpm qa:web-matrix
```

Then complete the generated matrix against seeded data.

Critical areas:

- All Users and tenant switching
- Dark mode readability
- Assignments
- Fees
- Library
- Parent portal
- Chat
- Responsive web layout

## Android QA checks

Before sharing an APK:

1. Build a fresh debug APK.
2. Install on a real Android device.
3. Sign in as at least admin, teacher, student, and parent demo roles.
4. Verify dashboard, assignments, attendance, fees, library, parent portal, chat, and logout.
5. Confirm the APK does not point to localhost or emulator-only API URLs.

## API smoke checks

Use:

```powershell
pnpm smoke:web-api
```

For authenticated smoke checks, configure:

```text
SMOKE_TENANT_ID
SMOKE_ACCESS_TOKEN
```

Use a low-privilege test user token only.

## Exit criteria

Release readiness is complete when:

- Release checklist is generated.
- Formatting, lint, tests, and builds pass.
- Demo seed verification passes.
- API smoke passes or failures are explained.
- Web QA matrix critical items pass or have tracked issues.
- Android APK installs and core flows work on a real device.
- There are no open release-blocking PRs or issues.
