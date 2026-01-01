/**
 * Profile Page JavaScript
 * Handles user profile management including:
 * - Display name updates
 * - Phone number updates
 * - Password changes
 * - Account deletion
 * - Email verification
 * 
 * @module profile
 */

import { 
    initAuthListener, 
    onAuthStateChange,
    signUpUser, 
    signInUser, 
    signInWithGoogle,
    signOutUser,
    getCurrentUser,
    getUserDetails,
    isAuthenticated,
    resetPassword,
    changePassword,
    updateDisplayName,
    updatePhoneNumber,
    getPhoneNumber,
    deleteUserAccount,
    sendVerificationEmail
} from './firebase-auth-service.js';

/* ========================================
   Global Variables
   ======================================== */

let currentUserData = null;
let currentPhoneNumber = null;
let profileModal = null;
let deleteAccountModal = null;
let authModal = null;

/* ========================================
   Initialization
   ======================================== */

/**
 * Initialize the profile page
 */
document.addEventListener('DOMContentLoaded', () => {
    initAuthListener();
    initModals();
    setupEventListeners();
    setupAuthHandlers();
    
    // Listen for auth state changes
    onAuthStateChange((user) => {
        if (user) {
            currentUserData = getUserDetails();
            showProfileContent();
            populateUserData();
        } else {
            currentUserData = null;
            showAuthRequired();
        }
    });
});

/**
 * Initialize Bootstrap modals
 */
function initModals() {
    const deleteModalEl = document.getElementById('deleteAccountModal');
    const authModalEl = document.getElementById('authModal');
    
    if (deleteModalEl) {
        deleteAccountModal = new bootstrap.Modal(deleteModalEl);
    }
    if (authModalEl) {
        authModal = new bootstrap.Modal(authModalEl);
    }
}

/**
 * Setup all event listeners
 */
function setupEventListeners() {
    // Display Name Form
    const displayNameForm = document.getElementById('updateDisplayNameForm');
    if (displayNameForm) {
        displayNameForm.addEventListener('submit', handleDisplayNameUpdate);
    }

    // Phone Number Form
    const phoneForm = document.getElementById('updatePhoneForm');
    if (phoneForm) {
        phoneForm.addEventListener('submit', handlePhoneUpdate);
    }

    // Change Password Form
    const changePasswordForm = document.getElementById('changePasswordForm');
    if (changePasswordForm) {
        changePasswordForm.addEventListener('submit', handlePasswordChange);
    }

    // Password strength indicator
    const newPasswordInput = document.getElementById('newPassword');
    if (newPasswordInput) {
        newPasswordInput.addEventListener('input', updatePasswordStrength);
    }

    // Password toggle buttons
    document.querySelectorAll('.toggle-password').forEach(button => {
        button.addEventListener('click', togglePasswordVisibility);
    });

    // Send verification email
    const sendVerificationBtn = document.getElementById('sendVerificationBtn');
    if (sendVerificationBtn) {
        sendVerificationBtn.addEventListener('click', handleSendVerification);
    }

    // Delete account
    const deleteAccountBtn = document.getElementById('deleteAccountBtn');
    if (deleteAccountBtn) {
        deleteAccountBtn.addEventListener('click', () => {
            if (deleteAccountModal) {
                document.getElementById('deleteConfirmPassword').value = '';
                document.getElementById('deleteAccountAlert').innerHTML = '';
                deleteAccountModal.show();
            }
        });
    }

    // Confirm delete account
    const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
    if (confirmDeleteBtn) {
        confirmDeleteBtn.addEventListener('click', handleDeleteAccount);
    }

    // Logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            await signOutUser();
            window.location.href = '../index.html';
        });
    }
}

/* ========================================
   UI State Management
   ======================================== */

/**
 * Hide loading state
 */
function hideLoading() {
    const loadingState = document.getElementById('loadingState');
    if (loadingState) loadingState.style.display = 'none';
}

/**
 * Show profile content (when logged in)
 */
