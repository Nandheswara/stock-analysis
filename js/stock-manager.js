/**
 * Stock Manager - Net Worth Tracker
 * Handles stock portfolio management with automatic brokerage and tax calculations
 * Integrated with Firebase for user-specific data storage
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
    signInWithGoogle
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

// Storage key for localStorage
const STORAGE_KEY = 'stockPortfolio';

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
        this.loadFromStorage();
        this.setupFirebaseSync();
    }

    /**
     * Set up Firebase real-time sync
     */
    setupFirebaseSync() {
        const user = getCurrentUser();
        
        if (user) {
            console.log('Setting up Firebase sync for user:', user.email);
            
            // Listen to real-time updates
            unsubscribePortfolio = listenToPortfolio((firebaseStocks) => {
                if (!isSyncing) {
                    console.log('Received Firebase update:', firebaseStocks.length, 'stocks');
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
                    
                    // Update UI
                    renderStocksTable();
                    updateSummaryDisplay();
                }
            });
            
            // Load initial data from Firebase
            this.loadFromFirebase();
        } else {
            console.log('No user authenticated, using localStorage only');
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
                console.log('Loading', firebaseStocks.length, 'stocks from Firebase');
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
                
                // Save to localStorage as backup
                this.saveToStorage();
                
                // Update UI
                renderStocksTable();
                updateSummaryDisplay();
            } else {
                // No data in Firebase, check if we have local data to migrate
                const localStocks = this.stocks;
                if (localStocks.length > 0) {
                    console.log('Migrating', localStocks.length, 'stocks from localStorage to Firebase');
                    await syncPortfolioToFirebase(localStocks);
                }
            }
            
            isSyncing = false;
        } catch (error) {
            console.error('Error loading from Firebase:', error);
            isSyncing = false;
        }
    }

    /**
     * Adds a new stock to the portfolio
     */
    async addStock(name, quantity, buyPrice, sellPrice = null) {
        const stock = new Stock(name, quantity, buyPrice, sellPrice);
        this.stocks.push(stock);
        this.saveToStorage();
        
        // Save to Firebase if user is authenticated
        const user = getCurrentUser();
        if (user) {
            try {
                isSyncing = true;
                await savePortfolioStock(stock);
                isSyncing = false;
                console.log('Stock saved to Firebase');
            } catch (error) {
                console.error('Error saving to Firebase:', error);
                isSyncing = false;
            }
        }
        
        return stock;
    }

    /**
     * Removes a stock from the portfolio
     */
    async removeStock(stockId) {
        this.stocks = this.stocks.filter(stock => stock.id !== stockId);
        this.saveToStorage();
        
        // Delete from Firebase if user is authenticated
        const user = getCurrentUser();
        if (user) {
            try {
                isSyncing = true;
                await deletePortfolioStockFirebase(stockId);
                isSyncing = false;
                console.log('Stock deleted from Firebase');
            } catch (error) {
                console.error('Error deleting from Firebase:', error);
                isSyncing = false;
            }
        }
    }

    /**
     * Updates a stock in the portfolio
     */
    async updateStock(stockId, updates) {
        const stockIndex = this.stocks.findIndex(stock => stock.id === stockId);
        if (stockIndex !== -1) {
            const stock = this.stocks[stockIndex];
            Object.assign(stock, updates);
            stock.calculateCharges();
            this.saveToStorage();
            
            // Update in Firebase if user is authenticated
            const user = getCurrentUser();
            if (user) {
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
                    console.log('Stock updated in Firebase');
                } catch (error) {
                    console.error('Error updating in Firebase:', error);
                    isSyncing = false;
                }
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
     * Saves portfolio to localStorage
     */
    saveToStorage() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this.stocks));
        } catch (error) {
            console.error('Failed to save portfolio to storage:', error);
        }
    }

    /**
     * Loads portfolio from localStorage
     */
    loadFromStorage() {
        try {
            const data = localStorage.getItem(STORAGE_KEY);
            if (data) {
                const parsedData = JSON.parse(data);
                this.stocks = parsedData.map(stockData => {
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
            }
        } catch (error) {
            console.error('Failed to load portfolio from storage:', error);
            this.stocks = [];
        }
    }

    /**
     * Gets all stocks
     */
    getAllStocks() {
        return this.stocks;
    }
}

// Initialize Portfolio Manager
const portfolioManager = new PortfolioManager();

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

        // Reset form
        event.target.reset();

        // Show success message
        showNotification('Stock added successfully!');
    } catch (error) {
        console.error('Error adding stock:', error);
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
        // Update the stock
        await portfolioManager.updateStock(stockId, {
            sellPrice: parseFloat(sellPrice)
        });

        // Update UI
        renderStocksTable();
        updateSummaryDisplay();
        closeEditModal();
        showNotification('Stock updated successfully!');
    } catch (error) {
        console.error('Error updating stock:', error);
        showNotification('Failed to update stock. Please try again.', 'error');
    }
}

/**
 * Deletes a stock from the portfolio
 */
