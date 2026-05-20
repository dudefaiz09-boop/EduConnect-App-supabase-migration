import { Platform } from 'react-native';

/**
 * PRODUCTION-GRADE MOBILE ENVIRONMENT CONFIG
 *
 * process.env.VAR literals are replaced by babel-plugin-transform-inline-environment-variables
 * at bundle time. Do NOT use process?.env?.VAR or _env['VAR'] — Babel cannot inline those patterns.
 * Do NOT add 'declare const process | undefined' — it causes Hermes to throw a TypeError.
 */

interface EnvConfig {
  API_BASE_URL: string;
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  IS_PRODUCTION: boolean;
}

const PRODUCTION_CONFIG: EnvConfig = {
  // Babel inlines these literals at bundle time from CI environment secrets
  API_BASE_URL: process.env.API_BASE_URL || 'https://your-api.example.com/api',
  SUPABASE_URL: process.env.SUPABASE_URL || 'https://your-project.supabase.co',
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || 'your_supabase_anon_key',
  IS_PRODUCTION: true,
};

const DEV_CONFIG: EnvConfig = {
  // Use local emulator IP for Android/iOS
  API_BASE_URL: Platform.select({
    android: 'http://10.0.2.2:8080/api',
    ios: 'http://localhost:8080/api',
    default: 'http://localhost:8080/api',
  })!,
  SUPABASE_URL: process.env.SUPABASE_URL || 'https://your-project.supabase.co',
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || 'your_supabase_anon_key',
  IS_PRODUCTION: false,
};

export const ENV = __DEV__ ? DEV_CONFIG : PRODUCTION_CONFIG;

// Warn if placeholder values are still in use at runtime — this means
// CI secrets were not injected and the app will fail to authenticate.
if (
  ENV.SUPABASE_URL === 'https://your-project.supabase.co' ||
  ENV.SUPABASE_ANON_KEY === 'your_supabase_anon_key'
) {
  console.warn(
    '[EduConnect] WARNING: Supabase URL or Anon Key is still set to the placeholder value. ' +
      'Set SUPABASE_URL and SUPABASE_ANON_KEY as GitHub Repository Secrets and rebuild.'
  );
}

if (__DEV__) {
  console.log('[Mobile] ENV mode: DEV. API:', ENV.API_BASE_URL);
  console.log('[Mobile] Supabase URL:', ENV.SUPABASE_URL);
}

