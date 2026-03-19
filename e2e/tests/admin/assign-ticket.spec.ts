import { test, expect } from '@playwright/test';
import { AdminDashboardPage } from '../../pages/admin-dashboard.page';
import { SubmitTicketPage } from '../../pages/submit-ticket.page';

test.describe('Assign Ticket', () => {
  test('assign to me button works', async ({ page }) => {
    // First create a ticket to assign
    await page.goto('/employee/submit');
    const submitPage = new SubmitTicketPage(page);
    const uniqueTitle = `E2E Assign Test ${Date.now()}`;
    await submitPage.fillForm(uniqueTitle, 'Ticket to assign');
    await submitPage.submit();
    await page.locator('mat-snack-bar-container').waitFor({ timeout: 5000 });

    // Navigate to admin dashboard
    await page.goto('/admin/dashboard');
    const dashboardPage = new AdminDashboardPage(page);

    // Find the row with our ticket and assign it
    const ticketRow = page.locator('tr.mat-mdc-row', { hasText: uniqueTitle });
    await expect(ticketRow).toBeVisible({ timeout: 5000 });
    await ticketRow.locator('button[title="Assign to me"]').click();

    // Verify success snackbar
    const snackbar = page.locator('mat-snack-bar-container', { hasText: 'Ticket assigned' });
    await expect(snackbar).toBeVisible({ timeout: 5000 });
  });
});
