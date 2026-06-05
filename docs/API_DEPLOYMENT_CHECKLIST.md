# API Deployment & Stability Checklist

This checklist keeps the EduConnect API stable on Vercel and separates startup/import failures from browser CORS symptoms.

## API Vercel Project Settings

### Recommended Combined Project

- Framework Preset: Other
- Root Directory: repo root / empty
- Git Branch: main
- Runtime entrypoint: `api/index.ts`
- Build Command: `corepack pnpm --filter @educonnect/functions build && corepack pnpm --filter @educonnect/web build`
- Output Directory: `apps/web/dist`
- Serverless import: `api/index.ts` must import `../apps/functions/dist/app.js`.
- Web env: set `VITE_API_BASE_URL=/api` because the API and web app share the same origin.

### Advanced Split API Project

- Framework Preset: Other
- Root Directory: `apps/functions`
- Git Branch: main
- Runtime entrypoint: `apps/functions/api/index.ts`
- Build Command: `cd ../.. && corepack pnpm --filter @educonnect/functions build`
- Output Directory: `public`

In split mode, Vercel uses `apps/functions/vercel.json` and `apps/functions/api/index.ts`.
That entrypoint must import
`../dist/app.js`, never `../dist/index.js`, because `dist/index.js` starts `app.listen()`.

## API Environment

Set these variables on the API Vercel project:

- `SUPABASE_URL=<project URL>`
- `SUPABASE_SERVICE_ROLE_KEY=<service role key>`
- `CORS_ORIGINS=https://your-web-project.vercel.app`
- `NODE_ENV=production`
- `OPENROUTER_API_KEY` optional
- `OPENROUTER_MODEL` optional/free only

Do not expose `SUPABASE_SERVICE_ROLE_KEY` to the web project.

## Web Environment

Set these variables on the web Vercel project:

- Combined project: `VITE_API_BASE_URL=/api`
- Split projects: `VITE_API_BASE_URL=https://educonnect-api-sigma.vercel.app/api`
- `VITE_SUPABASE_URL=<Supabase project URL>`
- `VITE_SUPABASE_ANON_KEY=<Supabase anon key>`

Use `/api` only when the Express API is served from the exact same origin as the web app.
For split projects, `VITE_API_BASE_URL` must point to the deployed API Vercel URL and must
end in `/api`. The local Vite dev server can use `/api` because `apps/web/vite.config.ts`
proxies `/api` to `http://localhost:3000`.

Vite embeds `VITE_*` variables at build time. After changing `VITE_API_BASE_URL` or any
other `VITE_*` variable in Vercel, redeploy the web project; a runtime restart is not enough.

## Serverless Startup Rules

- `api/index.ts` imports the compiled Express app from `apps/functions/dist/app.js`.
- `api/index.ts` must never import `apps/functions/src/index.ts`; that file starts `app.listen()` for local server usage.
- Vercel runtime must never import `apps/functions/dist/index.js`.
- Public diagnostic routes must not require Supabase, OpenRouter, auth, tenant context, or the document layer during import.

If `/api/version` crashes, do not debug CORS first. Fix API startup/import/deployment first.

## Middleware Order

Verify in `apps/functions/src/app.ts`:

- Global CORS/preflight handling runs before auth, tenant middleware, protected routers, and rate limiters.
- `OPTIONS` requests return `204`.
- `publicRouter` is mounted before any protected router.
- `protectedRouter` applies middleware in this order:
  1. `authMiddleware`
  2. `requireAuth`
  3. `tenantMiddleware`
- `globalErrorHandler` is the final middleware.

## Post-Deploy Checks

1. `https://educonnect-api-sigma.vercel.app/api/version`
   Expected: JSON 200.

2. `https://educonnect-api-sigma.vercel.app/api/health`
   Expected: JSON 200.

3. `https://educonnect-api-sigma.vercel.app/api/ready`
   Expected: JSON 200 if envs and Supabase connectivity are good, JSON 503 if envs are missing or Supabase is unreachable. Never a Vercel crash page.

4. `https://educonnect-api-sigma.vercel.app/api/notifications`
   Expected without login: JSON 401. Never a Vercel crash page.

## PowerShell CORS Check

```powershell
curl.exe -i -X OPTIONS "https://educonnect-api-sigma.vercel.app/api/notifications" `
  -H "Origin: https://your-web-project.vercel.app" `
  -H "Access-Control-Request-Method: GET" `
  -H "Access-Control-Request-Headers: authorization,x-school-id,content-type"
```

Expected:

```txt
HTTP 204
access-control-allow-origin: https://your-web-project.vercel.app
access-control-allow-credentials: true
```

## Protected Route Expectations

Without `Authorization`, these routes must return JSON 401:

- `GET /api/notifications`
- `GET /api/announcements`
- `GET /api/attendance`
- `GET /api/assignments`
- `GET /api/library`
- `GET /api/fees`
- `GET /api/performance`
- `GET /api/teachers`
- `GET /api/chat`
- `GET /api/users`
- `GET /api/students`

With auth but missing tenant context, protected routes should return JSON 400 `Tenant Context Required`.

With an invalid tenant override, protected routes should return JSON 403 `Tenant Access Denied`.

## Build & Test Pass

- `pnpm format:check`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm turbo build --filter @educonnect/functions`
- `pnpm turbo build --filter @educonnect/web`
