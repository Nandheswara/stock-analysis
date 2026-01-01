/**
 * Stock Manager - Net Worth Tracker
 * Handles stock portfolio management with automatic brokerage and tax calculations
 * Integrated with Firebase for user-specific data storage
 * 
 * Authentication Required: All data operations require user authentication
 * Data Storage: Firebase Realtime Database only (no sessionStorage fallback)
 * Multi-Device Sync: Real-time synchronization across all devices
 */

import { 
    savePortfolioStock, 
    loadPortfolioStocks, 
    updatePortfolioStock, 
    deletePortfolioStock as deletePortfolioStockFirebase,
    listenToPortfolio,
    syncPortfolioToFirebase
} from './firebase-portfolio-service.js';
import { 
    getCurrentUser, 
    onAuthStateChangedWrapper as onAuthStateChanged, 
    loginUser, 
    signupUser, 
    logoutUser,
    initAuthListener,
    signInWithGoogle,
    isAuthenticated,
    changePassword
} from './firebase-auth-service.js';

// Constants for brokerage and tax calculations (Indian market rates)
const BROKERAGE_RATES = {
    BUY: 0.0003, // 0.03% or ₹20 per executed order (whichever is lower)
    SELL: 0.0003, // 0.03% or ₹20 per executed order (whichever is lower)
    MAX_PER_ORDER: 20
};

const TAX_RATES = {
    STT_BUY: 0.0001, // 0.01% on buy side
    STT_SELL: 0.00025, // 0.025% on sell side
    TRANSACTION_CHARGES: 0.0000325, // 0.00325% (NSE charges)
    GST: 0.18, // 18% GST on brokerage and transaction charges
    SEBI_CHARGES: 0.0000001, // ₹10 per crore
    STAMP_DUTY: 0.00015 // 0.015% or ₹1500 per crore on buy side
};

// Real-time listener unsubscribe function
let unsubscribePortfolio = null;

// Track if we're currently syncing to avoid loops
let isSyncing = false;

/**
 * Stock class to represent individual stock transactions
 */
class Stock {
    constructor(name, quantity, buyPrice, sellPrice = null) {
        this.id = this.generateId();
        this.name = name;
        this.quantity = parseInt(quantity);
        this.buyPrice = parseFloat(buyPrice);
        this.sellPrice = sellPrice ? parseFloat(sellPrice) : null;
        this.dateAdded = new Date().toISOString();
        
        // Calculate all charges
        this.calculateCharges();
    }

