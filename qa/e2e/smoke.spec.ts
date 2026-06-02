import { expect, test } from '@playwright/test';
import {
  attachConsoleErrorGuard,
  assertRouteLoaded,
  loginFirstConfiguredRole,
  stabilizePage,
  visitRoute,
} from './helpers';
import { prRoutes, smokeRoutes, type QaRoute } from './routes';

const mobileOverflowRoutes: QaRoute[] = [
  { name: 'dashboard', path: '/', module: 'dashboard', authRequired: true },
  { name: 'chat', path: '/chat', module: 'chat', authRequired: true },
  { name: 'all-users', path: '/all-users', module: 'allUsers', authRequired: true },
];

for (const mode of [
  { label: 'PR smoke checks @pr', routes: prRoutes },
  { label: 'full smoke checks @full', routes: smokeRoutes },
]) {
  test.describe(mode.label, () => {
    for (const route of mode.routes) {
      test(`${route.name} loads without crashing`, async ({ page }) => {
        const getConsoleErrors = attachConsoleErrorGuard(page);
        const authenticated = route.authRequired ? await loginFirstConfiguredRole(page) : false;

        await visitRoute(page, route);
        await assertRouteLoaded(page, route, authenticated);

        expect(getConsoleErrors(), `${route.name} should not emit console/page errors`).toEqual([]);
      });
    }
  });
}

test.describe('authenticated mobile layout guardrails @pr @full', () => {
  test('shared shell pages do not horizontally overflow at 375px', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile-chromium', '375px overflow guard runs on mobile.');

    await page.setViewportSize({ width: 375, height: 812 });
    const authenticated = await loginFirstConfiguredRole(page);
    test.skip(!authenticated, 'Authenticated overflow guard needs configured QA credentials.');

    for (const route of mobileOverflowRoutes) {
      await visitRoute(page, route);
      await assertRouteLoaded(page, route, authenticated);
      await stabilizePage(page);

      const width = await page.evaluate(() => ({
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
        bodyScrollWidth: document.body.scrollWidth,
      }));

      expect(
        width.scrollWidth,
        `${route.name} should not create document-level horizontal overflow at 375px`
      ).toBeLessThanOrEqual(width.clientWidth + 1);
      expect(
        width.bodyScrollWidth,
        `${route.name} body should not horizontally overflow at 375px`
      ).toBeLessThanOrEqual(width.clientWidth + 1);
    }
  });
});
