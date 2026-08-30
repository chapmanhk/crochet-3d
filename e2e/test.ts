import { test as base, expect } from '@playwright/test';
import { ONBOARDING_KEY } from './helpers';

export const test = base.extend({
  page: async ({ page }, use) => {
    await page.addInitScript((onboardingKey) => {
      window.localStorage.setItem(onboardingKey, 'true');
    }, ONBOARDING_KEY);
    await use(page);
  },
});

export { expect };
