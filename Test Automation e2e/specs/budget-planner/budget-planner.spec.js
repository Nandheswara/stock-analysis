import { test, expect } from '@playwright/test';
import { BudgetPlannerPage } from '../../pages/budget-planner-page.js';

test.describe('Budget Planner: Annual Planning & Events', () => {

  test('should display unauthenticated state and gate banner by default', async ({ page }) => {
    const budgetPlanner = new BudgetPlannerPage(page);
    await budgetPlanner.goto();

    await expect(budgetPlanner.unauthenticatedState).toBeVisible();
    await expect(budgetPlanner.unauthenticatedState).toContainText(/Access Annual Budget & Events/i);
    await expect(budgetPlanner.gateLoginBtn).toBeVisible();
  });

  test('should verify year navigator and controls exist in DOM', async ({ page }) => {
    const budgetPlanner = new BudgetPlannerPage(page);
    await budgetPlanner.goto();

    await expect(budgetPlanner.yearDisplay).toBeAttached();
    await expect(budgetPlanner.prevYearBtn).toBeAttached();
    await expect(budgetPlanner.nextYearBtn).toBeAttached();
  });

  test('should verify annual budget widget structure in DOM', async ({ page }) => {
    const budgetPlanner = new BudgetPlannerPage(page);
    await budgetPlanner.goto();

    await expect(budgetPlanner.annualIncomeGoalValue).toBeAttached();
    await expect(budgetPlanner.yearlyExpensesValue).toBeAttached();
  });
});