    /**
     * Generates a unique ID for the stock entry
     */
    generateId() {
        return `stock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Calculates brokerage charges
     */
    calculateBrokerage(price, quantity) {
        const turnover = price * quantity;
        const calculatedBrokerage = turnover * BROKERAGE_RATES.BUY;
        return Math.min(calculatedBrokerage, BROKERAGE_RATES.MAX_PER_ORDER);
    }

    /**
     * Calculates all taxes and charges
     */
    calculateTaxes(price, quantity, isSell = false) {
        const turnover = price * quantity;
        
        // STT (Securities Transaction Tax)
        const stt = isSell 
            ? turnover * TAX_RATES.STT_SELL 
            : turnover * TAX_RATES.STT_BUY;
        
        // Transaction charges
        const transactionCharges = turnover * TAX_RATES.TRANSACTION_CHARGES;
        
        // SEBI charges
        const sebiCharges = turnover * TAX_RATES.SEBI_CHARGES;
        
        // Stamp duty (only on buy side)
        const stampDuty = !isSell ? turnover * TAX_RATES.STAMP_DUTY : 0;
        
        // Calculate brokerage for GST calculation
        const brokerage = this.calculateBrokerage(price, quantity);
        
        // GST on brokerage and transaction charges
        const gst = (brokerage + transactionCharges) * TAX_RATES.GST;
        
        return {
            stt,
            transactionCharges,
            sebiCharges,
            stampDuty,
            gst,
            total: stt + transactionCharges + sebiCharges + stampDuty + gst
        };
    }

    /**
     * Calculates all charges for buying and selling
     */
    calculateCharges() {
        // Buy side calculations
        this.buyBrokerage = this.calculateBrokerage(this.buyPrice, this.quantity);
        this.buyTaxes = this.calculateTaxes(this.buyPrice, this.quantity, false);
        this.buyTaxTotal = this.buyTaxes.total;
        
        // Total cost including all charges
        this.totalCost = (this.buyPrice * this.quantity) + this.buyBrokerage + this.buyTaxTotal;
        
        // Sell side calculations (if sold)
        if (this.sellPrice !== null) {
            this.sellBrokerage = this.calculateBrokerage(this.sellPrice, this.quantity);
            this.sellTaxes = this.calculateTaxes(this.sellPrice, this.quantity, true);
            this.sellTaxTotal = this.sellTaxes.total;
            
            // Total revenue after all charges
            this.totalRevenue = (this.sellPrice * this.quantity) - this.sellBrokerage - this.sellTaxTotal;
            
            // Profit or loss
            this.profitLoss = this.totalRevenue - this.totalCost;
        } else {
            this.sellBrokerage = 0;
            this.sellTaxTotal = 0;
            this.totalRevenue = 0;
            this.profitLoss = 0;
        }
    }

    /**
     * Returns the status of the stock
     */
    getStatus() {
        return this.sellPrice !== null ? 'Sold' : 'Holding';
    }
}

/**
 * Portfolio Manager class to handle all portfolio operations
 */
class PortfolioManager {
    constructor() {
        this.stocks = [];
        // Check for preloaded portfolio data for instant display
        this.loadPreloadedData();
    }

    /**
     * Load preloaded data from inline cache script for instant display
     */
    loadPreloadedData() {
        if (window.__PRELOADED_PORTFOLIO__ && window.__PRELOADED_PORTFOLIO__.length > 0) {
            this.stocks = window.__PRELOADED_PORTFOLIO__.map(stockData => {
                const stock = new Stock(
                    stockData.name,
                    stockData.quantity,
                    stockData.buyPrice,
                    stockData.sellPrice
                );
                stock.id = stockData.id;
                stock.dateAdded = stockData.dateAdded;
                return stock;
            });
            // Immediately render the cached data
            window.__PORTFOLIO_RENDERED__ = true;
            renderStocksTable();
            updateSummaryDisplay();
            
            // Hide loading overlay immediately
            const overlay = document.getElementById('loadingOverlay');
            if (overlay) overlay.style.display = 'none';
        }
    }

    /**
     * Set up Firebase real-time sync
     * Optimized to serve cached data instantly
     */
    setupFirebaseSync() {
        const user = getCurrentUser();
        
        if (user) {
            // Try to load from localStorage cache immediately if not already loaded
            if (this.stocks.length === 0 && !window.__PORTFOLIO_CACHE_HIT__) {
                const userId = user.uid;
                if (userId) {
                    try {
                        const cacheKey = `portfolioCache_${userId}`;
                        const cached = localStorage.getItem(cacheKey);
                        if (cached) {
                            const cachedStocks = JSON.parse(cached);
                            if (cachedStocks && cachedStocks.length > 0) {
                                this.stocks = cachedStocks.map(stockData => {
                                    const stock = new Stock(
                                        stockData.name,
                                        stockData.quantity,
                                        stockData.buyPrice,
                                        stockData.sellPrice
                                    );
                                    stock.id = stockData.id;
                                    stock.dateAdded = stockData.dateAdded;
                                    return stock;
                                });
                                renderStocksTable();
                                updateSummaryDisplay();
                            }
                        }
                    } catch (e) {
                        // Silent fail
                    }
                }
            }
            
            if (unsubscribePortfolio) {
                unsubscribePortfolio();
                unsubscribePortfolio = null;
            }
            
            unsubscribePortfolio = listenToPortfolio((firebaseStocks) => {
                if (!isSyncing) {
                    // Only update if data actually changed
                    const newIds = firebaseStocks.map(s => s.id).sort().join(',');
                    const currentIds = this.stocks.map(s => s.id).sort().join(',');
                    
                    if (newIds !== currentIds || firebaseStocks.length !== this.stocks.length) {
                        this.stocks = firebaseStocks.map(stockData => {
                            const stock = new Stock(
                                stockData.name,
                                stockData.quantity,
                                stockData.buyPrice,
                                stockData.sellPrice
                            );
                            stock.id = stockData.id;
                            stock.dateAdded = stockData.dateAdded;
                            return stock;
                        });
                        
                        renderStocksTable();
                        updateSummaryDisplay();
                    }
                }
            });
        } else {
            this.stocks = [];
            renderStocksTable();
            updateSummaryDisplay();
        }
    }

    /**
     * Load portfolio from Firebase
     */
    async loadFromFirebase() {
        try {
            isSyncing = true;
            const firebaseStocks = await loadPortfolioStocks();
            
            if (firebaseStocks.length > 0) {
                this.stocks = firebaseStocks.map(stockData => {
                    const stock = new Stock(
                        stockData.name,
                        stockData.quantity,
                        stockData.buyPrice,
                        stockData.sellPrice
                    );
                    stock.id = stockData.id;
                    stock.dateAdded = stockData.dateAdded;
                    return stock;
                });
                
                renderStocksTable();
                updateSummaryDisplay();
            }
            
            isSyncing = false;
        } catch (error) {
            isSyncing = false;
        }
    }

    /**
     * Adds a new stock to the portfolio
     */
    async addStock(name, quantity, buyPrice, sellPrice = null) {
        // Require authentication
        if (!isAuthenticated()) {
            throw new Error('Authentication required to add stocks');
        }

        const stock = new Stock(name, quantity, buyPrice, sellPrice);
        this.stocks.push(stock);
        
        try {
            isSyncing = true;
            await savePortfolioStock(stock);
            isSyncing = false;
        } catch (error) {
            this.stocks = this.stocks.filter(s => s.id !== stock.id);
            isSyncing = false;
            throw error;
        }
        
        return stock;
    }

    /**
     * Removes a stock from the portfolio
     */
    async removeStock(stockId) {
        if (!isAuthenticated()) {
            throw new Error('Authentication required to remove stocks');
        }

        this.stocks = this.stocks.filter(stock => stock.id !== stockId);
        
        try {
            isSyncing = true;
            await deletePortfolioStockFirebase(stockId);
            isSyncing = false;
        } catch (error) {
            isSyncing = false;
            throw error;
        }
    }

    /**
     * Updates a stock in the portfolio
     */
    async updateStock(stockId, updates) {
        if (!isAuthenticated()) {
            throw new Error('Authentication required to update stocks');
        }

        const stockIndex = this.stocks.findIndex(stock => stock.id === stockId);
        if (stockIndex !== -1) {
            const stock = this.stocks[stockIndex];
            Object.assign(stock, updates);
            stock.calculateCharges();
            
            try {
                isSyncing = true;
                const updateData = {
                    sellPrice: stock.sellPrice,
                    sellBrokerage: stock.sellBrokerage,
                    sellTaxTotal: stock.sellTaxTotal,
                    totalRevenue: stock.totalRevenue,
                    profitLoss: stock.profitLoss
                };
                await updatePortfolioStock(stockId, updateData);
                isSyncing = false;
            } catch (error) {
                isSyncing = false;
                throw error;
            }
            
            return stock;
        }
        return null;
    }

    /**
     * Calculates portfolio summary
     */
    getPortfolioSummary() {
        let totalInvestment = 0;
        let currentValue = 0;
        let totalBrokerage = 0;
        let totalTax = 0;
        let totalProfitLoss = 0;

        this.stocks.forEach(stock => {
            totalInvestment += stock.totalCost;
            totalBrokerage += stock.buyBrokerage + stock.sellBrokerage;
            totalTax += stock.buyTaxTotal + stock.sellTaxTotal;

            if (stock.sellPrice !== null) {
                currentValue += stock.totalRevenue;
                totalProfitLoss += stock.profitLoss;
            } else {
                // For holdings, use current buy price * quantity
                currentValue += stock.buyPrice * stock.quantity;
            }
        });

        const netWorth = currentValue - totalInvestment + totalProfitLoss;

        return {
            totalInvestment,
            currentValue,
            totalBrokerage,
            totalTax,
            totalProfitLoss,
            netWorth
        };
    }

    /**
     * Gets all stocks
     */
    getAllStocks() {
        return this.stocks;
    }
}

// Portfolio Manager instance (initialized after auth is ready)
let portfolioManager = null;

/**
 * Formats a number as Indian currency
 */
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(amount);
}

/**
 * Updates the portfolio summary display
 */
function updateSummaryDisplay() {
    if (!portfolioManager) {
        return;
    }
    
    const summary = portfolioManager.getPortfolioSummary();

    document.getElementById('totalInvestment').textContent = formatCurrency(summary.totalInvestment);
    document.getElementById('currentValue').textContent = formatCurrency(summary.currentValue);
    
    const totalProfitLossElement = document.getElementById('totalProfitLoss');
    totalProfitLossElement.textContent = formatCurrency(summary.totalProfitLoss);
    totalProfitLossElement.className = summary.totalProfitLoss >= 0 ? 'value positive' : 'value negative';
    
    document.getElementById('totalBrokerage').textContent = formatCurrency(summary.totalBrokerage);
    document.getElementById('totalTax').textContent = formatCurrency(summary.totalTax);
    
    const netWorthElement = document.getElementById('netWorth');
    netWorthElement.textContent = formatCurrency(summary.netWorth);
    netWorthElement.className = summary.netWorth >= 0 ? 'value highlight positive' : 'value highlight negative';
}

/**
 * Renders the stocks table
 */
function renderStocksTable() {
    const tbody = document.getElementById('stocksTableBody');
    
    if (!portfolioManager) {
        if (tbody) {
            tbody.innerHTML = `
                <tr class="no-data">
                    <td colspan="13">Loading...</td>
                </tr>
            `;
        }
        return;
    }
    
    const stocks = portfolioManager.getAllStocks();

    if (stocks.length === 0) {
        tbody.innerHTML = `
            <tr class="no-data">
                <td colspan="13">No stocks added yet. Add your first stock transaction above.</td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = stocks.map(stock => `
        <tr>
            <td class="stock-name">${stock.name}</td>
            <td>${stock.quantity}</td>
            <td>${formatCurrency(stock.buyPrice)}</td>
            <td>${stock.sellPrice ? formatCurrency(stock.sellPrice) : '—'}</td>
            <td>${formatCurrency(stock.buyBrokerage)}</td>
            <td>${formatCurrency(stock.buyTaxTotal)}</td>
            <td>${formatCurrency(stock.sellBrokerage)}</td>
            <td>${formatCurrency(stock.sellTaxTotal)}</td>
            <td>${formatCurrency(stock.totalCost)}</td>
            <td>${stock.totalRevenue > 0 ? formatCurrency(stock.totalRevenue) : '—'}</td>
            <td class="${stock.profitLoss >= 0 ? 'profit' : 'loss'}">
                ${stock.sellPrice ? formatCurrency(stock.profitLoss) : '—'}
            </td>
            <td>
                <span class="status-badge ${stock.getStatus().toLowerCase()}">
                    ${stock.getStatus()}
                </span>
            </td>
            <td class="action-cell">${!stock.sellPrice ? `<button class="btn btn-info" onclick="editStock('${stock.id}')" aria-label="Edit ${stock.name}" title="Add sell price"><i class="bi bi-pencil-square"></i> Edit</button>` : ''}<button class="btn btn-danger" onclick="deleteStock('${stock.id}')" aria-label="Delete ${stock.name}"><i class="bi bi-trash"></i> Delete</button></td>
        </tr>
    `).join('');
}

/**
 * Handles form submission
 */
async function handleFormSubmit(event) {
    event.preventDefault();

    // Check if user is authenticated
    if (!isAuthenticated()) {
        showNotification('Please sign in to manage your portfolio', 'error');
        showAuthModal(true); // Show login modal
        return;
    }

    const formData = new FormData(event.target);
    const stockName = formData.get('stockName').trim();
    const quantity = formData.get('quantity');
    const buyPrice = formData.get('buyPrice');
    const sellPrice = formData.get('sellPrice');

    // Validate inputs
    if (!stockName || !quantity || !buyPrice) {
        showNotification('Please fill in all required fields', 'error');
        return;
    }

    try {
        // Add stock to portfolio
        await portfolioManager.addStock(
            stockName,
            quantity,
            buyPrice,
            sellPrice || null
        );

        // Update UI
        renderStocksTable();
        updateSummaryDisplay();

        event.target.reset();
        showNotification('Stock added successfully!');
    } catch (error) {
        showNotification('Failed to add stock. Please try again.', 'error');
    }
}

/**
 * Shows calculation information modal
 */
function showCalculationInfo() {
    document.getElementById('calculationModal').classList.add('active');
}

/**
 * Closes the calculation info modal
 */
function closeCalculationModal() {
    document.getElementById('calculationModal').classList.remove('active');
}

/**
 * Opens edit modal for a stock
 */
function editStock(stockId) {
    // Check if user is authenticated
    if (!isAuthenticated()) {
        showNotification('Please sign in to edit stocks', 'error');
        showAuthModal(true); // Show login modal
        return;
    }

    const stocks = portfolioManager.getAllStocks();
    const stock = stocks.find(s => s.id === stockId);
    
    if (!stock) {
        showNotification('Stock not found!', 'error');
        return;
    }

    // Populate modal fields
    document.getElementById('editStockId').value = stock.id;
    document.getElementById('editStockName').value = stock.name;
    document.getElementById('editQuantity').value = stock.quantity;
    document.getElementById('editBuyPrice').value = stock.buyPrice;
    document.getElementById('editSellPrice').value = stock.sellPrice || '';

    // Show modal
    document.getElementById('editModal').classList.add('active');
}

/**
 * Closes the edit modal
 */
function closeEditModal() {
    document.getElementById('editModal').classList.remove('active');
    document.getElementById('editStockForm').reset();
}

/**
 * Saves the edited stock
 */
async function saveEditStock() {
    const stockId = document.getElementById('editStockId').value;
    const sellPrice = document.getElementById('editSellPrice').value;

    if (!sellPrice || parseFloat(sellPrice) <= 0) {
        showNotification('Please enter a valid sell price!', 'error');
        return;
    }

    try {
        await portfolioManager.updateStock(stockId, {
            sellPrice: parseFloat(sellPrice)
        });

        renderStocksTable();
        updateSummaryDisplay();
        closeEditModal();
        showNotification('Stock updated successfully!');
    } catch (error) {
        showNotification('Failed to update stock. Please try again.', 'error');
    }
}

/**
 * Deletes a stock from the portfolio
 */
function deleteStock(stockId) {
    // Check if user is authenticated
    if (!isAuthenticated()) {
        showNotification('Please sign in to delete stocks', 'error');
        showAuthModal(true); // Show login modal
        return;
    }

    if (confirm('Are you sure you want to delete this stock?')) {
        portfolioManager.removeStock(stockId);
        renderStocksTable();
        updateSummaryDisplay();
        showNotification('Stock deleted successfully!');
    }
}

/**
 * Shows a notification message
 */
function showNotification(message, type = 'success') {
    // Simple notification - can be enhanced with a better UI
    const notification = document.createElement('div');
    notification.textContent = message;
    
    const bgColor = type === 'error' ? '#e74c3c' : '#27ae60';
    
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${bgColor};
        color: white;
        padding: 1rem 2rem;
        border-radius: 5px;
        box-shadow: 0 5px 15px rgba(0,0,0,0.3);
        z-index: 10000;
        animation: slideIn 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

/**
 * Initialize the application
 * Optimized for instant data display from cache
 */
function initApp() {
    try {
        // Try to load and display cached data IMMEDIATELY (before auth)
        loadCachedDataInstantly();
        
        // Initialize auth listener (non-blocking)
        initAuthListener();
        
        // Create portfolio manager (will also try to load preloaded data)
        portfolioManager = new PortfolioManager();
        
        const form = document.getElementById('stockForm');
        if (form) {
            form.addEventListener('submit', handleFormSubmit);
        }

        setupAuthUI();
        
        // Only render if we haven't already rendered from cache
        if (!window.__PORTFOLIO_RENDERED__) {
            renderStocksTable();
            updateSummaryDisplay();
        }

        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideIn {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
            @keyframes slideOut {
                from {
                    transform: translateX(0);
                    opacity: 1;
                }
                to {
                    transform: translateX(100%);
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(style);
    } catch (error) {
        // Silent fail - app may still work partially
    }
}

/**
 * Load cached data instantly without waiting for auth
 * This provides immediate data display on page load
 */
function loadCachedDataInstantly() {
    try {
        // Check for preloaded data from inline script
        if (window.__PRELOADED_PORTFOLIO__ && window.__PRELOADED_PORTFOLIO__.length > 0) {
            window.__PORTFOLIO_RENDERED__ = true;
            return; // Already handled by PortfolioManager constructor
        }
        
        // Try to get user ID from auth cache
        const authCache = sessionStorage.getItem('authStateCache');
        if (authCache) {
            const auth = JSON.parse(authCache);
            const userId = auth.uid;
            if (userId) {
                const cacheKey = `portfolioCache_${userId}`;
                const cached = localStorage.getItem(cacheKey);
                if (cached) {
                    const stocks = JSON.parse(cached);
                    if (stocks && stocks.length > 0) {
                        window.__PRELOADED_PORTFOLIO__ = stocks;
                        window.__PORTFOLIO_CACHE_HIT__ = true;
                    }
                }
            }
        }
    } catch (e) {
        // Silent fail
    }
}

/**
 * Set up authentication UI handlers
 */
function setupAuthUI() {
    let isLoginMode = true;

    const loginBtn = document.getElementById('loginBtn');
    const signupBtn = document.getElementById('signupBtn');
    const logoutBtn = document.getElementById('logoutBtn');

    onAuthStateChanged((user) => {
        if (user && portfolioManager) {
            portfolioManager.setupFirebaseSync();
        } else if (!user && portfolioManager) {
            portfolioManager.stocks = [];
            renderStocksTable();
            updateSummaryDisplay();
        }
    });

    if (loginBtn) {
        loginBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            isLoginMode = true;
            showAuthModal(true);
        });
    }

    if (signupBtn) {
        signupBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            isLoginMode = false;
            showAuthModal(false);
        });
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            try {
                await logoutUser();
                showNotification('Logged out successfully!');
                
                if (unsubscribePortfolio) {
                    unsubscribePortfolio();
                    unsubscribePortfolio = null;
                }
                location.reload();
            } catch (error) {
                showNotification('Failed to logout', 'error');
            }
        });
    }

    // Profile button now navigates to profile.html page directly via href
    // No need to intercept the click event

    setupAuthModalHandlers();
    
    // Setup calculation info button handler
    const calculationInfoBtn = document.getElementById('calculationInfoBtn');
    if (calculationInfoBtn) {
        calculationInfoBtn.addEventListener('click', (e) => {
            e.preventDefault();
            showCalculationInfo();
        });
    }
}

