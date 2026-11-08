import { BasePage } from './base-page.js';

/**
 * Stock Manager Page Object
 * Handles portfolio tracking, summary cards, and transactions modal.
 */
export class StockManagerPage extends BasePage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    super(page);
    this.totalInvestment = page.locator('#totalInvestment');
    this.currentValue = page.locator('#currentValue');
    this.totalProfitLoss = page.locator('#totalProfitLoss');
    this.totalBrokerage = page.locator('#totalBrokerage');
    this.totalTax = page.locator('#totalTax');
    this.netWorth = page.locator('#netWorth');

    this.calculationInfoBtn = page.locator('#calculationInfoBtn');
    this.addStockModal = page.locator('#addStockModal');
    this.stockForm = page.locator('#stockForm');
  }

  async goto() {
    await this.page.goto('/pages/stock-manager.html');
    await this.waitForReady();
  }

  async getTotalInvestment() {
    return await this.totalInvestment.innerText();
  }

  async getCurrentValue() {
    return await this.currentValue.innerText();
  }

  async getNetWorth() {
    return await this.netWorth.innerText();
  }
}

