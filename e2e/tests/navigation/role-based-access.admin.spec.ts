import { test, expect } from '@playwright/test';

test.describe('Role-Based Access (Admin)', () => {
  test('admin can access /admin/dashboard', async ({ page }) => {
    await page.goto('/admin/dashboard');
    await expect(page).toHaveURL(/\/admin\/dashboard/, { timeout: 5000 });
  });

  test('admin can access /employee/submit', async ({ page }) => {
    await page.goto('/employee/submit');
    await expect(page).toHaveURL(/\/employee\/submit/, { timeout: 5000 });
  });
});
