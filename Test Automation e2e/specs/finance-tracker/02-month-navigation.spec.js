import { test, expect } from '@playwright/test';
import { FinanceTrackerPage } from '../../pages/finance-tracker-page.js';
import { TEST_CREDENTIALS } from '../../fixtures/auth-config.js';

test.describe('Finance Tracker: 02 Month Navigation', () => {

  test('should navigate to previous and next month updating display label', async ({ page }) => {
    const tracker = new FinanceTrackerPage(page);
    await tracker.login(TEST_CREDENTIALS.email, TEST_CREDENTIALS.password);

    const initialMonth = await tracker.getMonthText();
    expect(initialMonth).not.toBe('');

    // Navigate to previous month
    await tracker.clickPreviousMonth();
    const prevMonth = await tracker.getMonthText();
    expect(prevMonth).not.toBe(initialMonth);

    // Navigate forward back to initial month
    await tracker.clickNextMonth();
    const restoredMonth = await tracker.getMonthText();
    expect(restoredMonth).toBe(initialMonth);
  });
});

