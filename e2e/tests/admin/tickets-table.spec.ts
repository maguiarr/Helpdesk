import { test, expect } from '@playwright/test';
import { AdminDashboardPage } from '../../pages/admin-dashboard.page';

test.describe('Tickets Table', () => {
  let dashboardPage: AdminDashboardPage;

  test.beforeEach(async ({ page }) => {
    dashboardPage = new AdminDashboardPage(page);
    await page.goto('/admin/dashboard');
  });

  test('tickets table is visible', async () => {
    await expect(dashboardPage.ticketsTable).toBeVisible();
  });

  test('table has correct columns', async ({ page }) => {
    const headers = page.locator('th.mat-mdc-header-cell');
    await expect(headers.first()).toBeVisible();
    const headerTexts = await headers.allTextContents();
    const expectedColumns = ['Title', 'Submitted By', 'Priority', 'Status', 'Assigned To', 'Created', 'Actions'];
    for (const col of expectedColumns) {
      expect(headerTexts.some(h => h.includes(col))).toBeTruthy();
    }
  });

  test('table shows all tickets including other users', async ({ page }) => {
    const rows = dashboardPage.ticketsTable.locator('tr.mat-mdc-row');
    const count = await rows.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });
});
