const { spawn, spawnSync } = require('node:child_process');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..');
const functionsDir = path.join(repoRoot, 'apps', 'functions');

const apiHost = '127.0.0.1';
const apiPort = process.env.QA_API_PORT || '3000';
const webHost = '127.0.0.1';
const webPort = process.env.QA_WEB_PORT || '4173';
const apiOrigin = `http://${apiHost}:${apiPort}`;
const apiHealthUrl = `${apiOrigin}/api/health`;
const webOrigin = `http://${webHost}:${webPort}`;
const webReadyUrl = `${webOrigin}/auth/login`;

const pnpm = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
const children = new Set();
let shuttingDown = false;

const webEnv = {
  ...process.env,
  VITE_ENVIRONMENT: process.env.VITE_ENVIRONMENT || 'preview',
  VITE_DEMO_MODE: process.env.VITE_DEMO_MODE || 'true',
  VITE_SUPABASE_URL:
    process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://example.supabase.co',
  VITE_SUPABASE_ANON_KEY:
    process.env.VITE_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    'qa-placeholder-anon-key',
  VITE_API_BASE_URL: process.env.VITE_API_BASE_URL || `${apiOrigin}/api`,
};

const apiEnv = {
  ...process.env,
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: apiPort,
  PUBLIC_APP_URL: process.env.PUBLIC_APP_URL || webOrigin,
  CORS_ORIGINS: process.env.CORS_ORIGINS || webOrigin,

  VITE_DEMO_MODE: process.env.VITE_DEMO_MODE || 'true',
  DEMO_MODE: process.env.DEMO_MODE || 'true',

  SUPABASE_URL:
    process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://example.supabase.co',

  SUPABASE_ANON_KEY:
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    'qa-placeholder-anon-key',

  SUPABASE_SERVICE_ROLE_KEY:
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    'qa-placeholder-service-role-key',

  VITE_SUPABASE_URL:
    process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://example.supabase.co',

  VITE_SUPABASE_ANON_KEY:
    process.env.VITE_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    'qa-placeholder-anon-key',

  STORAGE_PROVIDER: process.env.STORAGE_PROVIDER || 'supabase',
};

function runBuild(label, args, env = process.env) {
  console.log(`[QA] Building ${label}...`);
  const result = spawnSync(pnpm, args, {
    cwd: repoRoot,
    env,
    shell: process.platform === 'win32',
    stdio: 'inherit',
  });

  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

function spawnChild(label, command, args, options) {
  const child = spawn(command, args, {
    shell: process.platform === 'win32',
    stdio: 'inherit',
    ...options,
  });

  children.add(child);

  child.on('exit', (code, signal) => {
    children.delete(child);
    if (shuttingDown || signal) return;
    console.error(
      `[QA] ${label} exited before QA completed${code === null ? '' : ` with ${code}`}.`
    );
    shutdown(code || 1);
  });

  child.on('error', (error) => {
    children.delete(child);
    if (shuttingDown) return;
    console.error(`[QA] Failed to start ${label}: ${error.message}`);
    shutdown(1);
  });

  return child;
}

async function waitForUrl(label, url, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  let lastError;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(url, { redirect: 'manual' });
      if (response.status > 0 && response.status < 500) {
        return;
      }
      lastError = new Error(`status ${response.status}`);
    } catch (error) {
      lastError = error;
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error(
    `${label} did not become ready at ${url}: ${
      lastError instanceof Error ? lastError.message : String(lastError)
    }`
  );
}

function shutdown(exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;

  for (const child of children) {
    if (!child.killed) {
      child.kill('SIGTERM');
    }
  }

  setTimeout(() => process.exit(exitCode), 250).unref();
}

process.once('SIGINT', () => shutdown(130));
process.once('SIGTERM', () => shutdown(143));
process.once('exit', () => {
  for (const child of children) {
    if (!child.killed) {
      child.kill('SIGTERM');
    }
  }
});

async function main() {
  runBuild('@educonnect/functions', ['--filter', '@educonnect/functions', 'build'], apiEnv);
  runBuild('@educonnect/web', ['--filter', '@educonnect/web', 'build'], webEnv);

  spawnChild('QA API', 'node', ['dist/standalone.js'], {
    cwd: functionsDir,
    env: apiEnv,
  });

  await waitForUrl('QA API', apiHealthUrl, 120000);
  console.log(`QA API ready: ${apiOrigin}`);

  spawnChild(
    'QA web',
    pnpm,
    ['--filter', '@educonnect/web', 'preview', '--host', webHost, '--port', webPort],
    {
      cwd: repoRoot,
      env: webEnv,
    }
  );

  await waitForUrl('QA web', webReadyUrl, 120000);
  console.log(`QA web ready: ${webOrigin}`);
}

main().catch((error) => {
  console.error(`[QA] ${error instanceof Error ? error.message : String(error)}`);
  shutdown(1);
});
