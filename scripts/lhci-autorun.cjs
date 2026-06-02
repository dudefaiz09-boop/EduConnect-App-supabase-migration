const { mkdirSync } = require('node:fs');
const net = require('node:net');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { chromium } = require('@playwright/test');

const lhciTempDir = path.resolve('.lighthouseci/tmp');
const runtimeDir = path.join(lhciTempDir, 'runtime');
mkdirSync(lhciTempDir, { recursive: true });
mkdirSync(runtimeDir, { recursive: true });

function getFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      server.close(() => {
        if (address && typeof address === 'object') {
          resolve(address.port);
          return;
        }
        reject(new Error('Unable to allocate a local Chromium debugging port'));
      });
    });
  });
}

async function waitForDevTools(port) {
  const endpoint = `http://127.0.0.1:${port}/json/version`;
  const deadline = Date.now() + 30000;
  let lastError;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(endpoint);
      if (response.ok) {
        const version = await response.json();
        if (version.webSocketDebuggerUrl) return version;
      }
    } catch (error) {
      lastError = error;
    }

    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  throw new Error(
    `Playwright Chromium DevTools endpoint did not become ready at ${endpoint}: ${
      lastError instanceof Error ? lastError.message : String(lastError || 'timed out')
    }`
  );
}

function runLhci(env) {
  return new Promise((resolve) => {
    const pnpmCommand = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
    const useShell = process.platform === 'win32';
    const child = spawn(pnpmCommand, ['exec', 'lhci', 'autorun', '--config=./lighthouserc.cjs'], {
      env,
      shell: useShell,
      stdio: 'inherit',
    });

    child.on('error', (error) => {
      console.error(error);
      resolve(1);
    });

    child.on('exit', (code, signal) => {
      if (signal) {
        resolve(1);
        return;
      }
      resolve(code || 0);
    });
  });
}

async function main() {
  const port = await getFreePort();
  let browser;
  let exitCode = 0;

  const closeBrowser = async () => {
    if (!browser) return;
    const openBrowser = browser;
    browser = null;
    await openBrowser.close().catch(() => undefined);
  };

  const stop = async (signal) => {
    await closeBrowser();
    process.kill(process.pid, signal);
  };

  process.once('SIGINT', () => void stop('SIGINT'));
  process.once('SIGTERM', () => void stop('SIGTERM'));

  try {
    browser = await chromium.launch({
      headless: true,
      chromiumSandbox: false,
      args: [
        `--remote-debugging-port=${port}`,
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-cpu-frequency-scaling',
        '--disable-crash-reporter',
        '--disable-breakpad',
        '--no-first-run',
        '--no-default-browser-check',
      ],
    });

    const version = await waitForDevTools(port);
    console.log(`[LHCI] Playwright Chromium DevTools: ${port}`);
    console.log(`[LHCI] Browser: ${version.Browser || 'unknown'}`);

    exitCode = await runLhci({
      ...process.env,
      TMP: lhciTempDir,
      TEMP: lhciTempDir,
      TMPDIR: lhciTempDir,
      XDG_RUNTIME_DIR: runtimeDir,
      LHCI_CHROME_PORT: String(port),
    });
  } finally {
    await closeBrowser();
  }

  process.exit(exitCode);
}

main().catch(async (error) => {
  console.error(error);
  process.exit(1);
});
