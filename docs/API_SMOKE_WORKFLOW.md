# API Smoke Workflow

The repository includes a GitHub Actions workflow for lightweight API smoke checks:

```text
.github/workflows/api-smoke.yml
```

It runs the existing script:

```powershell
pnpm smoke:web-api
```

## What it checks

The smoke script verifies basic API availability and auth/tenant surfaces, including:

- `/health`
- `/ai/status`
- `/notifications`
- `/announcements`

The protected route checks accept expected auth or tenant errors when no smoke token is configured, so the workflow can still detect broken routing without needing a demo login token.

## Required configuration

Set this repository variable or secret:

```text
API_BASE_URL=https://your-api-host.example.com/api
```

The value must be an HTTPS URL and must end with `/api`. GitHub-hosted smoke checks must target
a deployed API, not `localhost`, `127.0.0.1`, or an emulator URL.

## Optional configuration

For authenticated tenant-aware smoke checks, set:

```text
SMOKE_TENANT_ID=tenant-a
SMOKE_ACCESS_TOKEN=<short-lived test user access token>
```

Use a low-privilege demo/test account for `SMOKE_ACCESS_TOKEN`. Do not use service-role keys or admin credentials.

## Manual run

GitHub UI:

1. Open **Actions**.
2. Select **API Smoke**.
3. Choose **Run workflow**.
4. Optionally provide `api_base_url`.

The manual `api_base_url` input overrides the configured `API_BASE_URL` variable/secret for that run.

## Scheduled run

The workflow also runs on a daily schedule. If `API_BASE_URL` is not configured, or if it is not
an HTTPS URL ending in `/api`, the workflow fails so deployment monitoring cannot silently go dark.

## Local run

Against a deployed API:

```powershell
$env:API_BASE_URL="https://your-api-host.example.com/api"
pnpm smoke:web-api
```

Against the local standalone functions API, start the API in another terminal first:

```powershell
corepack pnpm --filter @educonnect/functions build
$env:PORT="8080"
node apps/functions/dist/standalone.js
```

Then run:

```powershell
$env:API_BASE_URL="http://localhost:8080/api"
pnpm smoke:web-api
```

Against the QA web/API harness, keep `scripts/start-qa-web-api.cjs` running and use:

```powershell
$env:API_BASE_URL="http://127.0.0.1:3000/api"
pnpm smoke:web-api
```

For authenticated checks:

```powershell
$env:SMOKE_TENANT_ID="tenant-a"
$env:SMOKE_ACCESS_TOKEN="<short-lived test user access token>"
pnpm smoke:web-api
```

If the script cannot connect, it prints the resolved `API_BASE_URL` and points to the deployed,
standalone-local, and QA-harness options above. Connection failures usually mean the API process is
not running or `API_BASE_URL` points at the wrong port.
