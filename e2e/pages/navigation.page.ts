import { type Page, type Locator } from '@playwright/test';

export class NavigationPage {
  readonly page: Page;
  readonly submitTicketLink: Locator;
  readonly dashboardLink: Locator;
  readonly usernameDisplay: Locator;
  readonly adminChip: Locator;
  readonly logoutButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.submitTicketLink = page.locator('mat-toolbar a', { hasText: 'Submit Ticket' });
    this.dashboardLink = page.locator('mat-toolbar a', { hasText: 'Dashboard' });
    this.usernameDisplay = page.locator('mat-toolbar span').filter({ hasText: /\w+/ }).filter({ hasNotText: 'HelpDesk' }).last();
    this.adminChip = page.locator('mat-chip', { hasText: 'Admin' });
    this.logoutButton = page.locator('mat-toolbar button[title="Logout"]');
  }

  async navigateToSubmit(): Promise<void> {
    await this.submitTicketLink.click();
  }

  async navigateToDashboard(): Promise<void> {
    await this.dashboardLink.click();
  }

  async logout(): Promise<void> {
    await this.logoutButton.click();
  }

  async isAdminChipVisible(): Promise<boolean> {
    return this.adminChip.isVisible();
  }

  async isDashboardLinkVisible(): Promise<boolean> {
    return this.dashboardLink.isVisible();
  }
}
