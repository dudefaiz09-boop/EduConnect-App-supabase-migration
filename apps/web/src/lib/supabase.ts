import { createClient } from '@supabase/supabase-js';
import { env } from './env';
import type { Database } from '../types/database';

export const supabase = createClient<Database>(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

export const uploadsBucket = env.VITE_SUPABASE_UPLOADS_BUCKET;

export async function getSupabaseAccessToken() {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token || null;
}
