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
    const user = getCurrentUser();
    
    if (!user) {
        return { success: false, offline: true };
    }

    try {
        const stockRef = getPortfolioStockRef(stock.id);
        
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
 * @returns {Promise<Array>} Array of stock objects
 */
export async function loadPortfolioStocks() {
    const user = getCurrentUser();
    
    if (!user) {
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
    const user = getCurrentUser();
    
    if (!user) {
        return false;
    }

    try {
        const stockRef = getPortfolioStockRef(stockId);
        
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
    const user = getCurrentUser();
    
    if (!user) {
        return false;
    }

    try {
        const stockRef = getPortfolioStockRef(stockId);
        await remove(stockRef);
        
        return true;
    } catch (error) {
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
        return () => {};
    }
    
    const portfolioRef = getUserPortfolioRef();
    
    portfolioListener = onValue(portfolioRef, (snapshot) => {
        const data = snapshot.val();
        const stocksArray = data ? Object.keys(data).map(key => ({
            ...data[key],
            id: key
        })) : [];
        
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
    const user = getCurrentUser();
    
    if (!user) {
        return false;
    }

    try {
        const portfolioRef = getUserPortfolioRef();
        
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
    const user = getCurrentUser();
    
    if (!user) {
        return false;
    }

    try {
        const portfolioRef = getUserPortfolioRef();
        await remove(portfolioRef);
        
        return true;
    } catch (error) {
        throw error;
    }
}
