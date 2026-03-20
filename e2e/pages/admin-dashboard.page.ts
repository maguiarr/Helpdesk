import { type Page, type Locator } from '@playwright/test';

export class AdminDashboardPage {
  readonly page: Page;
  readonly statsCards: Locator;
  readonly searchInput: Locator;
  readonly ticketsTable: Locator;
  readonly paginator: Locator;

  constructor(page: Page) {
    this.page = page;
    this.statsCards = page.locator('.stat-card');
    this.searchInput = page.locator('input[matinput][placeholder="Search..."]');
    this.ticketsTable = page.locator('table.mat-mdc-table');
    this.paginator = page.locator('mat-paginator');
  }

  async getStatValue(name: string): Promise<string> {
    const card = this.page.locator('.stat-card', { hasText: name });
    const value = card.locator('.stat-value');
    return (await value.textContent())?.trim() ?? '';
  }

  async applyFilter(text: string): Promise<void> {
    await this.searchInput.fill(text);
    await this.searchInput.dispatchEvent('keyup');
  }

  async assignToMe(rowIndex: number): Promise<void> {
    const rows = this.ticketsTable.locator('tr.mat-mdc-row');
    const row = rows.nth(rowIndex);
    await row.locator('button[title="Assign to me"]').click();
  }

  async updateStatus(rowIndex: number, status: string): Promise<void> {
    const rows = this.ticketsTable.locator('tr.mat-mdc-row');
    const row = rows.nth(rowIndex);
    await row.locator('mat-select.status-select').click();
    await this.page.locator('mat-option', { hasText: status }).click();
  }

  getTicketRows(): Locator {
    return this.ticketsTable.locator('tr.mat-mdc-row');
  }

  async getPageSize(): Promise<string> {
    const sizeSelect = this.paginator.locator('.mat-mdc-paginator-page-size-value');
    return (await sizeSelect.textContent())?.trim() ?? '';
  }

  async setPageSize(n: number): Promise<void> {
    await this.paginator.locator('.mat-mdc-paginator-page-size-select').click();
    await this.page.locator('mat-option', { hasText: String(n) }).click();
  }
}