/**
 * Setup auth modal handlers
 * Note: isLoginMode is stored in the data attribute of the modal
 */
function setupAuthModalHandlers() {
    const authSubmitBtn = document.getElementById('authSubmitBtn');
    const authForm = document.getElementById('authForm');
    const googleSignInBtn = document.getElementById('googleSignInBtn');
    
    const handleAuthSubmit = async (e) => {
        if (e) e.preventDefault();
        
        const email = document.getElementById('authEmail')?.value;
        const password = document.getElementById('authPassword')?.value;
        const errorDiv = document.getElementById('authError');
        const modal = document.getElementById('authModal');
        
        const isLoginMode = modal?.dataset.loginMode === 'true';

        if (errorDiv) errorDiv.style.display = 'none';

        if (!email || !password) {
            if (errorDiv) {
                errorDiv.textContent = 'Please enter both email and password';
                errorDiv.style.display = 'block';
            }
            return;
        }

        if (authSubmitBtn) {
            authSubmitBtn.disabled = true;
            authSubmitBtn.textContent = isLoginMode ? 'Logging in...' : 'Signing up...';
        }

        try {
            if (isLoginMode) {
                await loginUser(email, password);
                showNotification('Logged in successfully!');
            } else {
                await signupUser(email, password);
                showNotification('Account created successfully!');
            }
            closeAuthModal();
        } catch (error) {
            if (errorDiv) {
                errorDiv.textContent = error.message || 'Authentication failed';
                errorDiv.style.display = 'block';
            }
        } finally {
            if (authSubmitBtn) {
                authSubmitBtn.disabled = false;
                authSubmitBtn.textContent = isLoginMode ? 'Login' : 'Sign Up';
            }
        }
    };

    if (authSubmitBtn) {
        authSubmitBtn.onclick = handleAuthSubmit;
    }
    
    if (authForm) {
        authForm.onsubmit = handleAuthSubmit;
    }
    
    if (googleSignInBtn) {
        googleSignInBtn.onclick = async (e) => {
            e.preventDefault();
            const errorDiv = document.getElementById('authError');
            const googleSignInText = document.getElementById('googleSignInText');
            
            if (errorDiv) errorDiv.style.display = 'none';
            
            googleSignInBtn.disabled = true;
            if (googleSignInText) googleSignInText.textContent = 'Signing in...';
            
            try {
                const result = await signInWithGoogle();
                
                if (result.success) {
                    showNotification('Signed in with Google successfully!');
                    closeAuthModal();
                } else {
                    throw new Error(result.error || 'Google sign-in failed');
                }
            } catch (error) {
                if (errorDiv) {
                    errorDiv.textContent = error.message || 'Failed to sign in with Google. Please try again.';
                    errorDiv.style.display = 'block';
                }
            } finally {
                googleSignInBtn.disabled = false;
                if (googleSignInText) googleSignInText.textContent = 'Continue with Google';
            }
        };
    }
}

