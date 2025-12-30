/**
 * Firebase Database Service
 * 
 * Handles all database operations for stock data including CRUD operations,
 * real-time listeners, and offline support with localStorage fallback.
 * 
 * @module firebase-database-service
 */

import { database } from './firebase-config.js';
import { getCurrentUser } from './firebase-auth-service.js';
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
 * Local cache for offline support
 */
let localStocksCache = [];
let isOnline = navigator.onLine;
let stocksListener = null;

/**
 * Initialize network status listener
 */
window.addEventListener('online', () => {
    isOnline = true;
    console.log('Connection restored - syncing data...');
    syncOfflineData();
});

window.addEventListener('offline', () => {
    isOnline = false;
    console.log('Connection lost - using offline mode');
});

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
 * @param {Function} callback - Callback function to handle stock data updates
 * @returns {Function} Unsubscribe function
 */
export function listenToStocks(callback) {
    const user = getCurrentUser();
    
    if (!user) {
        console.log('No user authenticated, loading from localStorage');
        const localData = loadFromLocalStorage();
        callback(localData);
        return () => {}; // Return empty unsubscribe function
    }
    
    const stocksRef = getUserStocksRef();
    
    // Set up real-time listener
    stocksListener = onValue(stocksRef, (snapshot) => {
        const data = snapshot.val();
        const stocksArray = data ? Object.keys(data).map(key => ({
            ...data[key],
            stock_id: key
        })) : [];
        
        console.log(`Loaded ${stocksArray.length} stocks from Firebase`);
        
        // Update local cache
        localStocksCache = stocksArray;
        saveToLocalStorage(stocksArray);
        
        // Call callback with stock data
        callback(stocksArray);
    }, (error) => {
        console.error('Firebase listener error:', error);
        
        // Fallback to localStorage on error
        const localData = loadFromLocalStorage();
        callback(localData);
    });
    
    // Return unsubscribe function
    return () => {
        if (stocksListener) {
            stocksListener();
            stocksListener = null;
        }
    };
}

/**
 * Add a new stock to Firebase
 * @param {Object} stockData - Stock data object
 * @returns {Promise<Object>} Result with success status and stock ID
 */
