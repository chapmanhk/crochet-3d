import { expect, test } from '@playwright/test';
import {
  createFoundationChain,
  gotoApp,
  infoPanel,
  loadTemplate,
  toolbarButton,
} from './helpers';

test.describe('Scale preview', () => {
  test('Large pattern renders without blocking the toolbar', async ({ page }) => {
    await gotoApp(page);
    await loadTemplate(page, 'Large swatch');
    await expect(toolbarButton(page, 'Save pattern')).toBeEnabled();
    await expect(page.getByText(/Stitches/i).first()).toBeVisible();
    await expect(infoPanel(page)).toContainText('120');
  });

  test('Drape preview can be toggled on and off', async ({ page }) => {
    await gotoApp(page);
    await createFoundationChain(page, 6);
    await toolbarButton(page, 'New Row').click();

    const toggle = page.getByTestId('drape-preview-toggle');
    await expect(toggle).toHaveAttribute('aria-pressed', 'false');

    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-pressed', 'true');
    await expect(toggle).toHaveText('Drape preview on');

    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-pressed', 'false');
    await expect(toggle).toHaveText('Drape preview off');
  });

  test('Attachment target is announced in the info panel', async ({ page }) => {
    await gotoApp(page);
    await createFoundationChain(page, 6);
    await toolbarButton(page, 'New Row').click();

    await expect(page.getByTestId('attachment-target-description')).toContainText(
      'attaches to stitch',
    );
  });
});
