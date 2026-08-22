import { expect, test, type Page } from '@playwright/test';

function infoPanel(page: Page) {
  return page.getByRole('complementary', { name: 'Pattern information' });
}

function chainDialog(page: Page) {
  return page.getByRole('dialog', { name: 'Foundation chain' });
}

function confirmDialog(page: Page) {
  return page.getByRole('alertdialog');
}

function chainLengthInput(page: Page) {
  return chainDialog(page).getByRole('spinbutton', { name: 'Chain length' });
}

function toolbarButton(page: Page, name: string | RegExp) {
  return page
    .getByRole('toolbar', { name: 'Pattern tools' })
    .getByRole('button', { name });
}

async function openChainDialog(page: Page) {
  await page.getByRole('button', { name: 'New Chain' }).click();
  await expect(chainDialog(page)).toBeVisible();
}

async function createFoundationChain(page: Page, length: number) {
  await openChainDialog(page);
  await chainLengthInput(page).fill(String(length));
  await chainDialog(page).getByRole('button', { name: 'Create chain' }).click();
}

async function acceptConfirm(page: Page, label: string) {
  const dialog = confirmDialog(page);
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: label }).click();
}

async function dismissConfirm(page: Page) {
  const dialog = confirmDialog(page);
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Cancel' }).click();
}

test.describe('App shell', () => {
  test('loads toolbar, info panel, and 3D canvas', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('toolbar', { name: 'Pattern tools' })).toBeVisible();
    await expect(infoPanel(page)).toBeVisible();
    await expect(page.locator('#main-canvas')).toBeVisible();
    await expect(page.getByRole('button', { name: 'New Chain' })).toBeVisible();
  });

  test('empty pattern shows guidance', async ({ page }) => {
    await page.goto('/');

    const panel = infoPanel(page);
    await expect(panel.locator('dt:text("Status") + dd')).toHaveText('No pattern');
    await expect(panel.getByText('Start with a foundation chain.')).toBeVisible();
    await expect(panel.getByText('Choose New Chain to start your foundation.')).toBeVisible();
  });

  test('skip link focuses the 3D canvas region', async ({ page }) => {
    await page.goto('/');

    await page.getByRole('link', { name: 'Skip to 3D canvas' }).focus();
    await page.keyboard.press('Enter');

    await expect(page.locator('#main-canvas')).toBeFocused();
  });
});

test.describe('Foundation chain', () => {
  test('creates a foundation chain', async ({ page }) => {
    await page.goto('/');

    await createFoundationChain(page, 3);

    const panel = infoPanel(page);
    await expect(panel.locator('dt:text("Status") + dd')).toHaveText('Foundation');
    await expect(panel.locator('dt:text("Stitches") + dd')).toHaveText('3');
    await expect(panel.locator('dt:text("Foundation") + dd')).toHaveText('3');
    await expect(panel.getByText('Foundation: ch 3')).toBeVisible();
  });

  test('dialog opens with default 10', async ({ page }) => {
    await page.goto('/');

    await openChainDialog(page);
    const input = chainLengthInput(page);

    await expect(input).toHaveValue('10');
    await expect(input).toBeFocused();
    await expect
      .poll(async () =>
        input.evaluate((element) => {
          const field = element as HTMLInputElement;
          return field.selectionStart === 0 && field.selectionEnd === 2;
        }),
      )
      .toBe(true);
  });

  test('dialog accepts numbers only', async ({ page }) => {
    await page.goto('/');

    await openChainDialog(page);
    const input = chainLengthInput(page);

    await input.fill('abc123def');
    await expect(input).toHaveValue('123');
  });

  test('stepper adjusts the chain length', async ({ page }) => {
    await page.goto('/');

    await openChainDialog(page);
    const dialog = chainDialog(page);
    const input = chainLengthInput(page);

    await dialog.getByRole('button', { name: 'Decrease chain length' }).click();
    await expect(input).toHaveValue('9');

    await dialog.getByRole('button', { name: 'Increase chain length' }).click();
    await dialog.getByRole('button', { name: 'Increase chain length' }).click();
    await expect(input).toHaveValue('11');
  });

  test('stepper disables at min and max bounds', async ({ page }) => {
    await page.goto('/');

    await openChainDialog(page);
    const dialog = chainDialog(page);
    const decrease = dialog.getByRole('button', { name: 'Decrease chain length' });
    const increase = dialog.getByRole('button', { name: 'Increase chain length' });

    await chainLengthInput(page).fill('1');
    await expect(decrease).toBeDisabled();

    await chainLengthInput(page).fill('500');
    await expect(increase).toBeDisabled();
  });

  test('arrow keys adjust the chain length', async ({ page }) => {
    await page.goto('/');

    await openChainDialog(page);
    const input = chainLengthInput(page);

    await input.press('ArrowDown');
    await expect(input).toHaveValue('9');

    await input.press('ArrowUp');
    await input.press('ArrowUp');
    await expect(input).toHaveValue('11');
  });

  test('Enter submits a valid chain length', async ({ page }) => {
    await page.goto('/');

    await openChainDialog(page);
    const input = chainLengthInput(page);
    await input.fill('4');
    await input.press('Enter');

    await expect(chainDialog(page)).toBeHidden();
    await expect(infoPanel(page).locator('dt:text("Foundation") + dd')).toHaveText('4');
  });

  test('shows error for out-of-range chain length', async ({ page }) => {
    await page.goto('/');

    await openChainDialog(page);
    const dialog = chainDialog(page);
    await chainLengthInput(page).fill('501');
    await dialog.getByRole('button', { name: 'Create chain' }).click();

    await expect(dialog.getByRole('alert')).toContainText(
      'Chain length must be between 1 and 500.',
    );
  });

  test('shows error when chain length is empty', async ({ page }) => {
    await page.goto('/');

    await openChainDialog(page);
    const dialog = chainDialog(page);
    await chainLengthInput(page).fill('');
    await dialog.getByRole('button', { name: 'Create chain' }).click();

    await expect(dialog.getByRole('alert')).toContainText('Enter a chain length.');
    await expect(chainDialog(page)).toBeVisible();
  });

  test('closes without creating a chain when cancelled', async ({ page }) => {
    await page.goto('/');

    await openChainDialog(page);
    await chainDialog(page).getByRole('button', { name: 'Cancel' }).click();

    await expect(chainDialog(page)).toBeHidden();
    await expect(infoPanel(page).locator('dt:text("Stitches") + dd')).toHaveText('0');
  });

  test('closes without creating a chain when Escape is pressed', async ({ page }) => {
    await page.goto('/');

    await openChainDialog(page);
    await page.keyboard.press('Escape');

    await expect(chainDialog(page)).toBeHidden();
    await expect(infoPanel(page).locator('dt:text("Stitches") + dd')).toHaveText('0');
  });

  test('declining New Chain reset keeps the existing pattern', async ({ page }) => {
    await page.goto('/');

    await createFoundationChain(page, 3);
    await page.getByRole('button', { name: 'New Chain' }).click();
    await dismissConfirm(page);

    await expect(chainDialog(page)).toBeHidden();
    await expect(infoPanel(page).locator('dt:text("Stitches") + dd')).toHaveText('3');
  });

  test('confirming New Chain reset replaces the pattern', async ({ page }) => {
    await page.goto('/');

    await createFoundationChain(page, 3);
    await page.getByRole('button', { name: 'New Chain' }).click();
    await acceptConfirm(page, 'Start new chain');
    await chainLengthInput(page).fill('5');
    await chainDialog(page).getByRole('button', { name: 'Create chain' }).click();

    const panel = infoPanel(page);
    await expect(panel.locator('dt:text("Stitches") + dd')).toHaveText('5');
    await expect(panel.locator('dt:text("Foundation") + dd')).toHaveText('5');
  });
});

