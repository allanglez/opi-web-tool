import { test, expect, USERS } from './helpers/fixtures';

/**
 * E2E: Admin Cycle Setup + Reset Flow
 * Tests admin pages: cycle setup, ingestion status, reports, retention config,
 * and the annual reset workflow with confirmation dialog.
 *
 * Requires: AUTH_MOCK=true, seeded database with admin user.
 */
test.describe('Admin Cycle Setup + Reset Flow', () => {
  test.describe.configure({ mode: 'serial' });

  test('admin can access dashboard', async ({ page }) => {
    await page.goto('/admin/dashboard');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('h1')).toContainText(/admin|dashboard/i);
  });

  test('admin can access cycle setup page', async ({ page }) => {
    await page.goto('/admin/cycle');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('h1')).toContainText(/cycle/i);
    await expect(page.locator('main')).toBeVisible();
  });

  test('admin can access ingestion status page', async ({ page }) => {
    await page.goto('/admin/ingestion');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('h1')).toContainText(/ingestion/i);
    await expect(page.locator('main')).toBeVisible();
  });

  test('admin can access class inclusion page', async ({ page }) => {
    await page.goto('/admin/cycle/classes');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('h1')).toContainText(/class/i);
    await expect(page.locator('main')).toBeVisible();
  });

  test('admin can access audit log page', async ({ page }) => {
    await page.goto('/admin/audit-log');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('h1')).toContainText(/audit/i);
    await expect(page.locator('main')).toBeVisible();
  });

  test('admin can access reports export page', async ({ page }) => {
    await page.goto('/admin/reports');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('h1')).toContainText(/report|export/i);
    await expect(page.locator('main')).toBeVisible();
  });

  test('admin can access retention config page', async ({ page }) => {
    await page.goto('/admin/retention');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('h1')).toContainText(/retention/i);
    await expect(page.locator('main')).toBeVisible();
  });

  test('admin can access reset page', async ({ page }) => {
    await page.goto('/admin/reset');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('h1')).toContainText(/reset/i);
    await expect(page.locator('main')).toBeVisible();
  });

  test('reset page shows warning banner', async ({ page }) => {
    await page.goto('/admin/reset');
    await page.waitForLoadState('networkidle');

    // Should display a caution/warning about destructive operation
    const warning = page.locator('text=/caution|warning|destructive|irreversible/i').first();
    await expect(warning).toBeVisible();
  });

  test('reset page requires typed confirmation', async ({ page }) => {
    await page.goto('/admin/reset');
    await page.waitForLoadState('networkidle');

    // Find the reset button
    const resetButton = page.locator('button:has-text("Reset Cycle")').first();
    if (await resetButton.isVisible()) {
      await resetButton.click();

      // Confirmation dialog should appear
      const dialog = page.locator('text=/confirm|type/i').first();
      await expect(dialog).toBeVisible({ timeout: 5000 });

      // The confirm button should be disabled until text is typed
      const confirmBtn = page.locator('button:has-text("Confirm Reset")').first();
      if (await confirmBtn.isVisible()) {
        await expect(confirmBtn).toBeDisabled();
      }

      // Cancel the dialog
      const cancelBtn = page.locator('button:has-text("Cancel")').first();
      if (await cancelBtn.isVisible()) {
        await cancelBtn.click();
      }
    }
  });

  test('retention config API returns cycle settings', async ({ api }) => {
    const res = await api.getRetentionConfig(USERS.ADMIN);
    expect(res.ok()).toBeTruthy();

    const configs = await res.json();
    expect(Array.isArray(configs)).toBeTruthy();

    if (configs.length > 0) {
      const config = configs[0];
      expect(config).toHaveProperty('cycleId');
      expect(config).toHaveProperty('cycleName');
      expect(config).toHaveProperty('retentionDays');
      expect(config).toHaveProperty('isActive');
      expect(config).toHaveProperty('endsOn');
      expect(config).toHaveProperty('dataExpiry');
    }
  });

  test('retention config can be updated via API', async ({ api }) => {
    const configRes = await api.getRetentionConfig(USERS.ADMIN);
    const configs = await configRes.json();

    if (configs.length === 0) {
      test.skip(true, 'No cycles to configure retention for');
      return;
    }

    const cycleId = configs[0].cycleId;

    // Set retention to 365 days
    const updateRes = await api.updateRetentionConfig(
      { cycleId, retentionDays: 365 },
      USERS.ADMIN,
    );
    expect(updateRes.ok()).toBeTruthy();

    // Verify the update
    const verifyRes = await api.getRetentionConfig(USERS.ADMIN);
    const updated = await verifyRes.json();
    const updatedCycle = updated.find((c: { cycleId: number }) => c.cycleId === cycleId);
    expect(updatedCycle?.retentionDays).toBe(365);

    // Set back to null (no limit)
    const resetRes = await api.updateRetentionConfig(
      { cycleId, retentionDays: null },
      USERS.ADMIN,
    );
    expect(resetRes.ok()).toBeTruthy();
  });

  test('reset status API returns idle when no reset in progress', async ({ api }) => {
    const res = await api.getResetStatus(USERS.ADMIN);
    expect(res.ok()).toBeTruthy();

    const status = await res.json();
    expect(status).toHaveProperty('status');
    expect(['idle', 'completed', 'failed']).toContain(status.status);
  });

  test('non-admin cannot access admin pages', async ({ api }) => {
    // Evaluator should not be able to access retention config
    const res = await api.getRetentionConfig(USERS.EVALUATOR_1);
    expect(res.status()).toBe(403);
  });
});
