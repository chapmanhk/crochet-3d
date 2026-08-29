import { expect, type Locator, type Page } from '@playwright/test';

export const AUTOSAVE_KEY = 'crochet-3d-autosave';
export const ONBOARDING_KEY = 'crochet-3d-onboarding-seen';

export async function clearAppStorage(page: Page) {
  await page.evaluate(
    ({ autosaveKey, onboardingKey }) => {
      window.localStorage.setItem(onboardingKey, 'true');
      window.localStorage.removeItem(autosaveKey);
    },
    { autosaveKey: AUTOSAVE_KEY, onboardingKey: ONBOARDING_KEY },
  );
}

export async function waitForAppReady(page: Page) {
  await page.getByRole('toolbar', { name: 'Pattern tools' }).waitFor({ state: 'visible' });
  const loading = page.getByText('Loading 3D preview…');
  if (await loading.isVisible().catch(() => false)) {
    await loading.waitFor({ state: 'hidden', timeout: 15_000 });
  }
}

export async function gotoApp(page: Page, options: { clearAutosave?: boolean } = {}) {
  const { clearAutosave = true } = options;
  await page.goto('/');
  if (clearAutosave) {
    await clearAppStorage(page);
    await page.reload();
  }
  await waitForAppReady(page);
}

export function infoPanel(page: Page) {
  return page.getByRole('complementary', { name: 'Pattern information' });
}

export function chainDialog(page: Page) {
  return page.getByRole('dialog', { name: 'Start foundation' });
}

export function confirmDialog(page: Page) {
  return page.getByRole('alertdialog');
}

export function chainLengthInput(page: Page) {
  return chainDialog(page).getByRole('spinbutton');
}

export function toolbar(page: Page) {
  return page.getByRole('toolbar', { name: 'Pattern tools' });
}

export function toolbarButton(page: Page, name: string | RegExp): Locator {
  return toolbar(page).getByRole('button', { name });
}

export async function clickToolbarButton(page: Page, name: string | RegExp) {
  await expect(async () => {
    const button = toolbarButton(page, name);
    await button.waitFor({ state: 'visible', timeout: 2_000 });
    await button.click({ timeout: 2_000 });
  }).toPass({ timeout: 15_000 });
}

export async function openChainDialog(page: Page) {
  await clickToolbarButton(page, 'New foundation');
  await expect(chainDialog(page)).toBeVisible();
}

export async function createFoundationChain(page: Page, length: number) {
  await openChainDialog(page);
  await chainLengthInput(page).fill(String(length));
  await chainDialog(page).getByRole('button', { name: 'Create foundation chain' }).click();
  await waitForAppReady(page);
}

export async function acceptConfirm(page: Page, label: string) {
  const dialog = confirmDialog(page);
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: label }).click();
  await waitForAppReady(page);
}

export async function dismissConfirm(page: Page) {
  const dialog = confirmDialog(page);
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Cancel' }).click();
  await waitForAppReady(page);
}

export { MIN_CHAIN_LENGTH, MAX_CHAIN_LENGTH } from '../src/engine/Pattern';

export async function completeRow(page: Page, stitchCount: number) {
  for (let index = 0; index < stitchCount; index += 1) {
    await clickToolbarButton(page, /Add single crochet/);
  }
}

export async function selectStitchType(page: Page, type: 'SC' | 'HDC' | 'DC') {
  const labels: Record<'SC' | 'HDC' | 'DC', string> = {
    SC: 'Single Crochet',
    HDC: 'Half Double Crochet',
    DC: 'Double Crochet',
  };

  await page
    .getByRole('group', { name: 'Stitch type' })
    .getByRole('button', { name: labels[type], exact: true })
    .click();
}

export async function openTemplateDialog(page: Page) {
  await clickToolbarButton(page, 'Templates');
  await expect(page.getByRole('dialog', { name: 'Pattern templates' })).toBeVisible();
}

export async function loadTemplate(page: Page, name: string) {
  await openTemplateDialog(page);
  await page.getByRole('button', { name, exact: true }).click();
  await waitForAppReady(page);
}

export async function createMagicRing(page: Page, stitchCount: number) {
  await openChainDialog(page);
  await chainDialog(page).getByRole('button', { name: 'Magic ring' }).click();
  await chainLengthInput(page).fill(String(stitchCount));
  await chainDialog(page).getByRole('button', { name: 'Create magic ring' }).click();
  await waitForAppReady(page);
}

export async function startRowOne(page: Page, chainLength: number) {
  await createFoundationChain(page, chainLength);
  await clickToolbarButton(page, 'New Row');
}

export function attachmentPoint(page: Page) {
  return page.getByTestId('attachment-point');
}
