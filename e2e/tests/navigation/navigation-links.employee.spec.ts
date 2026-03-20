import { test, expect } from '@playwright/test';
import { NavigationPage } from '../../pages/navigation.page';

test.describe('Navigation Links', () => {
  test('employee sees Submit Ticket link', async ({ page }) => {
    await page.goto('/employee/submit');
    const nav = new NavigationPage(page);
    await expect(nav.submitTicketLink).toBeVisible();
  });

  test('employee does not see Dashboard link', async ({ page }) => {
    await page.goto('/employee/submit');
    const nav = new NavigationPage(page);
    await expect(nav.dashboardLink).not.toBeVisible();
  });

  test('employee does not see Admin chip', async ({ page }) => {
    await page.goto('/employee/submit');
    const nav = new NavigationPage(page);
    await expect(nav.adminChip).not.toBeVisible();
  });
});