/**
 * Show auth modal
 */
function showAuthModal(isLogin) {
    const modal = document.getElementById('authModal');
    const title = document.getElementById('authModalTitle');
    const submitBtn = document.getElementById('authSubmitBtn');
    const switchText = document.getElementById('authSwitchText');

    if (!modal || !title || !submitBtn || !switchText) {
        return;
    }

    modal.dataset.loginMode = isLogin ? 'true' : 'false';

    title.textContent = isLogin ? 'Login' : 'Sign Up';
    submitBtn.textContent = isLogin ? 'Login' : 'Sign Up';
    submitBtn.disabled = false;
    
    if (isLogin) {
        switchText.innerHTML = 'Don\'t have an account? <a href="#" id="authSwitchLink" style="color: #667eea; text-decoration: none;">Sign Up</a>';
    } else {
        switchText.innerHTML = 'Already have an account? <a href="#" id="authSwitchLink" style="color: #667eea; text-decoration: none;">Login</a>';
    }

    const switchLink = document.getElementById('authSwitchLink');
    if (switchLink) {
        switchLink.onclick = (e) => {
            e.preventDefault();
            showAuthModal(!isLogin);
        };
    }

    modal.style.display = 'flex';
    modal.classList.add('active');

    const emailInput = document.getElementById('authEmail');
    const passwordInput = document.getElementById('authPassword');
    const errorDiv = document.getElementById('authError');
    
    if (emailInput) emailInput.value = '';
    if (passwordInput) passwordInput.value = '';
    if (errorDiv) errorDiv.style.display = 'none';
    
    setTimeout(() => {
        if (emailInput) emailInput.focus();
    }, 100);
}

