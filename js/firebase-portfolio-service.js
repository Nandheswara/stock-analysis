/**
 * Firebase Portfolio Service
 * 
 * Handles all database operations for stock portfolio manager including:
 * - CRUD operations for portfolio stocks
 * - Real-time sync with Firebase
 * - Offline support with localStorage caching for instant loading
 * - User-specific data management
 * 
 * @module firebase-portfolio-service
 */

import { database } from './firebase-config.js';
import { getCurrentUser, waitForAuthReady } from './firebase-auth-service.js';
import { 
    ref, 
    set, 
    get, 
    update, 
    remove, 
    onValue, 
    push
} from "https://www.gstatic.com/firebasejs/11.1.0/firebase-database.js";

/**
 * Cache keys
 */
const CACHE_KEYS = {
    PORTFOLIO: 'portfolioCache',
    SESSION: 'stockPortfolio'
};

/**
 * Cache duration (1 hour)
 */
const CACHE_DURATION = 60 * 60 * 1000;

let portfolioListener = null;
let isCacheWarmed = false;

/**
 * Save portfolio to localStorage cache
 * @param {string} userId - User ID
 * @param {Array} stocks - Portfolio stocks
 */
function saveToLocalCache(userId, stocks) {
    try {
        const cacheKey = `${CACHE_KEYS.PORTFOLIO}_${userId}`;
        localStorage.setItem(cacheKey, JSON.stringify(stocks));
        localStorage.setItem(`${cacheKey}_timestamp`, Date.now().toString());
    } catch (error) {
        // Silent fail
    }
}

/**
 * Load portfolio from localStorage cache
 * @param {string} userId - User ID
 * @returns {Array|null} Cached portfolio or null
 */
function loadFromLocalCache(userId) {
    try {
        const cacheKey = `${CACHE_KEYS.PORTFOLIO}_${userId}`;
        const cached = localStorage.getItem(cacheKey);
        const timestamp = localStorage.getItem(`${cacheKey}_timestamp`);
        
        if (cached && timestamp) {
            const cacheAge = Date.now() - parseInt(timestamp);
            if (cacheAge < CACHE_DURATION) {
                return JSON.parse(cached);
            }
        }
    } catch (error) {
        // Silent fail
    }
    return null;
}

function getUserPortfolioRef() {
    const user = getCurrentUser();
    if (!user) {
        return null;
    }
    return ref(database, `users/${user.uid}/portfolio`);
}

function getPortfolioStockRef(stockId) {
    const user = getCurrentUser();
    if (!user) {
        return null;
    }
    return ref(database, `users/${user.uid}/portfolio/${stockId}`);
}

/**
 * Save portfolio stock to Firebase
 * @param {Object} stock - Stock object to save
 * @returns {Promise<Object>} Saved stock with ID
 */
export async function savePortfolioStock(stock) {
    let user = getCurrentUser();
    
    // If user is from cache, wait for Firebase to confirm auth
    if (user && user._fromCache) {
        user = await waitForAuthReady();
    }
    
    if (!user) {
        return { success: false, offline: true };
    }

    try {
        // Use user.uid directly instead of calling getPortfolioStockRef()
        const stockRef = ref(database, `users/${user.uid}/portfolio/${stock.id}`);
        
        const stockData = {
            name: stock.name,
            quantity: stock.quantity,
            buyPrice: stock.buyPrice,
            sellPrice: stock.sellPrice,
            buyBrokerage: stock.buyBrokerage,
            buyTaxTotal: stock.buyTaxTotal,
            sellBrokerage: stock.sellBrokerage,
            sellTaxTotal: stock.sellTaxTotal,
            totalCost: stock.totalCost,
            totalRevenue: stock.totalRevenue,
            profitLoss: stock.profitLoss,
            dateAdded: stock.dateAdded,
            lastModified: new Date().toISOString()
        };

        await set(stockRef, stockData);
        
        return { success: true, stock: { ...stockData, id: stock.id } };
    } catch (error) {
        throw error;
    }
}

/**
 * Load all portfolio stocks from Firebase
 * Optimized with localStorage cache for instant loading
 * @param {boolean} useCache - Whether to use cached data (default: true)
 * @returns {Promise<Array>} Array of stock objects
 */
