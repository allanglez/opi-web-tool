import { test as base } from '@playwright/test';
import { ApiHelper } from './api';

/**
 * Extended Playwright test fixture with API helper.
 * All E2E tests use AUTH_MOCK=true on the API side.
 * The frontend auth guard calls /api/v1/me which the mock guard auto-resolves.
 */
export const test = base.extend<{ api: ApiHelper }>({
  api: async ({ request }, use) => {
    const api = new ApiHelper(request);
    await use(api);
  },
});

export { expect } from '@playwright/test';

/**
 * Known mock user IDs from seed data.
 * These must match the users seeded in prisma/seed.ts.
 */
export const USERS = {
  ADMIN: 1,
  COORDINATOR: 2,
  EVALUATOR_1: 3,
  EVALUATOR_2: 4,
} as const;

/**
 * Wait helper for polling-based UI updates.
 */
export async function waitForText(page: import('@playwright/test').Page, text: string, timeout = 10000) {
  await page.getByText(text).waitFor({ state: 'visible', timeout });
}