/**
 * Close auth modal
 */
function closeAuthModal() {
    const modal = document.getElementById('authModal');
    modal.classList.remove('active');
    setTimeout(() => {
        modal.style.display = 'none';
    }, 300);
}

/**
 * Show user profile modal
 */
function showProfileModal() {
    const user = getCurrentUser();
    
    if (user) {
        const displayNameEl = document.getElementById('profileDisplayName');
        const emailEl = document.getElementById('profileEmail');
        
        if (displayNameEl) {
            displayNameEl.textContent = user.displayName || 'User';
        }
        if (emailEl) {
            emailEl.textContent = user.email || '';
        }
    }

    // Clear form and alerts
    const form = document.getElementById('changePasswordForm');
    if (form) {
        form.reset();
    }
    const alertContainer = document.getElementById('profileAlertContainer');
    if (alertContainer) {
        alertContainer.innerHTML = '';
    }

    const modal = document.getElementById('profileModal');
    if (modal) {
        modal.style.display = 'flex';
        modal.classList.add('active');
    }
}

/**
 * Close profile modal
 */
function closeProfileModal() {
    const modal = document.getElementById('profileModal');
    if (modal) {
        modal.classList.remove('active');
        setTimeout(() => {
            modal.style.display = 'none';
        }, 300);
    }
}