function showProfileContent() {
    hideLoading();
    const authRequired = document.getElementById('authRequiredMessage');
    const profileContent = document.getElementById('profileContent');
    const authButtons = document.getElementById('authButtons');
    const userProfile = document.getElementById('userProfile');
    
    if (authRequired) authRequired.style.display = 'none';
    if (profileContent) profileContent.style.display = 'block';
    if (authButtons) authButtons.style.setProperty('display', 'none', 'important');
    if (userProfile) userProfile.style.setProperty('display', 'flex', 'important');
}

/**
 * Show auth required message (when not logged in)
 */
function showAuthRequired() {
    hideLoading();
    const authRequired = document.getElementById('authRequiredMessage');
    const profileContent = document.getElementById('profileContent');
    const authButtons = document.getElementById('authButtons');
    const userProfile = document.getElementById('userProfile');
    
    if (authRequired) authRequired.style.display = 'block';
    if (profileContent) profileContent.style.display = 'none';
    if (authButtons) authButtons.style.setProperty('display', 'flex', 'important');
    if (userProfile) userProfile.style.setProperty('display', 'none', 'important');
}

/**
 * Populate user data in the UI
 */
async function populateUserData() {
    if (!currentUserData) return;

    // Display Name
    const displayNameText = document.getElementById('displayNameText');
    const newDisplayNameInput = document.getElementById('newDisplayName');
    const userEmail = document.getElementById('userEmail');
    
    if (displayNameText) {
        displayNameText.textContent = currentUserData.displayName || 'User';
    }
    if (newDisplayNameInput) {
        newDisplayNameInput.value = currentUserData.displayName || '';
    }
    if (userEmail) {
        userEmail.textContent = currentUserData.displayName || currentUserData.email || 'User';
    }

    // Email
    const emailText = document.getElementById('emailText');
    const currentEmail = document.getElementById('currentEmail');
    
    if (emailText) {
        emailText.textContent = currentUserData.email || '';
    }
    if (currentEmail) {
        currentEmail.textContent = currentUserData.email || '';
    }

    // Phone Number - fetch from database
    await loadPhoneNumber();

    // Email verification status
    const verifiedBadge = document.getElementById('emailVerifiedBadge');
    const unverifiedBadge = document.getElementById('emailUnverifiedBadge');
    const verificationBtn = document.getElementById('sendVerificationBtn');
    
    if (currentUserData.emailVerified) {
        if (verifiedBadge) verifiedBadge.style.display = 'inline-block';
        if (unverifiedBadge) unverifiedBadge.style.display = 'none';
        if (verificationBtn) verificationBtn.style.display = 'none';
    } else {
        if (verifiedBadge) verifiedBadge.style.display = 'none';
        if (unverifiedBadge) unverifiedBadge.style.display = 'inline-block';
        if (verificationBtn) verificationBtn.style.display = 'inline-block';
    }

    // Profile Initials (display name initials)
    updateProfileInitials(currentUserData.displayName);

    // Account dates
    const memberSince = document.getElementById('memberSince');
    const lastSignIn = document.getElementById('lastSignIn');
    
    if (memberSince && currentUserData.creationTime) {
        memberSince.textContent = formatDate(currentUserData.creationTime);
    }
    if (lastSignIn && currentUserData.lastSignInTime) {
        lastSignIn.textContent = formatDate(currentUserData.lastSignInTime);
    }
}

/**
 * Update profile initials UI
 * @param {string|null} displayName - Display name or null
 */
function updateProfileInitials(displayName) {
    const initialsEl = document.getElementById('profileInitials');

    if (initialsEl) {
        initialsEl.innerHTML = getInitials(displayName) || '<i class="bi bi-person-fill"></i>';
    }
}

/* ========================================
   Form Handlers
   ======================================== */

/**
 * Handle display name update
 * @param {Event} e - Submit event
 */
