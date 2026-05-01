import { expect, test } from '@playwright/test';
import { mockOllama } from './helpers/mockOllama';

test.beforeEach(async ({ page }) => {
  await mockOllama(page);
});

test('saves provider settings and restores them after reload via unlock flow', async ({ page }) => {
  await page.goto('/');

  await page.getByRole('button', { name: /settings/i }).click();
  await page.getByPlaceholder(/Set \/ enter encryption password/i).fill('e2e-password');
  await page.getByText(/ChatGPT \/ OpenAI/i).click();
  await page.getByPlaceholder(/Enter OpenAI API key/i).fill('sk-e2e-openai-key');
  await page.getByRole('button', { name: /save & apply/i }).click();

  await expect(page.getByText(/LLM Provider Settings/i)).not.toBeVisible();

  await page.reload();

  await page.getByPlaceholder(/Enter encryption password to unlock/i).fill('e2e-password');
  await page.getByRole('button', { name: /unlock/i }).click();

  await expect(page.getByPlaceholder(/Enter OpenAI API key/i)).toHaveValue('sk-e2e-openai-key');
});
