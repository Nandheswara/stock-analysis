import { BasePage } from './base-page.js';

/**
 * Stock Analysis Page Object
 * Handles stock selection, fundamental metrics table, and manual metric entry.
 */
export class StockAnalysisPage extends BasePage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    super(page);
    this.openAddStockModalBtn = page.locator('#openAddStockModalBtn');
    this.addStockModal = page.locator('#addStockModal');
    this.stockSourceSelect = page.locator('#stockSource');
    this.stockSymbolSelect = page.locator('#stockSymbol');
    this.stockNameInput = page.locator('#stockName');
    this.addStockSubmitBtn = page.locator('#addStockForm button[type="submit"], #addBtn');

    this.stocksTable = page.locator('#stocksTable');
    this.metricsBody = page.locator('#metricsBody');
    this.emptyState = page.locator('#emptyState');
    this.clearAllBtn = page.locator('#clearAllBtn');
    this.fetchAllBtn = page.locator('#fetchAllBtn');
  }

  async goto() {
    await this.page.goto('/pages/analysis.html');
    await this.waitForReady();
  }

  async openAddStockModal() {
    await this.openAddStockModalBtn.click();
    await this.addStockModal.waitFor({ state: 'visible' });
  }

  async selectStockSource(sourceValue) {
    await this.stockSourceSelect.selectOption(sourceValue);
  }

  async selectStockBySymbol(symbolValue) {
    await this.stockSymbolSelect.selectOption({ value: symbolValue });
  }

  async getDropdownOptionsCount() {
    return await this.stockSymbolSelect.locator('option').count();
  }

  async isStockTableVisible() {
    return await this.stocksTable.isVisible();
  }

  async isEmptyStateVisible() {
    return await this.emptyState.isVisible();
  }

  async getTableRowsCount() {
    return await this.metricsBody.locator('tr').count();
  }
}

