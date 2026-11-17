/**
 * Navbar Component Object
 * Encapsulates header navigation items and actions.
 */
export class NavbarComponent {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.brandLink = page.locator('#navBrandLink');
    this.homeLink = page.locator('#navHomeLink');
    this.analysisLink = page.locator('#navAnalysisLink');
    this.stockManagerLink = page.locator('#navStockManagerLink');
    this.newsLink = page.locator('#navNewsLink');
    this.financeTrackerLink = page.locator('#navFinanceTrackerLink');
    this.budgetPlannerLink = page.locator('#navBudgetPlannerLink');

    this.authButtons = page.locator('#authButtons');
    this.loginBtn = page.locator('#loginBtn');
    this.signupBtn = page.locator('#signupBtn');

    this.userProfile = page.locator('#userProfile');
    this.userDropdown = page.locator('#userDropdown');
    this.userEmail = page.locator('#userEmail');
    this.logoutBtn = page.locator('#logoutBtn');
    this.profileBtn = page.locator('#profileBtn');

    this.themeToggle = page.locator('#themeToggle');
    this.navbarToggler = page.locator('.navbar-toggler');
  }

  async ensureNavbarExpanded() {
    if (await this.navbarToggler.isVisible()) {
      const isExpanded = await this.navbarToggler.getAttribute('aria-expanded');
      if (isExpanded !== 'true') {
        await this.navbarToggler.click();
        await this.page.waitForTimeout(300);
      }
    }
  }

  async clickHome() {
    await this.ensureNavbarExpanded();
    await this.homeLink.click();
  }

  async clickAnalysis() {
    await this.ensureNavbarExpanded();
    await this.analysisLink.click();
  }

  async clickStockManager() {
    await this.ensureNavbarExpanded();
    await this.stockManagerLink.click();
  }

  async clickNews() {
    await this.ensureNavbarExpanded();
    await this.newsLink.click();
  }

  async clickFinanceTracker() {
    await this.ensureNavbarExpanded();
    await this.financeTrackerLink.click();
  }

  async clickBudgetPlanner() {
    await this.ensureNavbarExpanded();
    await this.budgetPlannerLink.click();
  }

  async clickLogin() {
    await this.ensureNavbarExpanded();
    await this.loginBtn.click();
  }

  async clickSignUp() {
    await this.ensureNavbarExpanded();
    await this.signupBtn.click();
  }

  async getActiveLink() {
    return this.page.locator('.navbar-nav .nav-link.active');
  }
}

