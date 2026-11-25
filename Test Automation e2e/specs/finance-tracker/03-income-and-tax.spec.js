import { test, expect } from '@playwright/test';
import { FinanceTrackerPage } from '../../pages/finance-tracker-page.js';
import { TEST_CREDENTIALS } from '../../fixtures/auth-config.js';

test.describe('Finance Tracker: 03 Income & Tax Calculations', () => {

  test('should configure salary, other income, and tax deduction updating summary bar', async ({ page }) => {
    const tracker = new FinanceTrackerPage(page);
    await tracker.login(TEST_CREDENTIALS.email, TEST_CREDENTIALS.password);

    // Set Monthly Income: Salary = 120,000, Other = 15,000
    await tracker.setIncome(120000, 15000);
    await expect(tracker.summaryIncome).toContainText(/1,35,000|135000/);

    // Set Monthly Tax Deduction = 18,000
    await tracker.setTax(18000);
    await expect(tracker.summaryTax).toContainText(/18,000|18000/);
  });
});