async function handleDisplayNameUpdate(e) {
    e.preventDefault();
    
    const newName = document.getElementById('newDisplayName').value.trim();
    const submitBtn = document.getElementById('updateNameBtn');
    const alertContainer = document.getElementById('displayNameAlert');

    if (!newName) {
        showAlert(alertContainer, 'Please enter a display name', 'danger');
        return;
    }

    // Show loading state
    const originalBtnText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Updating...';

    try {
        const result = await updateDisplayName(newName);

        if (result.success) {
            showAlert(alertContainer, result.message, 'success');
            
            // Update UI
            const displayNameText = document.getElementById('displayNameText');
            const userEmail = document.getElementById('userEmail');
            
            if (displayNameText) displayNameText.textContent = newName;
            if (userEmail) userEmail.textContent = newName;
            
            // Update initials if no photo
            if (!currentUserData?.photoURL) {
                const initialsEl = document.getElementById('profileInitials');
                if (initialsEl) {
                    initialsEl.innerHTML = getInitials(newName) || '<i class="bi bi-person-fill"></i>';
                }
            }

            // Update current user data
            if (currentUserData) {
                currentUserData.displayName = newName;
            }
        } else {
            showAlert(alertContainer, result.error, 'danger');
        }
    } catch (error) {
        showAlert(alertContainer, 'An unexpected error occurred. Please try again.', 'danger');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnText;
    }
}

/**
 * Load phone number from database
 */
async function loadPhoneNumber() {
    try {
        currentPhoneNumber = await getPhoneNumber();
        
        const phoneInput = document.getElementById('phoneNumber');
        const phoneText = document.getElementById('phoneText');
        const phoneDisplayValue = document.getElementById('phoneDisplayValue');
        
        if (phoneInput) {
            phoneInput.value = currentPhoneNumber || '';
        }
        
        if (currentPhoneNumber) {
            if (phoneText) phoneText.style.display = 'block';
            if (phoneDisplayValue) phoneDisplayValue.textContent = currentPhoneNumber;
        } else {
            if (phoneText) phoneText.style.display = 'none';
        }
    } catch (error) {
        console.error('Failed to load phone number:', error);
    }
}

/**
 * Handle phone number update
 * @param {Event} e - Submit event
 */
async function handlePhoneUpdate(e) {
    e.preventDefault();
    
    const phoneNumber = document.getElementById('phoneNumber').value.trim();
    const submitBtn = document.getElementById('updatePhoneBtn');
    const alertContainer = document.getElementById('phoneAlert');

    // Show loading state
    const originalBtnText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Updating...';

    try {
        const result = await updatePhoneNumber(phoneNumber);

        if (result.success) {
            showAlert(alertContainer, result.message, 'success');
            currentPhoneNumber = phoneNumber;
            
            // Update display in sidebar
            const phoneText = document.getElementById('phoneText');
            const phoneDisplayValue = document.getElementById('phoneDisplayValue');
            
            if (phoneNumber) {
                if (phoneText) phoneText.style.display = 'block';
                if (phoneDisplayValue) phoneDisplayValue.textContent = phoneNumber;
            } else {
                if (phoneText) phoneText.style.display = 'none';
            }
        } else {
            showAlert(alertContainer, result.error, 'danger');
        }
    } catch (error) {
        showAlert(alertContainer, 'An unexpected error occurred. Please try again.', 'danger');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnText;
    }
}

/**
 * Handle password change
 * @param {Event} e - Submit event
 */
