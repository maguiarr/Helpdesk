import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });

const baseURL = process.env.BASE_URL || 'http://localhost:4200';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? 'html' : 'list',
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'setup-chromium',
      testMatch: /auth\.setup\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'setup-firefox',
      testMatch: /auth\.setup\.ts/,
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'employee-chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: '.auth/employee-chromium.json',
      },
      dependencies: ['setup-chromium'],
      testMatch: /\/(employee)\/.+\.spec\.ts$|\/(navigation|auth)\/.*\.employee\.spec\.ts$/,
    },
    {
      name: 'employee-firefox',
      use: {
        ...devices['Desktop Firefox'],
        storageState: '.auth/employee-firefox.json',
      },
      dependencies: ['setup-firefox'],
      testMatch: /\/(employee)\/.+\.spec\.ts$|\/(navigation|auth)\/.*\.employee\.spec\.ts$/,
    },
    {
      name: 'admin-chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: '.auth/admin-chromium.json',
      },
      dependencies: ['setup-chromium'],
      testMatch: /\/(admin)\/.+\.spec\.ts$|\/(navigation|auth)\/.*\.admin\.spec\.ts$/,
    },
    {
      name: 'admin-firefox',
      use: {
        ...devices['Desktop Firefox'],
        storageState: '.auth/admin-firefox.json',
      },
      dependencies: ['setup-firefox'],
      testMatch: /\/(admin)\/.+\.spec\.ts$|\/(navigation|auth)\/.*\.admin\.spec\.ts$/,
    },
  ],
});
