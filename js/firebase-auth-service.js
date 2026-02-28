/**
 * Firebase Authentication Service
 * 
 * Handles user authentication including sign up, sign in, sign out,
 * and user session management with optimized auth state detection.
 * 
 * @module firebase-auth-service
 */

import { auth, database } from './firebase-config.js';
import { 
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    GoogleAuthProvider,
    signInWithPopup,
    updateProfile,
    sendPasswordResetEmail,
    sendEmailVerification,
    updatePassword,
    reauthenticateWithCredential,
    EmailAuthProvider,
    deleteUser
} from "https://www.gstatic.com/firebasejs/11.1.0/firebase-auth.js";
import {
    ref as dbRef,
    set,
    get,
    update
} from "https://www.gstatic.com/firebasejs/11.1.0/firebase-database.js";

/**
 * Session storage key for auth state caching
 */
const AUTH_CACHE_KEY = 'authStateCache';

/**
 * Cache duration in milliseconds (30 minutes for better performance)
 */
const AUTH_CACHE_DURATION = 30 * 60 * 1000;

/**
 * Email validation regex pattern
 */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Minimum password length
 */
const MIN_PASSWORD_LENGTH = 6;

/**
 * Primary admin email - cannot be removed from admin access
 * This is the super admin with full control
 */
const PRIMARY_ADMIN_EMAIL = 'nandheswara21@gmail.com';

/**
 * Cached admin emails from database
 */
let cachedAdminEmails = null;
let adminCacheTimestamp = 0;
const ADMIN_CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Current user object
 */
let currentUser = null;

/**
 * Flag to track if auth state has been determined
 */
let authStateResolved = false;

/**
 * Flag to prevent concurrent login attempts
 */
let isLoginInProgress = false;

/**
 * Promise that resolves when auth state is determined
 */
let authReadyPromise = null;
let authReadyResolve = null;

/**
 * Auth state change callbacks
 */
const authStateCallbacks = [];

/**
 * Cache auth state to sessionStorage for faster page loads
 * @param {Object|null} user - User object to cache
 */
function cacheAuthState(user) {
    try {
        if (user) {
            const cacheData = {
                uid: user.uid,
                email: user.email,
                displayName: user.displayName,
                emailVerified: user.emailVerified,
                timestamp: Date.now()
            };
            sessionStorage.setItem(AUTH_CACHE_KEY, JSON.stringify(cacheData));
        } else {
            sessionStorage.removeItem(AUTH_CACHE_KEY);
        }
    } catch (error) {
        // Silent fail for storage errors
    }
}

/**
 * Get cached auth state from sessionStorage
 * @returns {Object|null} Cached user data or null
 */
function getCachedAuthState() {
    try {
        const cached = sessionStorage.getItem(AUTH_CACHE_KEY);
        if (cached) {
            const data = JSON.parse(cached);
            // Cache is valid for 30 minutes
            if (Date.now() - data.timestamp < AUTH_CACHE_DURATION) {
                return data;
            }
            sessionStorage.removeItem(AUTH_CACHE_KEY);
        }
    } catch (error) {
        // Silent fail for storage errors
    }
    return null;
}

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} True if email format is valid
 */
function isValidEmail(email) {
    return EMAIL_REGEX.test(email);
}

/**
 * Validate password requirements
 * @param {string} password - Password to validate
 * @returns {boolean} True if password meets requirements
 */
function isValidPassword(password) {
    return password && password.length >= MIN_PASSWORD_LENGTH;
}

/**
 * Check if a login operation is currently in progress
 * Useful for preventing UI interactions during login
 * @returns {boolean} True if login is in progress
 */
export function isLoginPending() {
    return isLoginInProgress;
}

/**
 * Initialize auth state listener with optimized detection
 * Uses cached state for immediate UI rendering while Firebase confirms
 * @returns {Promise} Promise that resolves when auth state is determined
 */
