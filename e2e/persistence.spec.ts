import { expect, test } from '@playwright/test';
import {
  Pattern,
  StitchType,
  createSavedPatternFile,
  resetIdCounter,
  serializePatternFile,
} from '@engine/index';
import {
  acceptConfirm,
  createFoundationChain,
  dismissConfirm,
  infoPanel,
  startRowOne,
  toolbarButton,
} from './helpers';

function buildPatternJson(setup: (pattern: Pattern) => void): string {
  resetIdCounter();
  const pattern = new Pattern();
  setup(pattern);
  return serializePatternFile(
    createSavedPatternFile(pattern.getSnapshot(), {
      yarnColor: '#d98952',
      selectedStitchType: StitchType.SINGLE_CROCHET,
    }),
  );
}

test.describe('Pattern persistence', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('crochet-3d-onboarding-seen', 'true');
    });
  });

  async function startFresh(page: import('@playwright/test').Page) {
    await page.goto('/');
    await page.evaluate(() => window.localStorage.removeItem('crochet-3d-autosave'));
    await page.reload();
  }

  test('Save pattern downloads a JSON file', async ({ page }) => {
    await startFresh(page);
    await startRowOne(page, 3);
    await toolbarButton(page, /Add single crochet/).click();

    const downloadPromise = page.waitForEvent('download');
    await toolbarButton(page, 'Save pattern').click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toMatch(/crochet-pattern-.*\.json$/);
    await expect(infoPanel(page).getByText('Pattern file downloaded.')).toBeVisible();
  });

  test('Load pattern replaces the current work after confirmation', async ({ page }) => {
    await startFresh(page);
    await createFoundationChain(page, 5);

    const json = buildPatternJson((pattern) => {
      pattern.addFoundationChain(2);
      pattern.startNewRow();
      pattern.addSingleCrochet();
      pattern.addSingleCrochet();
    });

    await page.evaluate((contents) => {
      const input = document.querySelector('input[type="file"][accept*="json"]') as HTMLInputElement;
      if (!input) {
        throw new Error('Missing pattern file input');
      }
      const file = new File([contents], 'pattern.json', { type: 'application/json' });
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      input.files = dataTransfer.files;
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }, json);

    await acceptConfirm(page, 'Load pattern');

    const panel = infoPanel(page);
    await expect(panel.locator('dt:text-is("Stitches") + dd')).toHaveText('4');
    await expect(panel.getByText('Foundation: ch 2')).toBeVisible();
    await expect(panel.getByText('Row 1: work across (2 sc)')).toBeVisible();
    await expect(panel.getByText('Pattern loaded.')).toBeVisible();
  });

  test('Load pattern is cancelled without replacing work', async ({ page }) => {
    await startFresh(page);
    await createFoundationChain(page, 5);

    const json = buildPatternJson((pattern) => {
      pattern.addFoundationChain(2);
      pattern.startNewRow();
      pattern.addSingleCrochet();
      pattern.addSingleCrochet();
    });

    await page.evaluate((contents) => {
      const input = document.querySelector('input[type="file"][accept*="json"]') as HTMLInputElement;
      const file = new File([contents], 'pattern.json', { type: 'application/json' });
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      input.files = dataTransfer.files;
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }, json);

    await dismissConfirm(page);
    await expect(infoPanel(page).locator('dt:text-is("Stitches") + dd')).toHaveText('5');
  });

  test('Invalid pattern file shows an error', async ({ page }) => {
    await startFresh(page);

    await page.evaluate(() => {
      const input = document.querySelector('input[type="file"][accept*="json"]') as HTMLInputElement;
      const file = new File(['{ invalid'], 'pattern.json', { type: 'application/json' });
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      input.files = dataTransfer.files;
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });

    await expect(infoPanel(page).getByText(/Could not load pattern file/)).toBeVisible();
  });

  test('Copy instructions places pattern text on the clipboard', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await startFresh(page);
    await createFoundationChain(page, 3);

    await toolbarButton(page, 'Copy instructions').click();
    await expect(infoPanel(page).getByText('Instructions copied to clipboard.')).toBeVisible();

    const clipboardText = await page.evaluate(async () => navigator.clipboard.readText());
    expect(clipboardText).toContain('Foundation: ch 3');
  });

  test('Export instructions downloads a markdown file', async ({ page }) => {
    await startFresh(page);
    await createFoundationChain(page, 3);

    const downloadPromise = page.waitForEvent('download');
    await toolbarButton(page, 'Export instructions').click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toMatch(/crochet-instructions-.*\.md$/);
    await expect(infoPanel(page).getByText('Instructions exported.')).toBeVisible();
  });

  test('Pattern restores from autosave after refresh', async ({ page }) => {
    await page.goto('/');
    await startRowOne(page, 3);
    await toolbarButton(page, /Add single crochet/).click();

    await page.waitForFunction(() => window.localStorage.getItem('crochet-3d-autosave') !== null);
    await page.reload();
    await expect(infoPanel(page).locator('dt:text-is("Stitches") + dd')).toHaveText('4');
    await expect(infoPanel(page).getByText('Restored your last pattern.')).toBeVisible();
  });
});
