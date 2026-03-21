import { test as setup } from '@playwright/test';
import { LoginPage } from '../pages/login.page';

setup('authenticate as employee', async ({ page }, testInfo) => {
  const browser = testInfo.project.name.replace('setup-', '');
  const employeeFile = `.auth/employee-${browser}.json`;

  const loginPage = new LoginPage(page);
  const baseURL = process.env.BASE_URL || 'http://localhost:4200';

  await page.goto(baseURL);
  await loginPage.login(
    process.env.EMPLOYEE_USERNAME || 'employee1',
    process.env.EMPLOYEE_PASSWORD || 'password123'
  );

  await page.waitForURL('**/employee/submit');
  await page.context().storageState({ path: employeeFile });
});

setup('authenticate as admin', async ({ page }, testInfo) => {
  const browser = testInfo.project.name.replace('setup-', '');
  const adminFile = `.auth/admin-${browser}.json`;

  const loginPage = new LoginPage(page);
  const baseURL = process.env.BASE_URL || 'http://localhost:4200';

  await page.goto(baseURL);
  await loginPage.login(
    process.env.ADMIN_USERNAME || 'admin1',
    process.env.ADMIN_PASSWORD || 'password123'
  );

  await page.waitForURL('**/employee/submit');
  await page.context().storageState({ path: adminFile });
});
