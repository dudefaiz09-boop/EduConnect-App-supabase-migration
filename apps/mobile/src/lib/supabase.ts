import { createClient } from '@supabase/supabase-js';
import { ENV } from '../config/env';

const PLACEHOLDER_URL = 'https://your-project.supabase.co';
const PLACEHOLDER_KEY = 'your_supabase_anon_key';

const isConfigured =
  ENV.SUPABASE_URL !== PLACEHOLDER_URL && ENV.SUPABASE_ANON_KEY !== PLACEHOLDER_KEY;

if (!isConfigured) {
  console.error(
    '[EduConnect] FATAL: Supabase is not configured. ' +
      'Add SUPABASE_URL and SUPABASE_ANON_KEY as GitHub Repository Secrets, then rebuild the APK.'
  );
}

// createClient is safe to call with placeholder values — it won't throw.
// All auth calls will fail gracefully and the AuthContext .catch() will handle them.
export const supabase = createClient(
  isConfigured ? ENV.SUPABASE_URL : PLACEHOLDER_URL,
  isConfigured ? ENV.SUPABASE_ANON_KEY : PLACEHOLDER_KEY,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: false,
    },
  }
);

export const supabaseConfigured = isConfigured;

export async function getSupabaseAccessToken() {
  if (!isConfigured) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token || null;
}

