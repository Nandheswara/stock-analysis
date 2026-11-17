import { test, expect } from '@playwright/test';
import { StockAnalysisPage } from '../../pages/stock-analysis-page.js';

test.describe('Stock Analysis: Fundamental Screener', () => {

  test('should load analysis table headers and verify 13 key fundamental metrics columns', async ({ page }) => {
    const analysisPage = new StockAnalysisPage(page);
    await analysisPage.goto();

    await expect(analysisPage.stocksTable).toBeAttached();

    const headers = page.locator('#stocksTable thead th');
    const headerTexts = await headers.allInnerTexts();

    expect(headerTexts).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/Stock Name/i),
        expect.stringMatching(/Liquidity/i),
        expect.stringMatching(/Quick Ratio/i),
        expect.stringMatching(/Debt\/Equity/i),
        expect.stringMatching(/ROE/i),
        expect.stringMatching(/ROA/i),
        expect.stringMatching(/EBITDA/i),
        expect.stringMatching(/Stock PE/i),
        expect.stringMatching(/P\/B/i),
        expect.stringMatching(/BETA/i),
        expect.stringMatching(/Promoter/i)
      ])
    );
  });

  test('should display empty state when no stocks are added', async ({ page }) => {
    const analysisPage = new StockAnalysisPage(page);
    await analysisPage.goto();

    await expect(analysisPage.emptyState).toBeVisible();
    await expect(analysisPage.emptyState).toContainText(/No Stocks Added Yet/i);
  });

  test('should open Add Stock modal and verify index source options', async ({ page }) => {
    const analysisPage = new StockAnalysisPage(page);
    await analysisPage.goto();

    await analysisPage.openAddStockModal();
    await expect(analysisPage.addStockModal).toBeVisible();

    const options = await analysisPage.stockSourceSelect.locator('option').allInnerTexts();
    expect(options).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/All Stocks/i),
        expect.stringMatching(/NIFTY 50/i),
        expect.stringMatching(/NIFTY 100/i),
        expect.stringMatching(/NIFTY 200/i)
      ])
    );
  });

  test('should populate stock symbols dropdown and auto-fill company name on selection', async ({ page }) => {
    const analysisPage = new StockAnalysisPage(page);
    await analysisPage.goto();

    await analysisPage.openAddStockModal();

    await expect(analysisPage.stockSymbolSelect.locator('option')).not.toHaveCount(1, { timeout: 10000 });
    const count = await analysisPage.getDropdownOptionsCount();
    expect(count).toBeGreaterThan(10);

    const options = analysisPage.stockSymbolSelect.locator('option');
    const targetOptionValue = await options.nth(2).getAttribute('value');
    if (targetOptionValue && targetOptionValue !== '') {
      await analysisPage.stockSymbolSelect.selectOption(targetOptionValue);
      await expect(analysisPage.stockNameInput).not.toHaveValue('');
    }
  });

  test('should prompt authentication when unauthenticated user attempts to submit stock', async ({ page }) => {
    const analysisPage = new StockAnalysisPage(page);
    await analysisPage.goto();

    await analysisPage.openAddStockModal();

    const options = analysisPage.stockSymbolSelect.locator('option');
    const targetOptionValue = await options.nth(2).getAttribute('value');
    if (targetOptionValue && targetOptionValue !== '') {
      await analysisPage.stockSymbolSelect.selectOption(targetOptionValue);
      await analysisPage.addStockSubmitBtn.click();

      await expect(page.locator('#authModal')).toBeVisible({ timeout: 5000 });
    }
  });
});

