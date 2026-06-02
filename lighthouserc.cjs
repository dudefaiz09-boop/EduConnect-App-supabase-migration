const { mkdirSync, rmSync } = require('node:fs');
const path = require('node:path');

const chromeUserDataDir = path
  .resolve(`.lighthouseci/tmp/chrome-user-data-${process.pid}`)
  .replace(/\\/g, '/');

rmSync(chromeUserDataDir, { recursive: true, force: true });
mkdirSync(chromeUserDataDir, { recursive: true });

const chromeFlags = [
  '--headless=new',
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-dev-shm-usage',
  '--disable-gpu',
  '--disable-cpu-frequency-scaling',
  '--disable-crash-reporter',
  '--disable-breakpad',
  '--no-first-run',
  '--no-default-browser-check',
  `--user-data-dir=${chromeUserDataDir}`,
].join(' ');

module.exports = {
  ci: {
    collect: {
      startServerCommand:
        process.env.LHCI_START_SERVER_COMMAND || 'node scripts/lhci-start-server.cjs',
      startServerReadyPattern: 'LHCI server ready',
      startServerReadyTimeout: 120000,
      url: [
        'http://127.0.0.1:4173/auth/login',
        'http://127.0.0.1:4173/auth/register',
        'http://127.0.0.1:4173/auth/forgot-password',
      ],
      numberOfRuns: 1,
      settings: {
        preset: 'desktop',
        chromeFlags,
      },
    },
    assert: {
      preset: 'lighthouse:recommended',
      assertions: {
        'categories:performance': ['warn', { minScore: 0.5 }],
        'categories:accessibility': ['error', { minScore: 0.85 }],
        'categories:best-practices': ['warn', { minScore: 0.8 }],
        'categories:seo': ['warn', { minScore: 0.8 }],
        'color-contrast': 'warn',
        'network-dependency-tree-insight': 'warn',
        'unused-javascript': 'off',
        'uses-long-cache-ttl': 'off',
      },
    },
    upload: {
      target: 'filesystem',
      outputDir: './qa/results/lighthouse',
    },
  },
};