export function initAuthListener() {
    // Return existing promise if already initialized
    if (authReadyPromise) {
        return authReadyPromise;
    }
    
    // Create promise for auth ready state
    authReadyPromise = new Promise((resolve) => {
        authReadyResolve = resolve;
    });
    
    // Check cached auth state for immediate UI update (non-blocking)
    const cachedState = getCachedAuthState();
    if (cachedState) {
        // Apply cached state immediately for fast UI rendering
        // Use requestAnimationFrame for smoother UI update
        requestAnimationFrame(() => updateAuthUI(cachedState));
    }
    
    // Set up Firebase auth state listener
    onAuthStateChanged(auth, (user) => {
        currentUser = user;
        authStateResolved = true;
        
        // Cache the auth state asynchronously (don't block UI)
        queueMicrotask(() => cacheAuthState(user));
        
        // Notify all callbacks
        if (authStateCallbacks.length > 0) {
            authStateCallbacks.forEach(callback => {
                try {
                    callback(user);
                } catch (e) {
                    console.error('Auth callback error:', e);
                }
            });
        }
        
        // Update UI with actual auth state only if different from cached
        const cachedUid = cachedState?.uid;
        const currentUid = user?.uid;
        if (cachedUid !== currentUid) {
            updateAuthUI(user);
        }
        
        // Resolve the auth ready promise
        if (authReadyResolve) {
            authReadyResolve(user);
            authReadyResolve = null;
        }
    });
    
    return authReadyPromise;
}

/**
 * Wait for auth state to be determined
 * @returns {Promise<Object|null>} Promise resolving to current user or null
 */
export function waitForAuthReady() {
    if (authStateResolved) {
        return Promise.resolve(currentUser);
    }
    return authReadyPromise || Promise.resolve(null);
}

/**
 * Register a callback for auth state changes
 * @param {Function} callback - Function to call when auth state changes
 */
export function onAuthStateChange(callback) {
    authStateCallbacks.push(callback);
}

/**
 * Wrapper for onAuthStateChanged - accepts just a callback (unlike Firebase's version which requires auth)
 * @param {Function} callback - Function to call when auth state changes with user object
 */
export function onAuthStateChangedWrapper(callback) {
    authStateCallbacks.push(callback);
    
    if (currentUser !== undefined) {
        callback(currentUser);
    }
}

/**
 * Get current authenticated user
 * Returns the Firebase user if available, or cached user data if auth state is still being determined
 * @returns {Object|null} Current user object or null
 */
export function getCurrentUser() {
    // If we have the actual Firebase user, return it
    if (currentUser) {
        return currentUser;
    }
    
    // If auth state hasn't been resolved yet, check cache for faster response
    if (!authStateResolved) {
        const cached = getCachedAuthState();
        if (cached) {
            // Return a minimal user object from cache for immediate operations
            return {
                uid: cached.uid,
                email: cached.email,
                displayName: cached.displayName,
                emailVerified: cached.emailVerified,
                _fromCache: true
            };
        }
    }
    
    return null;
}

/**
 * Sign up a new user with email and password
 * @param {string} email - User email
 * @param {string} password - User password
 * @param {string} displayName - User display name
 * @returns {Promise<Object>} User credential object
 */
export async function signUpUser(email, password, displayName) {
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        
        if (displayName) {
            await updateProfile(userCredential.user, {
                displayName: displayName
            });
        }
        
        // Save user data to database for admin panel visibility
        try {
            const userRef = dbRef(database, `users/${userCredential.user.uid}`);
            await set(userRef, {
                email: userCredential.user.email,
                displayName: displayName || null,
                createdAt: Date.now(),
                lastActive: Date.now(),
                role: 'user',
                status: 'active',
                metadata: {
                    createdAt: Date.now(),
                    lastLogin: Date.now()
                }
            });
        } catch (dbError) {
            console.error('Error saving user to database:', dbError);
            // Don't fail signup if database write fails
        }
        
        return { success: true, user: userCredential.user };
    } catch (error) {
        console.error('Sign up failed:', error.code);
        throw new Error(getAuthErrorMessage(error.code));
    }
}

// Alias for compatibility
export const signupUser = signUpUser;

/**
 * Sign in existing user with email and password
 * Optimized for faster authentication with pre-validation and immediate caching
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise<Object>} User credential object
 */
