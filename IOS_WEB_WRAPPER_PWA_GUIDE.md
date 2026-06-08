# EduConnect iOS Safari PWA / Web Wrapper Guide

## What This Is

This is a **Progressive Web App (PWA) web wrapper** for EduConnect Web, allowing iPhone and iPad users to add EduConnect to their iOS Home Screen via Safari's **Add to Home Screen** feature.

The PWA provides:
- **Standalone/app-like** launch (no browser address bar or tab bar)
- **App icon** on the Home Screen (like a native app)
- **Fast initial load** via service worker static asset caching
- **Portrait orientation lock** for mobile use
- **Theme color** matching the EduConnect brand

## What This Is NOT

- **Not an App Store app** — This is NOT submitted to the iOS App Store. No Apple Developer account, provisioning profiles, or code signing is involved.
- **Not a native iOS app** — This does NOT use Swift, UIKit, SwiftUI, or any Apple native framework. It runs in Safari's WebKit engine in PWA mode.
- **Not an Android replacement** — The Android native React Native app remains the primary Android distribution path. The PWA is for iOS users who cannot install the Android app.
- **Not Expo, Capacitor, or Cordova** — No mobile wrapper frameworks are used. This is purely a web standard PWA.
- **Not a migration** — The existing React Native Android app is untouched and remains fully publishable.

## How iPhone/iPad Users Install

1. Open **Safari** on iPhone or iPad (Chrome, Firefox, and other browsers do not support Add to Home Screen).
2. Navigate to the EduConnect web URL.
3. Tap the **Share** button (square with upward arrow icon, usually at the bottom center of Safari).
4. Scroll down in the share sheet and tap **Add to Home Screen**.
5. Tap **Add** (top-right corner). Safari will dismiss and place the EduConnect icon on your Home Screen.
6. Tap the EduConnect icon on the Home Screen to launch it in **standalone mode** (no Safari browser chrome).

## How Android Remains Handled

- The Android native React Native app is **fully preserved** and remains the primary Android experience.
- The Android APK/AAB release build pipeline is **unchanged**.
- Android users should use the native app from the published APK/AAB.
- If an Android user visits the web app, a small banner mentions the native Android app as the recommended option.
- The PWA does NOT replace or compete with the Android native app.

## How to Test Locally

### Prerequisites
- Node.js >= 22
- pnpm >= 11.1.0

### Steps

```bash
# 1. Install all dependencies
pnpm install

# 2. Generate PWA icons (PNGs from the favicon SVG)
cd apps/web && node scripts/generate-pwa-icons.mjs && cd ../..

# 3. Start the dev server
pnpm --filter @educonnect/web dev
```

### Verify PWA Features Locally

1. Open `http://localhost:5173` in a browser.
2. Open DevTools → **Application** tab → **Manifest** to verify the manifest loads.
3. Open DevTools → **Application** → **Service Workers** to verify the service worker is registered.
4. Open DevTools → **Network** tab, reload, and verify static assets come from the service worker ( `(from ServiceWorker)` ).
5. Verify no API/XHR requests are cached by the service worker (they should show `(from disk cache)` or fresh network, NOT service worker).

### Test iOS PWA Behavior

For full PWA testing on iOS, you must deploy to a publicly accessible URL (see next section). iOS Safari requires HTTPS to register a service worker.

However, you can partially test on desktop:
1. In Chrome DevTools, toggle **Device Toolbar** (Ctrl+Shift+M).
2. Select **iPhone** or **iPad** from the device list.
3. Reload the page.
4. The PWA install banner should appear at the bottom after 3 seconds.

## How to Test After Vercel Deploy

### Deploy to Vercel

```bash
# Build and deploy (if your Vercel project is linked)
pnpm --filter @educonnect/web build
npx vercel --prod
```

Or push to the Git branch that Vercel auto-deploys.

### Post-Deploy Test Checklist

1. **Visit the deployed URL** in Safari on iPhone/iPad.
2. **Verify Add to Home Screen** works: Share → Add to Home Screen → Add.
3. **Verify standalone launch**: Open from Home Screen — no address bar or tab bar should appear.
4. **Verify manifest**: Open Safari → DevTools (connect via Safari Web Inspector on macOS) → Application → Manifest. All fields should be populated.
5. **Verify icons**: The Home Screen icon should display the EduConnect branded icon (dark rounded square with blue/green accents).
6. **Verify direct routes**: Refresh on `/dashboard`, `/assignments`, `/attendance`, `/parent-portal`, `/chat`, `/fees`, `/library`, `/performance`, `/settings` — none should return a 404.
7. **Verify auth still works**: Log in, log out, and log back in. Session should persist correctly.
8. **Verify no data caching**: In Safari Web Inspector → Storage → Service Workers, inspect the cache storage. Only static assets (JS, CSS, HTML, images) should be cached. No API responses or Supabase data should appear.

## Troubleshooting

### Add to Home Screen is missing/grayed out
- Ensure you are using **Safari**, not Chrome or another browser on iOS.
- Ensure the page loads over **HTTPS** (required for service workers and manifest). Local testing via `localhost` works, but production requires HTTPS.
- Check that `manifest.webmanifest` is served with the correct MIME type (`application/manifest+json`). Vite/Vercel handles this automatically.
- Verify the manifest is valid JSON (no trailing commas). Run `pnpm --filter @educonnect/web build` and check `apps/web/dist/manifest.webmanifest`.

