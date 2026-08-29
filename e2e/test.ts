import { test as base, expect } from '@playwright/test';
import { ONBOARDING_KEY } from './helpers';

export const test = base.extend({
  page: async ({ page }, use) => {
    await page.addInitScript(() => {
      window.localStorage.setItem(ONBOARDING_KEY, 'true');
    });
    await use(page);
  },
});

export { expect };
