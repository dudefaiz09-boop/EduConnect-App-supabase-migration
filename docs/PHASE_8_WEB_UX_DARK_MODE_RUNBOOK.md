# Phase 8 Web UX Dark Mode Runbook

This phase hardens dark-mode readability for legacy web surfaces while the app continues moving toward explicit `dark:*` Tailwind classes in each page.

## Goal

Make forms, cards, modals, tables, preview panels, and import flows readable in dark mode without requiring users to highlight text.

## What changed

A compatibility stylesheet is loaded after the main Tailwind stylesheet:

```text
apps/web/src/dark-compat.css
```

It provides dark-mode overrides for common legacy light-only utilities such as:

```text
bg-white
bg-slate-50
bg-slate-100
border-slate-100
border-slate-200
text-slate-700
text-slate-600
text-slate-500
```

This is intended as a safety layer, not a replacement for future component-level design cleanup.

## Priority QA surfaces

Validate these areas in both light and dark mode:

- All Users page
- Add/manage user modal
- Bulk import modal
- Audit logs modal
- CSV preview table
- Filters and search inputs
- Assignment list empty/error state
- Fees import/export surfaces
- Library issue/return surfaces
- Parent portal cards and tables

## Manual checks

1. Toggle dark mode.
2. Open each priority surface.
3. Confirm text is readable without selecting it.
4. Confirm placeholder text is visible but lower contrast than real values.
5. Confirm disabled fields are readable.
6. Confirm hover states are not bright white in dark mode.
7. Confirm tables keep readable headers and rows.
8. Confirm modals remain centered and scrollable on laptop and mobile widths.

## Regression checks

Run before opening the PR:

```powershell
pnpm prettier --write apps/web/src/main.tsx apps/web/src/dark-compat.css docs/PHASE_8_WEB_UX_DARK_MODE_RUNBOOK.md
pnpm format:check
pnpm --filter @educonnect/web build
```

## Follow-up

After this compatibility layer lands, future UI PRs should gradually replace broad legacy utility overrides with explicit component classes, especially in:

- `apps/web/src/pages/Users.tsx`
- Assignments page
- Fees page
- Library page
- Parent portal page
