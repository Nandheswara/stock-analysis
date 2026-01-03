/**
 * Firebase Database Service
 * 
 * Handles all database operations for stock data including CRUD operations,
 * real-time listeners, and offline support with localStorage caching for instant loading.
 * 
 * @module firebase-database-service
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
    push,
    child,
    query,
    orderByChild
} from "https://www.gstatic.com/firebasejs/11.1.0/firebase-database.js";

/**
 * Cache keys for localStorage
 */
const CACHE_KEYS = {
    STOCKS: 'stocksCache',
    STOCKS_TIMESTAMP: 'stocksCacheTimestamp',
    SESSION_STOCKS: 'analysisStocks'
};

/**
 * Cache duration in milliseconds (1 hour for data cache)
 */
const DATA_CACHE_DURATION = 60 * 60 * 1000;

/**
 * Local cache for offline support
 */
let localStocksCache = [];
let isOnline = navigator.onLine;
let stocksListener = null;
let isCacheWarmed = false;

window.addEventListener('online', () => {
    isOnline = true;
    syncOfflineData();
});

window.addEventListener('offline', () => {
    isOnline = false;
});

/**
 * Save data to localStorage cache for instant loading
 * @param {string} userId - User ID for cache key
 * @param {Array} stocks - Stocks data to cache
 */
function saveToLocalCache(userId, stocks) {
    try {
        const cacheKey = `${CACHE_KEYS.STOCKS}_${userId}`;
        localStorage.setItem(cacheKey, JSON.stringify(stocks));
        localStorage.setItem(`${cacheKey}_timestamp`, Date.now().toString());
    } catch (error) {
        // Silent fail - localStorage might be full or disabled
    }
}

/**
 * Load data from localStorage cache for instant display
 * @param {string} userId - User ID for cache key
 * @returns {Array|null} Cached stocks or null if cache is invalid/missing
 */
function loadFromLocalCache(userId) {
    try {
        const cacheKey = `${CACHE_KEYS.STOCKS}_${userId}`;
        const cached = localStorage.getItem(cacheKey);
        const timestamp = localStorage.getItem(`${cacheKey}_timestamp`);
        
        if (cached && timestamp) {
            const cacheAge = Date.now() - parseInt(timestamp);
            // Return cached data if within cache duration
            if (cacheAge < DATA_CACHE_DURATION) {
                return JSON.parse(cached);
            }
        }
    } catch (error) {
        // Silent fail
    }
    return null;
}

/**
 * Clear localStorage cache for a user
 * @param {string} userId - User ID for cache key
 */
function clearLocalCache(userId) {
    try {
        const cacheKey = `${CACHE_KEYS.STOCKS}_${userId}`;
        localStorage.removeItem(cacheKey);
        localStorage.removeItem(`${cacheKey}_timestamp`);
    } catch (error) {
        // Silent fail
    }
}

/**
 * Get user-specific database reference
 * @returns {Object} Firebase database reference for current user's stocks
 */
function getUserStocksRef() {
    const user = getCurrentUser();
    if (!user) {
        throw new Error('User must be authenticated');
    }
    return ref(database, `users/${user.uid}/stocks`);
}

/**
 * Get reference to a specific stock
 * @param {string} stockId - Stock ID
 * @returns {Object} Firebase database reference
 */
function getStockRef(stockId) {
    const user = getCurrentUser();
    if (!user) {
        throw new Error('User must be authenticated');
    }
    return ref(database, `users/${user.uid}/stocks/${stockId}`);
}

/**
 * Listen to real-time stock data changes
 * Optimized with localStorage cache for instant loading
 * @param {Function} callback - Callback function to handle stock data updates
 * @returns {Function} Unsubscribe function
 */