test.describe('Single crochet rows', () => {
  test('starts the first working row after foundation', async ({ page }) => {
    await page.goto('/');

    await createFoundationChain(page, 3);
    await toolbarButton(page, 'New Row').click();

    const panel = infoPanel(page);
    await expect(panel.locator('dt:text("Status") + dd')).toHaveText('Row 1');
    await expect(panel.locator('dt:text("Row progress") + dd')).toHaveText('0/3');
  });

  test('completes MVP flow across a foundation row', async ({ page }) => {
    await page.goto('/');

    await createFoundationChain(page, 3);

    const panel = infoPanel(page);
    await toolbarButton(page, 'New Row').click();
    await expect(panel.locator('dt:text("Status") + dd')).toHaveText('Row 1');

    await toolbarButton(page, 'Add SC').click();
    await expect(panel.locator('dt:text("Stitches") + dd')).toHaveText('4');
    await expect(panel.locator('dt:text("Row progress") + dd')).toHaveText('1/3');
    await expect(panel.getByText('Row 1: sc in each st across (1 sc)')).toBeVisible();

    await toolbarButton(page, 'Add SC').click();
    await toolbarButton(page, 'Add SC').click();
    await expect(panel.locator('dt:text("Stitches") + dd')).toHaveText('6');
    await expect(panel.locator('dt:text("Row progress") + dd')).toHaveText('3/3');
    await expect(panel.getByText('Row 1: sc in each st across (3 sc)')).toBeVisible();
  });
});

test.describe('Pattern validation', () => {
  test('Add SC is disabled without a foundation chain', async ({ page }) => {
    await page.goto('/');

    await expect(toolbarButton(page, /Add SC/)).toBeDisabled();
  });

  test('New Row is disabled without a foundation chain', async ({ page }) => {
    await page.goto('/');

    await expect(toolbarButton(page, /New Row/)).toBeDisabled();
  });

  test('Add SC is disabled on the foundation row', async ({ page }) => {
    await page.goto('/');

    await createFoundationChain(page, 3);
    await expect(toolbarButton(page, /Add SC/)).toBeDisabled();
  });

  test('New Row is disabled while the current row is incomplete', async ({ page }) => {
    await page.goto('/');

    await createFoundationChain(page, 3);
    await toolbarButton(page, 'New Row').click();
    await toolbarButton(page, 'Add SC').click();

    await expect(toolbarButton(page, /New Row/)).toBeDisabled();
  });

  test('Reset is disabled with no pattern', async ({ page }) => {
    await page.goto('/');

    await expect(toolbarButton(page, /Reset/)).toBeDisabled();
  });
});

test.describe('Reset pattern', () => {
  test('reset clears an existing pattern', async ({ page }) => {
    await page.goto('/');

    await createFoundationChain(page, 2);

    const panel = infoPanel(page);
    await expect(panel.locator('dt:text("Stitches") + dd')).toHaveText('2');

    await page.getByRole('button', { name: 'Reset' }).click();
    await acceptConfirm(page, 'Reset pattern');
    await expect(panel.locator('dt:text("Status") + dd')).toHaveText('No pattern');
    await expect(panel.getByText('Start with a foundation chain.')).toBeVisible();
  });

  test('declining reset keeps the existing pattern', async ({ page }) => {
    await page.goto('/');

    await createFoundationChain(page, 2);

    const panel = infoPanel(page);
    await page.getByRole('button', { name: 'Reset' }).click();
    await dismissConfirm(page);

    await expect(panel.locator('dt:text("Status") + dd')).toHaveText('Foundation');
    await expect(panel.locator('dt:text("Stitches") + dd')).toHaveText('2');
  });
});
