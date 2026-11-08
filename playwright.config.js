import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for Equity Labs
 * Configured for multi-device testing: Desktop, Tablet, and Mobile.
 *
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './Test Automation e2e/specs',
  timeout: 30 * 1000,
  expect: {
    timeout: 5000
  },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 2,
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'playwright-report/results.json' }],
    ...(process.env.CI ? [['github']] : [])
  ],
  use: {
    baseURL: 'http://127.0.0.1:8080',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'off'
  },

  projects: [
    {
      name: 'desktop',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 }
      }
    },
    {
      name: 'tablet',
      use: {
        ...devices['Galaxy Tab S4']
      }
    },
    {
      name: 'mobile',
      use: {
        ...devices['Pixel 5']
      }
    }
  ],

  /* Run local web server before starting the tests */
  webServer: {
    command: 'npx serve -l 8080 -C --no-port-switching .',
    url: 'http://127.0.0.1:8080/index.html',
    reuseExistingServer: !process.env.CI,
    timeout: 30 * 1000
  }
});