export async function signInUser(email, password) {
    // Prevent concurrent login attempts
    if (isLoginInProgress) {
        return { success: false, error: 'Login already in progress' };
    }

    // Pre-validate inputs before making network call
    const trimmedEmail = email?.trim().toLowerCase();
    
    if (!trimmedEmail) {
        return { success: false, error: 'Please enter your email address.' };
    }
    
    if (!isValidEmail(trimmedEmail)) {
        return { success: false, error: 'Please enter a valid email address.' };
    }
    
    if (!password) {
        return { success: false, error: 'Please enter your password.' };
    }
    
    if (!isValidPassword(password)) {
        return { success: false, error: 'Password must be at least 6 characters.' };
    }

    isLoginInProgress = true;

    try {
        // Execute Firebase sign-in
        const userCredential = await signInWithEmailAndPassword(auth, trimmedEmail, password);
        const user = userCredential.user;
        
        // Cache auth state immediately for faster subsequent page loads
        cacheAuthState(user);
        
        // Update current user reference
        currentUser = user;
        authStateResolved = true;
        
        // Update last active timestamp in database
        try {
            const userRef = dbRef(database, `users/${user.uid}`);
            const snapshot = await get(userRef);
            if (snapshot.exists()) {
                // Update existing user's lastActive and sync data from Auth
                const updates = {
                    lastActive: Date.now(),
                    'metadata/lastLogin': Date.now()
                };
                // Always sync email and displayName from Firebase Auth
                if (user.email) {
                    updates.email = user.email;
                }
                if (user.displayName) {
                    updates.displayName = user.displayName;
                }
                await update(userRef, updates);
            } else {
                // Create user record if doesn't exist (for existing auth users)
                await set(userRef, {
                    email: user.email,
                    displayName: user.displayName || null,
                    createdAt: Date.now(),
                    lastActive: Date.now(),
                    role: 'user',
                    status: 'active',
                    metadata: {
                        createdAt: Date.now(),
                        lastLogin: Date.now()
                    }
                });
            }
        } catch (dbError) {
            console.error('Error updating user activity:', dbError);
            // Don't fail login if database write fails
        }
        
        return { success: true, user };
    } catch (error) {
        console.error('Sign in failed:', error.code);
        return { success: false, error: getAuthErrorMessage(error.code) };
    } finally {
        isLoginInProgress = false;
    }
}

// Alias for compatibility
export const loginUser = signInUser;

/**
 * Sign in with Google popup
 * Optimized with immediate caching and state management
 * @returns {Promise<Object>} User credential object
 */
export async function signInWithGoogle() {
    // Prevent concurrent login attempts
    if (isLoginInProgress) {
        return { success: false, error: 'Login already in progress' };
    }

    isLoginInProgress = true;

    try {
        const provider = new GoogleAuthProvider();
        // Add select_account prompt for better UX when switching accounts
        provider.setCustomParameters({ prompt: 'select_account' });
        
        const userCredential = await signInWithPopup(auth, provider);
        const user = userCredential.user;
        
        // Cache auth state immediately
        cacheAuthState(user);
        
        // Update current user reference
        currentUser = user;
        authStateResolved = true;
        
        // Save/update user data in database
        try {
            const userRef = dbRef(database, `users/${user.uid}`);
            const snapshot = await get(userRef);
            if (snapshot.exists()) {
                // Update existing user's lastActive and sync data from Auth
                const updates = {
                    lastActive: Date.now(),
                    'metadata/lastLogin': Date.now()
                };
                // Always sync email and displayName from Firebase Auth
                if (user.email) {
                    updates.email = user.email;
                }
                if (user.displayName) {
                    updates.displayName = user.displayName;
                }
                await update(userRef, updates);
            } else {
                // Create user record for new Google sign-in users
                await set(userRef, {
                    email: user.email,
                    displayName: user.displayName || null,
                    createdAt: Date.now(),
                    lastActive: Date.now(),
                    role: 'user',
                    status: 'active',
                    metadata: {
                        createdAt: Date.now(),
                        lastLogin: Date.now()
                    }
                });
            }
        } catch (dbError) {
            console.error('Error saving Google user to database:', dbError);
            // Don't fail login if database write fails
        }
        
        return { success: true, user };
    } catch (error) {
        console.error('Google sign-in failed:', error.code);
        return { success: false, error: getAuthErrorMessage(error.code) };
    } finally {
        isLoginInProgress = false;
    }
}

