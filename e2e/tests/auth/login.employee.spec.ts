import { test, expect } from '@playwright/test';
import { NavigationPage } from '../../pages/navigation.page';

test.describe('Authenticated Employee Session', () => {
  test('authenticated employee lands on /employee/submit', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/employee\/submit/);
  });

  test('username shows in toolbar', async ({ page }) => {
    await page.goto('/employee/submit');
    const nav = new NavigationPage(page);
    await expect(nav.usernameDisplay).toBeVisible();
  });
});
