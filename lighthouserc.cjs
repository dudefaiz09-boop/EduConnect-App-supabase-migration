module.exports = {
  ci: {
    collect: {
      startServerCommand:
        process.env.LHCI_START_SERVER_COMMAND ||
        'pnpm --filter @educonnect/web build && pnpm --filter @educonnect/web preview --host 127.0.0.1 --port 4173',
      startServerReadyPattern: 'Local:',
      startServerReadyTimeout: 120000,
      url: [
        'http://127.0.0.1:4173/auth/login',
        'http://127.0.0.1:4173/auth/register',
        'http://127.0.0.1:4173/auth/forgot-password',
      ],
      numberOfRuns: 1,
      settings: {
        preset: 'desktop',
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
