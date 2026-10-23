import { defineConfig, devices } from '@playwright/test';

/**
 * End-to-end tests against the full stack (docker compose up): nginx on :4200
 * serving the app and proxying the API, Mailpit on :8025 catching the emails.
 */
export default defineConfig({
  testDir: './e2e',
  // Screenshots have their own config (npm run screens).
  testIgnore: 'screens/**',
  timeout: 120_000,
  expect: { timeout: 15_000 },
  forbidOnly: !!process.env['CI'],
  retries: 0,
  workers: 1,
  reporter: process.env['CI'] ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: process.env['E2E_BASE_URL'] ?? 'http://localhost:4200',
    locale: 'en-US',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // A preinstalled Chromium can be used instead of `playwright install`.
        launchOptions: { executablePath: process.env['E2E_CHROMIUM_PATH'] || undefined },
      },
    },
  ],
});