/**
 * Clear all app-related localStorage cache on logout
 * Removes stocks cache, portfolio cache, and their timestamps
 */
function clearAllLocalStorageCache() {
    try {
        const keysToRemove = [];
        
        // Find all cache keys related to our app
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && (
                key.startsWith('stocksCache_') ||
                key.startsWith('portfolioCache_') ||
                key === 'analysisStocks' ||
                key === 'stockPortfolio'
            )) {
                keysToRemove.push(key);
            }
        }
        
        // Remove all found cache keys
        keysToRemove.forEach(key => localStorage.removeItem(key));
        
        console.log(`Cleared ${keysToRemove.length} cached items from localStorage`);
    } catch (error) {
        // Silent fail - localStorage might be disabled
        console.warn('Failed to clear localStorage cache:', error);
    }
}

/**
 * Clear all sessionStorage data on logout for security
 * Removes auth cache and any other session-specific data
 */
function clearAllSessionStorage() {
    try {
        // Clear all sessionStorage for complete security
        sessionStorage.clear();
        console.log('Cleared all sessionStorage data');
    } catch (error) {
        // Silent fail - sessionStorage might be disabled
        console.warn('Failed to clear sessionStorage:', error);
    }
}

/**
 * Sign out current user
 * @returns {Promise<Object>} Success status
 */
export async function signOutUser() {
    try {
        // Clear all cached data for security
        clearAllLocalStorageCache();
        clearAllSessionStorage();
        
        await signOut(auth);
        
        // Immediately update local state and UI after successful sign out
        currentUser = null;
        updateAuthUI(null);
        
        return { success: true };
    } catch (error) {
        throw new Error(error.message);
    }
}

// Alias for compatibility
export const logoutUser = signOutUser;

/**
 * Send password reset email
 * @param {string} email - User email address
 * @returns {Promise<Object>} Success status
 */
export async function resetPassword(email) {
    try {
        await sendPasswordResetEmail(auth, email);
        return { 
            success: true, 
            message: 'Password reset email sent! Check your inbox and spam folder.' 
        };
    } catch (error) {
        let errorMessage = getAuthErrorMessage(error.code);
        if (error.code === 'auth/user-not-found') {
            errorMessage = 'No account found with this email address. Please check the email or sign up.';
        } else if (error.code === 'auth/invalid-email') {
            errorMessage = 'Invalid email address format.';
        } else if (error.code === 'auth/too-many-requests') {
            errorMessage = 'Too many requests. Please wait a few minutes and try again.';
        }
        
        return { success: false, error: errorMessage };
    }
}

/**
 * Change user password (requires reauthentication)
 * @param {string} currentPassword - Current password for reauthentication
 * @param {string} newPassword - New password to set
 * @returns {Promise<Object>} Result object with success status and message
 */
export async function changePassword(currentPassword, newPassword) {
    try {
        if (!currentUser) {
            return { 
                success: false, 
                error: 'No user is currently signed in. Please sign in again.' 
            };
        }

        // Validate new password
        if (!newPassword || newPassword.length < MIN_PASSWORD_LENGTH) {
            return { 
                success: false, 
                error: `New password must be at least ${MIN_PASSWORD_LENGTH} characters long.` 
            };
        }

        // Get user email for reauthentication
        const email = currentUser.email;
        if (!email) {
            return { 
                success: false, 
                error: 'Unable to verify user. Please sign in again.' 
            };
        }

        // Create credential for reauthentication
        const credential = EmailAuthProvider.credential(email, currentPassword);

        // Reauthenticate user
        await reauthenticateWithCredential(currentUser, credential);

        // Update password
        await updatePassword(currentUser, newPassword);

        // Update cache timestamp
        cacheAuthState(currentUser);

        return { 
            success: true, 
            message: 'Password changed successfully!' 
        };
    } catch (error) {
        console.error('Password change failed:', error.code);
        
        let errorMessage = 'Failed to change password. Please try again.';
        
        if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
            errorMessage = 'Current password is incorrect. Please try again.';
        } else if (error.code === 'auth/weak-password') {
            errorMessage = 'New password is too weak. Please use at least 6 characters.';
        } else if (error.code === 'auth/requires-recent-login') {
            errorMessage = 'For security reasons, please sign out and sign in again before changing your password.';
        } else if (error.code === 'auth/too-many-requests') {
            errorMessage = 'Too many failed attempts. Please wait a few minutes and try again.';
        } else if (error.code === 'auth/network-request-failed') {
            errorMessage = 'Network error. Please check your internet connection and try again.';
        }

        return { success: false, error: errorMessage };
    }
}

