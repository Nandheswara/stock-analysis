import { BasePage } from './base-page.js';

/**
 * News Page Object
 * Handles live news flow, category filtering, and breaking news ticker.
 */
export class NewsPage extends BasePage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    super(page);
    this.refreshNewsBtn = page.locator('#refreshNewsBtn');
    this.pauseNewsBtn = page.locator('#pauseNewsBtn');
    this.newsTicker = page.locator('#newsTicker');
    this.categoryButtons = page.locator('.news-filter-btn');
  }

  async goto() {
    await this.page.goto('/pages/news.html');
    await this.waitForReady();
  }

  async selectCategory(categoryName) {
    const btn = this.page.locator(`.news-filter-btn[data-category="${categoryName}"]`);
    await btn.click();
  }

  async getActiveCategory() {
    return await this.page.locator('.news-filter-btn.active').getAttribute('data-category');
  }
}

