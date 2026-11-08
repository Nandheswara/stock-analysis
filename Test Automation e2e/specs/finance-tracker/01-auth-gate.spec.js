import { test, expect } from '@playwright/test';
import { FinanceTrackerPage } from '../../pages/finance-tracker-page.js';
import { TEST_CREDENTIALS } from '../../fixtures/auth-config.js';

test.describe('Finance Tracker: 01 Auth Gate & Security', () => {

  test('should display security banner, dismiss it, and show login prompt for unauthenticated users', async ({ page }) => {
    const tracker = new FinanceTrackerPage(page);
    await tracker.goto();

    // Verify encryption banner and dismiss it
    const encryptionBanner = page.locator('#encryptionBanner');
    await expect(encryptionBanner).toBeVisible();
    await page.locator('#closeEncryptionBanner').click();
    await expect(encryptionBanner).toBeHidden();

    // Verify unauthenticated prompt is displayed and main workspace is guarded
    await expect(tracker.loginPrompt).toBeVisible();
    await expect(tracker.loginPrompt.locator('h3')).toContainText(/Sign in to access Finance Tracker/i);
    await expect(tracker.financeMainContent).toBeHidden();
  });

  test('should authenticate test user and unlock finance workspace', async ({ page }) => {
    const tracker = new FinanceTrackerPage(page);
    await tracker.login(TEST_CREDENTIALS.email, TEST_CREDENTIALS.password);

    // Verify workspace unlocked
    await expect(tracker.financeMainContent).toBeVisible();
    await expect(tracker.loginPrompt).toBeHidden();

    // Verify user profile indicator in navbar
    await expect(tracker.userEmailDisplay).toBeAttached();
    await expect(tracker.userEmailDisplay).not.toBeEmpty();
  });
});
