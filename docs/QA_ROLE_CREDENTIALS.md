# QA Role Credentials

Use dedicated non-production users for Playwright role QA. Do not reuse real school accounts.

## Preflight

Run this before `pnpm qa:roles` or `pnpm qa:full`:

```powershell
pnpm qa:roles:preflight
```

By default, preflight requires only admin credentials because PR UI QA uses the admin role for
protected-route smoke coverage.

## Required For PR UI QA

Configure these local environment variables or GitHub Actions secrets:

```text
WEB_QA_ADMIN_EMAIL
WEB_QA_ADMIN_PASSWORD
```

The UI QA workflow maps these to `WEB_QA_EMAIL` and `WEB_QA_PASSWORD` for compatibility with older
Playwright helpers.

## Full Role Matrix

Set these pairs to exercise the full role matrix:

```text
WEB_QA_ADMIN_EMAIL
WEB_QA_ADMIN_PASSWORD
WEB_QA_PRINCIPAL_EMAIL
WEB_QA_PRINCIPAL_PASSWORD
WEB_QA_TEACHER_EMAIL
WEB_QA_TEACHER_PASSWORD
WEB_QA_STUDENT_EMAIL
WEB_QA_STUDENT_PASSWORD
WEB_QA_PARENT_EMAIL
WEB_QA_PARENT_PASSWORD
WEB_QA_LIBRARIAN_EMAIL
WEB_QA_LIBRARIAN_PASSWORD
WEB_QA_ACCOUNTANT_EMAIL
WEB_QA_ACCOUNTANT_PASSWORD
WEB_QA_STAFF_EMAIL
WEB_QA_STAFF_PASSWORD
```

To make missing role credentials fail preflight:

```text
WEB_QA_REQUIRE_ALL_ROLES=true
```

To require only a subset:

```text
WEB_QA_REQUIRED_ROLES=admin,teacher,student,parent
```

Allowed role names are:

```text
admin, principal, teacher, student, parent, librarian, accountant, staff
```

## GitHub Actions Checklist

For pull requests:

- `WEB_QA_ADMIN_EMAIL`
- `WEB_QA_ADMIN_PASSWORD`

For scheduled or manually dispatched full audits, add every `WEB_QA_<ROLE>_EMAIL` and
`WEB_QA_<ROLE>_PASSWORD` pair above.

For visual regression:

- `PERCY_TOKEN`

## Failure Guide

If preflight fails with `Missing environment variables`, add the listed variables exactly as shown.
If it fails with `Role QA credential pairs must be complete`, either add the missing half of the
pair or remove both values for that role.

Use `pnpm qa:pr` when only admin credentials exist. Use `pnpm qa:roles` after every required role
has both email and password configured.
