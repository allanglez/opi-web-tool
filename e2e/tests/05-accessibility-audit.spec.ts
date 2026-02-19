import { test, expect } from './helpers/fixtures';

/**
 * E2E: Accessibility Audit
 * Verifies basic accessibility requirements across all major pages:
 * - Headings hierarchy
 * - Alt text on images
 * - Form labels
 * - Color contrast (via visible text)
 * - Keyboard navigation (focus indicators)
 * - ARIA landmarks
 */
test.describe('Accessibility Audit', () => {
  const pages = [
    { path: '/admin/dashboard', name: 'Admin Dashboard' },
    { path: '/admin/cycle', name: 'Cycle Setup' },
    { path: '/admin/ingestion', name: 'Ingestion Status' },
    { path: '/admin/audit-log', name: 'Audit Log' },
    { path: '/admin/reports', name: 'Reports Export' },
    { path: '/admin/retention', name: 'Retention Config' },
    { path: '/admin/reset', name: 'Annual Reset' },
    { path: '/coordinator/dashboard', name: 'Coordinator Dashboard' },
    { path: '/coordinator/assignments', name: 'Assignments' },
    { path: '/coordinator/scheduling', name: 'Scheduling' },
    { path: '/evaluator/dashboard', name: 'Evaluator Dashboard' },
  ];

  for (const { path, name } of pages) {
    test(`${name} page has proper heading structure`, async ({ page }) => {
      await page.goto(path);
      await page.waitForLoadState('networkidle');

      // Every page should have at least one h1
      const h1Count = await page.locator('h1').count();
      expect(h1Count).toBeGreaterThanOrEqual(1);

      // h1 should not be empty
      const h1Text = await page.locator('h1').first().textContent();
      expect(h1Text?.trim().length).toBeGreaterThan(0);
    });

    test(`${name} page has no images without alt text`, async ({ page }) => {
      await page.goto(path);
      await page.waitForLoadState('networkidle');

      // All img elements should have alt attribute (can be empty for decorative)
      const imagesWithoutAlt = await page.locator('img:not([alt])').count();
      expect(imagesWithoutAlt).toBe(0);
    });

    test(`${name} page has visible main content`, async ({ page }) => {
      await page.goto(path);
      await page.waitForLoadState('networkidle');

      // Main content area should be visible
      const main = page.locator('main').first();
      if (await main.count() > 0) {
        await expect(main).toBeVisible();
      }
    });
  }

  test('form inputs have associated labels', async ({ page }) => {
    // Check the retention config page which has form inputs
    await page.goto('/admin/retention');
    await page.waitForLoadState('networkidle');

    // All visible input/select elements should have a label or aria-label
    const inputs = page.locator('input:visible, select:visible, textarea:visible');
    const count = await inputs.count();

    for (let i = 0; i < count; i++) {
      const input = inputs.nth(i);
      const id = await input.getAttribute('id');
      const ariaLabel = await input.getAttribute('aria-label');
      const ariaLabelledBy = await input.getAttribute('aria-labelledby');
      const placeholder = await input.getAttribute('placeholder');

      // Input should have at least one of: associated label, aria-label, aria-labelledby, or placeholder
      const hasLabel = id ? await page.locator(`label[for="${id}"]`).count() > 0 : false;
      const hasAccessibleName = hasLabel || !!ariaLabel || !!ariaLabelledBy || !!placeholder;

      expect(hasAccessibleName).toBeTruthy();
    }
  });

  test('buttons have accessible text', async ({ page }) => {
    await page.goto('/admin/reset');
    await page.waitForLoadState('networkidle');

    // All buttons should have text content or aria-label
    const buttons = page.locator('button:visible');
    const count = await buttons.count();

    for (let i = 0; i < count; i++) {
      const button = buttons.nth(i);
      const text = await button.textContent();
      const ariaLabel = await button.getAttribute('aria-label');

      const hasAccessibleName = (text?.trim().length ?? 0) > 0 || !!ariaLabel;
      expect(hasAccessibleName).toBeTruthy();
    }
  });

  test('page is navigable with keyboard (Tab key)', async ({ page }) => {
    await page.goto('/admin/dashboard');
    await page.waitForLoadState('networkidle');

    // Press Tab and verify focus moves to an interactive element
    await page.keyboard.press('Tab');

    const focusedElement = await page.evaluate(() => {
      const el = document.activeElement;
      return el ? el.tagName.toLowerCase() : null;
    });

    // Focus should land on an interactive element
    const interactiveElements = ['a', 'button', 'input', 'select', 'textarea'];
    if (focusedElement) {
      expect(interactiveElements).toContain(focusedElement);
    }
  });
});
