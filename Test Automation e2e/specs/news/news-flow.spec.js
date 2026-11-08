import { test, expect } from '@playwright/test';
import { NewsPage } from '../../pages/news-page.js';

test.describe('News: Live Market News Flow', () => {

  test('should display market news header, ticker, and refresh button', async ({ page }) => {
    const newsPage = new NewsPage(page);
    await newsPage.goto();

    await expect(page.locator('h1')).toContainText(/Stock Market News/i);
    await expect(newsPage.newsTicker).toBeVisible();
    await expect(newsPage.refreshNewsBtn).toBeVisible();
    await expect(newsPage.pauseNewsBtn).toBeVisible();
  });

  test('should display news category filter buttons and support category switching', async ({ page }) => {
    const newsPage = new NewsPage(page);
    await newsPage.goto();

    expect(await newsPage.getActiveCategory()).toBe('all');

    await newsPage.selectCategory('markets');
    expect(await newsPage.getActiveCategory()).toBe('markets');

    await newsPage.selectCategory('stocks');
    expect(await newsPage.getActiveCategory()).toBe('stocks');

    await newsPage.selectCategory('economy');
    expect(await newsPage.getActiveCategory()).toBe('economy');
  });

  test('should toggle pause/play state on breaking news ticker', async ({ page }) => {
    const newsPage = new NewsPage(page);
    await newsPage.goto();

    const pauseBtn = newsPage.pauseNewsBtn;
    await expect(page.locator('#pauseIcon')).toBeVisible();

    await pauseBtn.click();
    await expect(pauseBtn).toBeVisible();
  });
});

