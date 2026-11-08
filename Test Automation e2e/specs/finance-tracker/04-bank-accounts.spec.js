import { test, expect } from '@playwright/test';
import { FinanceTrackerPage } from '../../pages/finance-tracker-page.js';
import { TEST_CREDENTIALS } from '../../fixtures/auth-config.js';

test.describe('Finance Tracker: 04 Bank Accounts (Assets)', () => {

  test('should add a bank account and verify asset balance updates', async ({ page }) => {
    const tracker = new FinanceTrackerPage(page);
    await tracker.login(TEST_CREDENTIALS.email, TEST_CREDENTIALS.password);

    const uniqueId = Date.now().toString().slice(-4);
    const bankAccountName = `Savings Account ${uniqueId}`;
    const bankBalance = 85000;

    await tracker.addBank(bankAccountName, 'HDFC Bank', 'savings', bankBalance);

    // Verify account appears in banks table
    const bankRow = tracker.banksTableBody.locator('tr', { hasText: bankAccountName });
    await expect(bankRow).toBeVisible();
    await expect(bankRow).toContainText('HDFC Bank');
    await expect(bankRow).toContainText('85,000');

    // Verify total bank balance reflects the balance with auto-waiting
    await expect(async () => {
      const totalBankBalance = tracker.parseCurrency(await tracker.summaryBankBalance.innerText());
      expect(totalBankBalance).toBeGreaterThanOrEqual(bankBalance);
    }).toPass({ timeout: 15000 });
  });
});
