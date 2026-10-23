import { defineConfig, devices } from '@playwright/test';

/**
 * Screenshots of the main screens for review (`npm run screens`), against the same stack as the
 * end-to-end tests. The PNGs go to `screens/`, which is not committed.
 */
export default defineConfig({
  testDir: './e2e/screens',
  outputDir: './test-results/screens',
  timeout: 120_000,
  forbidOnly: !!process.env['CI'],
  retries: 0,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: process.env['E2E_BASE_URL'] ?? 'http://localhost:4200',
    locale: 'en-US',
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
