import { test, expect } from '@playwright/test';
import { NavigationPage } from '../../pages/navigation.page';

test.describe('Logout', () => {
  test('clicking logout redirects to Keycloak login', async ({ page }) => {
    await page.goto('/employee/submit');
    const nav = new NavigationPage(page);
    await nav.logout();
    // After logout, should be redirected to Keycloak login page
    await expect(page).toHaveURL(/\/realms\/helpdesk\/protocol\/openid-connect/, { timeout: 10000 });
  });
});
