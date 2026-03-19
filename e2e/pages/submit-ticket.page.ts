import { type Page, type Locator } from '@playwright/test';

export class SubmitTicketPage {
  readonly page: Page;
  readonly titleInput: Locator;
  readonly descriptionInput: Locator;
  readonly prioritySelect: Locator;
  readonly submitButton: Locator;
  readonly myTicketsTable: Locator;
  readonly emptyState: Locator;

  constructor(page: Page) {
    this.page = page;
    this.titleInput = page.locator('input[formcontrolname="title"]');
    this.descriptionInput = page.locator('textarea[formcontrolname="description"]');
    this.prioritySelect = page.locator('mat-select[formcontrolname="priority"]');
    this.submitButton = page.locator('button[type="submit"]', { hasText: 'Submit Ticket' });
    this.myTicketsTable = page.locator('table.mat-mdc-table').last();
    this.emptyState = page.locator('p.no-data', { hasText: 'No tickets submitted yet.' });
  }

  async fillForm(title: string, description: string, priority?: string): Promise<void> {
    await this.titleInput.fill(title);
    await this.descriptionInput.fill(description);
    if (priority) {
      await this.prioritySelect.click();
      await this.page.locator('mat-option', { hasText: priority }).click();
    }
  }

  async submit(): Promise<void> {
    await this.submitButton.click();
  }

  getMyTickets(): Locator {
    return this.myTicketsTable.locator('tr.mat-mdc-row');
  }

  async getValidationError(field: string): Promise<string> {
    const error = this.page.locator(`mat-form-field:has([formcontrolname="${field}"]) mat-error`);
    return error.textContent() as Promise<string>;
  }
}