/**
 * Update user display name
 * @param {string} newDisplayName - New display name to set
 * @returns {Promise<Object>} Result object with success status and message
 */
export async function updateDisplayName(newDisplayName) {
    try {
        if (!currentUser) {
            return { 
                success: false, 
                error: 'No user is currently signed in. Please sign in again.' 
            };
        }

        // Validate display name
        const trimmedName = newDisplayName?.trim();
        if (!trimmedName) {
            return { 
                success: false, 
                error: 'Display name cannot be empty.' 
            };
        }

        if (trimmedName.length > 50) {
            return { 
                success: false, 
                error: 'Display name must be 50 characters or less.' 
            };
        }

        // Update profile
        await updateProfile(currentUser, {
            displayName: trimmedName
        });

        // Update cache
        cacheAuthState(currentUser);

        return { 
            success: true, 
            message: 'Display name updated successfully!',
            displayName: trimmedName
        };
    } catch (error) {
        console.error('Display name update failed:', error.code);
        return { 
            success: false, 
            error: 'Failed to update display name. Please try again.' 
        };
    }
}

/**
 * Update user phone number in Firebase Database
 * @param {string} phoneNumber - Phone number to set
 * @returns {Promise<Object>} Result object with success status and message
 */
export async function updatePhoneNumber(phoneNumber) {
    try {
        if (!currentUser) {
            return { 
                success: false, 
                error: 'No user is currently signed in. Please sign in again.' 
            };
        }

        // Validate phone number format (basic validation)
        const trimmedPhone = phoneNumber ? phoneNumber.trim() : '';
        
        if (trimmedPhone && !/^[0-9+\-\s()]+$/.test(trimmedPhone)) {
            return { 
                success: false, 
                error: 'Please enter a valid phone number.' 
            };
        }

        // Store in Firebase Database under user profile
        const userPhoneRef = dbRef(database, `users/${currentUser.uid}/phoneNumber`);
        await set(userPhoneRef, trimmedPhone || null);

        return { 
            success: true, 
            message: trimmedPhone ? 'Phone number updated successfully!' : 'Phone number removed successfully!',
            phoneNumber: trimmedPhone
        };
    } catch (error) {
        console.error('Phone number update failed:', error.code, error.message);
        return { 
            success: false, 
            error: 'Failed to update phone number. Please try again.' 
        };
    }
}

/**
 * Get user phone number from Firebase Database
 * @returns {Promise<string|null>} Phone number or null if not set
 */
export async function getPhoneNumber() {
    try {
        if (!currentUser) {
            return null;
        }

        const userPhoneRef = dbRef(database, `users/${currentUser.uid}/phoneNumber`);
        const snapshot = await get(userPhoneRef);
        
        if (snapshot.exists()) {
            return snapshot.val();
        }
        return null;
    } catch (error) {
        console.error('Failed to get phone number:', error.code, error.message);
        return null;
    }
}

/**
 * Delete user account (requires reauthentication)
 * @param {string} password - Current password for reauthentication
 * @returns {Promise<Object>} Result object with success status and message
 */
export async function deleteUserAccount(password) {
    try {
        if (!currentUser) {
            return { 
                success: false, 
                error: 'No user is currently signed in.' 
            };
        }

        const email = currentUser.email;
        if (!email) {
            return { 
                success: false, 
                error: 'Unable to verify user. Please sign in again.' 
            };
        }

        // Create credential for reauthentication
        const credential = EmailAuthProvider.credential(email, password);

        // Reauthenticate user before deletion
        await reauthenticateWithCredential(currentUser, credential);

        // Delete user
        await deleteUser(currentUser);

        // Clear cache
        sessionStorage.removeItem(AUTH_CACHE_KEY);

        return { 
            success: true, 
            message: 'Account deleted successfully.' 
        };
    } catch (error) {
        console.error('Account deletion failed:', error.code);
        
        let errorMessage = 'Failed to delete account. Please try again.';
        
        if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
            errorMessage = 'Password is incorrect. Please try again.';
        } else if (error.code === 'auth/requires-recent-login') {
            errorMessage = 'For security reasons, please sign out and sign in again before deleting your account.';
        } else if (error.code === 'auth/too-many-requests') {
            errorMessage = 'Too many failed attempts. Please wait a few minutes and try again.';
        }

        return { success: false, error: errorMessage };
    }
}

