import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { assertRouteLoaded, loginFirstConfiguredRole, stabilizePage, visitRoute } from './helpers';
import { prRoutes, smokeRoutes } from './routes';

for (const mode of [
  { label: 'PR axe accessibility checks @pr', routes: prRoutes },
  { label: 'full axe accessibility checks @full', routes: smokeRoutes },
]) {
  test.describe(mode.label, () => {
    let authenticated = false;

    test.beforeEach(async ({ page }) => {
      authenticated = await loginFirstConfiguredRole(page);
    });

    for (const route of mode.routes) {
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
}
