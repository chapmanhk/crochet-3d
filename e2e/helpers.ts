import { expect, type Page } from '@playwright/test';

export async function gotoApp(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.setItem('crochet-3d-onboarding-seen', 'true');
    window.localStorage.removeItem('crochet-3d-autosave');
  });
  await page.goto('/');
  await page.getByRole('toolbar', { name: 'Pattern tools' }).waitFor({ state: 'visible' });
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

export function foundationLengthInput(page: Page) {
  return chainDialog(page).getByRole('spinbutton');
}

export function chainLengthInput(page: Page) {
  return foundationLengthInput(page);
}

export function toolbarButton(page: Page, name: string | RegExp) {
  return page
    .getByRole('toolbar', { name: 'Pattern tools' })
    .getByRole('button', { name });
}

export async function openChainDialog(page: Page) {
  await toolbarButton(page, 'New foundation').click();
  await expect(chainDialog(page)).toBeVisible();
}

export async function createFoundationChain(page: Page, length: number) {
  await openChainDialog(page);
  await chainLengthInput(page).fill(String(length));
  await chainDialog(page).getByRole('button', { name: 'Create foundation chain' }).click();
}

export async function acceptConfirm(page: Page, label: string) {
  const dialog = confirmDialog(page);
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: label }).click();
}

export async function dismissConfirm(page: Page) {
  const dialog = confirmDialog(page);
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Cancel' }).click();
}

export { MIN_CHAIN_LENGTH, MAX_CHAIN_LENGTH } from '../src/engine/Pattern';

export async function completeRow(page: Page, stitchCount: number) {
  for (let index = 0; index < stitchCount; index += 1) {
    await toolbarButton(page, /Add single crochet/).click();
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
  await toolbarButton(page, 'Templates').click();
  await expect(page.getByRole('dialog', { name: 'Pattern templates' })).toBeVisible();
}

export async function loadTemplate(page: Page, name: string) {
  await openTemplateDialog(page);
  await page.getByRole('button', { name, exact: true }).click();
}

export async function createMagicRing(page: Page, stitchCount: number) {
  await openChainDialog(page);
  await chainDialog(page).getByRole('button', { name: 'Magic ring' }).click();
  await chainLengthInput(page).fill(String(stitchCount));
  await chainDialog(page).getByRole('button', { name: 'Create magic ring' }).click();
}

export async function startRowOne(page: Page, chainLength: number) {
  await createFoundationChain(page, chainLength);
  await toolbarButton(page, 'New Row').click();
}

export function attachmentPoint(page: Page) {
  return page.getByTestId('attachment-point');
}
