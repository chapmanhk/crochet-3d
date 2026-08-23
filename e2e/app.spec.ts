import { expect, test } from '@playwright/test';
import {
  acceptConfirm,
  attachmentPoint,
  completeRow,
  createFoundationChain,
  dismissConfirm,
  infoPanel,
  MAX_CHAIN_LENGTH,
  MIN_CHAIN_LENGTH,
  openChainDialog,
  chainDialog,
  chainLengthInput,
  startRowOne,
  toolbarButton,
} from './helpers';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem('crochet-3d-onboarding-seen', 'true');
  });
});

test.describe('App shell', () => {
  test('App loads with toolbar, info panel, and 3D canvas', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('toolbar', { name: 'Pattern tools' })).toBeVisible();
    await expect(infoPanel(page)).toBeVisible();
    await expect(page.locator('#main-canvas')).toBeVisible();
    await expect(page.getByRole('button', { name: 'New Chain' })).toBeVisible();
  });

  test('Empty pattern shows guidance', async ({ page }) => {
    await page.goto('/');

    const panel = infoPanel(page);
    await expect(panel.locator('dt:text("Status") + dd')).toHaveText('No pattern');
    await expect(panel.getByText('Start with a foundation chain.')).toBeVisible();
    await expect(panel.getByText('Choose New Chain to start your foundation.')).toBeVisible();
  });

  test('Skip link focuses the 3D canvas region', async ({ page }) => {
    await page.goto('/');

    await page.getByRole('link', { name: 'Skip to 3D canvas' }).focus();
    await page.keyboard.press('Enter');

    await expect(page.locator('#main-canvas')).toBeFocused();
  });

  test('Foundation chain shows next-step guidance', async ({ page }) => {
    await page.goto('/');

    await createFoundationChain(page, 3);
    await expect(infoPanel(page).getByText('Choose New Row to begin the first working row.')).toBeVisible();
  });
});

