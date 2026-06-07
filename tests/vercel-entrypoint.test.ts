import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import request from 'supertest';
import { describe, it, expect } from '@jest/globals';
import app from '../apps/functions/src/app.js';
import { buildFallbackReadyBody } from '../api/index.js';

const envKeys = [
  'NODE_ENV',
  'VERCEL_ENV',
  'VERCEL_URL',
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'CORS_ORIGINS',
] as const;

function withEnv(overrides: Partial<Record<(typeof envKeys)[number], string | undefined>>) {
  const original = Object.fromEntries(envKeys.map((key) => [key, process.env[key]]));

  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }

  return () => {
    for (const [key, value] of Object.entries(original)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  };
}

describe('Vercel Entrypoint Verification', () => {
  it('api/index.ts imports the compiled Express app, not source or listener bundles', () => {
    const entrypoint = readFileSync(join(process.cwd(), 'api/index.ts'), 'utf8');

    expect(entrypoint).toContain('../apps/functions/dist/app.js');
    expect(entrypoint).not.toContain('../apps/functions/src/app.ts');
    expect(entrypoint).not.toContain('../apps/functions/src/index');
    expect(entrypoint).not.toContain('../apps/functions/dist/index.js');
  });

  it('apps/functions/api/index.ts imports the compiled app bundle, not the listener bundle', () => {
    const entrypoint = readFileSync(join(process.cwd(), 'apps/functions/api/index.ts'), 'utf8');

    expect(entrypoint).toContain('../dist/app.js');
    expect(entrypoint).not.toContain('../dist/index.js');
  });

  it('source app exports an Express app function', () => {
    expect(typeof app).toBe('function');
  });

  it('should respond to /api/health via the source app', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status', 'healthy');
  });

  it('should respond to /api/version via the source app', async () => {
    const res = await request(app).get('/api/version');
    expect(res.status).toBe(200);
    expect(res.type).toContain('json');
    expect(res.body).toHaveProperty('status', 'ok');
    expect(res.body).toHaveProperty('app', 'educonnect-api');
  });

  it('GET /api/version returns JSON without Supabase env vars', async () => {
    const originalUrl = process.env.SUPABASE_URL;
    const originalServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;

    try {
      const res = await request(app).get('/api/version');
      expect(res.status).toBe(200);
      expect(res.type).toContain('json');
      expect(res.body).toHaveProperty('app', 'educonnect-api');
    } finally {
      if (originalUrl) process.env.SUPABASE_URL = originalUrl;
      if (originalServiceRoleKey) process.env.SUPABASE_SERVICE_ROLE_KEY = originalServiceRoleKey;
    }
  });

  it('GET /api/health returns JSON without Supabase env vars', async () => {
    const originalUrl = process.env.SUPABASE_URL;
    const originalServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;

    try {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.type).toContain('json');
      expect(res.body).toHaveProperty('status', 'healthy');
    } finally {
      if (originalUrl) process.env.SUPABASE_URL = originalUrl;
      if (originalServiceRoleKey) process.env.SUPABASE_SERVICE_ROLE_KEY = originalServiceRoleKey;
    }
  });

  it('GET /api/ready returns JSON 503 without Supabase env vars', async () => {
    const originalUrl = process.env.SUPABASE_URL;
    const originalServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const originalCorsOrigins = process.env.CORS_ORIGINS;
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.CORS_ORIGINS;

    try {
      const res = await request(app).get('/api/ready');
      expect(res.status).toBe(503);
      expect(res.type).toContain('json');
      expect(res.body).toHaveProperty('status', 'not_ready');
      expect(res.body.checks).toMatchObject({
        hasSupabaseUrl: false,
        hasServiceRoleKey: false,
        hasCorsOrigins: false,
        expressAppLoaded: true,
      });
      expect(res.body.missing).toEqual(
        expect.arrayContaining(['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'CORS_ORIGINS'])
      );
    } finally {
      if (originalUrl) process.env.SUPABASE_URL = originalUrl;
      if (originalServiceRoleKey) process.env.SUPABASE_SERVICE_ROLE_KEY = originalServiceRoleKey;
      if (originalCorsOrigins) process.env.CORS_ORIGINS = originalCorsOrigins;
    }
  });

  it('fallback /api/ready hides diagnostics in production', () => {
    const restoreEnv = withEnv({
      NODE_ENV: 'production',
      VERCEL_ENV: 'production',
      VERCEL_URL: 'educonnect-api-sigma.vercel.app',
      SUPABASE_URL: undefined,
      SUPABASE_SERVICE_ROLE_KEY: undefined,
      CORS_ORIGINS: undefined,
    });

    try {
      const body = buildFallbackReadyBody('startup failed: missing SUPABASE_SERVICE_ROLE_KEY');
      const serialized = JSON.stringify(body);

      expect(body).toHaveProperty('status', 'not_ready');
      expect(body).toHaveProperty('checks', { expressAppLoaded: false });
      expect(body).toHaveProperty('timestamp');
      expect(body).not.toHaveProperty('missing');
      expect(body).not.toHaveProperty('startupError');
      expect(body).not.toHaveProperty('vercelUrl');
      expect(serialized).not.toContain('SUPABASE_SERVICE_ROLE_KEY');
      expect(serialized).not.toContain('SUPABASE_URL');
      expect(serialized).not.toContain('CORS_ORIGINS');
      expect(serialized).not.toContain('startup failed');
    } finally {
      restoreEnv();
    }
  });

  it('fallback /api/ready includes local diagnostics outside production', () => {
    const restoreEnv = withEnv({
      NODE_ENV: 'test',
      VERCEL_ENV: undefined,
      VERCEL_URL: undefined,
      SUPABASE_URL: undefined,
      SUPABASE_SERVICE_ROLE_KEY: undefined,
      CORS_ORIGINS: undefined,
    });

    try {
      const body = buildFallbackReadyBody('startup failed');

      expect(body).toHaveProperty('status', 'not_ready');
      expect(body).toHaveProperty('startupError', 'startup failed');
      expect(body.missing).toEqual(
        expect.arrayContaining(['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'CORS_ORIGINS'])
      );
      expect(body.checks).toMatchObject({
        hasSupabaseUrl: false,
        hasServiceRoleKey: false,
        hasCorsOrigins: false,
        expressAppLoaded: false,
      });
    } finally {
      restoreEnv();
    }
  });

  it('OPTIONS /api/notifications should return 204 with CORS headers', async () => {
    const res = await request(app)
      .options('/api/notifications')
      .set('Origin', 'http://localhost:5173')
      .set('Access-Control-Request-Method', 'GET')
      .set('Access-Control-Request-Headers', 'authorization,x-school-id,content-type');

    expect(res.status).toBe(204);
    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    expect(res.headers['access-control-allow-methods']).toContain('GET');
    expect(res.headers['access-control-allow-headers']).toContain('authorization');
  });

  it('GET /api/notifications without auth should return 401', async () => {
    const res = await request(app).get('/api/notifications');
    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('code', 'AUTH_MISSING');
  });

  it('GET /api/announcements without auth should return 401', async () => {
    const res = await request(app).get('/api/announcements');
    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('code', 'AUTH_MISSING');
  });
});