export async function loadPortfolioStocks(useCache = true) {
    let user = getCurrentUser();
    
    // If user is from cache, wait for Firebase to confirm auth
    if (user && user._fromCache) {
        // Return cached data immediately while waiting for auth
        if (useCache) {
            const cachedData = loadFromLocalCache(user.uid);
            if (cachedData && cachedData.length > 0) {
                // Return cached data immediately, fetch in background
                waitForAuthReady().then(async (confirmedUser) => {
                    if (confirmedUser) {
                        // Background refresh - will update through listener
                        try {
                            const portfolioRef = ref(database, `users/${confirmedUser.uid}/portfolio`);
                            const snapshot = await get(portfolioRef);
                            if (snapshot.exists()) {
                                const data = snapshot.val();
                                const stocksArray = Object.keys(data).map(key => ({
                                    ...data[key],
                                    id: key
                                }));
                                saveToLocalCache(confirmedUser.uid, stocksArray);
                            }
                        } catch (e) {
                            // Silent fail for background refresh
                        }
                    }
                });
                return cachedData;
            }
        }
        user = await waitForAuthReady();
    }
    
    if (!user) {
        return [];
    }

    // Check cache first for instant return
    if (useCache) {
        const cachedData = loadFromLocalCache(user.uid);
        if (cachedData && cachedData.length > 0) {
            // Return cached data, but trigger background refresh
            queueMicrotask(async () => {
                try {
                    const portfolioRef = ref(database, `users/${user.uid}/portfolio`);
                    const snapshot = await get(portfolioRef);
                    if (snapshot.exists()) {
                        const data = snapshot.val();
                        const stocksArray = Object.keys(data).map(key => ({
                            ...data[key],
                            id: key
                        }));
                        saveToLocalCache(user.uid, stocksArray);
                    }
                } catch (e) {
                    // Silent fail
                }
            });
            return cachedData;
        }
    }

    try {
        // Use user.uid directly instead of calling getUserPortfolioRef()
        const portfolioRef = ref(database, `users/${user.uid}/portfolio`);
        const snapshot = await get(portfolioRef);
        
        if (snapshot.exists()) {
            const data = snapshot.val();
            const stocksArray = Object.keys(data).map(key => ({
                ...data[key],
                id: key
            }));
            
            // Cache the fetched data for next time
            saveToLocalCache(user.uid, stocksArray);
            
            return stocksArray;
        }
        
        return [];
    } catch (error) {
        throw error;
    }
}

/**
 * Update a portfolio stock in Firebase
 * @param {string} stockId - Stock ID to update
 * @param {Object} updates - Object containing fields to update
 * @returns {Promise<boolean>} Success status
 */
export async function updatePortfolioStock(stockId, updates) {
    let user = getCurrentUser();
    
    // If user is from cache, wait for Firebase to confirm auth
    if (user && user._fromCache) {
        user = await waitForAuthReady();
    }
    
    if (!user) {
        return false;
    }

    try {
        // Use user.uid directly instead of calling getPortfolioStockRef()
        const stockRef = ref(database, `users/${user.uid}/portfolio/${stockId}`);
        
        const updateData = {
            ...updates,
            lastModified: new Date().toISOString()
        };

        await update(stockRef, updateData);
        
        return true;
    } catch (error) {
        throw error;
    }
}

/**
 * Delete a portfolio stock from Firebase
 * @param {string} stockId - Stock ID to delete
 * @returns {Promise<boolean>} Success status
 */
export async function deletePortfolioStock(stockId) {
    let user = getCurrentUser();
    
    // If user is from cache, wait for Firebase to confirm auth
    if (user && user._fromCache) {
        user = await waitForAuthReady();
    }
    
    if (!user) {
        return false;
    }

    try {
        // Use user.uid directly instead of calling getPortfolioStockRef()
        const stockRef = ref(database, `users/${user.uid}/portfolio/${stockId}`);
        await remove(stockRef);
        
        return true;
    } catch (error) {
        throw error;
    }
}

/**
 * Listen to real-time portfolio data changes
 * Optimized with localStorage cache for instant loading
 * @param {Function} callback - Callback function to handle portfolio data updates
 * @returns {Function} Unsubscribe function
 */
