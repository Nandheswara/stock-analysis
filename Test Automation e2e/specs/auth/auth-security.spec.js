import { test, expect } from '@playwright/test';
import { HomePage } from '../../pages/home-page.js';
import { NavbarComponent } from '../../pages/navbar.js';
import { AuthModalComponent } from '../../pages/auth-modal.js';
import { FinanceTrackerPage } from '../../pages/finance-tracker-page.js';
import { BudgetPlannerPage } from '../../pages/budget-planner-page.js';

test.describe('Auth: Security & Access Control', () => {

  test('should open auth modal and switch between tabs', async ({ page }) => {
    const homePage = new HomePage(page);
    await homePage.goto();

    const navbar = new NavbarComponent(page);
    const authModal = new AuthModalComponent(page);

    // Open login modal
    await navbar.clickLogin();
    await authModal.waitForOpen();
    await expect(authModal.modalTitle).toContainText(/Sign In/i);
    await expect(authModal.loginForm).toBeVisible();

    // Switch to Sign Up
    await authModal.switchToSignup();
    await expect(authModal.modalTitle).toContainText(/Create Account/i);
    await expect(authModal.signupForm).toBeVisible();

    // Switch to Forgot Password
    await authModal.switchToLogin();
    await authModal.switchToForgotPassword();
    await expect(authModal.modalTitle).toContainText(/Reset Password/i);
    await expect(authModal.forgotPasswordForm).toBeVisible();

    // Close modal
    await authModal.closeModal();
    await expect(authModal.modal).toBeHidden();
  });

  test('should validate signup password confirmation mismatch', async ({ page }) => {
    const homePage = new HomePage(page);
    await homePage.goto();

    const navbar = new NavbarComponent(page);
    const authModal = new AuthModalComponent(page);

    await navbar.clickSignUp();
    await authModal.waitForOpen();

    await authModal.fillSignup('Jane Doe', 'jane@example.com', 'password123', 'differentpassword');
    await authModal.submitSignup();

    const alertText = await authModal.getAlertText();
    expect(alertText.toLowerCase()).toContain('password');
  });

  test('should enforce guest protection on Finance Tracker', async ({ page }) => {
    const financeTracker = new FinanceTrackerPage(page);
    await financeTracker.goto();

    await expect(financeTracker.loginPrompt).toBeVisible();
    await expect(financeTracker.financeMainContent).toBeHidden();
  });

  test('should enforce guest protection on Budget Planner', async ({ page }) => {
    const budgetPlanner = new BudgetPlannerPage(page);
    await budgetPlanner.goto();

    await expect(budgetPlanner.unauthenticatedState).toBeVisible();
    await expect(budgetPlanner.authenticatedState).toBeHidden();
  });
});

