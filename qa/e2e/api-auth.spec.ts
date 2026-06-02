import { expect, test } from '@playwright/test';

const defaultQaApiBaseUrl = 'http://127.0.0.1:3000/api';

const protectedApiPaths = [
  '/api/students',
  '/api/announcements',
  '/api/attendance',
  '/api/assignments',
  '/api/library',
  '/api/fees',
  '/api/performance',
  '/api/users',
];

function getApiBaseUrl() {
  const configuredApiBaseUrl = (process.env.API_BASE_URL || process.env.VITE_API_BASE_URL || '').trim();
  if (configuredApiBaseUrl) {
    return configuredApiBaseUrl;
  }

  return process.env.PLAYWRIGHT_WEB_SERVER_COMMAND ? '' : defaultQaApiBaseUrl;
}

test.describe('protected API authorization smoke checks @full', () => {
  test.describe.configure({ mode: 'serial' });

  test.skip(
    !/^https?:\/\//i.test(getApiBaseUrl()),
    'Protected API auth checks require an absolute API_BASE_URL or VITE_API_BASE_URL when overriding the QA server.'
  );

  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-chromium', 'API checks run once.');
  });

  for (const [index, path] of protectedApiPaths.entries()) {
    test(`${path} rejects unauthenticated requests`, async ({ request }) => {
      const apiBaseUrl = getApiBaseUrl();
      const url = `${apiBaseUrl.replace(/\/+$/, '')}${path.replace(/^\/api(?=\/|$)/, '')}`;
      const response = await request.get(url, {
        failOnStatusCode: false,
        headers: { 'X-Forwarded-For': `203.0.113.${index + 10}` },
      });
      expect([401, 403]).toContain(response.status());
    });
  }
});
