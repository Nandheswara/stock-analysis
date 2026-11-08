/**
 * Auth Modal Component Object
 * Encapsulates modal dialog operations for Sign In, Sign Up, and Password Reset.
 */
export class AuthModalComponent {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.modal = page.locator('#authModal');
    this.modalTitle = page.locator('#authModalTitle');
    this.closeBtn = page.locator('#authModal .btn-close');
    this.alertContainer = page.locator('#authAlertContainer');

    // Login Form
    this.loginForm = page.locator('#loginForm');
    this.loginEmailInput = page.locator('#loginEmail');
    this.loginPasswordInput = page.locator('#loginPassword');
    this.loginSubmitBtn = page.locator('#loginForm button[type="submit"]');
    this.showSignupLink = page.locator('#showSignupForm');
    this.forgotPasswordLink = page.locator('#forgotPasswordLink');

    // Signup Form
    this.signupForm = page.locator('#signupForm');
    this.signupNameInput = page.locator('#signupName');
    this.signupEmailInput = page.locator('#signupEmail');
    this.signupPasswordInput = page.locator('#signupPassword');
    this.signupConfirmPasswordInput = page.locator('#signupConfirmPassword');
    this.signupSubmitBtn = page.locator('#signupForm button[type="submit"]');
    this.showLoginLink = page.locator('#showLoginForm');

    // Forgot Password Form
    this.forgotPasswordForm = page.locator('#forgotPasswordForm');
    this.resetEmailInput = page.locator('#resetEmail');
    this.sendResetEmailBtn = page.locator('#sendResetEmailBtn');
    this.backToLoginBtn = page.locator('#backToLoginBtn');
  }

  async isVisible() {
    return await this.modal.isVisible();
  }

  async waitForOpen() {
    await this.modal.waitFor({ state: 'visible', timeout: 5000 });
  }

  async waitForClose() {
    await this.modal.waitFor({ state: 'hidden', timeout: 5000 });
  }

  async switchToSignup() {
    await this.showSignupLink.click();
    await this.signupForm.waitFor({ state: 'visible' });
  }

  async switchToLogin() {
    await this.showLoginLink.click();
    await this.loginForm.waitFor({ state: 'visible' });
  }

  async switchToForgotPassword() {
    await this.forgotPasswordLink.click();
    await this.forgotPasswordForm.waitFor({ state: 'visible' });
  }

  async fillLogin(email, password) {
    await this.loginEmailInput.fill(email);
    await this.loginPasswordInput.fill(password);
  }

  async submitLogin() {
    await this.loginSubmitBtn.click();
  }

  async fillSignup(name, email, password, confirmPassword) {
    await this.signupNameInput.fill(name);
    await this.signupEmailInput.fill(email);
    await this.signupPasswordInput.fill(password);
    await this.signupConfirmPasswordInput.fill(confirmPassword);
  }

  async submitSignup() {
    await this.signupSubmitBtn.click();
  }

  async closeModal() {
    await this.closeBtn.click();
    await this.waitForClose();
  }

  async getAlertText() {
    await this.alertContainer.waitFor({ state: 'visible' });
    return await this.alertContainer.innerText();
  }
}

