import { BasePage } from './base-page.js';

/**
 * Home Page Object
 * Handles home page interactions, hero elements, and feature cards navigation.
 */
export class HomePage extends BasePage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    super(page);
    this.heroTitle = page.locator('h1.display-6');
    this.analyzeStocksCardBtn = page.locator('main a[href="pages/analysis.html"], .card a[href="pages/analysis.html"]').first();
    this.managePortfolioCardBtn = page.locator('main a[href="pages/stock-manager.html"], .card a[href="pages/stock-manager.html"]').first();
    this.trackFinanceCardBtn = page.locator('main a[href="pages/finance-tracker.html"], .card a[href="pages/finance-tracker.html"]').first();
    this.metricsPreviewSection = page.locator('.metrics-preview');
  }

  async goto() {
    await this.page.goto('/index.html');
    await this.waitForReady();
  }

  async clickAnalyzeStocks() {
    await this.analyzeStocksCardBtn.click();
  }

  async clickManagePortfolio() {
    await this.managePortfolioCardBtn.click();
  }

  async clickTrackFinance() {
    await this.trackFinanceCardBtn.click();
  }
}

