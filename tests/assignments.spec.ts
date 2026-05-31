import { test, expect } from '@playwright/test';

test.describe('Assignments End-to-End Workflow', () => {
  // TODO: This test remains skipped because:
  // 1. It requires a live seeded Supabase instance with specific demo credentials
  //    (teacher@educonnect.app / student@educonnect.app) that don't exist in CI.
  // 2. It is NOT picked up by any test runner:
  //    - Jest config matches **/tests/**/*.test.ts (this file is .spec.ts)
  //    - Playwright uses testDir: ./qa/e2e (this file is in tests/)
  // 3. Hardcoded login flow and URLs will not work across environments.
  //
  // Reliable assignment test coverage (permission checks, schema validation, etc.)
  // is in tests/assignments.test.ts (Jest, no DB required).
  //
  // To enable this spec, you would need to:
  //   a. Move it to qa/e2e/ and rename to .spec.ts
  //   b. Use the credential injection pattern from qa/e2e/auth.setup.ts
  //   c. Run against a seeded demo environment

  test.skip('Teacher creates assignment with rubric and student submits', async ({ page }) => {
    // 1. Login as Teacher
    await page.goto('/');
    await page.fill('input[type="email"]', 'teacher@educonnect.app');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');

    // 2. Go to Assignments
    await page.click('text=Assignments');

    // 3. Create Assignment
    await page.click('button:has-text("Create")');
    await page.fill('input[placeholder="Assignment Title"]', 'Test Math Homework');
    await page.fill('textarea', 'Solve equations 1 to 5.');
    // Implicitly rubric might be added here
    await page.click('button:has-text("Create Assignment")');

    // Check creation success
    await expect(page.locator('text=Test Math Homework')).toBeVisible();

    // 4. Logout
    await page.click('button:has-text("Logout")');

    // 5. Login as Student
    await page.fill('input[type="email"]', 'student@educonnect.app');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');

    // 6. View Assignments and Submit
    await page.click('text=Assignments');
    await page.click('text=Test Math Homework');

    await page.fill(
      'textarea[placeholder="Type your submission here..."]',
      'Here are my answers: 1: x=2, 2: y=4'
    );
    await page.fill('input[type="url"]', 'https://example.com/math-hw.pdf');

    // Submit
    await page.click('button:has-text("Submit Work")');

    // Check submission state
    await expect(page.locator('text=My Submission')).toBeVisible();
    await expect(page.locator('text=Pending teacher verification')).toBeVisible();
  });
});
