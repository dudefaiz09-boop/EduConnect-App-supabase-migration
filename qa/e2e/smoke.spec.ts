import { expect, test } from '@playwright/test';
import { attachConsoleErrorGuard, assertRouteLoaded, loginIfConfigured, visitRoute } from './helpers';
import { smokeRoutes } from './routes';

test.describe('web UI smoke checks', () => {
  let authenticated = false;

  test.beforeEach(async ({ page }) => {
    authenticated = await loginIfConfigured(page);
  });

  for (const route of smokeRoutes) {
    test(`${route.name} loads without crashing`, async ({ page }) => {
      const getConsoleErrors = attachConsoleErrorGuard(page);

      await visitRoute(page, route);
      await assertRouteLoaded(page, route, authenticated);

      expect(getConsoleErrors(), `${route.name} should not emit console/page errors`).toEqual([]);
    });
  }
});