async function handlePasswordChange(e) {
    e.preventDefault();

    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmNewPassword').value;
    const submitBtn = document.getElementById('changePasswordBtn');
    const alertContainer = document.getElementById('passwordAlert');

    // Validate
    if (!currentPassword || !newPassword || !confirmPassword) {
        showAlert(alertContainer, 'Please fill in all password fields', 'danger');
        return;
    }

    if (newPassword !== confirmPassword) {
        showAlert(alertContainer, 'New passwords do not match', 'danger');
        return;
    }

    if (newPassword.length < 6) {
        showAlert(alertContainer, 'New password must be at least 6 characters', 'danger');
        return;
    }

    if (currentPassword === newPassword) {
        showAlert(alertContainer, 'New password must be different from current password', 'danger');
        return;
    }

    // Show loading state
    const originalBtnText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Updating...';

    try {
        const result = await changePassword(currentPassword, newPassword);

        if (result.success) {
            showAlert(alertContainer, result.message, 'success');
            document.getElementById('changePasswordForm').reset();
            
            // Hide password strength
            document.getElementById('passwordStrength').style.display = 'none';
        } else {
            showAlert(alertContainer, result.error, 'danger');
        }
    } catch (error) {
        showAlert(alertContainer, 'An unexpected error occurred. Please try again.', 'danger');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnText;
    }
}

/**
 * Handle send verification email
 */
async function handleSendVerification() {
    const btn = document.getElementById('sendVerificationBtn');
    const alertContainer = document.getElementById('emailAlert');
    const originalBtnText = btn.innerHTML;

    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Sending...';

    try {
        const result = await sendVerificationEmail();

        if (result.success) {
            showAlert(alertContainer, result.message, 'success');
        } else {
            showAlert(alertContainer, result.error, 'danger');
        }
    } catch (error) {
        showAlert(alertContainer, 'Failed to send verification email. Please try again.', 'danger');
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalBtnText;
    }
}

/**
 * Handle delete account
 */
async function handleDeleteAccount() {
    const password = document.getElementById('deleteConfirmPassword').value;
    const btn = document.getElementById('confirmDeleteBtn');
    const alertContainer = document.getElementById('deleteAccountAlert');

    if (!password) {
        showAlert(alertContainer, 'Please enter your password to confirm', 'danger');
        return;
    }

    const originalBtnText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Deleting...';

    try {
        const result = await deleteUserAccount(password);

        if (result.success) {
            if (deleteAccountModal) deleteAccountModal.hide();
            // Redirect to home page
            window.location.href = '../index.html';
        } else {
            showAlert(alertContainer, result.error, 'danger');
        }
    } catch (error) {
        showAlert(alertContainer, 'Failed to delete account. Please try again.', 'danger');
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalBtnText;
    }
}

/* ========================================
   Password Strength
   ======================================== */

/**
 * Update password strength indicator
 * @param {Event} e - Input event
 */
function updatePasswordStrength(e) {
    const password = e.target.value;
    const strengthContainer = document.getElementById('passwordStrength');
    const strengthBar = document.getElementById('passwordStrengthBar');
    const strengthText = document.getElementById('passwordStrengthText');

    if (!password) {
        strengthContainer.style.display = 'none';
        return;
    }

    strengthContainer.style.display = 'block';
    
    const strength = calculatePasswordStrength(password);
    
    strengthBar.style.width = strength.percent + '%';
    strengthBar.className = 'progress-bar ' + strength.class;
    strengthText.textContent = strength.text;
    strengthText.className = strength.textClass;
}

/**
 * Calculate password strength
 * @param {string} password - Password to evaluate
 * @returns {Object} Strength details
 */
function calculatePasswordStrength(password) {
    let score = 0;
    
    // Length
    if (password.length >= 6) score += 1;
    if (password.length >= 8) score += 1;
    if (password.length >= 12) score += 1;
    
    // Character types
    if (/[a-z]/.test(password)) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^a-zA-Z0-9]/.test(password)) score += 1;

    if (score <= 2) {
        return { percent: 25, class: 'strength-weak', text: 'Weak', textClass: 'text-danger' };
    } else if (score <= 4) {
        return { percent: 50, class: 'strength-fair', text: 'Fair', textClass: 'text-warning' };
    } else if (score <= 5) {
        return { percent: 75, class: 'strength-good', text: 'Good', textClass: 'text-info' };
    } else {
        return { percent: 100, class: 'strength-strong', text: 'Strong', textClass: 'text-success' };
    }
}