export function listenToStocks(callback) {
    let user = getCurrentUser();
    
    // Reset cache state when setting up a new listener
    // This ensures proper behavior when navigating between pages or restoring from bfcache
    isCacheWarmed = false;
    localStocksCache = [];
    
    // Unsubscribe from any existing listener
    if (stocksListener) {
        stocksListener();
        stocksListener = null;
    }
    
    // If user is from cache, we need to wait for Firebase to confirm
    // because Firebase Database requires actual auth token, not just uid
    if (user && user._fromCache) {
        // Try localStorage cache first for instant display
        const cachedData = loadFromLocalCache(user.uid);
        if (cachedData && cachedData.length > 0) {
            isCacheWarmed = true;
            localStocksCache = cachedData;
            // Immediate callback with cached data - no loading delay
            queueMicrotask(() => callback(cachedData));
        } else {
            // Fallback to sessionStorage
            const sessionData = loadFromSessionStorage();
            if (sessionData.length > 0) {
                queueMicrotask(() => callback(sessionData));
            }
        }
        
        // Wait for auth and then set up real listener in background
        waitForAuthReady().then((confirmedUser) => {
            if (confirmedUser) {
                setupFirebaseListener(confirmedUser, callback, isCacheWarmed);
            } else {
                // User not authenticated, show empty or cached data
                const fallbackData = loadFromSessionStorage();
                callback(fallbackData);
            }
        });
        
        return () => {
            if (stocksListener) {
                stocksListener();
                stocksListener = null;
            }
        };
    }
    
    if (!user) {
        const localData = loadFromSessionStorage();
        callback(localData);
        return () => {};
    }
    
    // For confirmed users, check localStorage cache first
    const cachedData = loadFromLocalCache(user.uid);
    if (cachedData && cachedData.length > 0 && !isCacheWarmed) {
        isCacheWarmed = true;
        localStocksCache = cachedData;
        // Immediate callback with cached data
        queueMicrotask(() => callback(cachedData));
    }
    
    return setupFirebaseListener(user, callback, isCacheWarmed);
}

/**
 * Set up Firebase real-time listener for stocks
 * Optimized to skip redundant callbacks when cache was already served
 * @param {Object} user - Authenticated user object
 * @param {Function} callback - Callback function
 * @param {boolean} cacheAlreadyServed - Whether cached data was already sent to callback
 * @returns {Function} Unsubscribe function
 */
function setupFirebaseListener(user, callback, cacheAlreadyServed = false) {
    const stocksRef = ref(database, `users/${user.uid}/stocks`);
    let isFirstLoad = true;
    
    stocksListener = onValue(stocksRef, (snapshot) => {
        const data = snapshot.val();
        const stocksArray = data ? Object.keys(data).map(key => ({
            ...data[key],
            stock_id: key
        })) : [];
        
        // Check if data actually changed from cache BEFORE saving
        // This prevents unnecessary callback when cache is still valid
        if (isFirstLoad && cacheAlreadyServed) {
            isFirstLoad = false;
            const cachedData = loadFromLocalCache(user.uid);
            const cacheJSON = JSON.stringify(cachedData || []);
            const newJSON = JSON.stringify(stocksArray);
            
            // Update cache and local storage regardless
            localStocksCache = stocksArray;
            saveToLocalCache(user.uid, stocksArray);
            saveToSessionStorage(stocksArray);
            
            if (cacheJSON === newJSON) {
                return; // Skip callback - data matches cache
            }
            // Data changed, continue to callback
            callback(stocksArray);
            return;
        }
        
        isFirstLoad = false;
        localStocksCache = stocksArray;
        
        // Save to both localStorage (for instant loading) and sessionStorage (for backup)
        saveToLocalCache(user.uid, stocksArray);
        saveToSessionStorage(stocksArray);
        
        // Skip first callback if we already served cached data and data hasn't changed
        if (isFirstLoad && cacheAlreadyServed) {
            isFirstLoad = false;
            // Check if data actually changed from cache
            const cacheJSON = JSON.stringify(loadFromLocalCache(user.uid) || []);
            const newJSON = JSON.stringify(stocksArray);
            if (cacheJSON === newJSON) {
                return; // Skip - data matches cache
            }
        }
        
        isFirstLoad = false;
        callback(stocksArray);
    }, (error) => {
        console.error('Firebase listener error:', error.message);
        const localData = loadFromSessionStorage();
        callback(localData);
    });
    
    return () => {
        if (stocksListener) {
            stocksListener();
            stocksListener = null;
        }
    };
}

/**
 * Add a new stock to Firebase
 * Optimized for faster response - uses cached auth when available
 * @param {Object} stockData - Stock data object
 * @param {string} customStockId - Optional custom stock ID (for optimistic UI updates)
 * @returns {Promise<Object>} Result with success status and stock ID
 */