/**
 * Get detailed user information
 * @returns {Object|null} User details object or null if not signed in
 */
export function getUserDetails() {
    if (!currentUser) {
        return null;
    }

    return {
        uid: currentUser.uid,
        email: currentUser.email,
        displayName: currentUser.displayName,
        photoURL: currentUser.photoURL,
        emailVerified: currentUser.emailVerified,
        creationTime: currentUser.metadata?.creationTime,
        lastSignInTime: currentUser.metadata?.lastSignInTime,
        providerId: currentUser.providerData?.[0]?.providerId || 'password'
    };
}

/**
 * Check if user is authenticated
 * Returns true if user is logged in (from Firebase or cache)
 * @returns {boolean} True if user is authenticated
 */
export function isAuthenticated() {
    if (currentUser !== null) {
        return true;
    }
    
    // If auth state hasn't been resolved yet, check cache
    if (!authStateResolved) {
        const cached = getCachedAuthState();
        return cached !== null;
    }
    
    return false;
}

/**
 * Get user-friendly error messages
 * @param {string} errorCode - Firebase error code
 * @returns {string} User-friendly error message
 */
function getAuthErrorMessage(errorCode) {
    const errorMessages = {
        'auth/email-already-in-use': 'This email is already registered. Please sign in instead.',
        'auth/invalid-email': 'Please enter a valid email address.',
        'auth/operation-not-allowed': 'Email/password sign in is not enabled. Please contact support.',
        'auth/weak-password': 'Password should be at least 6 characters long.',
        'auth/user-disabled': 'This account has been disabled. Please contact support.',
        'auth/user-not-found': 'No account found with this email. Please sign up first.',
        'auth/wrong-password': 'Incorrect password. Please try again.',
        'auth/invalid-credential': 'Invalid email or password. Please try again.',
        'auth/too-many-requests': 'Too many failed attempts. Please try again later.',
        'auth/network-request-failed': 'Network error. Please check your internet connection.',
        'auth/popup-closed-by-user': 'Sign in cancelled. Please try again.'
    };
    
    return errorMessages[errorCode] || 'An unexpected error occurred. Please try again.';
}

/**
 * Send email verification to current user
 * @returns {Promise<Object>} Result object with success status and message
 */
export async function sendVerificationEmail() {
    try {
        if (!currentUser) {
            return { 
                success: false, 
                error: 'No user is currently signed in' 
            };
        }
        
        if (currentUser.emailVerified) {
            return { 
                success: false, 
                error: 'Email is already verified' 
            };
        }
        
        await sendEmailVerification(currentUser);
        
        return { 
            success: true, 
            message: 'Verification email sent! Please check your inbox and spam folder.' 
        };
    } catch (error) {
        return { 
            success: false, 
            error: getErrorMessage(error.code) 
        };
    }
}

/**
 * Check if current user's email is verified
 * @returns {boolean} True if email is verified
 */
export function isEmailVerified() {
    return currentUser ? currentUser.emailVerified : false;
}

/**
 * Check if the current user is an admin
 * @param {Object} user - Optional user object, defaults to currentUser
 * @returns {Promise<boolean>} True if user is admin
 */
