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
    updateProfile
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
    onAuthStateChanged(auth, (user) => {
        currentUser = user;
        console.log('Auth state changed:', user ? `User: ${user.email}` : 'No user');
        
        // Notify all registered callbacks
        authStateCallbacks.forEach(callback => callback(user));
        
        // Update UI based on auth state
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
        
        // Update user profile with display name
        if (displayName) {
            await updateProfile(userCredential.user, {
                displayName: displayName
            });
        }
        
        console.log('User signed up successfully:', userCredential.user.email);
        return { success: true, user: userCredential.user };
    } catch (error) {
        console.error('Sign up error:', error);
        return { success: false, error: getAuthErrorMessage(error.code) };
    }
}

/**
 * Sign in existing user with email and password
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise<Object>} User credential object
 */
export async function signInUser(email, password) {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        console.log('User signed in successfully:', userCredential.user.email);
        return { success: true, user: userCredential.user };
    } catch (error) {
        console.error('Sign in error:', error);
        return { success: false, error: getAuthErrorMessage(error.code) };
    }
}

/**
 * Sign in with Google popup
 * @returns {Promise<Object>} User credential object
 */
export async function signInWithGoogle() {
    try {
        const provider = new GoogleAuthProvider();
        const userCredential = await signInWithPopup(auth, provider);
        console.log('User signed in with Google:', userCredential.user.email);
        return { success: true, user: userCredential.user };
    } catch (error) {
        console.error('Google sign in error:', error);
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
        console.log('User signed out successfully');
        return { success: true };
    } catch (error) {
        console.error('Sign out error:', error);
        return { success: false, error: error.message };
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
 * Update UI elements based on authentication state
 * @param {Object|null} user - Current user object
 */
function updateAuthUI(user) {
    const authButtons = document.getElementById('authButtons');
    const userProfile = document.getElementById('userProfile');
    const userEmail = document.getElementById('userEmail');
    const analysisContent = document.getElementById('analysisContent');
    const authPrompt = document.getElementById('authPrompt');
    
    if (user) {
        // User is signed in
        if (authButtons) authButtons.style.display = 'none';
        if (userProfile) {
            userProfile.style.display = 'flex';
            if (userEmail) {
                userEmail.textContent = user.displayName || user.email;
            }
        }
        if (analysisContent) analysisContent.style.display = 'block';
        if (authPrompt) authPrompt.style.display = 'none';
    } else {
        // User is signed out
        if (authButtons) authButtons.style.display = 'flex';
        if (userProfile) userProfile.style.display = 'none';
        if (analysisContent) analysisContent.style.display = 'none';
        if (authPrompt) authPrompt.style.display = 'block';
    }
}
