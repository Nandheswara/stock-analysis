import { test, expect } from '@playwright/test';
import { StockManagerPage } from '../../pages/stock-manager-page.js';

test.describe('Stock Manager: Portfolio Net Worth', () => {

  test('should load portfolio summary cards and check initial values', async ({ page }) => {
    const stockManager = new StockManagerPage(page);
    await stockManager.goto();

    await expect(stockManager.totalInvestment).toBeVisible();
    await expect(stockManager.currentValue).toBeVisible();
    await expect(stockManager.totalProfitLoss).toBeVisible();
    await expect(stockManager.totalBrokerage).toBeVisible();
    await expect(stockManager.totalTax).toBeVisible();
    await expect(stockManager.netWorth).toBeVisible();

    expect(await stockManager.getTotalInvestment()).toContain('₹0');
    expect(await stockManager.getNetWorth()).toContain('₹0');
  });

  test('should open calculation info modal when clicking info button', async ({ page }) => {
    const stockManager = new StockManagerPage(page);
    await stockManager.goto();

    await stockManager.calculationInfoBtn.click();
    const infoModal = page.locator('#calculationModal');
    await expect(infoModal).toBeVisible();

    await page.locator('#calcModalCloseBtn, #calcModalGotItBtn').first().click();
    await expect(infoModal).toBeHidden();
  });

  test('should verify add stock transaction form fields exist in modal', async ({ page }) => {
    const stockManager = new StockManagerPage(page);
    await stockManager.goto();

    await expect(stockManager.addStockModal).toBeAttached();
    await expect(stockManager.stockForm).toBeAttached();
    await expect(stockManager.stockForm.locator('#stockName')).toBeAttached();
  });
});

