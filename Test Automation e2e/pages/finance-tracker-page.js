import { BasePage } from './base-page.js';
import { TEST_CREDENTIALS } from '../fixtures/auth-config.js';

/**
 * Finance Tracker Page Object
 * Encapsulates Net Worth dashboard, Assets, Liabilities, Credit Card Optimizer,
 * Month navigation, and financial calculations.
 */
export class FinanceTrackerPage extends BasePage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    super(page);

    // Authentication gates
    this.loginPrompt = page.locator('#loginPrompt');
    this.loginPromptBtn = page.locator('#loginPromptBtn');
    this.financeMainContent = page.locator('#financeMainContent');
    this.authModal = page.locator('#authModal');
    this.userEmailDisplay = page.locator('#userEmail');

    // Month Navigation
    this.monthDisplay = page.locator('#monthDisplay');
    this.monthPrevBtn = page.locator('#monthPrevBtn');
    this.monthNextBtn = page.locator('#monthNextBtn');

    // Financial Summary Bar Cards
    this.summaryIncomeCard = page.locator('#summaryIncomeCard');
    this.summaryIncome = page.locator('#summaryIncome');
    this.summaryExpenditure = page.locator('#summaryExpenditure');
    this.summaryInvested = page.locator('#summaryInvested');
    this.summaryBankBalance = page.locator('#summaryBankBalance');
    this.summaryTaxCard = page.locator('#summaryTaxCard');
    this.summaryTax = page.locator('#summaryTax');

    // Net Worth Cards
    this.totalAssetsValue = page.locator('#totalAssetsValue');
    this.totalLiabilitiesValue = page.locator('#totalLiabilitiesValue');
    this.netWorthValue = page.locator('#netWorthValue');
    this.netWorthEPFOCard = page.locator('#netWorthEPFOCard');
    this.epfoValue = page.locator('#epfoValue');
    this.netWorthCibilCard = page.locator('#netWorthCibilCard');
    this.cibilScoreValue = page.locator('#cibilScoreValue');

    // Section Headers & Add Buttons
    this.addBankBtn = page.locator('#bankAccountsSection button:has-text("Add Bank")');
    this.addCardBtn = page.locator('#creditCardsSection button:has-text("Add Credit Card")');
    this.addLoanBtn = page.locator('#loansSection button:has-text("Add Loan")');
    this.addExpenseBtn = page.locator('#expensesSection button:has-text("Add Expense")');
    this.addInsuranceBtn = page.locator('#insuranceSection button:has-text("Add Insurance")');

    // Tables
    this.banksTableBody = page.locator('#banksTableBody');
    this.creditCardsTableBody = page.locator('#creditCardsTableBody');
    this.loansTableBody = page.locator('#loansTableBody');
    this.expensesTableBody = page.locator('#expensesTableBody');
    this.insuranceTableBody = page.locator('#insuranceTableBody');

    // Utility Controls
    this.maskDataBtn = page.locator('#maskDataBtn');
    this.viewSettingsBtn = page.locator('.view-settings-btn');
    this.forecastBtn = page.locator('#forecastBtn');
    this.cardOptimizerBtn = page.locator('#btnCardOptimizer');
    this.takeTourBtn = page.locator('#headerTakeTourBtn');

    // Modals
    this.editIncomeModal = page.locator('#editIncomeModal');
    this.editTaxModal = page.locator('#editTaxModal');
    this.editEPFOModal = page.locator('#editEPFOModal');
    this.editCibilModal = page.locator('#editCibilModal');
    this.addBankModal = page.locator('#addBankModal');
    this.addCreditCardModal = page.locator('#addCreditCardModal');
    this.cardOptimizerModal = page.locator('#cardOptimizerModal');
    this.sectionSettingsModal = page.locator('#sectionSettingsModal');
    this.forecastModal = page.locator('#forecastModal');
    this.exportModal = page.locator('#exportModal');
  }

  async goto() {
    await this.page.goto('/pages/finance-tracker.html');
    await this.waitForReady();
  }

  /**
   * Helper to parse currency strings like "₹1,25,000.50" into raw float number 125000.50
   * @param {string} text
   * @returns {number}
   */
  parseCurrency(text) {
    if (!text) return 0;
    const clean = text.replace(/[^0-9.-]/g, '');
    return parseFloat(clean) || 0;
  }

  /**
   * Authenticates the test user via the login form across desktop, tablet, and mobile
   * @param {string} [email]
   * @param {string} [password]
   */
  async login(email = TEST_CREDENTIALS.email, password = TEST_CREDENTIALS.password) {
    await this.goto();

    // Fast-path: Check if already authenticated or session auto-restored
    if (await this.financeMainContent.isVisible()) {
      return;
    }
    try {
      await this.financeMainContent.waitFor({ state: 'visible', timeout: 1500 });
      return;
    } catch {
      // Proceed with form authentication
    }

    // Open login modal across desktop, tablet, and mobile
    const promptBtn = this.page.locator('#loginPromptBtn');
    if (await promptBtn.isVisible()) {
      await promptBtn.click();
    } else {
      const loginBtn = this.page.locator('#loginBtn');
      if (await loginBtn.isVisible()) {
        await loginBtn.click();
      } else {
        const toggler = this.page.locator('.navbar-toggler');
        if (await toggler.isVisible()) {
          await toggler.click();
          await this.page.locator('#loginBtn').waitFor({ state: 'visible', timeout: 5000 });
          await this.page.locator('#loginBtn').click();
        }
      }
    }

    await this.authModal.waitFor({ state: 'visible', timeout: 8000 });

    // Fill credentials and submit
    await this.page.locator('#loginEmail').fill(email.trim());
    await this.page.locator('#loginPassword').fill(password.trim());
    await this.page.locator('#loginForm button[type="submit"]').click();

    // Fail-fast race: Wait for either finance workspace unlock or an auth error alert
    const successPromise = this.financeMainContent.waitFor({ state: 'visible', timeout: 15000 }).then(() => 'success');
    const failureAlert = this.page.locator('#authAlertContainer .alert-danger');
    const failurePromise = failureAlert.waitFor({ state: 'visible', timeout: 15000 }).then(async () => {
      const errText = await failureAlert.innerText().catch(() => 'Unknown authentication error');
      throw new Error(`Firebase Auth rejected login for [${email}]: ${errText}`);
    });

    await Promise.race([successPromise, failurePromise]);

    // Collapse mobile navbar menu if left open so it doesn't overlay page content
    const navbarCollapse = this.page.locator('.navbar-collapse');
    const toggler = this.page.locator('.navbar-toggler');
    if (await toggler.isVisible() && await navbarCollapse.evaluate(el => el.classList.contains('show')).catch(() => false)) {
      await toggler.click();
      await this.page.waitForTimeout(300);
    }
  }

  async clickPreviousMonth() {
    await this.monthPrevBtn.click();
  }

  async clickNextMonth() {
    await this.monthNextBtn.click();
  }

  async getMonthText() {
    return await this.monthDisplay.innerText();
  }

  /**
   * Sets Monthly Income (Salary + Other Income)
   */
  async setIncome(salary, otherIncome = 0) {
    await this.summaryIncomeCard.click();
    await this.editIncomeModal.waitFor({ state: 'visible' });
    await this.page.locator('#modalIncomeSalary').fill(salary.toString());
    await this.page.locator('#modalIncomeOther').fill(otherIncome.toString());
    await this.page.locator('#editIncomeModal button:has-text("Save")').click();
    await this.editIncomeModal.waitFor({ state: 'hidden' });
  }

  /**
   * Sets Monthly Tax deduction
   */
  async setTax(taxAmount) {
    await this.summaryTaxCard.click();
    await this.editTaxModal.waitFor({ state: 'visible' });
    await this.page.locator('#modalTaxAmount').fill(taxAmount.toString());
    await this.page.locator('#editTaxModal button:has-text("Save")').click();
    await this.editTaxModal.waitFor({ state: 'hidden' });
  }

  /**
   * Adds a new bank account
   */
  async addBank(accountName, bankName, accountType, balance) {
    await this.addBankBtn.click();
    await this.addBankModal.waitFor({ state: 'visible' });
    await this.page.locator('#bankAccountName').fill(accountName);
    if (bankName) await this.page.locator('#bankBankName').fill(bankName);
    if (accountType) await this.page.locator('#bankAccountType').selectOption(accountType);
    await this.page.locator('#bankBalance').fill(balance.toString());
    await this.page.locator('#addBankModal button:has-text("Save")').click();
    await this.addBankModal.waitFor({ state: 'hidden' });
  }

  /**
   * Adds a credit card liability
   */
  async addCreditCard(cardName, issuer, limit, outstanding) {
    await this.addCardBtn.click();
    await this.addCreditCardModal.waitFor({ state: 'visible' });
    await this.page.locator('#cardName').fill(cardName);
    if (issuer) await this.page.locator('#cardIssuer').fill(issuer);
    if (limit) await this.page.locator('#cardLimit').fill(limit.toString());
    await this.page.locator('#cardOutstanding').fill(outstanding.toString());
    await this.page.locator('#addCreditCardModal button:has-text("Save")').click();
    await this.addCreditCardModal.waitFor({ state: 'hidden' });
  }

  /**
   * Adds a loan with interest rate and tenure
   */
  async addLoan(loanName, lender, loanType, amount, rate, tenure, startMonth) {
    await this.addLoanBtn.click();
    await this.addCreditCardModal.waitFor({ state: 'visible' });
    await this.page.locator('#cardName').fill(loanName);
    if (lender) await this.page.locator('#cardIssuerLoan').fill(lender);
    if (loanType) await this.page.locator('#cardLoanType').selectOption(loanType);
    await this.page.locator('#cardTotalLoanAmount').fill(amount.toString());
    await this.page.locator('#cardInterestRate').fill(rate.toString());
    await this.page.locator('#cardTenure').fill(tenure.toString());
    if (startMonth) await this.page.locator('#cardLoanStartMonth').fill(startMonth);

    // Assert live preview calculates before saving
    await this.page.locator('#loanCalculationPreview').waitFor({ state: 'visible' });
    await this.page.locator('#addCreditCardModal button:has-text("Save")').click();
    await this.addCreditCardModal.waitFor({ state: 'hidden' });
  }

  /**
   * Sets EPFO balance
   */
  async setEpfo(amount) {
    await this.netWorthEPFOCard.click();
    await this.editEPFOModal.waitFor({ state: 'visible' });
    await this.page.locator('#modalEPFOAmount').fill(amount.toString());
    await this.page.locator('#editEPFOModal button:has-text("Save")').click();
    await this.editEPFOModal.waitFor({ state: 'hidden' });
  }

  /**
   * Sets CIBIL score
   */
  async setCibil(score) {
    await this.netWorthCibilCard.click();
    await this.editCibilModal.waitFor({ state: 'visible' });
    await this.page.locator('#modalCibilScore').fill(score.toString());
    await this.page.locator('#editCibilModal button:has-text("Save Score")').click();
    await this.editCibilModal.waitFor({ state: 'hidden' });
  }

  /**
   * Toggles amount masking
   */
  async toggleMaskData() {
    await this.page.waitForFunction(() => typeof window.toggleAmountMasking === 'function');
    await this.maskDataBtn.scrollIntoViewIfNeeded();
    await this.maskDataBtn.click();
  }

  /**
   * Opens and queries the Smart Card Advisor
   */
  async searchCardAdvisor(merchant, amount) {
    await this.cardOptimizerBtn.click();
    await this.cardOptimizerModal.waitFor({ state: 'visible' });
    await this.page.locator('#cardAdvisorSearchInput').fill(merchant);
    await this.page.locator('#cardAdvisorAmountInput').fill(amount.toString());
  }

  async closeCardOptimizer() {
    await this.page.locator('#cardOptimizerModal .finance-modal-close').click();
    await this.cardOptimizerModal.waitFor({ state: 'hidden' });
  }
}