/**
 * Setup profile modal handlers
 */
function setupProfileModalHandlers() {
    const changePasswordForm = document.getElementById('changePasswordForm');
    
    if (changePasswordForm) {
        changePasswordForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await handleChangePassword();
        });
    }

    // Password toggle buttons
    const toggleButtons = document.querySelectorAll('.toggle-password');
    toggleButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetId = button.getAttribute('data-target');
            const input = document.getElementById(targetId);
            const icon = button.querySelector('i');
            
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
        });
    });
}

/**
 * Handle change password form submission
 */
async function handleChangePassword() {
    const currentPassword = document.getElementById('currentPassword')?.value;
    const newPassword = document.getElementById('newPassword')?.value;
    const confirmNewPassword = document.getElementById('confirmNewPassword')?.value;
    const submitBtn = document.getElementById('changePasswordBtn');

    // Validate inputs
    if (!currentPassword || !newPassword || !confirmNewPassword) {
        showProfileAlert('Please fill in all password fields', 'error');
        return;
    }

    if (newPassword !== confirmNewPassword) {
        showProfileAlert('New passwords do not match', 'error');
        return;
    }

    if (newPassword.length < 6) {
        showProfileAlert('New password must be at least 6 characters', 'error');
        return;
    }

    if (currentPassword === newPassword) {
        showProfileAlert('New password must be different from current password', 'error');
        return;
    }

    // Show loading state
    const originalBtnText = submitBtn?.innerHTML;
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner"></span> Updating...';
    }

    try {
        const result = await changePassword(currentPassword, newPassword);

        if (result.success) {
            showProfileAlert(result.message, 'success');
            // Clear form on success
            document.getElementById('changePasswordForm')?.reset();
            
            // Close modal after 2 seconds on success
            setTimeout(() => {
                closeProfileModal();
            }, 2000);
        } else {
            showProfileAlert(result.error, 'error');
        }
    } catch (error) {
        showProfileAlert('An unexpected error occurred. Please try again.', 'error');
    } finally {
        // Restore button state
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalBtnText;
        }
    }
}

