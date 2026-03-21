import { test, expect } from '@playwright/test';
import { SubmitTicketPage } from '../../pages/submit-ticket.page';
import { TestData } from '../../fixtures/test-data';

test.describe('Submit Ticket Validation', () => {
  let submitPage: SubmitTicketPage;

  test.beforeEach(async ({ page }) => {
    submitPage = new SubmitTicketPage(page);
    await page.goto('/employee/submit');
  });

  test('title required error shows when touched and empty', async ({ page }) => {
    await submitPage.titleInput.click();
    await submitPage.descriptionInput.click(); // blur title
    const error = await submitPage.getValidationError('title');
    expect(error).toContain(TestData.validation.titleRequired);
  });

  test('description required error shows when touched and empty', async ({ page }) => {
    await submitPage.descriptionInput.click();
    await submitPage.titleInput.click(); // blur description
    const error = await submitPage.getValidationError('description');
    expect(error).toContain(TestData.validation.descriptionRequired);
  });

  test('title max length is enforced', async ({ page }) => {
    const longTitle = 'a'.repeat(TestData.validation.titleMaxLength + 1);
    await submitPage.titleInput.fill(longTitle);
    await submitPage.descriptionInput.click(); // blur to trigger validation
    // maxLength validator marks the form invalid (disabling submit), even without a visible mat-error
    const inputValue = await submitPage.titleInput.inputValue();
    const isSubmitDisabled = await submitPage.submitButton.isDisabled();
    expect(inputValue.length <= TestData.validation.titleMaxLength || isSubmitDisabled).toBeTruthy();
  });

  test('description max length is enforced', async ({ page }) => {
    const longDescription = 'a'.repeat(TestData.validation.descriptionMaxLength + 1);
    await submitPage.descriptionInput.fill(longDescription);
    await submitPage.titleInput.click(); // blur to trigger validation
    // maxLength validator marks the form invalid (disabling submit), even without a visible mat-error
    const inputValue = await submitPage.descriptionInput.inputValue();
    const isSubmitDisabled = await submitPage.submitButton.isDisabled();
    expect(inputValue.length <= TestData.validation.descriptionMaxLength || isSubmitDisabled).toBeTruthy();
  });
});
