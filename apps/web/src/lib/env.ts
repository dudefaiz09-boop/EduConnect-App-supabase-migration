import { z } from 'zod';

const envSchema = z.object({
  VITE_SUPABASE_URL: z.string().url('VITE_SUPABASE_URL must be a valid Supabase project URL'),
  VITE_SUPABASE_ANON_KEY: z.string().min(1, 'VITE_SUPABASE_ANON_KEY is required'),
  VITE_SUPABASE_UPLOADS_BUCKET: z.string().min(1).default('educonnect-uploads'),
  VITE_API_BASE_URL: z.string().min(1).default('/api'),
  VITE_ENABLE_AI_FEATURES: z.string().default('true'),
  VITE_ENVIRONMENT: z.string().default('development'),
});

export type WebEnv = z.infer<typeof envSchema>;

function parseEnv(): WebEnv {
  const parsed = envSchema.safeParse(import.meta.env);
  if (!parsed.success) {
    const message = parsed.error.issues.map((issue) => issue.message).join('\n');
    throw new Error(`Invalid web environment configuration:\n${message}`);
  }
  return parsed.data;
}

export const env = parseEnv();
