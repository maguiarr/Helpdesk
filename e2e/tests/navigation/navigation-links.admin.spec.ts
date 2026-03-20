import { test, expect } from '@playwright/test';
import { NavigationPage } from '../../pages/navigation.page';

test.describe('Navigation Links (Admin)', () => {
  test('admin sees Submit Ticket link', async ({ page }) => {
    await page.goto('/employee/submit');
    const nav = new NavigationPage(page);
    await expect(nav.submitTicketLink).toBeVisible();
  });

  test('admin sees Dashboard link', async ({ page }) => {
    await page.goto('/employee/submit');
    const nav = new NavigationPage(page);
    await expect(nav.dashboardLink).toBeVisible();
  });

  test('admin sees Admin chip', async ({ page }) => {
    await page.goto('/employee/submit');
    const nav = new NavigationPage(page);
    await expect(nav.adminChip).toBeVisible();
  });
});
