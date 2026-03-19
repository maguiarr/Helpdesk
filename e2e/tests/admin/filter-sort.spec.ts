import { test, expect } from '@playwright/test';
import { AdminDashboardPage } from '../../pages/admin-dashboard.page';

test.describe('Filter, Sort, and Pagination', () => {
  let dashboardPage: AdminDashboardPage;

  test.beforeEach(async ({ page }) => {
    dashboardPage = new AdminDashboardPage(page);
    await page.goto('/admin/dashboard');
  });

  test('search filter filters table rows', async ({ page }) => {
    const allRows = dashboardPage.ticketsTable.locator('tr.mat-mdc-row');
    const initialCount = await allRows.count();
    test.skip(initialCount === 0, 'No tickets in table to filter');

    // Apply a filter that won't match anything
    await dashboardPage.applyFilter('zzz_nonexistent_filter');

    // Wait for Angular to process the filter and re-render the table
    await expect(async () => {
      const filteredCount = await allRows.count();
      expect(filteredCount).toBeLessThan(initialCount);
    }).toPass({ timeout: 3000 });
  });

  test('column sorting works', async ({ page }) => {
    const titleHeader = page.locator('th.mat-mdc-header-cell', { hasText: 'Title' });
    await titleHeader.click();
    // After clicking, sort indicator should be present
    const sortIndicator = titleHeader.locator('.mat-sort-header-arrow');
    await expect(sortIndicator).toBeVisible();
  });

  test('pagination works with page size options', async ({ page }) => {
    await expect(dashboardPage.paginator).toBeVisible();
    // Paginator should show page size options
    const pageSizeSelect = dashboardPage.paginator.locator('.mat-mdc-paginator-page-size');
    await expect(pageSizeSelect).toBeVisible();
  });
});
