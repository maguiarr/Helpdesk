import { test, expect } from '@playwright/test';
import { NavigationPage } from '../../pages/navigation.page';

test.describe('Login (Admin)', () => {
  test('admin login redirects to /employee/submit', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/employee\/submit/);
  });

  test('admin can access /admin/dashboard', async ({ page }) => {
    await page.goto('/admin/dashboard');
    await expect(page).toHaveURL(/\/admin\/dashboard/);
  });

  test('admin username shows in toolbar', async ({ page }) => {
    await page.goto('/employee/submit');
    const nav = new NavigationPage(page);
    await expect(nav.usernameDisplay).toBeVisible();
  });
});
