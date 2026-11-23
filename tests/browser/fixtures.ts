import { test as base, expect } from '@playwright/test';

// Les ROMs personnelles du workspace ne sont jamais chargées par la suite CI.
export const test = base.extend({
  page: async ({ page }, use) => {
    await page.route('**/__local-roms/**', (route) =>
      route.fulfill({
        status: 404,
        body: 'No personal ROMs in automated tests',
      }),
    );
    await use(page);
  },
});
export { expect };
