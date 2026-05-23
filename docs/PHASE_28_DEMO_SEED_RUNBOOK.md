# Phase 28: Demo Seed Runbook

## Purpose

This runbook documents the current demo seed coverage and the checks needed before using the seeded data for a stakeholder or sales demo.

## Seed script

Primary script:

```text
apps/functions/scripts/seed-supabase.ts
```

The script is designed to clean and rebuild known demo tenants and users. It should not be pointed at real production schools.

## Required environment variables

Set these before running the seed script:

```text
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
```

## Demo tenants

The current seed flow uses two active demo tenants:

- `tenant-a` — EduConnect Demo Academy
- `tenant-b` — EduConnect International School

The cleanup flow also removes known stale demo data for `tenant-c`.

## Current role coverage

Current seeded roles include:

- Global admin
- Tenant admin
- Principal
- Teacher
- Student
- Parent
- Librarian
- Accountant

Known follow-up:

- Add explicit seeded `staff` users for both demo tenants, because the role/module map already supports `staff`.

## Current module coverage

Current seeded module examples include:

- Tenants and schools
- Users and profiles
- Classes, sections, subjects, and timetable
- Attendance
- Assignments
- Submissions
- Fees
- Performance records
- Library resources
- Announcements
- Notifications

Known follow-up:

- Add library borrow-history records, including due-soon and overdue examples, so the web and mobile overdue states can be demonstrated immediately after seeding.
- Add fee payment-history records if payment history needs to be shown in the first demo click path.

## Recommended seed command

From the repository root, use the project package script if one exists. If not, run the script from the functions workspace using the repo's TypeScript execution pattern.

Before running against a shared database, confirm the target Supabase project and keys are for a demo environment.

## Smoke checks after seeding

After seeding, verify these login paths:

- Global admin can switch or view managed demo tenants.
- Tenant admin can open dashboard, users, fees, library, attendance, assignments, and announcements.
- Principal can view school-level operational data.
- Teacher can view students, mark attendance, and manage assignments.
- Student can view assignments, attendance, fees, performance, and library resources.
- Parent can view linked-child portal data.
- Librarian can manage library resources.
- Accountant can manage fees.

## Data quality checks

Verify that repeated seed runs do not create duplicate demo rows for:

- Auth users
- Profiles
- User tenant links
- Attendance records
- Assignments
- Submissions
- Fees
- Performance records
- Documents table rows

## Safety checklist

Before running the seed script:

- Confirm the Supabase URL is a demo or staging project.
- Confirm the service role key belongs to the intended project.
- Confirm the database does not contain real school data using the `@educonnect.test` domain or demo tenant IDs.
- Confirm stale demo cleanup is limited to known demo tenants and demo email domains.

## Exit criteria

Phase 28 seed readiness is complete when:

- Two tenants can be recreated from scratch.
- Every required role has at least one seeded account in each tenant.
- Parent accounts are linked to child student accounts.
- Library, fees, assignments, attendance, performance, announcements, and notifications have meaningful demo data.
- Re-running the seed script leaves a clean, deterministic demo state.
