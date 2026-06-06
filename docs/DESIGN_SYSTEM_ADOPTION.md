# Cross-Platform Design System Adoption

This repo now has a small design-system foundation for incremental web and mobile modernization:

- `packages/design-tokens`: shared colors, spacing, radii, typography, elevation, and role colors.
- `packages/ui`: web React primitives backed by shared tokens.
- `packages/mobile-ui`: React Native primitives backed by shared tokens.

## Adoption Rules

- Migrate one module or layout surface at a time.
- Keep user-facing behavior unchanged while swapping primitives.
- Prefer shared tokens over hard-coded colors, spacing, and border radii.
- Keep platform-specific components in `@educonnect/ui` or `@educonnect/mobile-ui`; only tokens belong in `@educonnect/design-tokens`.
- Do not introduce generated `dist` output into commits. Package builds regenerate it.

## Web Usage

Use web primitives in React browser surfaces:

```tsx
import { Button, Card, EmptyState, Input } from '@educonnect/ui';
```

Good first web targets:

- common empty states
- loading skeletons
- modal/dialog shells
- form fields
- repeated action buttons

## Mobile Usage

Use mobile primitives in React Native surfaces:

```tsx
import { Banner, FormField, ListRow, ModuleCard, ScreenShell } from '@educonnect/mobile-ui';
```

Good first mobile targets:

- module list cards
- role-aware dashboard tiles
- loading and error states
- simple form fields
- bottom navigation experiments

## Validation

Run these commands after package or adoption changes:

```powershell
corepack pnpm format:check
corepack pnpm typecheck
corepack pnpm build --filter @educonnect/design-tokens --filter @educonnect/ui --filter @educonnect/mobile-ui
corepack pnpm --filter mobile test
corepack pnpm --filter mobile lint
```

For web screen migrations, also run the relevant Playwright route smoke or PR UI QA workflow.

## Follow-Up PR Order

1. Replace duplicated web empty/loading states with `@educonnect/ui`.
2. Replace mobile dashboard/module cards with `@educonnect/mobile-ui`.
3. Move repeated role colors and status colors to `@educonnect/design-tokens`.
4. Add visual QA snapshots after components are adopted in user-visible screens.
5. Add package-level component tests once the primitives become shared production dependencies.
