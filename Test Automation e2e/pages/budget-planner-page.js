import { BasePage } from './base-page.js';

/**
 * Budget Planner Page Object
 * Handles Annual Budget & Events, Year navigation, and Gate prompt.
 */
export class BudgetPlannerPage extends BasePage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    super(page);
    this.unauthenticatedState = page.locator('#unauthenticatedState');
    this.gateLoginBtn = page.locator('#gateLoginBtn');
    this.authenticatedState = page.locator('#authenticatedState');
    this.yearDisplay = page.locator('#yearDisplay');
    this.prevYearBtn = page.locator('#prevYearBtn');
    this.nextYearBtn = page.locator('#nextYearBtn');
    this.annualIncomeGoalValue = page.locator('#annualIncomeGoalValue');
    this.yearlyExpensesValue = page.locator('#yearlyExpensesValue');
  }

  async goto() {
    await this.page.goto('/pages/budget-planner.html');
    await this.waitForReady();
  }

  async isUnauthenticatedGateVisible() {
    return await this.unauthenticatedState.isVisible();
  }

  async isAuthenticatedContentVisible() {
    return await this.authenticatedState.isVisible();
  }

  async getYearText() {
    return await this.yearDisplay.innerText();
  }
}

