/**
 * Firebase Configuration and Initialization
 * 
 * This file contains the Firebase project configuration and initializes
 * Firebase services including Auth, Realtime Database, and Analytics.
 * 
 * @module firebase-config
 */

// Import Firebase SDKs
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-auth.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-database.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-analytics.js";

/**
 * Firebase Configuration Object
 * Contains all necessary credentials and settings for Firebase services
 */
const firebaseConfig = {
    apiKey: "AIzaSyBZQaXHNEojsxVquSgOcClmVlWG0Vsjd4E",
    authDomain: "stock-analysis-51b9a.firebaseapp.com",
    projectId: "stock-analysis-51b9a",
    storageBucket: "stock-analysis-51b9a.firebasestorage.app",
    messagingSenderId: "382958286310",
    appId: "1:382958286310:web:9b01a2a4ff1d0f8c749227",
    measurementId: "G-6W4B01Q2TR",
    databaseURL: "https://stock-analysis-51b9a-default-rtdb.firebaseio.com" // Add your database URL
};

/**
 * Initialize Firebase App
 */
const app = initializeApp(firebaseConfig);

/**
 * Initialize Firebase Services
 */
const auth = getAuth(app);
const database = getDatabase(app);
const analytics = getAnalytics(app);

/**
 * Export Firebase instances for use in other modules
 */
export { app, auth, database, analytics };
