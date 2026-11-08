import { test, expect } from '@playwright/test';
import { FinanceTrackerPage } from '../../pages/finance-tracker-page.js';
import { TEST_CREDENTIALS } from '../../fixtures/auth-config.js';

test.describe('Finance Tracker: 09 Preferences, Privacy & Forecast Mode', () => {

  test('should toggle amount masking for financial privacy', async ({ page }) => {
    const tracker = new FinanceTrackerPage(page);
    await tracker.login(TEST_CREDENTIALS.email, TEST_CREDENTIALS.password);

    // Toggle mask on
    await tracker.toggleMaskData();
    await expect(tracker.maskDataBtn).toHaveAttribute('title', /Show amount values/i);

    // Toggle mask off
    await tracker.toggleMaskData();
    await expect(tracker.maskDataBtn).toHaveAttribute('title', /Mask amount values/i);
  });

  test('should open Section Visibility Settings modal and Future Forecast modal', async ({ page }) => {
    const tracker = new FinanceTrackerPage(page);
    await tracker.login(TEST_CREDENTIALS.email, TEST_CREDENTIALS.password);

    // Open Section Settings modal
    await tracker.viewSettingsBtn.click();
    await expect(tracker.sectionSettingsModal).toBeVisible();
    await expect(page.locator('#sectionPreferencesList')).toBeVisible();
    await page.locator('#sectionSettingsModal .finance-modal-close').click();
    await expect(tracker.sectionSettingsModal).toBeHidden();

    // Open Future Forecast modal
    await tracker.forecastBtn.click();
    await expect(tracker.forecastModal).toBeVisible();
    await expect(page.locator('#forecastMonthSelect')).toBeVisible();
    await expect(page.locator('#forecastYearSelect')).toBeVisible();
    await page.locator('#forecastModal .finance-modal-close').click();
    await expect(tracker.forecastModal).toBeHidden();
  });
});

