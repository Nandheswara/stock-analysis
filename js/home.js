/**
 * Home Page Authentication Module
 * Handles user authentication UI interactions for the home page
 * @module home
 */

import { 
    initAuthListener,
    signUpUser,
    signInUser,
    signInWithGoogle,
    signOutUser,
    resetPassword,
    changePassword,
    getCurrentUser
} from './firebase-auth-service.js';

/**
 * Authentication Modal Manager
 * Manages the authentication modal state and form switching
 */
class AuthModalManager {
    constructor() {
        this.modal = null;
        this.forms = {
            login: null,
            signup: null,
            forgotPassword: null
        };
        this.alertContainer = null;
    }

    /**
     * Initialize the modal manager
     * @returns {void}
     */
    init() {
        const modalElement = document.getElementById('authModal');
        if (!modalElement) {
            console.warn('Auth modal element not found');
            return;
        }

        this.modal = new bootstrap.Modal(modalElement);
        this.forms.login = document.getElementById('loginForm');
        this.forms.signup = document.getElementById('signupForm');
        this.forms.forgotPassword = document.getElementById('forgotPasswordForm');
        this.alertContainer = document.getElementById('authAlertContainer');

        this.bindEvents();
    }

    /**
     * Bind all event listeners
     * @returns {void}
     */
    bindEvents() {
        this.bindModalTriggers();
        this.bindFormSwitchers();
        this.bindFormSubmissions();
        this.bindGoogleAuth();
        this.bindPasswordReset();
        this.bindLogout();
        this.bindProfile();
    }

    /**
     * Bind modal trigger buttons
     * @returns {void}
     */
    bindModalTriggers() {
        const loginBtn = document.getElementById('loginBtn');
        const signupBtn = document.getElementById('signupBtn');

        if (loginBtn) {
            loginBtn.addEventListener('click', () => {
                this.showLoginForm();
                this.modal.show();
            });
        }

        if (signupBtn) {
            signupBtn.addEventListener('click', () => {
                this.showSignupForm();
                this.modal.show();
            });
        }
    }

    /**
     * Bind form switching links
     * @returns {void}
     */
    bindFormSwitchers() {
        const showSignup = document.getElementById('showSignupForm');
        const showLogin = document.getElementById('showLoginForm');
        const forgotPassword = document.getElementById('forgotPasswordLink');
        const backToLogin = document.getElementById('backToLoginBtn');

        if (showSignup) {
            showSignup.addEventListener('click', (e) => {
                e.preventDefault();
                this.showSignupForm();
            });
        }

        if (showLogin) {
            showLogin.addEventListener('click', (e) => {
                e.preventDefault();
                this.showLoginForm();
            });
        }

        if (forgotPassword) {
            forgotPassword.addEventListener('click', (e) => {
                e.preventDefault();
                this.showForgotPasswordForm();
            });
        }

        if (backToLogin) {
            backToLogin.addEventListener('click', (e) => {
                e.preventDefault();
                this.showLoginForm();
            });
        }
    }