/* ========================================
   Utility Functions
   ======================================== */

/**
 * Toggle password visibility
 */
function togglePasswordVisibility() {
    const targetId = this.getAttribute('data-target');
    const input = document.getElementById(targetId);
    const icon = this.querySelector('i');

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
}

/**
 * Show alert message
 * @param {HTMLElement} container - Alert container element
 * @param {string} message - Alert message
 * @param {string} type - Alert type (success, danger, warning, info)
 */
function showAlert(container, message, type = 'danger') {
    if (!container) return;

    container.innerHTML = `
        <div class="alert alert-${type} alert-dismissible fade show" role="alert">
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        </div>
    `;

    // Auto-dismiss success messages
    if (type === 'success') {
        setTimeout(() => {
            container.innerHTML = '';
        }, 5000);
    }
}

/**
 * Format date string
 * @param {string} dateString - Date string to format
 * @returns {string} Formatted date
 */
function formatDate(dateString) {
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    } catch {
        return '-';
    }
}

/**
 * Get initials from name
 * @param {string} name - Full name
 * @returns {string} Initials (max 2 characters)
 */
function getInitials(name) {
    if (!name) return '';
    
    const parts = name.trim().split(' ').filter(p => p.length > 0);
    if (parts.length === 0) return '';
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

/* ========================================
   Authentication Handlers
   ======================================== */

/**
 * Setup authentication form handlers
 */
function setupAuthHandlers() {
    // Auth prompt buttons
    const authPromptLoginBtn = document.getElementById('authPromptLoginBtn');
    const authPromptSignupBtn = document.getElementById('authPromptSignupBtn');
    
    if (authPromptLoginBtn) {
        authPromptLoginBtn.addEventListener('click', () => showAuthModal('login'));
    }
    if (authPromptSignupBtn) {
        authPromptSignupBtn.addEventListener('click', () => showAuthModal('signup'));
    }

    // Nav auth buttons
    const loginBtn = document.getElementById('loginBtn');
    const signupBtn = document.getElementById('signupBtn');
    
    if (loginBtn) {
        loginBtn.addEventListener('click', () => showAuthModal('login'));
    }
    if (signupBtn) {
        signupBtn.addEventListener('click', () => showAuthModal('signup'));
    }

    // Form switchers
    document.getElementById('showSignupForm')?.addEventListener('click', (e) => {
        e.preventDefault();
        switchAuthForm('signup');
    });
    document.getElementById('showLoginForm')?.addEventListener('click', (e) => {
        e.preventDefault();
        switchAuthForm('login');
    });
    document.getElementById('forgotPasswordLink')?.addEventListener('click', (e) => {
        e.preventDefault();
        switchAuthForm('forgotPassword');
    });
    document.getElementById('backToLoginBtn')?.addEventListener('click', (e) => {
        e.preventDefault();
        switchAuthForm('login');
    });

    // Login form
    document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        await handleLogin();
    });

    // Signup form
    document.getElementById('signupForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        await handleSignup();
    });

    // Google auth
    document.getElementById('googleSignInBtn')?.addEventListener('click', handleGoogleAuth);
    document.getElementById('googleSignUpBtn')?.addEventListener('click', handleGoogleAuth);

    // Password reset
    document.getElementById('sendResetEmailBtn')?.addEventListener('click', handlePasswordReset);
}

/**
 * Show authentication modal
 * @param {string} mode - 'login' or 'signup'
 */
function showAuthModal(mode) {
    switchAuthForm(mode);
    if (authModal) authModal.show();
}

/**
 * Switch authentication form
 * @param {string} form - Form to show ('login', 'signup', 'forgotPassword')
 */
