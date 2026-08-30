import { expect, test } from './test';
import {
  clickToolbarButton,
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

  test('Attachment target is announced in the info panel', async ({ page }) => {
    await gotoApp(page);
    await createFoundationChain(page, 6);
    await clickToolbarButton(page, 'New Row');

    await expect(page.getByTestId('attachment-target-description')).toContainText(
      'attaches to stitch',
    );
  });
});
