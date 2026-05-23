import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { assertRouteLoaded, loginIfConfigured, stabilizePage, visitRoute } from './helpers';
import { publicRoutes, protectedRoutes } from './routes';

const routesToScan = publicRoutes.concat(protectedRoutes.slice(0, 5));

test.describe('axe accessibility checks', () => {
  let authenticated = false;

  test.beforeEach(async ({ page }) => {
    authenticated = await loginIfConfigured(page);
  });

  for (const route of routesToScan) {
    test(`${route.name} has no serious or critical axe violations`, async ({ page }, testInfo) => {
      await visitRoute(page, route);
      await assertRouteLoaded(page, route, authenticated);
      await stabilizePage(page);

      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();

      const blockingViolations = results.violations.filter((violation) =>
        ['serious', 'critical'].includes(violation.impact || '')
      );

      await testInfo.attach(`${route.name}-axe-results.json`, {
        body: JSON.stringify(results.violations, null, 2),
        contentType: 'application/json',
      });

      expect(blockingViolations).toEqual([]);
    });
  }
});