function deleteStock(stockId) {
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
 */
function initApp() {
    console.log('=== Initializing Stock Manager ===');
    
    try {
        // Initialize Firebase Auth listener
        console.log('Step 1: Initializing auth listener...');
        initAuthListener();
        console.log('Auth listener initialized');
        
        // Set up form submission handler
        console.log('Step 2: Setting up form handler...');
        const form = document.getElementById('stockForm');
        if (form) {
            form.addEventListener('submit', handleFormSubmit);
            console.log('Form submit handler added');
        } else {
            console.warn('Stock form not found - may not be on stock manager page');
        }

        // Set up auth listeners
        console.log('Step 3: Setting up auth UI...');
        setupAuthUI();
        console.log('Auth UI setup complete');

        // Initial render
        console.log('Step 4: Rendering initial data...');
        renderStocksTable();
        updateSummaryDisplay();
        console.log('Initial render complete');

        // Add CSS animations
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
        
        console.log('=== Stock Manager initialized successfully ===');
        
        // Test button accessibility
        setTimeout(() => {
            const loginBtn = document.getElementById('loginBtn');
            const signupBtn = document.getElementById('signupBtn');
            console.log('=== Button Test (1 second after load) ===');
            console.log('Login button element:', loginBtn);
            console.log('Signup button element:', signupBtn);
            if (loginBtn) {
                console.log('Login button computed display:', window.getComputedStyle(loginBtn).display);
                console.log('Login button computed visibility:', window.getComputedStyle(loginBtn).visibility);
                console.log('Login button computed pointer-events:', window.getComputedStyle(loginBtn).pointerEvents);
            }
            if (signupBtn) {
                console.log('Signup button computed display:', window.getComputedStyle(signupBtn).display);
                console.log('Signup button computed visibility:', window.getComputedStyle(signupBtn).visibility);
                console.log('Signup button computed pointer-events:', window.getComputedStyle(signupBtn).pointerEvents);
            }
            console.log('Auth buttons parent display:', document.getElementById('authButtons')?.style.display);
            console.log('=== End Button Test ===');
        }, 1000);
        
    } catch (error) {
        console.error('=== Error initializing Stock Manager ===', error);
    }
}

/**
 * Set up authentication UI handlers
 */
function setupAuthUI() {
    console.log('Setting up auth UI...');
    
    let isLoginMode = true;

    // Get elements
    const loginBtn = document.getElementById('loginBtn');
    const signupBtn = document.getElementById('signupBtn');
    const logoutBtn = document.getElementById('logoutBtn');

    // Note: The auth buttons visibility is handled by updateAuthUI() in firebase-auth-service.js
    // which is called automatically by initAuthListener()

    // Auth state change listener for portfolio sync
    onAuthStateChanged((user) => {
        console.log('Auth state changed in stock-manager:', user ? user.email : 'Not authenticated');
        
        if (user && portfolioManager) {
            // User is signed in - reload portfolio from Firebase
            portfolioManager.setupFirebaseSync();
        }
    });

    // Login button
    if (loginBtn) {
        loginBtn.addEventListener('click', (e) => {
            console.log('Login button clicked');
            e.preventDefault();
            e.stopPropagation();
            isLoginMode = true;
            showAuthModal(true);
        });
        console.log('Login button listener added');
    } else {
        console.error('Login button not found');
    }

    // Signup button
    if (signupBtn) {
        signupBtn.addEventListener('click', (e) => {
            console.log('Signup button clicked');
            e.preventDefault();
            e.stopPropagation();
            isLoginMode = false;
            showAuthModal(false);
        });
        console.log('Signup button listener added');
    } else {
        console.error('Signup button not found');
    }

    // Logout button
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async (e) => {
            console.log('Logout button clicked');
            e.preventDefault();
            e.stopPropagation();
            
            try {
                await logoutUser();
                showNotification('Logged out successfully!');
                
                // Clear portfolio and reload from localStorage
                if (unsubscribePortfolio) {
                    unsubscribePortfolio();
                    unsubscribePortfolio = null;
                }
                location.reload();
            } catch (error) {
                console.error('Logout error:', error);
                showNotification('Failed to logout', 'error');
            }
        });
        console.log('Logout button listener added');
    } else {
        console.error('Logout button not found');
    }

    // Auth form switch link - set up dynamically when modal opens
    setupAuthModalHandlers();
    
    console.log('Auth UI setup complete');
}

/**
 * Setup auth modal handlers
 * Note: isLoginMode is stored in the data attribute of the modal
 */
