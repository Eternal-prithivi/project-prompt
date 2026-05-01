import { expect, test } from '@playwright/test';
import { mockOllama } from './helpers/mockOllama';

test.beforeEach(async ({ page }) => {
  await mockOllama(page);
});

test('analyzes a prompt and generates prompt variations', async ({ page }) => {
  await page.goto('/');

  await page.getByPlaceholder(/What do you want the AI to do/i).fill(
    'Help me plan a product launch campaign for a developer tool.'
  );
  await page.getByRole('button', { name: /Analyze/i }).click();

  await expect(page.getByText(/Refine Architecture/i)).toBeVisible();
  await expect(page.locator('input[value="Launch Strategist"]')).toBeVisible();

  await page.getByRole('button', { name: /Forge Final Prompts/i }).click();

  await expect(page.getByText(/Forged Variations/i)).toBeVisible();
  await expect(page.getByText('Precise Launch Plan')).toBeVisible();
  await expect(page.getByText('Creative Launch Narrative')).toBeVisible();
});
