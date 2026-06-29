import { test, expect } from '@playwright/test';

test('should load the main page and display the correct title', async ({ page }) => {
  // Go to the local Vite development client URL
  await page.goto('http://localhost:3000');
  
  // Wait for dynamic title to resolve
  await expect(page).toHaveTitle(/Giác Ngộ|Awakening AI|Bodhilab Admin/i);
});