function setupAuthModalHandlers() {
    // Auth submit button
    const authSubmitBtn = document.getElementById('authSubmitBtn');
    const authForm = document.getElementById('authForm');
    const googleSignInBtn = document.getElementById('googleSignInBtn');
    
    // Handle form submission (both button click and Enter key)
    const handleAuthSubmit = async (e) => {
        if (e) e.preventDefault();
        
        const email = document.getElementById('authEmail')?.value;
        const password = document.getElementById('authPassword')?.value;
        const errorDiv = document.getElementById('authError');
        const modal = document.getElementById('authModal');
        
        // Get current mode from modal data attribute
        const isLoginMode = modal?.dataset.loginMode === 'true';

        if (errorDiv) errorDiv.style.display = 'none';

        if (!email || !password) {
            if (errorDiv) {
                errorDiv.textContent = 'Please enter both email and password';
                errorDiv.style.display = 'block';
            }
            return;
        }

        // Disable button during submission
        if (authSubmitBtn) {
            authSubmitBtn.disabled = true;
            authSubmitBtn.textContent = isLoginMode ? 'Logging in...' : 'Signing up...';
        }

        try {
            console.log(`Attempting ${isLoginMode ? 'login' : 'signup'} for:`, email);
            
            if (isLoginMode) {
                await loginUser(email, password);
                showNotification('Logged in successfully!');
            } else {
                await signupUser(email, password);
                showNotification('Account created successfully!');
            }
            closeAuthModal();
        } catch (error) {
            console.error('Auth error:', error);
            if (errorDiv) {
                errorDiv.textContent = error.message || 'Authentication failed';
                errorDiv.style.display = 'block';
            }
        } finally {
            // Re-enable button
            if (authSubmitBtn) {
                authSubmitBtn.disabled = false;
                authSubmitBtn.textContent = isLoginMode ? 'Login' : 'Sign Up';
            }
        }
    };

    if (authSubmitBtn) {
        authSubmitBtn.onclick = handleAuthSubmit;
        console.log('Auth submit button handler added');
    }
    
    if (authForm) {
        authForm.onsubmit = handleAuthSubmit;
        console.log('Auth form submit handler added');
    }
    
    // Google Sign-In button handler
    if (googleSignInBtn) {
        googleSignInBtn.onclick = async (e) => {
            e.preventDefault();
            const errorDiv = document.getElementById('authError');
            const googleSignInText = document.getElementById('googleSignInText');
            
            if (errorDiv) errorDiv.style.display = 'none';
            
            // Disable button during sign-in
            googleSignInBtn.disabled = true;
            if (googleSignInText) googleSignInText.textContent = 'Signing in...';
            
            try {
                console.log('Attempting Google sign-in');
                const result = await signInWithGoogle();
                
                if (result.success) {
                    showNotification('Signed in with Google successfully!');
                    closeAuthModal();
                } else {
                    throw new Error(result.error || 'Google sign-in failed');
                }
            } catch (error) {
                console.error('Google sign-in error:', error);
                if (errorDiv) {
                    errorDiv.textContent = error.message || 'Failed to sign in with Google. Please try again.';
                    errorDiv.style.display = 'block';
                }
            } finally {
                // Re-enable button
                googleSignInBtn.disabled = false;
                if (googleSignInText) googleSignInText.textContent = 'Continue with Google';
            }
        };
        console.log('Google sign-in button handler added');
    }
}

/**
 * Show auth modal
 */
function showAuthModal(isLogin) {
    console.log('Showing auth modal, isLogin:', isLogin);
    
    const modal = document.getElementById('authModal');
    const title = document.getElementById('authModalTitle');
    const submitBtn = document.getElementById('authSubmitBtn');
    const switchText = document.getElementById('authSwitchText');

    if (!modal || !title || !submitBtn || !switchText) {
        console.error('Auth modal elements not found');
        return;
    }

    // Store the mode in data attribute for the submit handler to read
    modal.dataset.loginMode = isLogin ? 'true' : 'false';

    title.textContent = isLogin ? 'Login' : 'Sign Up';
    submitBtn.textContent = isLogin ? 'Login' : 'Sign Up';
    submitBtn.disabled = false;
    
    // Update switch text with proper event handler
    if (isLogin) {
        switchText.innerHTML = 'Don\'t have an account? <a href="#" id="authSwitchLink" style="color: #667eea; text-decoration: none;">Sign Up</a>';
    } else {
        switchText.innerHTML = 'Already have an account? <a href="#" id="authSwitchLink" style="color: #667eea; text-decoration: none;">Login</a>';
    }

    // Add event listener to the switch link
    const switchLink = document.getElementById('authSwitchLink');
    if (switchLink) {
        switchLink.onclick = (e) => {
            e.preventDefault();
            console.log('Switching auth mode');
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
    
    // Focus on email input
    setTimeout(() => {
        if (emailInput) emailInput.focus();
    }, 100);
    
    console.log('Auth modal displayed');
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

// Close modal when clicking outside of it
document.addEventListener('click', (event) => {
    const editModal = document.getElementById('editModal');
    const calcModal = document.getElementById('calculationModal');
    const authModal = document.getElementById('authModal');
    
    if (event.target === editModal) {
        closeEditModal();
    }
    if (event.target === calcModal) {
        closeCalculationModal();
    }
    if (event.target === authModal) {
        closeAuthModal();
    }
});

// Close modal with Escape key
document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
        const editModal = document.getElementById('editModal');
        const calcModal = document.getElementById('calculationModal');
        const authModal = document.getElementById('authModal');
        
        if (editModal && editModal.classList.contains('active')) {
            closeEditModal();
        }
        if (calcModal && calcModal.classList.contains('active')) {
            closeCalculationModal();
        }
        if (authModal && authModal.classList.contains('active')) {
            closeAuthModal();
        }
    }
});