export async function addStock(stockData, customStockId = null) {
    let user = getCurrentUser();
    
    // If user is from cache, try to proceed with cached uid first
    // Firebase will use the persisted auth token
    if (!user) {
        return { success: false, error: 'User must be authenticated' };
    }
    
    // Get actual uid - either from Firebase user or cache
    const uid = user.uid;
    if (!uid) {
        return { success: false, error: 'User ID not available' };
    }
    
    try {
        // Use uid directly for faster operation
        const stocksRef = ref(database, `users/${uid}/stocks`);
        
        // Use custom ID if provided (for optimistic updates), otherwise generate new
        const stockId = customStockId || `stock_${Date.now()}`;
        const stockRef = child(stocksRef, stockId);
        
        const stockWithMeta = {
            ...stockData,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            userId: uid
        };
        
        await set(stockRef, stockWithMeta);
        
        // Note: We don't update localStocksCache here because the Firebase listener
        // will automatically fire and update the cache with the new data.
        // Updating here would cause duplicates.
        
        return { 
            success: true, 
            stockId: stockId,
            message: 'Stock added successfully'
        };
        
    } catch (error) {
        console.error('Add stock failed:', error.message);
        
        // If auth error, try waiting for auth and retry once
        if (error.code === 'PERMISSION_DENIED' && user._fromCache) {
            const confirmedUser = await waitForAuthReady();
            if (confirmedUser) {
                return addStock(stockData, customStockId); // Retry with confirmed auth
            }
        }
        
        if (!isOnline) {
            // Use custom ID if provided, otherwise generate new
            const offlineStockId = customStockId || `stock_${Date.now()}`;
            const stockWithId = { ...stockData, stock_id: offlineStockId };
            localStocksCache.push(stockWithId);
            saveToSessionStorage(localStocksCache);
            
            return { 
                success: true, 
                stockId: offlineStockId,
                message: 'Stock saved offline - will sync when online',
                offline: true
            };
        }
        
        return { 
            success: false, 
            error: error.message 
        };
    }
}

/**
 * Update an existing stock in Firebase
 * @param {string} stockId - Stock ID
 * @param {Object} updates - Updated stock data
 * @returns {Promise<Object>} Result with success status
 */
export async function updateStock(stockId, updates) {
    let user = getCurrentUser();
    
    // If user is from cache, wait for Firebase to confirm auth
    if (user && user._fromCache) {
        user = await waitForAuthReady();
    }
    
    if (!user) {
        return { success: false, error: 'User must be authenticated' };
    }
    
    try {
        // Use user.uid directly instead of calling getStockRef()
        const stockRef = ref(database, `users/${user.uid}/stocks/${stockId}`);
        
        const updatesWithMeta = {
            ...updates,
            updatedAt: new Date().toISOString()
        };
        
        await update(stockRef, updatesWithMeta);
        
        return { 
            success: true,
            message: 'Stock updated successfully'
        };
        
    } catch (error) {
        console.error('Update stock failed:', error.message);
        
        if (!isOnline) {
            const index = localStocksCache.findIndex(s => s.stock_id === stockId);
            if (index !== -1) {
                localStocksCache[index] = { 
                    ...localStocksCache[index], 
                    ...updates 
                };
                saveToSessionStorage(localStocksCache);
                
                return { 
                    success: true,
                    message: 'Stock updated offline - will sync when online',
                    offline: true
                };
            }
        }
        
        return { 
            success: false, 
            error: error.message 
        };
    }
}

/**
 * Delete a stock from Firebase
 * @param {string} stockId - Stock ID to delete
 * @returns {Promise<Object>} Result with success status
 */
export async function deleteStock(stockId) {
    let user = getCurrentUser();
    
    // If user is from cache, wait for Firebase to confirm auth
    if (user && user._fromCache) {
        user = await waitForAuthReady();
    }
    
    if (!user) {
        return { success: false, error: 'User must be authenticated' };
    }
    
    try {
        // Use user.uid directly instead of calling getStockRef()
        const stockRef = ref(database, `users/${user.uid}/stocks/${stockId}`);
        
        await remove(stockRef);
        
        return { 
            success: true,
            message: 'Stock deleted successfully'
        };
        
    } catch (error) {
        console.error('Delete stock failed:', error.message);
        
        if (!isOnline) {
            localStocksCache = localStocksCache.filter(s => s.stock_id !== stockId);
            saveToSessionStorage(localStocksCache);
            
            return { 
                success: true,
                message: 'Stock deleted offline - will sync when online',
                offline: true
            };
        }
        
        return { 
            success: false, 
            error: error.message 
        };
    }
}