### Icon not showing on Home Screen
- Ensure `icon-192x192.png`, `icon-512x512.png`, and `apple-touch-icon.png` exist in `apps/web/public/icons/` and `apps/web/public/`.
- Regenerate icons: `cd apps/web && node scripts/generate-pwa-icons.mjs`
- Rebuild: `pnpm --filter @educonnect/web build`
- Clear Safari cache on iPhone: Settings → Safari → Clear History and Website Data.

### App opens in Safari instead of standalone
- Ensure the manifest has `"display": "standalone"`.
- Ensure the `<meta name="apple-mobile-web-app-capable" content="yes">` tag is present in `index.html`.
- Delete the Home Screen icon and re-add it.

### Blank screen after refresh
- Open the page in Safari, not from Home Screen. Check for JavaScript errors.
- Try clearing the service worker:
  1. Open the URL in Safari.
  2. Open Safari Settings → Advanced → Web Inspector (enable if not already).
  3. Connect via macOS Safari Web Inspector.
  4. Go to Application → Service Workers → Unregister.
- Or on-device: Settings → Safari → Clear History and Website Data → Close Safari → Re-add to Home Screen.

### Stale service worker cache
The service worker is configured with `registerType: 'autoUpdate'`, which means it updates in the background and takes control on the next page load.
- If you see stale content, close all Safari tabs, kill Safari from the app switcher, and relaunch.
- The service worker precaches only static build assets (JS, CSS, HTML, fonts, images). No API data is cached.

### Login/session issues
- The service worker does NOT intercept auth requests (no runtime caching for API/Supabase routes).
- Auth is handled by Supabase Auth SDK, which uses its own session storage (localStorage in the browser).
- If login fails in PWA mode, try opening in regular Safari first, login, then re-add to Home Screen.
- Clearing Safari data will also clear Supabase sessions. You will need to log in again.

### Direct route 404 on Vercel
- The root `vercel.json` already includes SPA catch-all rewrites: `{ "source": "/(.*)", "destination": "/index.html" }`.
- If a route returns 404, verify the Vercel deployment includes this rewrite rule.
- The web app's `apps/web/vercel.json` also has the same SPA catch-all for standalone deployments.

## Technical Details

### Files Changed for PWA Support

| File | Change |
|------|--------|
| `apps/web/package.json` | Added `vite-plugin-pwa` and `sharp` as devDependencies |
| `apps/web/vite.config.ts` | Added `VitePWA()` plugin with manifest and static-asset-only workbox |
| `apps/web/index.html` | Added manifest link, theme-color, Apple PWA meta tags, apple-touch-icon, PNG favicon |
| `apps/web/src/App.tsx` | Added `PwaInstallBanner` component |
| `apps/web/src/components/PwaInstallBanner.tsx` | **New** — iOS/Android install helper banner |
| `apps/web/scripts/generate-pwa-icons.mjs` | **New** — Icon generation script using sharp |
| `apps/web/public/icons/icon-192x192.png` | **New** — 192x192 PWA icon |
| `apps/web/public/icons/icon-512x512.png` | **New** — 512x512 PWA icon |
| `apps/web/public/apple-touch-icon.png` | **New** — 180x180 Apple touch icon |
| `apps/web/public/favicon.png` | **New** — 48x48 PNG favicon fallback |

### Service Worker Caching Strategy

- **Strategy:** `precacheOnly` (via workbox `globPatterns`)
- **Cached assets:** Only static files: `.js`, `.css`, `.html`, `.svg`, `.png`, `.ico`, `.woff2`
- **NOT cached:** API responses, Supabase data, attendance, assignments, fees, chat, parent portal data, student/teacher/admin data, or any authenticated backend response.
- **Update behavior:** `autoUpdate` — the service worker updates in the background and takes control on the next navigation.
- **No runtime caching** is configured, so no network requests are intercepted at runtime. All data requests go directly to the network.

### Android Files NOT Modified

The following Android/publishing files remain **unchanged**:

- `apps/mobile/android/app/build.gradle`
- `apps/mobile/android/build.gradle`
- `apps/mobile/android/gradle.properties`
- `apps/mobile/android/settings.gradle`
- `apps/mobile/android/app/src/**`
- `.github/workflows/android-distribute.yml`
- Any Android keystore or signing config
- `apps/mobile/package.json`
- All iOS native project files

### Limitations of iOS PWA Compared to Native App

| Feature | iOS PWA | Native App |
|---------|---------|------------|
| Push notifications | Not supported on iOS PWAs | Supported |
| Camera / file access | Limited Web APIs only | Full native access |
| Background sync | Not available | Available |
| Cache storage | ~50MB limit | Device storage |
| App Store presence | None | Available |
| Installation friction | User must manually Add to Home Screen | One-tap from App Store |
| Updates | Auto-updates via service worker on next launch | App Store update flow |
| Session persistence | Safari WebKit (may be cleared) | Full device storage |
