/**
 * Firebase Authentication Service
 * 
 * Handles user authentication including sign up, sign in, sign out,
 * and user session management.
 * 
 * @module firebase-auth-service
 */

import { auth } from './firebase-config.js';
import { 
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    GoogleAuthProvider,
    signInWithPopup,
    updateProfile,
    sendPasswordResetEmail,
    sendEmailVerification
} from "https://www.gstatic.com/firebasejs/11.1.0/firebase-auth.js";

/**
 * Current user object
 */
let currentUser = null;

/**
 * Auth state change callbacks
 */
const authStateCallbacks = [];

/**
 * Initialize auth state listener
 */
export function initAuthListener() {
    updateAuthUI(null);
    
    onAuthStateChanged(auth, (user) => {
        currentUser = user;
        
        authStateCallbacks.forEach(callback => callback(user));
        
        updateAuthUI(user);
    });
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
 * @returns {Object|null} Current user object or null
 */
export function getCurrentUser() {
    return currentUser;
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
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise<Object>} User credential object
 */
export async function signInUser(email, password) {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        return { success: true, user: userCredential.user };
    } catch (error) {
        console.error('Sign in failed:', error.code);
        throw new Error(getAuthErrorMessage(error.code));
    }
}

// Alias for compatibility
export const loginUser = signInUser;

/**
 * Sign in with Google popup
 * @returns {Promise<Object>} User credential object
 */
export async function signInWithGoogle() {
    try {
        const provider = new GoogleAuthProvider();
        const userCredential = await signInWithPopup(auth, provider);
        return { success: true, user: userCredential.user };
    } catch (error) {
        console.error('Google sign-in failed:', error.code);
        return { success: false, error: getAuthErrorMessage(error.code) };
    }
}

/**
 * Sign out current user
 * @returns {Promise<Object>} Success status
 */
export async function signOutUser() {
    try {
        await signOut(auth);
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
 * Check if user is authenticated
 * @returns {boolean} True if user is authenticated
 */
export function isAuthenticated() {
    return currentUser !== null;
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
 * Update UI elements based on authentication state
 * @param {Object|null} user - Current user object
 */
function updateAuthUI(user) {
    const authButtons = document.getElementById('authButtons');
    const userProfile = document.getElementById('userProfile'); 
    const userInfo = document.getElementById('userInfo'); 
    const userEmail = document.getElementById('userEmail');
    const analysisContent = document.getElementById('analysisContent');
    const authPrompt = document.getElementById('authPrompt');
    
    if (user) {
        if (authButtons) {
            authButtons.style.setProperty('display', 'none', 'important');
        }
        
        if (userProfile) {
            userProfile.style.setProperty('display', 'flex', 'important');
        }
        
        if (userEmail) {
            userEmail.textContent = user.displayName || user.email;
        }
        
        if (userInfo) {
            userInfo.style.setProperty('display', 'flex', 'important');
        }
        
        if (analysisContent) analysisContent.style.display = 'block';
        if (authPrompt) authPrompt.style.display = 'none';
    } else {
        if (authButtons) {
            authButtons.style.setProperty('display', 'flex', 'important');
        }
        
        if (userProfile) {
            userProfile.style.setProperty('display', 'none', 'important');
        }
        
        if (userInfo) {
            userInfo.style.setProperty('display', 'none', 'important');
        }
        
        if (analysisContent) analysisContent.style.display = 'none';
        if (authPrompt) authPrompt.style.display = 'block';
    }
}