/**
 * Show alert in profile modal
 * @param {string} message - Alert message
 * @param {string} type - Alert type (success, error)
 */
function showProfileAlert(message, type = 'error') {
    const alertContainer = document.getElementById('profileAlertContainer');
    if (!alertContainer) return;

    const alertClass = type === 'success' ? 'alert-success' : 'alert-danger';
    const bgColor = type === 'success' ? '#d4edda' : '#f8d7da';
    const textColor = type === 'success' ? '#155724' : '#721c24';
    const borderColor = type === 'success' ? '#c3e6cb' : '#f5c6cb';

    alertContainer.innerHTML = `
        <div class="alert ${alertClass}" style="padding: 0.75rem; border-radius: 5px; background-color: ${bgColor}; color: ${textColor}; border: 1px solid ${borderColor}; margin-bottom: 1rem;">
            ${message}
        </div>
    `;

    // Auto-dismiss success messages after 3 seconds
    if (type === 'success') {
        setTimeout(() => {
            alertContainer.innerHTML = '';
        }, 3000);
    }
}

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}

// Make functions globally accessible
window.deleteStock = deleteStock;
window.editStock = editStock;
window.closeEditModal = closeEditModal;
window.saveEditStock = saveEditStock;
window.showCalculationInfo = showCalculationInfo;
window.closeCalculationModal = closeCalculationModal;
window.closeAuthModal = closeAuthModal;
window.showAuthModal = showAuthModal;
window.closeProfileModal = closeProfileModal;
window.showProfileModal = showProfileModal;

// Close modal when clicking outside of it
document.addEventListener('click', (event) => {
    const editModal = document.getElementById('editModal');
    const calcModal = document.getElementById('calculationModal');
    const authModal = document.getElementById('authModal');
    const profileModal = document.getElementById('profileModal');
    
    if (event.target === editModal) {
        closeEditModal();
    }
    if (event.target === calcModal) {
        closeCalculationModal();
    }
    if (event.target === authModal) {
        closeAuthModal();
    }
    if (event.target === profileModal) {
        closeProfileModal();
    }
});

// Close modal with Escape key
document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
        const editModal = document.getElementById('editModal');
        const calcModal = document.getElementById('calculationModal');
        const authModal = document.getElementById('authModal');
        const profileModal = document.getElementById('profileModal');
        
        if (editModal && editModal.classList.contains('active')) {
            closeEditModal();
        }
        if (calcModal && calcModal.classList.contains('active')) {
            closeCalculationModal();
        }
        if (authModal && authModal.classList.contains('active')) {
            closeAuthModal();
        }
        if (profileModal && profileModal.classList.contains('active')) {
            closeProfileModal();
        }
    }
});
