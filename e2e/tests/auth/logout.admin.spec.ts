import { test, expect } from '@playwright/test';
import { NavigationPage } from '../../pages/navigation.page';
import { LoginPage } from '../../pages/login.page';

// Use a blank storageState so this test creates its own Keycloak session
// instead of invalidating the shared .auth/admin.json session.
test.use({ storageState: { cookies: [], origins: [] } });

test.describe('Logout (Admin)', () => {
  test('clicking logout redirects to Keycloak login', async ({ page }) => {
    // Log in fresh so we get a separate server-side session
    await page.goto('/');
    const loginPage = new LoginPage(page);
    await loginPage.login(
      process.env.ADMIN_USERNAME || 'admin1',
      process.env.ADMIN_PASSWORD || 'password123'
    );
    await page.waitForURL('**/employee/submit');

    const nav = new NavigationPage(page);
    await nav.logout();
    await expect(page).toHaveURL(/\/realms\/helpdesk\/protocol\/openid-connect/, { timeout: 10000 });
  });
});