export async function addStock(stockData) {
    const user = getCurrentUser();
    
    if (!user) {
        return { success: false, error: 'User must be authenticated' };
    }
    
    try {
        const stocksRef = getUserStocksRef();
        
        // Generate unique ID using timestamp
        const stockId = `stock_${Date.now()}`;
        const stockRef = child(stocksRef, stockId);
        
        // Add timestamps
        const stockWithMeta = {
            ...stockData,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            userId: user.uid
        };
        
        // Save to Firebase
        await set(stockRef, stockWithMeta);
        
        console.log('Stock added successfully:', stockId);
        
        return { 
            success: true, 
            stockId: stockId,
            message: 'Stock added successfully'
        };
        
    } catch (error) {
        console.error('Error adding stock:', error);
        
        // Fallback to localStorage if offline
        if (!isOnline) {
            const stockId = `stock_${Date.now()}`;
            const stockWithId = { ...stockData, stock_id: stockId };
            localStocksCache.push(stockWithId);
            saveToLocalStorage(localStocksCache);
            
            return { 
                success: true, 
                stockId: stockId,
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
    const user = getCurrentUser();
    
    if (!user) {
        return { success: false, error: 'User must be authenticated' };
    }
    
    try {
        const stockRef = getStockRef(stockId);
        
        // Add update timestamp
        const updatesWithMeta = {
            ...updates,
            updatedAt: new Date().toISOString()
        };
        
        // Update in Firebase
        await update(stockRef, updatesWithMeta);
        
        console.log('Stock updated successfully:', stockId);
        
        return { 
            success: true,
            message: 'Stock updated successfully'
        };
        
    } catch (error) {
        console.error('Error updating stock:', error);
        
        // Fallback to localStorage if offline
        if (!isOnline) {
            const index = localStocksCache.findIndex(s => s.stock_id === stockId);
            if (index !== -1) {
                localStocksCache[index] = { 
                    ...localStocksCache[index], 
                    ...updates 
                };
                saveToLocalStorage(localStocksCache);
                
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
    const user = getCurrentUser();
    
    if (!user) {
        return { success: false, error: 'User must be authenticated' };
    }
    
    try {
        const stockRef = getStockRef(stockId);
        
        // Remove from Firebase
        await remove(stockRef);
        
        console.log('Stock deleted successfully:', stockId);
        
        return { 
            success: true,
            message: 'Stock deleted successfully'
        };
        
    } catch (error) {
        console.error('Error deleting stock:', error);
        
        // Fallback to localStorage if offline
        if (!isOnline) {
            localStocksCache = localStocksCache.filter(s => s.stock_id !== stockId);
            saveToLocalStorage(localStocksCache);
            
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
    const user = getCurrentUser();
    
    if (!user) {
        return { success: false, error: 'User must be authenticated' };
    }
    
    try {
        const stocksRef = getUserStocksRef();
        
        // Remove all stocks
        await remove(stocksRef);
        
        console.log('All stocks deleted successfully');
        
        // Clear local cache
        localStocksCache = [];
        saveToLocalStorage([]);
        
        return { 
            success: true,
            message: 'All stocks deleted successfully'
        };
        
    } catch (error) {
        console.error('Error deleting all stocks:', error);
        
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
    const user = getCurrentUser();
    
    if (!user) {
        return null;
    }
    
    try {
        const stockRef = getStockRef(stockId);
        const snapshot = await get(stockRef);
        
        if (snapshot.exists()) {
            return {
                ...snapshot.val(),
                stock_id: stockId
            };
        }
        
        return null;
        
    } catch (error) {
        console.error('Error getting stock:', error);
        return null;
    }
}

/**
 * Sync offline data when connection is restored
 */
async function syncOfflineData() {
    const localData = loadFromLocalStorage();
    
    if (localData.length === 0) {
        return;
    }
    
    console.log('Syncing offline data...');
    
    // This is a simplified sync - you may want more sophisticated logic
    for (const stock of localData) {
        try {
            if (stock.stock_id && stock.stock_id.startsWith('stock_')) {
                await addStock(stock);
            }
        } catch (error) {
            console.error('Error syncing stock:', error);
        }
    }
}

/**
 * Save stocks to localStorage (backup/offline support)
 * @param {Array} stocks - Array of stock objects
 */
function saveToLocalStorage(stocks) {
    try {
        localStorage.setItem('analysisStocks', JSON.stringify(stocks));
        localStorage.setItem('analysisStocksBackup', JSON.stringify({
            data: stocks,
            timestamp: new Date().toISOString()
        }));
    } catch (error) {
        console.error('Error saving to localStorage:', error);
    }
}

/**
 * Load stocks from localStorage
 * @returns {Array} Array of stock objects
 */
function loadFromLocalStorage() {
    try {
        const saved = localStorage.getItem('analysisStocks');
        if (saved) {
            return JSON.parse(saved);
        }
    } catch (error) {
        console.error('Error loading from localStorage:', error);
    }
    return [];
}

/**
 * Migrate existing localStorage data to Firebase
 * @returns {Promise<Object>} Migration result
 */
export async function migrateLocalStorageToFirebase() {
    const user = getCurrentUser();
    
    if (!user) {
        return { success: false, error: 'User must be authenticated' };
    }
    
    const localData = loadFromLocalStorage();
    
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
            // Remove old stock_id if it exists
            const { stock_id, ...stockData } = stock;
            
            const result = await addStock(stockData);
            if (result.success) {
                migrated++;
            } else {
                failed++;
            }
        } catch (error) {
            console.error('Error migrating stock:', error);
            failed++;
        }
    }
    
    console.log(`Migration complete: ${migrated} migrated, ${failed} failed`);
    
    return {
        success: true,
        message: `Migrated ${migrated} stocks to Firebase`,
        migrated: migrated,
        failed: failed
    };
}
