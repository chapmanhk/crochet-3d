import { expect, type Page } from '@playwright/test';

export function infoPanel(page: Page) {
  return page.getByRole('complementary', { name: 'Pattern information' });
}

export function chainDialog(page: Page) {
  return page.getByRole('dialog', { name: 'Foundation chain' });
}

export function confirmDialog(page: Page) {
  return page.getByRole('alertdialog');
}

export function chainLengthInput(page: Page) {
  return chainDialog(page).getByRole('spinbutton', { name: 'Chain length' });
}

export function toolbarButton(page: Page, name: string | RegExp) {
  return page
    .getByRole('toolbar', { name: 'Pattern tools' })
    .getByRole('button', { name });
}

export async function openChainDialog(page: Page) {
  await page.getByRole('button', { name: 'New Chain' }).click();
  await expect(chainDialog(page)).toBeVisible();
}

export async function createFoundationChain(page: Page, length: number) {
  await openChainDialog(page);
  await chainLengthInput(page).fill(String(length));
  await chainDialog(page).getByRole('button', { name: 'Create chain' }).click();
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

export async function completeRow(page: Page, stitchCount: number) {
  for (let index = 0; index < stitchCount; index += 1) {
    await toolbarButton(page, 'Add SC').click();
  }
}
