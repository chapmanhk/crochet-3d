import { expect, test, type Page } from '@playwright/test';

function infoPanel(page: Page) {
  return page.getByRole('complementary', { name: 'Pattern information' });
}

async function acceptNextPrompt(page: Page, value: string) {
  page.once('dialog', async (dialog) => {
    expect(dialog.type()).toBe('prompt');
    await dialog.accept(value);
  });
}

async function acceptNextConfirm(page: Page) {
  page.once('dialog', async (dialog) => {
    expect(dialog.type()).toBe('confirm');
    await dialog.accept();
  });
}

test.describe('crochet-3d app', () => {
  test('loads toolbar, info panel, and 3D canvas', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('toolbar', { name: 'Pattern tools' })).toBeVisible();
    await expect(infoPanel(page)).toBeVisible();
    await expect(page.locator('#main-canvas')).toBeVisible();
    await expect(page.getByRole('button', { name: 'New Chain' })).toBeVisible();
    await expect(page.getByText('Start with a foundation chain.')).toBeVisible();
  });

  test('completes MVP flow: chain, new row, add single crochet', async ({ page }) => {
    await page.goto('/');

    await acceptNextPrompt(page, '3');
    await page.getByRole('button', { name: 'New Chain' }).click();

    const panel = infoPanel(page);
    await expect(panel.locator('dt:text("Status") + dd')).toHaveText('Foundation');
    await expect(panel.locator('dt:text("Stitches") + dd')).toHaveText('3');
    await expect(panel.locator('dt:text("Foundation") + dd')).toHaveText('3');
    await expect(panel.getByText('Foundation: ch 3')).toBeVisible();

    await page.getByRole('button', { name: 'New Row' }).click();
    await expect(panel.locator('dt:text("Status") + dd')).toHaveText('Row 1');

    await page.getByRole('button', { name: 'Add SC' }).click();
    await expect(panel.locator('dt:text("Stitches") + dd')).toHaveText('4');
    await expect(panel.getByText('Row 1: sc in each st across (1 sc)')).toBeVisible();

    await page.getByRole('button', { name: 'Add SC' }).click();
    await page.getByRole('button', { name: 'Add SC' }).click();
    await expect(panel.locator('dt:text("Stitches") + dd')).toHaveText('6');
    await expect(panel.getByText('Row 1: sc in each st across (3 sc)')).toBeVisible();
  });

  test('shows error when adding single crochet without foundation', async ({ page }) => {
    await page.goto('/');

    await page.getByRole('button', { name: 'Add SC' }).click();

    const alert = page.getByRole('alert');
    await expect(alert).toContainText('Add a foundation chain before placing single crochet stitches.');
  });

  test('shows error for invalid chain length input', async ({ page }) => {
    await page.goto('/');

    await acceptNextPrompt(page, 'abc');
    await page.getByRole('button', { name: 'New Chain' }).click();

    const alert = page.getByRole('alert');
    await expect(alert).toContainText('Enter a whole number for chain length.');
  });

  test('shows error when starting a new row before the current row is complete', async ({
    page,
  }) => {
    await page.goto('/');

    await acceptNextPrompt(page, '3');
    await page.getByRole('button', { name: 'New Chain' }).click();
    await page.getByRole('button', { name: 'New Row' }).click();
    await page.getByRole('button', { name: 'Add SC' }).click();
    await page.getByRole('button', { name: 'New Row' }).click();

    const alert = page.getByRole('alert');
    await expect(alert).toContainText('Complete row 1 before starting a new row');
  });

  test('reset clears the pattern', async ({ page }) => {
    await page.goto('/');

    await acceptNextPrompt(page, '2');
    await page.getByRole('button', { name: 'New Chain' }).click();

    const panel = infoPanel(page);
    await expect(panel.locator('dt:text("Stitches") + dd')).toHaveText('2');

    await acceptNextConfirm(page);
    await page.getByRole('button', { name: 'Reset' }).click();
    await expect(panel.locator('dt:text("Status") + dd')).toHaveText('No pattern');
    await expect(panel.getByText('Start with a foundation chain.')).toBeVisible();
  });
});
