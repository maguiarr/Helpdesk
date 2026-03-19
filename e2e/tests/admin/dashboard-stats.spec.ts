import { test, expect } from '@playwright/test';
import { AdminDashboardPage } from '../../pages/admin-dashboard.page';
import { TestData } from '../../fixtures/test-data';

test.describe('Dashboard Stats', () => {
  let dashboardPage: AdminDashboardPage;

  test.beforeEach(async ({ page }) => {
    dashboardPage = new AdminDashboardPage(page);
    await page.goto('/admin/dashboard');
  });

  test('all 5 stat cards render', async () => {
    await expect(dashboardPage.statsCards).toHaveCount(5);
  });

  test('stat cards show correct labels', async ({ page }) => {
    for (const label of TestData.statLabels) {
      const card = page.locator('.stat-card', { hasText: label });
      await expect(card).toBeVisible();
    }
  });

  test('stat values are numeric', async ({ page }) => {
    for (const label of TestData.statLabels) {
      const value = await dashboardPage.getStatValue(label);
      expect(Number(value)).not.toBeNaN();
    }
  });
});
