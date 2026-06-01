# EduConnect Release Guide

This migration branch releases through Vercel for web and API hosting, with Supabase for Auth/Postgres and Firebase Storage for new uploads.

## Supabase

Apply migrations from `supabase/migrations` before releasing API code that depends on new tables or policies.

```bash
supabase login
supabase link --project-ref your-project-ref
supabase db push
```

## File Storage (Supabase & Firebase)

Before deploying the backend, ensure:

1. The legacy `educonnect-uploads` storage bucket exists in Supabase for backward compatibility.
2. A Firebase project is set up with **Firebase Storage** enabled (Spark free plan).
3. A Firebase service account is created and its JSON key file is downloaded to configure the backend environment variables.

## Backend API

Deploy the API as the `educonnect-api` Vercel project with `apps/functions` as the root directory.

Use these settings:

- Framework Preset: Other
- Install Command: `cd ../.. && corepack pnpm install --frozen-lockfile`
- Build Command: `cd ../.. && corepack pnpm --filter @educonnect/functions build`
- Output Directory: `public`

Set:

- `NODE_ENV=production`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_UPLOADS_BUCKET` only when legacy Supabase Storage reads/deletes are still required
- `STORAGE_PROVIDER=firebase` (set to `supabase` only if fallback is needed)
- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY` (ensure standard newlines are preserved)
- `FIREBASE_STORAGE_BUCKET` (e.g. `your-project.appspot.com` or `your-project.firebasestorage.app`)
- `FIREBASE_SIGNED_URL_TTL_SECONDS` (optional, defaults to 900)
- `CORS_ORIGINS`
- `GEMINI_API_KEY` if AI is enabled

The root `vercel.json` serves the Express app from `/api`.

## Web

Deploy the web app as the `educonnect-web` Vercel project from the repository root.
Deploy the web app as the `educonnect-web` Vercel project with `apps/web` as the root directory.

Use these settings:

- Framework Preset: Vite
- Install Command: `cd ../.. && corepack pnpm install --frozen-lockfile`
- Build Command: `cd ../.. && corepack pnpm --filter @educonnect/web... build`
- Output Directory: `dist`

Set:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_API_BASE_URL`
- `VITE_ENABLE_AI_FEATURES`
- `VITE_ENVIRONMENT`

Never add `SUPABASE_SERVICE_ROLE_KEY` to the web project.

## Mobile

The Android workflow builds and uploads APK/AAB artifacts to GitHub Actions, and the iOS workflow verifies a simulator build on macOS.

Required public mobile build values:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `API_BASE_URL`

Android signing placeholders:

- `ANDROID_KEYSTORE_BASE64`
- `ANDROID_KEYSTORE_PASSWORD`
- `ANDROID_KEY_ALIAS`
- `ANDROID_KEY_PASSWORD`

Never pass `SUPABASE_SERVICE_ROLE_KEY` to mobile builds. Configure Supabase Auth redirect URLs `educonnect://auth/callback` and `educonnect://auth/reset-password` before shipping register/reset flows.
