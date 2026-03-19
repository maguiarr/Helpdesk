import { test, expect } from '@playwright/test';
import { SubmitTicketPage } from '../../pages/submit-ticket.page';

test.describe('My Tickets', () => {
  let submitPage: SubmitTicketPage;

  test.beforeEach(async ({ page }) => {
    submitPage = new SubmitTicketPage(page);
    await page.goto('/employee/submit');
  });

  test('table or empty state is displayed', async ({ page }) => {
    const hasTable = await submitPage.myTicketsTable.isVisible();
    const hasEmptyState = await submitPage.emptyState.isVisible();
    expect(hasTable || hasEmptyState).toBeTruthy();
  });

  test('my tickets table shows correct columns', async ({ page }) => {
    // Submit a ticket first so the table has data
    const uniqueTitle = `E2E Columns Test ${Date.now()}`;
    await submitPage.fillForm(uniqueTitle, 'Checking columns');
    await submitPage.submit();

    // Wait for the snackbar and table to refresh
    await page.locator('mat-snack-bar-container').waitFor({ timeout: 5000 });
    await page.locator('tr.mat-mdc-row', { hasText: uniqueTitle }).waitFor({ timeout: 5000 });

    const headers = page.locator('th.mat-mdc-header-cell');
    const headerTexts = await headers.allTextContents();
    expect(headerTexts.some(h => h.includes('Title'))).toBeTruthy();
    expect(headerTexts.some(h => h.includes('Priority'))).toBeTruthy();
    expect(headerTexts.some(h => h.includes('Status'))).toBeTruthy();
    expect(headerTexts.some(h => h.includes('Created'))).toBeTruthy();
  });

  test('submitted ticket appears with priority chip', async ({ page }) => {
    const uniqueTitle = `E2E Priority Chip ${Date.now()}`;
    await submitPage.fillForm(uniqueTitle, 'Testing priority chips', 'High');
    await submitPage.submit();

    await page.locator('mat-snack-bar-container').waitFor({ timeout: 5000 });
    await page.locator('tr.mat-mdc-row', { hasText: uniqueTitle }).waitFor({ timeout: 5000 });

    const ticketRow = page.locator('tr.mat-mdc-row', { hasText: uniqueTitle });
    await expect(ticketRow).toBeVisible();
    const priorityChip = ticketRow.locator('mat-chip', { hasText: 'High' });
    await expect(priorityChip).toBeVisible();
  });
});
