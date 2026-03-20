import { test, expect } from '@playwright/test';
import { AdminDashboardPage } from '../../pages/admin-dashboard.page';
import { SubmitTicketPage } from '../../pages/submit-ticket.page';

test.describe('Update Status', () => {
  test('status dropdown changes status with success snackbar', async ({ page }) => {
    // Create a ticket first
    await page.goto('/employee/submit');
    const submitPage = new SubmitTicketPage(page);
    const uniqueTitle = `E2E Status Test ${Date.now()}`;
    await submitPage.fillForm(uniqueTitle, 'Ticket for status update');
    await submitPage.submit();
    await page.locator('mat-snack-bar-container').waitFor({ timeout: 5000 });

    // Navigate to dashboard
    await page.goto('/admin/dashboard');
    const dashboardPage = new AdminDashboardPage(page);

    // Find ticket row and update status
    const ticketRow = page.locator('tr.mat-mdc-row', { hasText: uniqueTitle });
    await expect(ticketRow).toBeVisible({ timeout: 5000 });

    // Change status to InProgress
    await ticketRow.locator('mat-select.status-select').click();
    await page.locator('mat-option', { hasText: 'InProgress' }).click();

    const snackbar = page.locator('mat-snack-bar-container', { hasText: 'Status updated' });
    await expect(snackbar).toBeVisible({ timeout: 5000 });
  });
});