export function listenToPortfolio(callback) {
    let user = getCurrentUser();
    
    // Get userId from either confirmed user or cached user
    const userId = user?.uid;
    
    // ALWAYS try to serve cached data first for instant display
    if (userId) {
        const cachedData = loadFromLocalCache(userId);
        if (cachedData && cachedData.length > 0) {
            isCacheWarmed = true;
            // Serve cached data immediately (synchronously via microtask)
            queueMicrotask(() => callback(cachedData));
        }
    }
    
    // If user is from cache, wait for Firebase auth in background
    if (user && user._fromCache) {
        waitForAuthReady().then((confirmedUser) => {
            if (confirmedUser) {
                setupPortfolioListener(confirmedUser, callback, isCacheWarmed);
            }
        });
        return () => {
            if (portfolioListener) {
                portfolioListener();
                portfolioListener = null;
            }
        };
    }
    
    if (!user) {
        return () => {};
    }
    
    return setupPortfolioListener(user, callback, isCacheWarmed);
}

/**
 * Set up Firebase real-time listener for portfolio
 * @param {Object} user - Authenticated user object
 * @param {Function} callback - Callback function
 * @param {boolean} cacheAlreadyServed - Whether cache was already served
 * @returns {Function} Unsubscribe function
 */
function setupPortfolioListener(user, callback, cacheAlreadyServed = false) {
    const portfolioRef = ref(database, `users/${user.uid}/portfolio`);
    let isFirstLoad = true;
    
    portfolioListener = onValue(portfolioRef, (snapshot) => {
        const data = snapshot.val();
        const stocksArray = data ? Object.keys(data).map(key => ({
            ...data[key],
            id: key
        })) : [];
        
        // Save to cache
        saveToLocalCache(user.uid, stocksArray);
        
        // Skip first callback if cache was already served and data matches
        if (isFirstLoad && cacheAlreadyServed) {
            isFirstLoad = false;
            const cachedData = loadFromLocalCache(user.uid);
            if (cachedData && JSON.stringify(cachedData) === JSON.stringify(stocksArray)) {
                return; // Data unchanged from cache
            }
        }
        
        isFirstLoad = false;
        callback(stocksArray);
    }, (error) => {
        // Silent fail for listener errors
    });
    
    return () => {
        if (portfolioListener) {
            portfolioListener();
            portfolioListener = null;
        }
    };
}

/**
 * Sync all portfolio stocks to Firebase
 * @param {Array} stocks - Array of stock objects to sync
 * @returns {Promise<boolean>} Success status
 */
export async function syncPortfolioToFirebase(stocks) {
    let user = getCurrentUser();
    
    // If user is from cache, wait for Firebase to confirm auth
    if (user && user._fromCache) {
        user = await waitForAuthReady();
    }
    
    if (!user) {
        return false;
    }

    try {
        // Use user.uid directly instead of calling getUserPortfolioRef()
        const portfolioRef = ref(database, `users/${user.uid}/portfolio`);
        
        const portfolioData = {};
        stocks.forEach(stock => {
            portfolioData[stock.id] = {
                name: stock.name,
                quantity: stock.quantity,
                buyPrice: stock.buyPrice,
                sellPrice: stock.sellPrice,
                buyBrokerage: stock.buyBrokerage,
                buyTaxTotal: stock.buyTaxTotal,
                sellBrokerage: stock.sellBrokerage,
                sellTaxTotal: stock.sellTaxTotal,
                totalCost: stock.totalCost,
                totalRevenue: stock.totalRevenue,
                profitLoss: stock.profitLoss,
                dateAdded: stock.dateAdded,
                lastModified: new Date().toISOString()
            };
        });

        await set(portfolioRef, portfolioData);
        
        return true;
    } catch (error) {
        throw error;
    }
}

/**
 * Clear all portfolio data from Firebase
 * @returns {Promise<boolean>} Success status
 */
export async function clearPortfolio() {
    let user = getCurrentUser();
    
    // If user is from cache, wait for Firebase to confirm auth
    if (user && user._fromCache) {
        user = await waitForAuthReady();
    }
    
    if (!user) {
        return false;
    }

    try {
        // Use user.uid directly instead of calling getUserPortfolioRef()
        const portfolioRef = ref(database, `users/${user.uid}/portfolio`);
        await remove(portfolioRef);
        
        return true;
    } catch (error) {
        throw error;
    }
}
