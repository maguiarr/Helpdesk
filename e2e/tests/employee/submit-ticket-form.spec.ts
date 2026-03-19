import { test, expect } from '@playwright/test';
import { SubmitTicketPage } from '../../pages/submit-ticket.page';

test.describe('Submit Ticket Form', () => {
  let submitPage: SubmitTicketPage;

  test.beforeEach(async ({ page }) => {
    submitPage = new SubmitTicketPage(page);
    await page.goto('/employee/submit');
  });

  test('form renders with title, description, and priority fields', async () => {
    await expect(submitPage.titleInput).toBeVisible();
    await expect(submitPage.descriptionInput).toBeVisible();
    await expect(submitPage.prioritySelect).toBeVisible();
  });

  test('priority defaults to Medium', async () => {
    await expect(submitPage.prioritySelect).toContainText('Medium');
  });

  test('submit button is disabled when form is invalid', async () => {
    await expect(submitPage.submitButton).toBeDisabled();
  });

  test('successful submission shows snackbar, resets form, ticket appears in table', async ({ page }) => {
    const uniqueTitle = `E2E Test ${Date.now()}`;
    await submitPage.fillForm(uniqueTitle, 'Automated test description');
    await submitPage.submit();

    // Snackbar confirmation
    const snackbar = page.locator('mat-snack-bar-container', { hasText: 'Ticket submitted successfully' });
    await expect(snackbar).toBeVisible({ timeout: 5000 });

    // Form should be reset
    await expect(submitPage.titleInput).toHaveValue('');
    await expect(submitPage.descriptionInput).toHaveValue('');

    // New ticket should appear in table
    const ticketRow = page.locator('tr.mat-mdc-row', { hasText: uniqueTitle });
    await expect(ticketRow).toBeVisible({ timeout: 5000 });
  });
});
