import { test, expect } from '@playwright/test';
import { FinanceTrackerPage } from '../../pages/finance-tracker-page.js';
import { TEST_CREDENTIALS } from '../../fixtures/auth-config.js';

test.describe('Finance Tracker: 08 Smart Credit Card Advisor', () => {

  test('should search merchant rewards, render recommendations, and switch advisor tabs', async ({ page }) => {
    const tracker = new FinanceTrackerPage(page);
    await tracker.login(TEST_CREDENTIALS.email, TEST_CREDENTIALS.password);

    // Search Swiggy with ₹1,500
    await tracker.searchCardAdvisor('Swiggy', 1500);

    // Verify recommendations render
    const resultsContainer = page.locator('#cardAdvisorResultsContainer');
    await expect(resultsContainer).toBeVisible();

    // Switch to Lounges & Perks tab
    await page.locator('#tabPrivilegesBtn').click();
    await expect(page.locator('#cardOptimizerPrivilegesTab')).toBeVisible();

    // Switch to Popular Cards Directory tab
    await page.locator('#tabCardDirectoryBtn').click();
    await expect(page.locator('#cardOptimizerDirectoryTab')).toBeVisible();

    // Close optimizer modal
    await tracker.closeCardOptimizer();
  });
});

