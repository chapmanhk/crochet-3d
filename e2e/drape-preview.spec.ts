import { expect, test } from './test';
import {
  clickToolbarButton,
  createFoundationChain,
  drapePreviewToggle,
  gotoApp,
  toggleDrapePreview,
} from './helpers';

test.describe('Drape preview yarn constraints', () => {
  test('Drape preview with yarn constraints remains toggleable', async ({ page }) => {
    await gotoApp(page);
    await createFoundationChain(page, 6);
    await clickToolbarButton(page, 'New Row');

    await expect(drapePreviewToggle(page)).toHaveAttribute('aria-pressed', 'false');
    await toggleDrapePreview(page, true);
    await toggleDrapePreview(page, false);
  });
});