test.describe('Foundation chain', () => {
  test('Create a foundation chain', async ({ page }) => {
    await page.goto('/');

    await createFoundationChain(page, 3);

    const panel = infoPanel(page);
    await expect(panel.locator('dt:text("Status") + dd')).toHaveText('Foundation');
    await expect(panel.locator('dt:text("Stitches") + dd')).toHaveText('3');
    await expect(panel.locator('dt:text("Foundation") + dd')).toHaveText('3');
    await expect(panel.getByText('Foundation: ch 3')).toBeVisible();
    await expect(panel.getByText('Choose New Row to begin the first working row.')).toBeVisible();
    await expect(panel.locator('dt:text("Row progress") + dd')).toHaveText('—');
  });

  test('Chain length dialog opens with a default of 10', async ({ page }) => {
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

  test('Chain length can be typed directly', async ({ page }) => {
    await page.goto('/');

    await openChainDialog(page);
    const input = chainLengthInput(page);

    await input.fill('abc123def');
    await expect(input).toHaveValue('123');
  });

  test('Chain length can be adjusted with stepper buttons', async ({ page }) => {
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

  test('Stepper buttons disable at min and max bounds', async ({ page }) => {
    await page.goto('/');

    await openChainDialog(page);
    const dialog = chainDialog(page);
    const decrease = dialog.getByRole('button', { name: 'Decrease chain length' });
    const increase = dialog.getByRole('button', { name: 'Increase chain length' });

    await chainLengthInput(page).fill(String(MIN_CHAIN_LENGTH));
    await expect(decrease).toBeDisabled();

    await chainLengthInput(page).fill(String(MAX_CHAIN_LENGTH));
    await expect(increase).toBeDisabled();
  });

  test('Chain length can be adjusted with arrow keys', async ({ page }) => {
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

  test('Out-of-range chain length shows an error in the dialog', async ({ page }) => {
    await page.goto('/');

    await openChainDialog(page);
    const dialog = chainDialog(page);
    await chainLengthInput(page).fill(String(MAX_CHAIN_LENGTH + 1));
    await dialog.getByRole('button', { name: 'Create foundation chain' }).click();

    await expect(dialog.getByRole('alert')).toContainText(
      `Chain length must be between ${MIN_CHAIN_LENGTH} and ${MAX_CHAIN_LENGTH}.`,
    );
  });

  test('Empty chain length shows an error in the dialog', async ({ page }) => {
    await page.goto('/');

    await openChainDialog(page);
    const dialog = chainDialog(page);
    await chainLengthInput(page).fill('');
    await dialog.getByRole('button', { name: 'Create foundation chain' }).click();

    await expect(dialog.getByRole('alert')).toContainText('Enter a chain length.');
    await expect(chainDialog(page)).toBeVisible();
  });

  test('Cancel closes the chain dialog without creating a chain', async ({ page }) => {
    await page.goto('/');

    await openChainDialog(page);
    await chainDialog(page).getByRole('button', { name: 'Cancel' }).click();

    await expect(chainDialog(page)).toBeHidden();
    await expect(infoPanel(page).locator('dt:text("Stitches") + dd')).toHaveText('0');
  });

  test('Escape closes the chain dialog without creating a chain', async ({ page }) => {
    await page.goto('/');

    await openChainDialog(page);
    await page.keyboard.press('Escape');

    await expect(chainDialog(page)).toBeHidden();
    await expect(infoPanel(page).locator('dt:text("Stitches") + dd')).toHaveText('0');
  });

  test('Declining New Chain reset keeps the existing pattern', async ({ page }) => {
    await page.goto('/');

    await createFoundationChain(page, 3);
    await page.getByRole('button', { name: 'New Chain' }).click();
    await dismissConfirm(page);

    await expect(chainDialog(page)).toBeHidden();
    await expect(infoPanel(page).locator('dt:text("Stitches") + dd')).toHaveText('3');
  });

  test('Confirming New Chain reset replaces the pattern', async ({ page }) => {
    await page.goto('/');

    await createFoundationChain(page, 3);
    await page.getByRole('button', { name: 'New Chain' }).click();
    await acceptConfirm(page, 'Start new chain');
    await chainLengthInput(page).fill('5');
    await chainDialog(page).getByRole('button', { name: 'Create foundation chain' }).click();

    const panel = infoPanel(page);
    await expect(panel.locator('dt:text("Stitches") + dd')).toHaveText('5');
    await expect(panel.locator('dt:text("Foundation") + dd')).toHaveText('5');
  });
});

test.describe('Single crochet rows', () => {
  test('Start the first working row after foundation', async ({ page }) => {
    await page.goto('/');

    await createFoundationChain(page, 3);
    await toolbarButton(page, 'New Row').click();

    const panel = infoPanel(page);
    await expect(panel.locator('dt:text("Status") + dd')).toHaveText('Row 1');
    await expect(panel.locator('dt:text("Row progress") + dd')).toHaveText('0/3');
  });

  test('Add single crochet stitches across a row', async ({ page }) => {
    await page.goto('/');

    await createFoundationChain(page, 3);

    const panel = infoPanel(page);
    await toolbarButton(page, 'New Row').click();
    await expect(panel.locator('dt:text("Status") + dd')).toHaveText('Row 1');

    await toolbarButton(page, 'Add SC').click();
    await expect(panel.locator('dt:text("Stitches") + dd')).toHaveText('4');
    await expect(panel.locator('dt:text("Row progress") + dd')).toHaveText('1/3');
    await expect(panel.getByText('Row 1: sc in each st across (1 sc)')).toBeVisible();
    await expect(panel.getByText('Place 2 more single crochet stitches on row 1.')).toBeVisible();

    await completeRow(page, 2);
    await expect(panel.locator('dt:text("Stitches") + dd')).toHaveText('6');
    await expect(panel.locator('dt:text("Row progress") + dd')).toHaveText('3/3');
    await expect(panel.getByText('Row 1: sc in each st across (3 sc)')).toBeVisible();
    await expect(panel.getByText('Row 1 is complete. Choose New Row to continue.')).toBeVisible();
  });

  test('Work a second row after completing the first', async ({ page }) => {
    await page.goto('/');

    await createFoundationChain(page, 3);
    await toolbarButton(page, 'New Row').click();
    await completeRow(page, 3);

    const panel = infoPanel(page);
    await toolbarButton(page, 'New Row').click();
    await expect(panel.locator('dt:text("Status") + dd')).toHaveText('Row 2');
    await expect(panel.locator('dt:text("Row progress") + dd')).toHaveText('0/3');

    await toolbarButton(page, 'Add SC').click();
    await expect(panel.locator('dt:text("Stitches") + dd')).toHaveText('7');
    await expect(panel.getByText('Row 2: sc in each st across (1 sc)')).toBeVisible();
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

  test('Disabled toolbar buttons expose reasons to assistive technology', async ({ page }) => {
    await page.goto('/');

    const addSc = toolbarButton(page, 'Add SC');
    await expect(addSc).toBeDisabled();
    await expect(addSc).toHaveAttribute('aria-describedby', /.+/);
  });
});

test.describe('Click-to-place single crochet', () => {
  test('Next attachment point is available when SC can be placed', async ({ page }) => {
    await page.goto('/');
    await startRowOne(page, 3);

    await expect(attachmentPoint(page)).toBeVisible();
  });

  test('Clicking the attachment point places the next SC', async ({ page }) => {
    await page.goto('/');
    await startRowOne(page, 3);

    await attachmentPoint(page).click();

    const panel = infoPanel(page);
    await expect(panel.locator('dt:text("Stitches") + dd')).toHaveText('4');
    await expect(panel.locator('dt:text("Row progress") + dd')).toHaveText('1/3');
  });

  test('No attachment point when SC cannot be placed', async ({ page }) => {
    await page.goto('/');

    await expect(attachmentPoint(page)).toHaveCount(0);
  });

  test('Click-to-place matches Add SC toolbar behavior', async ({ page }) => {
    await page.goto('/');
    await startRowOne(page, 3);

    await attachmentPoint(page).click();
    await attachmentPoint(page).click();
    await attachmentPoint(page).click();

    await expect(infoPanel(page).locator('dt:text("Row progress") + dd')).toHaveText('3/3');
  });
});

test.describe('Pattern editing', () => {
  test('Undo removes the last placed single crochet', async ({ page }) => {
    await page.goto('/');
    await startRowOne(page, 3);
    await toolbarButton(page, 'Add SC').click();
    await toolbarButton(page, 'Add SC').click();

    await toolbarButton(page, 'Undo').click();

    const panel = infoPanel(page);
    await expect(panel.locator('dt:text("Stitches") + dd')).toHaveText('4');
    await expect(panel.locator('dt:text("Row progress") + dd')).toHaveText('1/3');
  });

  test('Redo restores an undone placement', async ({ page }) => {
    await page.goto('/');
    await startRowOne(page, 3);
    await toolbarButton(page, 'Add SC').click();
    await toolbarButton(page, 'Add SC').click();

    await toolbarButton(page, 'Undo').click();
    await toolbarButton(page, 'Redo').click();

    await expect(infoPanel(page).locator('dt:text("Stitches") + dd')).toHaveText('5');
  });

  test('Undo is disabled with nothing to undo', async ({ page }) => {
    await page.goto('/');

    await expect(toolbarButton(page, /Undo/)).toBeDisabled();
  });

  test('Reset clears undo and redo history', async ({ page }) => {
    await page.goto('/');
    await startRowOne(page, 3);
    await toolbarButton(page, 'Add SC').click();
    await toolbarButton(page, 'Undo').click();

    await page.getByRole('button', { name: 'Reset' }).click();
    await acceptConfirm(page, 'Reset pattern');

    await expect(toolbarButton(page, /Undo/)).toBeDisabled();
  });
});

test.describe('Onboarding', () => {
  test('First-run onboarding explains how to start a pattern', async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.removeItem('crochet-3d-onboarding-seen');
    });
    await page.goto('/');

    await expect(page.getByRole('dialog')).toContainText('foundation chain');
    await page.getByRole('button', { name: 'Get started' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });
});

test.describe('Responsive panels', () => {
  test('Info panel can be collapsed on narrow viewports', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 900 });
    await page.goto('/');

    const toggle = infoPanel(page).getByRole('button', { name: 'Hide panel' });
    await expect(toggle).toBeVisible();
    await toggle.click();
    await expect(infoPanel(page).getByRole('button', { name: 'Show panel' })).toBeVisible();
    await expect(infoPanel(page).locator('dt:text("Status")')).toBeHidden();
  });
});

test.describe('Reset pattern', () => {
  test('Reset clears an existing pattern', async ({ page }) => {
    await page.goto('/');

    await createFoundationChain(page, 2);

    const panel = infoPanel(page);
    await expect(panel.locator('dt:text("Stitches") + dd')).toHaveText('2');

    await page.getByRole('button', { name: 'Reset' }).click();
    await acceptConfirm(page, 'Reset pattern');
    await expect(panel.locator('dt:text("Status") + dd')).toHaveText('No pattern');
    await expect(panel.locator('dt:text("Stitches") + dd')).toHaveText('0');
    await expect(panel.getByText('Start with a foundation chain.')).toBeVisible();
  });

  test('Declining reset keeps the existing pattern', async ({ page }) => {
    await page.goto('/');

    await createFoundationChain(page, 2);

    const panel = infoPanel(page);
    await page.getByRole('button', { name: 'Reset' }).click();
    await dismissConfirm(page);

    await expect(panel.locator('dt:text("Status") + dd')).toHaveText('Foundation');
    await expect(panel.locator('dt:text("Stitches") + dd')).toHaveText('2');
  });
});
