const { existsSync, mkdirSync } = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const lhciTempDir = path.resolve('.lighthouseci/tmp');
const runtimeDir = path.join(lhciTempDir, 'runtime');
mkdirSync(lhciTempDir, { recursive: true });
mkdirSync(runtimeDir, { recursive: true });

function resolvePlaywrightChromiumPath() {
  try {
    const { chromium } = require('@playwright/test');
    const executablePath = chromium.executablePath();
    return executablePath && existsSync(executablePath) ? executablePath : null;
  } catch {
    return null;
  }
}

const chromePath = process.env.CHROME_PATH || resolvePlaywrightChromiumPath();

const env = {
  ...process.env,
  TMP: lhciTempDir,
  TEMP: lhciTempDir,
  TMPDIR: lhciTempDir,
  XDG_RUNTIME_DIR: runtimeDir,
  ...(chromePath ? { CHROME_PATH: chromePath } : {}),
};

console.log(`[LHCI] Chrome executable: ${chromePath || 'system discovery'}`);

const result = spawnSync('pnpm', ['exec', 'lhci', 'autorun', '--config=./lighthouserc.cjs'], {
  env,
  shell: true,
  stdio: 'inherit',
});

process.exit(result.status || 0);
