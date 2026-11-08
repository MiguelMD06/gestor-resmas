import { expect, test } from '@playwright/test';

test('visits the app root url', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#container')).toContainText('Ready to create an app?');
});

test('loads the app at /, displays the home page title, and has no console error messages', async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  await page.goto('/');
  await expect(page.locator('ion-title').first()).toBeVisible();
  await expect(page.locator('ion-title').first()).toContainText('Blank');
  await expect(page.locator('#container')).toBeVisible();

  expect(consoleErrors).toEqual([]);
});
