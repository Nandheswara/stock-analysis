import { test, expect } from '@playwright/test';
import { FinanceTrackerPage } from '../../pages/finance-tracker-page.js';
import { TEST_CREDENTIALS } from '../../fixtures/auth-config.js';

test.describe('Finance Tracker: 06 Loan EMI Amortization', () => {

  test('should preview live EMI calculation and add a loan entry', async ({ page }) => {
    const tracker = new FinanceTrackerPage(page);
    await tracker.login(TEST_CREDENTIALS.email, TEST_CREDENTIALS.password);

    const uniqueId = Date.now().toString().slice(-4);
    const loanName = `Personal Loan ${uniqueId}`;
    const principal = 120000;
    const annualRate = 12;
    const tenureMonths = 12;

    await tracker.addLoanBtn.click();
    await tracker.addCreditCardModal.waitFor({ state: 'visible' });

    await page.locator('#cardName').fill(loanName);
    await page.locator('#cardIssuerLoan').fill('HDFC Bank');
    await page.locator('#cardLoanType').selectOption('personal-loan');
    await page.locator('#cardTotalLoanAmount').fill(principal.toString());
    await page.locator('#cardInterestRate').fill(annualRate.toString());
    await page.locator('#cardTenure').fill(tenureMonths.toString());

    // Verify live preview dynamically calculates monthly EMI
    const previewEmi = page.locator('#previewLoanEmi');
    await expect(previewEmi).toBeVisible();
    const emiText = await previewEmi.innerText();
    const emiValue = tracker.parseCurrency(emiText);
    expect(emiValue).toBeGreaterThan(10000);
    expect(emiValue).toBeLessThan(11500);

    // Save the loan
    await page.locator('#addCreditCardModal button:has-text("Save")').click();
    await tracker.addCreditCardModal.waitFor({ state: 'hidden' });

    // Verify loan appears in loans table
    const loanRow = tracker.loansTableBody.locator('tr', { hasText: loanName });
    await expect(loanRow).toBeVisible();
  });
});

