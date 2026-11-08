import { waitForAppReady } from '../utils/mock-helpers.js';

/**
 * Base Page Object
 * Provides common operations and locators shared across all application pages.
 */
export class BasePage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.navbarPlaceholder = page.locator('#navbar-placeholder');
    this.footerPlaceholder = page.locator('#footer-placeholder');
    this.themeToggleBtn = page.locator('#themeToggle');
    this.themeIcon = page.locator('#themeIcon');
    this.toastContainer = page.locator('#toastContainer, .toast-container, .alert-container');
  }

  /**
   * Waits for DOM content and injected navigation/footer components
   */
  async waitForReady() {
    await waitForAppReady(this.page);
  }

  /**
   * Toggles light / dark mode
   */
  async toggleTheme() {
    const toggler = this.page.locator('.navbar-toggler');
    if (await toggler.isVisible()) {
      const navbarCollapse = this.page.locator('.navbar-collapse');
      const isExpanded = await navbarCollapse.evaluate(el => el.classList.contains('show')).catch(() => false);
      if (!isExpanded) {
        await toggler.click();
        await this.themeToggleBtn.waitFor({ state: 'visible' });
      }
    }
    await this.themeToggleBtn.waitFor({ state: 'visible' });
    await this.themeToggleBtn.click();
  }

  /**
   * Gets current applied theme from <html> or <body>
   * @returns {Promise<string|null>}
   */
  async getCurrentTheme() {
    return await this.page.evaluate(() => {
      return document.documentElement.getAttribute('data-theme') || 
             document.body.getAttribute('data-theme') || 
             localStorage.getItem('theme');
    });
  }

  /**
   * Retrieves page document title
   * @returns {Promise<string>}
   */
  async getPageTitle() {
    return await this.page.title();
  }
}