export async function isUserAdmin(user = null) {
    const checkUser = user || currentUser;
    
    if (!checkUser) {
        console.log('isUserAdmin: No user to check');
        return false;
    }
    
    const userEmail = checkUser.email?.toLowerCase();
    console.log('isUserAdmin: Checking admin status for:', userEmail);
    
    // Method 1: Check if primary admin
    if (userEmail === PRIMARY_ADMIN_EMAIL.toLowerCase()) {
        console.log('isUserAdmin: User is PRIMARY admin');
        return true;
    }
    
    // Method 2: Check database admin list
    try {
        const adminEmails = await getAdminEmailsFromDB();
        console.log('isUserAdmin: Admin emails from DB:', adminEmails);
        if (adminEmails.includes(userEmail)) {
            console.log('isUserAdmin: User found in admin list');
            return true;
        }
    } catch (error) {
        console.error('Error checking admin list:', error);
    }
    
    // Method 3: Check user's role in their profile
    try {
        const userRef = dbRef(database, `users/${checkUser.uid}/role`);
        const snapshot = await get(userRef);
        if (snapshot.exists() && snapshot.val() === 'admin') {
            console.log('isUserAdmin: User has admin role in profile');
            return true;
        }
    } catch (error) {
        console.error('Error checking admin status:', error);
    }
    
    console.log('isUserAdmin: User is NOT admin');
    return false;
}

/**
 * Get admin emails from database with caching
 * @returns {Promise<string[]>} Array of admin emails
 */
async function getAdminEmailsFromDB() {
    const now = Date.now();
    
    // Return cached if valid
    if (cachedAdminEmails && (now - adminCacheTimestamp) < ADMIN_CACHE_DURATION_MS) {
        return cachedAdminEmails;
    }
    
    try {
        const adminsRef = dbRef(database, 'adminUsers');
        const snapshot = await get(adminsRef);
        
        if (snapshot.exists()) {
            const adminsData = snapshot.val();
            cachedAdminEmails = Object.values(adminsData)
                .filter(admin => admin.active !== false)
                .map(admin => admin.email?.toLowerCase());
        } else {
            cachedAdminEmails = [];
        }
        
        adminCacheTimestamp = now;
        return cachedAdminEmails;
    } catch (error) {
        console.error('Error fetching admin emails:', error);
        return cachedAdminEmails || [];
    }
}

/**
 * Clear admin cache (call when admin list changes)
 */
export function clearAdminCache() {
    cachedAdminEmails = null;
    adminCacheTimestamp = 0;
}

/**
 * Check if email is the primary admin
 * @param {string} email - Email to check
 * @returns {boolean}
 */
export function isPrimaryAdmin(email) {
    return email?.toLowerCase() === PRIMARY_ADMIN_EMAIL.toLowerCase();
}

/**
 * Get primary admin email
 * @returns {string}
 */
export function getPrimaryAdminEmail() {
    return PRIMARY_ADMIN_EMAIL;
}

/**
 * Update UI elements based on authentication state
 * @param {Object|null} user - Current user object
 */
async function updateAuthUI(user) {
    const authButtons = document.getElementById('authButtons');
    const userProfile = document.getElementById('userProfile');
    const userEmail = document.getElementById('userEmail');
    const analysisContent = document.getElementById('analysisContent');
    const authPrompt = document.getElementById('authPrompt');
    const adminPanelLink = document.getElementById('adminPanelLink');
    
    if (user) {
        // User is logged in - hide auth buttons, show user profile
        if (authButtons) {
            authButtons.style.setProperty('display', 'none', 'important');
        }
        
        if (userProfile) {
            userProfile.style.setProperty('display', 'flex', 'important');
        }
        
        if (userEmail) {
            userEmail.textContent = user.displayName || user.email;
        }
        
        if (analysisContent) {
            analysisContent.style.display = 'block';
        }
        if (authPrompt) {
            authPrompt.style.display = 'none';
        }
        
        // Check and show admin link if user is admin
        if (adminPanelLink) {
            const isAdmin = await isUserAdmin(user);
            console.log('Admin check result:', isAdmin, 'for user:', user.email);
            adminPanelLink.style.display = isAdmin ? 'block' : 'none';
        }
    } else {
        // User is logged out - show auth buttons, hide user profile
        if (authButtons) {
            authButtons.style.setProperty('display', 'flex', 'important');
        }
        
        if (userProfile) {
            userProfile.style.setProperty('display', 'none', 'important');
        }
        
        if (analysisContent) {
            analysisContent.style.display = 'none';
        }
        if (authPrompt) {
            authPrompt.style.display = 'block';
        }
        
        // Hide admin link when logged out
        if (adminPanelLink) {
            adminPanelLink.style.display = 'none';
        }
    }
}
