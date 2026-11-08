import { test, expect } from '@playwright/test';
import { HomePage } from '../../pages/home-page.js';
import { NavbarComponent } from '../../pages/navbar.js';
import { trackPageErrors } from '../../utils/mock-helpers.js';

test.describe('Navigation: Core Smoke & Layout', () => {

  test('should load Home Page and inject dynamic navbar and footer', async ({ page }) => {
    const pageErrors = trackPageErrors(page);
    const homePage = new HomePage(page);

    await homePage.goto();

    // Verify title and main elements
    await expect(page).toHaveTitle(/Equity Labs/i);
    await expect(homePage.heroTitle).toBeVisible();

    // Verify dynamic navbar injected
    const navbar = new NavbarComponent(page);
    await expect(navbar.brandLink).toBeVisible();
    await expect(navbar.brandLink).toContainText('Equity Labs');

    // Verify dynamic footer injected
    await expect(page.locator('footer, .footer-links').first()).toBeVisible();

    // Assert no fatal uncaught JavaScript errors
    expect(pageErrors.length).toBe(0);
  });

  test('should toggle theme between dark and light and persist in localStorage', async ({ page }) => {
    const homePage = new HomePage(page);
    await homePage.goto();

    const initialTheme = await homePage.getCurrentTheme();
    await homePage.toggleTheme();

    const toggledTheme = await homePage.getCurrentTheme();
    expect(toggledTheme).not.toBe(initialTheme);

    // Verify persistence after reload
    await page.reload();
    await homePage.waitForReady();
    const persistedTheme = await homePage.getCurrentTheme();
    expect(persistedTheme).toBe(toggledTheme);
  });

  test('should navigate to Stock Analysis from navbar and verify subpage URL rewriting', async ({ page }) => {
    const homePage = new HomePage(page);
    await homePage.goto();

    const navbar = new NavbarComponent(page);
    await navbar.clickAnalysis();

    await page.waitForURL('**/pages/analysis.html');
    await expect(page).toHaveTitle(/Stock Fundamental Analysis|Equity Labs/i);
  });

  test('should navigate to News page from navbar', async ({ page }) => {
    const homePage = new HomePage(page);
    await homePage.goto();

    const navbar = new NavbarComponent(page);
    await navbar.clickNews();

    await page.waitForURL('**/pages/news.html');
    await expect(page.locator('h1')).toContainText(/Stock Market News/i);
  });

  test('should navigate to Finance Tracker and Stock Manager from Home feature cards', async ({ page }) => {
    const homePage = new HomePage(page);
    await homePage.goto();

    // Click Track Finance feature card
    await homePage.clickTrackFinance();
    await page.waitForURL('**/pages/finance-tracker.html');
    await expect(page.locator('.finance-header-title')).toContainText('Finance Tracker');

    // Go back to Home and test Stock Manager card
    await homePage.goto();
    await homePage.clickManagePortfolio();
    await page.waitForURL('**/pages/stock-manager.html');
    await expect(page.locator('h1')).toContainText(/Stock Net Worth Tracker/i);
  });
});

