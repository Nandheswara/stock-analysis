/**
 * Firebase Portfolio Service
 * 
 * Handles all database operations for stock portfolio manager including:
 * - CRUD operations for portfolio stocks
 * - Real-time sync with Firebase
 * - Offline support with localStorage fallback
 * - User-specific data management
 * 
 * @module firebase-portfolio-service
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
    push
} from "https://www.gstatic.com/firebasejs/11.1.0/firebase-database.js";

const LOCALSTORAGE_KEY = 'stockPortfolio';
let portfolioListener = null;

/**
 * Get user-specific database reference for portfolio
 * @returns {Object} Firebase database reference for current user's portfolio
 */
function getUserPortfolioRef() {
    const user = getCurrentUser();
    if (!user) {
        return null;
    }
    return ref(database, `users/${user.uid}/portfolio`);
}

/**
 * Get reference to a specific portfolio stock
 * @param {string} stockId - Stock ID
 * @returns {Object} Firebase database reference
 */
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
    const user = getCurrentUser();
    
    if (!user) {
        console.log('No user authenticated, saving to localStorage only');
        return { success: false, offline: true };
    }

    try {
        const stockRef = getPortfolioStockRef(stock.id);
        
        // Prepare data for Firebase
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
        console.log('Stock saved to Firebase:', stock.id);
        
        return { success: true, stock: { ...stockData, id: stock.id } };
    } catch (error) {
        console.error('Error saving stock to Firebase:', error);
        throw error;
    }
}

/**
 * Load all portfolio stocks from Firebase
 * @returns {Promise<Array>} Array of stock objects
 */
export async function loadPortfolioStocks() {
    const user = getCurrentUser();
    
    if (!user) {
        console.log('No user authenticated, loading from localStorage');
        return [];
    }

    try {
        const portfolioRef = getUserPortfolioRef();
        const snapshot = await get(portfolioRef);
        
        if (snapshot.exists()) {
            const data = snapshot.val();
            const stocksArray = Object.keys(data).map(key => ({
                ...data[key],
                id: key
            }));
            
            console.log(`Loaded ${stocksArray.length} portfolio stocks from Firebase`);
            return stocksArray;
        }
        
        console.log('No portfolio stocks found in Firebase');
        return [];
    } catch (error) {
        console.error('Error loading portfolio stocks from Firebase:', error);
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
    const user = getCurrentUser();
    
    if (!user) {
        console.log('No user authenticated, updating localStorage only');
        return false;
    }

    try {
        const stockRef = getPortfolioStockRef(stockId);
        
        // Add last modified timestamp
        const updateData = {
            ...updates,
            lastModified: new Date().toISOString()
        };

        await update(stockRef, updateData);
        console.log('Stock updated in Firebase:', stockId);
        
        return true;
    } catch (error) {
        console.error('Error updating stock in Firebase:', error);
        throw error;
    }
}

/**
 * Delete a portfolio stock from Firebase
 * @param {string} stockId - Stock ID to delete
 * @returns {Promise<boolean>} Success status
 */
export async function deletePortfolioStock(stockId) {
    const user = getCurrentUser();
    
    if (!user) {
        console.log('No user authenticated, deleting from localStorage only');
        return false;
    }

    try {
        const stockRef = getPortfolioStockRef(stockId);
        await remove(stockRef);
        console.log('Stock deleted from Firebase:', stockId);
        
        return true;
    } catch (error) {
        console.error('Error deleting stock from Firebase:', error);
        throw error;
    }
}

/**
 * Listen to real-time portfolio data changes
 * @param {Function} callback - Callback function to handle portfolio data updates
 * @returns {Function} Unsubscribe function
 */
export function listenToPortfolio(callback) {
    const user = getCurrentUser();
    
    if (!user) {
        console.log('No user authenticated for real-time sync');
        return () => {}; // Return empty unsubscribe function
    }
    
    const portfolioRef = getUserPortfolioRef();
    
    // Set up real-time listener
    portfolioListener = onValue(portfolioRef, (snapshot) => {
        const data = snapshot.val();
        const stocksArray = data ? Object.keys(data).map(key => ({
            ...data[key],
            id: key
        })) : [];
        
        console.log(`Real-time update: ${stocksArray.length} portfolio stocks`);
        callback(stocksArray);
    }, (error) => {
        console.error('Error listening to portfolio:', error);
    });
    
    // Return unsubscribe function
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
    const user = getCurrentUser();
    
    if (!user) {
        console.log('No user authenticated, cannot sync to Firebase');
        return false;
    }

    try {
        const portfolioRef = getUserPortfolioRef();
        
        // Convert array to object with stock IDs as keys
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
        console.log(`Synced ${stocks.length} portfolio stocks to Firebase`);
        
        return true;
    } catch (error) {
        console.error('Error syncing portfolio to Firebase:', error);
        throw error;
    }
}

/**
 * Clear all portfolio data from Firebase
 * @returns {Promise<boolean>} Success status
 */
export async function clearPortfolio() {
    const user = getCurrentUser();
    
    if (!user) {
        console.log('No user authenticated');
        return false;
    }

    try {
        const portfolioRef = getUserPortfolioRef();
        await remove(portfolioRef);
        console.log('Portfolio cleared from Firebase');
        
        return true;
    } catch (error) {
        console.error('Error clearing portfolio from Firebase:', error);
        throw error;
    }
}
