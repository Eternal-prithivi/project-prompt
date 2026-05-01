import { expect, test } from '@playwright/test';
import { mockOllama } from './helpers/mockOllama';

test.beforeEach(async ({ page }) => {
  await mockOllama(page);
});

test('compresses a prompt through the standalone compression modal', async ({ page }) => {
  await page.goto('/');

  await page.getByRole('button', { name: /compress/i }).click();
  await expect(page.getByRole('dialog', { name: /compression service/i })).toBeVisible();

  await page.getByPlaceholder(/Paste your prompt here/i).fill(
    'Please make sure to write markdown for [TOPIC] with citations and keep the structure concise.'
  );
  await page.getByRole('button', { name: /compress now/i }).click();

  await expect(page.getByText(/Tokens Saved/i)).toBeVisible();
  await expect(page.getByText(/Write concise markdown for \[TOPIC\] with citations\./i)).toBeVisible();
  await expect(page.getByText(/\$0\.10m/i)).toBeVisible();
});