    /**
     * Bind form submission handlers
     * @returns {void}
     */
    bindFormSubmissions() {
        // Login form submission
        if (this.forms.login) {
            this.forms.login.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.handleLogin();
            });
        }

        // Signup form submission
        if (this.forms.signup) {
            this.forms.signup.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.handleSignup();
            });
        }
    }

    /**
     * Bind Google authentication buttons
     * @returns {void}
     */
    bindGoogleAuth() {
        const googleSignInBtn = document.getElementById('googleSignInBtn');
        const googleSignUpBtn = document.getElementById('googleSignUpBtn');

        const handleGoogleAuth = async () => {
            const result = await signInWithGoogle();
            if (result.success) {
                this.showAlert('Signed in successfully!', 'success');
                this.modal.hide();
            } else {
                this.showAlert(result.error, 'danger');
            }
        };

        if (googleSignInBtn) {
            googleSignInBtn.addEventListener('click', handleGoogleAuth);
        }

        if (googleSignUpBtn) {
            googleSignUpBtn.addEventListener('click', handleGoogleAuth);
        }
    }

    /**
     * Bind password reset functionality
     * @returns {void}
     */
    bindPasswordReset() {
        const sendResetBtn = document.getElementById('sendResetEmailBtn');

        if (sendResetBtn) {
            sendResetBtn.addEventListener('click', async () => {
                await this.handlePasswordReset();
            });
        }
    }

    /**
     * Bind logout button
     * @returns {void}
     */
    bindLogout() {
        const logoutBtn = document.getElementById('logoutBtn');

        if (logoutBtn) {
            logoutBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                await signOutUser();
            });
        }
    }

    /**
     * Bind profile-related events (password toggles in any remaining modals)
     * Note: Profile button now navigates to profile.html page directly
     * @returns {void}
     */
    bindProfile() {
        // Profile button now uses href to navigate to profile.html
        // No need to intercept the click event
        
        // Bind password toggle buttons for any modals
        this.bindPasswordToggles();
    }

    /**
     * Bind password visibility toggle buttons
     * @returns {void}
     */
    bindPasswordToggles() {
        const toggleButtons = document.querySelectorAll('.toggle-password');
        
        toggleButtons.forEach(button => {
            button.addEventListener('click', () => {
                const targetId = button.getAttribute('data-target');
                const input = document.getElementById(targetId);
                const icon = button.querySelector('i');
                
                if (input && icon) {
                    if (input.type === 'password') {
                        input.type = 'text';
                        icon.classList.remove('bi-eye');
                        icon.classList.add('bi-eye-slash');
                    } else {
                        input.type = 'password';
                        icon.classList.remove('bi-eye-slash');
                        icon.classList.add('bi-eye');
                    }
                }
            });
        });
    }

    /**
     * Show profile modal with user information
     * @param {bootstrap.Modal} profileModal - Bootstrap modal instance
     * @returns {void}
     */
    showProfileModal(profileModal) {
        const user = getCurrentUser();
        
        if (user) {
            const displayNameEl = document.getElementById('profileDisplayName');
            const emailEl = document.getElementById('profileEmail');
            
            if (displayNameEl) {
                displayNameEl.textContent = user.displayName || 'User';
            }
            if (emailEl) {
                emailEl.textContent = user.email || '';
            }
        }

        // Clear the change password form
        const changePasswordForm = document.getElementById('changePasswordForm');
        if (changePasswordForm) {
            changePasswordForm.reset();
        }

        // Clear alerts
        const alertContainer = document.getElementById('profileAlertContainer');
        if (alertContainer) {
            alertContainer.innerHTML = '';
        }

        profileModal.show();
    }

    /**
     * Handle change password form submission
     * @param {bootstrap.Modal} profileModal - Bootstrap modal instance
     * @returns {Promise<void>}
     */
    async handleChangePassword(profileModal) {
        const currentPassword = document.getElementById('currentPassword')?.value;
        const newPassword = document.getElementById('newPassword')?.value;
        const confirmNewPassword = document.getElementById('confirmNewPassword')?.value;
        const submitBtn = document.getElementById('changePasswordBtn');
        const alertContainer = document.getElementById('profileAlertContainer');

        // Validate inputs
        if (!currentPassword || !newPassword || !confirmNewPassword) {
            this.showProfileAlert('Please fill in all password fields', 'danger');
            return;
        }

        if (newPassword !== confirmNewPassword) {
            this.showProfileAlert('New passwords do not match', 'danger');
            return;
        }

        if (newPassword.length < 6) {
            this.showProfileAlert('New password must be at least 6 characters', 'danger');
            return;
        }

        if (currentPassword === newPassword) {
            this.showProfileAlert('New password must be different from current password', 'danger');
            return;
        }

        // Show loading state
        const originalBtnText = submitBtn?.innerHTML;
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Updating...';
        }

        try {
            const result = await changePassword(currentPassword, newPassword);

            if (result.success) {
                this.showProfileAlert(result.message, 'success');
                // Clear form on success
                document.getElementById('changePasswordForm')?.reset();
                
                // Hide modal after 2 seconds on success
                setTimeout(() => {
                    profileModal.hide();
                }, 2000);
            } else {
                this.showProfileAlert(result.error, 'danger');
            }
        } catch (error) {
            this.showProfileAlert('An unexpected error occurred. Please try again.', 'danger');
        } finally {
            // Restore button state
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalBtnText;
            }
        }
    }

    /**
     * Show alert in profile modal
     * @param {string} message - Alert message
     * @param {string} type - Alert type (success, danger, warning, info)
     * @returns {void}
     */
    showProfileAlert(message, type = 'danger') {
        const alertContainer = document.getElementById('profileAlertContainer');
        if (!alertContainer) return;

        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
        alertDiv.role = 'alert';
        alertDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        `;

        alertContainer.innerHTML = '';
        alertContainer.appendChild(alertDiv);

        // Auto-dismiss success messages after 3 seconds
        if (type === 'success') {
            setTimeout(() => {
                alertDiv.remove();
            }, 3000);
        }
    }

    /**
     * Handle login form submission
     * Optimized with loading states and immediate feedback
     * @returns {Promise<void>}
     */
    async handleLogin() {
        const emailInput = document.getElementById('loginEmail');
        const passwordInput = document.getElementById('loginPassword');
        const submitBtn = this.forms.login?.querySelector('button[type="submit"]');
        
        const email = emailInput?.value?.trim();
        const password = passwordInput?.value;

        // Quick client-side validation
        if (!email || !password) {
            this.showAlert('Please enter email and password', 'danger');
            return;
        }

        // Show loading state immediately for better perceived performance
        const originalBtnText = submitBtn?.innerHTML;
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Signing in...';
        }

        try {
            const result = await signInUser(email, password);
            
            if (result.success) {
                this.showAlert('Signed in successfully!', 'success');
                this.modal.hide();
                this.forms.login?.reset();
            } else {
                this.showAlert(result.error, 'danger');
                // Focus on password field for quick retry
                passwordInput?.focus();
                passwordInput?.select();
            }
        } catch (error) {
            this.showAlert(error.message || 'An unexpected error occurred', 'danger');
        } finally {
            // Restore button state
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalBtnText;
            }
        }
    }

    /**
     * Handle signup form submission
     * @returns {Promise<void>}
     */
    async handleSignup() {
        const name = document.getElementById('signupName')?.value;
        const email = document.getElementById('signupEmail')?.value;
        const password = document.getElementById('signupPassword')?.value;
        const confirmPassword = document.getElementById('signupConfirmPassword')?.value;

        if (!name || !email || !password || !confirmPassword) {
            this.showAlert('Please fill in all fields', 'danger');
            return;
        }

        if (password !== confirmPassword) {
            this.showAlert('Passwords do not match', 'danger');
            return;
        }

        if (password.length < 6) {
            this.showAlert('Password must be at least 6 characters', 'danger');
            return;
        }

        const result = await signUpUser(email, password, name);
        if (result.success) {
            this.showAlert('Account created successfully!', 'success');
            this.modal.hide();
            this.forms.signup?.reset();
        } else {
            this.showAlert(result.error, 'danger');
        }
    }

    /**
     * Handle password reset request
     * @returns {Promise<void>}
     */
    async handlePasswordReset() {
        const email = document.getElementById('resetEmail')?.value;

        if (!email) {
            this.showAlert('Please enter your email address', 'danger');
            return;
        }

        const result = await resetPassword(email);
        if (result.success) {
            this.showAlert('Password reset email sent! Please check your inbox.', 'success');
            document.getElementById('resetEmail').value = '';
            setTimeout(() => {
                this.showLoginForm();
            }, 2000);
        } else {
            this.showAlert(result.error, 'danger');
        }
    }

    /**
     * Show the login form
     * @returns {void}
     */
    showLoginForm() {
        this.setModalTitle('Sign In');
        this.toggleForms('login');
        this.clearAlerts();
    }

    /**
     * Show the signup form
     * @returns {void}
     */
    showSignupForm() {
        this.setModalTitle('Create Account');
        this.toggleForms('signup');
        this.clearAlerts();
    }

    /**
     * Show the forgot password form
     * @returns {void}
     */
    showForgotPasswordForm() {
        this.setModalTitle('Reset Password');
        this.toggleForms('forgotPassword');
        this.clearAlerts();
    }

    /**
     * Set the modal title
     * @param {string} title - The title to display
     * @returns {void}
     */
    setModalTitle(title) {
        const titleElement = document.getElementById('authModalTitle');
        if (titleElement) {
            titleElement.textContent = title;
        }
    }

    /**
     * Toggle form visibility
     * @param {string} formToShow - The form key to show ('login', 'signup', 'forgotPassword')
     * @returns {void}
     */
    toggleForms(formToShow) {
        Object.entries(this.forms).forEach(([key, form]) => {
            if (form) {
                form.style.display = key === formToShow ? 'block' : 'none';
            }
        });
    }

    /**
     * Show an alert message
     * @param {string} message - The message to display
     * @param {string} type - The alert type ('success', 'danger', 'warning', 'info')
     * @returns {void}
     */
    showAlert(message, type = 'danger') {
        if (!this.alertContainer) return;

        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
        alertDiv.role = 'alert';
        alertDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        `;

        this.alertContainer.innerHTML = '';
        this.alertContainer.appendChild(alertDiv);

        // Auto-dismiss success messages after 3 seconds
        if (type === 'success') {
            setTimeout(() => {
                alertDiv.remove();
            }, 3000);
        }
    }

    /**
     * Clear all alert messages
     * @returns {void}
     */
    clearAlerts() {
        if (this.alertContainer) {
            this.alertContainer.innerHTML = '';
        }
    }
}

/**
 * Initialize the home page
 * @returns {void}
 */
function initHomePage() {
    // Initialize Firebase authentication listener
    initAuthListener();

    // Initialize authentication modal manager
    const authModalManager = new AuthModalManager();
    authModalManager.init();
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', initHomePage);
