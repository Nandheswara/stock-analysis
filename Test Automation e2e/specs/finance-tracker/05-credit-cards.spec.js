import { test, expect } from '@playwright/test';
import { FinanceTrackerPage } from '../../pages/finance-tracker-page.js';
import { TEST_CREDENTIALS } from '../../fixtures/auth-config.js';

test.describe('Finance Tracker: 05 Credit Cards (Liabilities)', () => {

  test('should add a credit card liability and verify credit card table and liabilities', async ({ page }) => {
    const tracker = new FinanceTrackerPage(page);
    await tracker.login(TEST_CREDENTIALS.email, TEST_CREDENTIALS.password);

    const uniqueId = Date.now().toString().slice(-4);
    const cardName = `Sapphiro Card ${uniqueId}`;
    const cardLimit = 300000;
    const cardOutstanding = 20000;

    await tracker.addCreditCard(cardName, 'ICICI Bank', cardLimit, cardOutstanding);

    // Verify card in credit cards table
    const cardRow = tracker.creditCardsTableBody.locator('tr', { hasText: cardName });
    await expect(cardRow).toBeVisible();
    await expect(cardRow).toContainText('ICICI Bank');
    await expect(cardRow).toContainText('20,000');
  });
});