/**
 * Delete all stocks for current user
 * @returns {Promise<Object>} Result with success status
 */
export async function deleteAllStocks() {
    let user = getCurrentUser();
    
    // If user is from cache, wait for Firebase to confirm auth
    if (user && user._fromCache) {
        user = await waitForAuthReady();
    }
    
    if (!user) {
        return { success: false, error: 'User must be authenticated' };
    }
    
    try {
        // Use user.uid directly instead of calling getUserStocksRef()
        const stocksRef = ref(database, `users/${user.uid}/stocks`);
        
        await remove(stocksRef);
        
        localStocksCache = [];
        saveToSessionStorage([]);
        
        return { 
            success: true,
            message: 'All stocks deleted successfully'
        };
        
    } catch (error) {
        console.error('Delete all stocks failed:', error.message);
        return { 
            success: false, 
            error: error.message 
        };
    }
}

/**
 * Get a single stock by ID
 * @param {string} stockId - Stock ID
 * @returns {Promise<Object>} Stock data or null
 */
export async function getStock(stockId) {
    let user = getCurrentUser();
    
    // If user is from cache, wait for Firebase to confirm auth
    if (user && user._fromCache) {
        user = await waitForAuthReady();
    }
    
    if (!user) {
        return null;
    }
    
    try {
        // Use user.uid directly instead of calling getStockRef()
        const stockRef = ref(database, `users/${user.uid}/stocks/${stockId}`);
        const snapshot = await get(stockRef);
        
        if (snapshot.exists()) {
            return {
                ...snapshot.val(),
                stock_id: stockId
            };
        }
        
        return null;
        
    } catch (error) {
        return null;
    }
}

/**
 * Sync offline data when connection is restored
 */
async function syncOfflineData() {
    const localData = loadFromSessionStorage();
    
    if (localData.length === 0) {
        return;
    }
    
    for (const stock of localData) {
        try {
            if (stock.stock_id && stock.stock_id.startsWith('stock_')) {
                await addStock(stock);
            }
        } catch (error) {
            // Silent fail for individual stock sync errors
        }
    }
}

/**
 * Save stocks to sessionStorage (backup/offline support)
 * @param {Array} stocks - Array of stock objects
 */
function saveToSessionStorage(stocks) {
    try {
        sessionStorage.setItem('analysisStocks', JSON.stringify(stocks));
        sessionStorage.setItem('analysisStocksBackup', JSON.stringify({
            data: stocks,
            timestamp: new Date().toISOString()
        }));
    } catch (error) {
        // Silent fail for storage errors
    }
}

/**
 * Load stocks from sessionStorage
 * @returns {Array} Array of stock objects
 */
function loadFromSessionStorage() {
    try {
        const saved = sessionStorage.getItem('analysisStocks');
        if (saved) {
            return JSON.parse(saved);
        }
    } catch (error) {
        // Silent fail for storage errors
    }
    return [];
}

/**
 * Migrate existing sessionStorage data to Firebase
 * @returns {Promise<Object>} Migration result
 */
export async function migrateSessionStorageToFirebase() {
    let user = getCurrentUser();
    
    // If user is from cache, wait for Firebase to confirm auth
    if (user && user._fromCache) {
        user = await waitForAuthReady();
    }
    
    if (!user) {
        return { success: false, error: 'User must be authenticated' };
    }
    
    const localData = loadFromSessionStorage();
    
    if (localData.length === 0) {
        return { 
            success: true, 
            message: 'No local data to migrate',
            migrated: 0
        };
    }
    
    let migrated = 0;
    let failed = 0;
    
    for (const stock of localData) {
        try {
            const { stock_id, ...stockData } = stock;
            
            const result = await addStock(stockData);
            if (result.success) {
                migrated++;
            } else {
                failed++;
            }
        } catch (error) {
            failed++;
        }
    }
    
    return {
        success: true,
        message: `Migrated ${migrated} stocks to Firebase`,
        migrated: migrated,
        failed: failed
    };
}