function switchAuthForm(form) {
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    const forgotPasswordForm = document.getElementById('forgotPasswordForm');
    const modalTitle = document.getElementById('authModalTitle');
    const alertContainer = document.getElementById('authAlertContainer');

    if (alertContainer) alertContainer.innerHTML = '';

    if (form === 'login') {
        if (loginForm) loginForm.style.display = 'block';
        if (signupForm) signupForm.style.display = 'none';
        if (forgotPasswordForm) forgotPasswordForm.style.display = 'none';
        if (modalTitle) modalTitle.textContent = 'Sign In';
    } else if (form === 'signup') {
        if (loginForm) loginForm.style.display = 'none';
        if (signupForm) signupForm.style.display = 'block';
        if (forgotPasswordForm) forgotPasswordForm.style.display = 'none';
        if (modalTitle) modalTitle.textContent = 'Create Account';
    } else if (form === 'forgotPassword') {
        if (loginForm) loginForm.style.display = 'none';
        if (signupForm) signupForm.style.display = 'none';
        if (forgotPasswordForm) forgotPasswordForm.style.display = 'block';
        if (modalTitle) modalTitle.textContent = 'Reset Password';
    }
}

/**
 * Handle login
 */
async function handleLogin() {
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const alertContainer = document.getElementById('authAlertContainer');

    if (!email || !password) {
        showAlert(alertContainer, 'Please enter email and password', 'danger');
        return;
    }

    const submitBtn = document.querySelector('#loginForm button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Signing in...';

    try {
        const result = await signInUser(email, password);

        if (result.success) {
            showAlert(alertContainer, 'Signed in successfully!', 'success');
            setTimeout(() => {
                if (authModal) authModal.hide();
            }, 1000);
        } else {
            showAlert(alertContainer, result.error, 'danger');
        }
    } catch (error) {
        showAlert(alertContainer, error.message || 'Sign in failed', 'danger');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    }
}

/**
 * Handle signup
 */
async function handleSignup() {
    const name = document.getElementById('signupName').value;
    const email = document.getElementById('signupEmail').value;
    const password = document.getElementById('signupPassword').value;
    const confirmPassword = document.getElementById('signupConfirmPassword').value;
    const alertContainer = document.getElementById('authAlertContainer');

    if (!name || !email || !password || !confirmPassword) {
        showAlert(alertContainer, 'Please fill in all fields', 'danger');
        return;
    }

    if (password !== confirmPassword) {
        showAlert(alertContainer, 'Passwords do not match', 'danger');
        return;
    }

    const submitBtn = document.querySelector('#signupForm button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Creating account...';

    try {
        const result = await signUpUser(email, password, name);

        if (result.success) {
            showAlert(alertContainer, 'Account created successfully!', 'success');
            setTimeout(() => {
                if (authModal) authModal.hide();
            }, 1000);
        } else {
            showAlert(alertContainer, result.error, 'danger');
        }
    } catch (error) {
        showAlert(alertContainer, error.message || 'Sign up failed', 'danger');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    }
}

/**
 * Handle Google authentication
 */
async function handleGoogleAuth() {
    const alertContainer = document.getElementById('authAlertContainer');

    try {
        const result = await signInWithGoogle();

        if (result.success) {
            showAlert(alertContainer, 'Signed in successfully!', 'success');
            setTimeout(() => {
                if (authModal) authModal.hide();
            }, 1000);
        } else {
            showAlert(alertContainer, result.error, 'danger');
        }
    } catch (error) {
        showAlert(alertContainer, error.message || 'Google sign in failed', 'danger');
    }
}

/**
 * Handle password reset
 */
async function handlePasswordReset() {
    const email = document.getElementById('resetEmail').value;
    const alertContainer = document.getElementById('authAlertContainer');
    const btn = document.getElementById('sendResetEmailBtn');

    if (!email) {
        showAlert(alertContainer, 'Please enter your email address', 'danger');
        return;
    }

    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Sending...';

    try {
        const result = await resetPassword(email);

        if (result.success) {
            showAlert(alertContainer, result.message, 'success');
        } else {
            showAlert(alertContainer, result.error, 'danger');
        }
    } catch (error) {
        showAlert(alertContainer, 'Failed to send reset email', 'danger');
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}
