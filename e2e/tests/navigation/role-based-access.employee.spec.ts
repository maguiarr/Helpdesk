import { test, expect } from '@playwright/test';
import { NavigationPage } from '../../pages/navigation.page';

test.describe('Role-Based Access', () => {
  test('employee cannot access /admin/dashboard', async ({ page }) => {
    await page.goto('/admin/dashboard');
    // Employee should be redirected to /employee/submit
    await expect(page).toHaveURL(/\/employee\/submit/, { timeout: 5000 });
  });
});
