import { z } from 'zod';
import 'dotenv/config';

/**
 * Environment Variables Schema
 * Enforces presence and format of required production keys.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).default('8080'),

  // FIREBASE / GCP (Injected by environment or Secret Manager)
  PROJECT_ID: z.string().min(1, 'PROJECT_ID is required for Vertex AI'),
  VERTEX_LOCATION: z.string().default('us-central1'),
  FIREBASE_STORAGE_BUCKET: z.string().optional(),
});

/**
 * Validates and returns the environment configuration.
 * Fails fast if required variables are missing.
 */
function validateEnv() {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    console.error(
      '❌ Invalid environment variables:',
      JSON.stringify(parsed.error.format(), null, 2)
    );

    // In production, we must crash if secrets are missing
    if (process.env.NODE_ENV === 'production') {
      throw new Error('CRITICAL: Environment validation failed. Stopping process.');
    }
  }

  return parsed.data || process.env;
}

export const env = validateEnv() as z.infer<typeof envSchema>;
