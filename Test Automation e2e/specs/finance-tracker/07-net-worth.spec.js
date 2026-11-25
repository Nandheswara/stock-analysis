import { test, expect } from '@playwright/test';
import { FinanceTrackerPage } from '../../pages/finance-tracker-page.js';
import { TEST_CREDENTIALS } from '../../fixtures/auth-config.js';

test.describe('Finance Tracker: 07 Net Worth Invariant & EPFO/CIBIL', () => {

  test('should track EPFO balance, CIBIL score, and verify the Net Worth equation', async ({ page }) => {
    const tracker = new FinanceTrackerPage(page);
    await tracker.login(TEST_CREDENTIALS.email, TEST_CREDENTIALS.password);

    // Set EPFO balance
    await tracker.setEpfo(250000);
    await expect(tracker.epfoValue).toContainText(/2,50,000|250000/);

    // Set CIBIL score
    await tracker.setCibil(790);
    await expect(tracker.cibilScoreValue).toContainText('790');

    // Wait for real-time calculation sync
    await page.waitForTimeout(1000);

    const assets = tracker.parseCurrency(await tracker.totalAssetsValue.innerText());
    const liabilities = tracker.parseCurrency(await tracker.totalLiabilitiesValue.innerText());
    const netWorth = tracker.parseCurrency(await tracker.netWorthValue.innerText());

    // Invariant: Assets - Liabilities = Net Worth
    const computedNetWorth = assets - liabilities;
    expect(Math.abs(computedNetWorth - netWorth)).toBeLessThanOrEqual(2);
  });
});

