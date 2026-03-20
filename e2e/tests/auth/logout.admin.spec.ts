import { test, expect } from '@playwright/test';
import { NavigationPage } from '../../pages/navigation.page';

test.describe('Logout (Admin)', () => {
  test('clicking logout redirects to Keycloak login', async ({ page }) => {
    await page.goto('/employee/submit');
    const nav = new NavigationPage(page);
    await nav.logout();
    await expect(page).toHaveURL(/\/realms\/helpdesk\/protocol\/openid-connect/, { timeout: 10000 });
  });
});
