/**
 * Analysis Page JavaScript for Stock Analysis Dashboard (Firebase Integrated)
 * 
 * This file handles all functionality specific to the fundamental analysis page:
 * - Stock management (add, remove, clear all) using Firebase
 * - Real-time data synchronization across devices
 * - User authentication integration
 * - Manual data entry via modal
 * - Table rendering and updates
 * - Alert notifications
 * - Form validation and submission
 * - Offline support with localStorage fallback
 * 
 * Dependencies: jQuery, Bootstrap 5, Firebase
 * Data Storage: Firebase Realtime Database with localStorage backup
 */

import { 
    initAuthListener, 
    onAuthStateChange, 
    signUpUser, 
    signInUser, 
    signInWithGoogle,
    signOutUser,
    getCurrentUser,
    isAuthenticated 
} from './firebase-auth-service.js';

import { 
    listenToStocks, 
    addStock as addStockToFirebase, 
    updateStock as updateStockInFirebase, 
    deleteStock as deleteStockFromFirebase, 
    deleteAllStocks,
    migrateLocalStorageToFirebase 
} from './firebase-database-service.js';

/* ========================================
   Global Variables
   ======================================== */

// Store stocks data in memory (synced with Firebase)
let stocksData = [];

// Store active filters
let activeFilters = {};

// Firebase listener unsubscribe function
let unsubscribeStocksListener = null;

/* ========================================
   Document Ready Handler
   ======================================== */

$(document).ready(function() {
    // Initialize Firebase authentication listener
    initAuthListener();
    
    // Listen for auth state changes
    onAuthStateChange((user) => {
        if (user) {
            console.log('User logged in:', user.email);
            loadStocksFromFirebase();
        } else {
            console.log('User logged out');
            stocksData = [];
            renderTable();
        }
    });
    
    // Setup authentication UI handlers
    setupAuthHandlers();
    
    // Form submit handler - Add new stock
    $('#addStockForm').on('submit', function(e) {
        e.preventDefault();
        addStock();
    });
    
    // Clear all stocks handler
    $('#clearAllBtn').on('click', function() {
        if (confirm('Remove all stocks from the analysis? This will delete them from Firebase.')) {
            clearAllStocks();
        }
    });
    
    // Save manual data button handler
    $('#saveDataBtn').on('click', function() {
        submitManualData();
    });
    
    // Filter button handler - Open filter modal
    $(document).on('click', '#filterBtn', function() {
        openFilterModal();
    });
    
    // Apply filters button handler
    $(document).on('click', '#applyFiltersBtn', function() {
        applyFiltersFromModal();
    });
    
    // Clear filters from modal button handler
    $(document).on('click', '#clearFiltersModalBtn', function() {
        clearAllFilters();
        bootstrap.Modal.getInstance(document.getElementById('filterModal')).hide();
    });
});

/* ========================================
   Authentication Functions
   ======================================== */

/**
 * Setup authentication UI handlers
 */
function setupAuthHandlers() {
    // Show login modal
    $('#loginBtn, #authPromptLoginBtn').on('click', function() {
        showAuthModal('login');
    });
    
    // Show signup modal
    $('#signupBtn, #authPromptSignupBtn').on('click', function() {
        showAuthModal('signup');
    });
    
    // Toggle between login and signup forms
    $('#showSignupForm').on('click', function(e) {
        e.preventDefault();
        $('#loginForm').hide();
        $('#signupForm').show();
        $('#authModalTitle').text('Create Account');
    });
    
    $('#showLoginForm').on('click', function(e) {
        e.preventDefault();
        $('#signupForm').hide();
        $('#loginForm').show();
        $('#authModalTitle').text('Sign In');
    });
    
    // Login form submission
    $('#loginForm').on('submit', async function(e) {
        e.preventDefault();
        const email = $('#loginEmail').val();
        const password = $('#loginPassword').val();
        
        const result = await signInUser(email, password);
        if (result.success) {
            showAuthAlert('success', 'Signed in successfully!');
            setTimeout(() => {
                bootstrap.Modal.getInstance(document.getElementById('authModal')).hide();
            }, 1000);
        } else {
            showAuthAlert('danger', result.error);
        }
    });
    
    // Signup form submission
    $('#signupForm').on('submit', async function(e) {
        e.preventDefault();
        const name = $('#signupName').val();
        const email = $('#signupEmail').val();
        const password = $('#signupPassword').val();
        const confirmPassword = $('#signupConfirmPassword').val();
        
        // Validate passwords match
        if (password !== confirmPassword) {
            showAuthAlert('danger', 'Passwords do not match');
            return;
        }
        
        const result = await signUpUser(email, password, name);
        if (result.success) {
            showAuthAlert('success', 'Account created successfully!');
            setTimeout(() => {
                bootstrap.Modal.getInstance(document.getElementById('authModal')).hide();
            }, 1000);
        } else {
            showAuthAlert('danger', result.error);
        }
    });
    
    // Google Sign In
    $('#googleSignInBtn, #googleSignUpBtn').on('click', async function() {
        const result = await signInWithGoogle();
        if (result.success) {
            showAuthAlert('success', 'Signed in with Google successfully!');
            setTimeout(() => {
                bootstrap.Modal.getInstance(document.getElementById('authModal')).hide();
            }, 1000);
        } else {
            showAuthAlert('danger', result.error);
        }
    });
    
    // Logout handler
    $('#logoutBtn').on('click', async function(e) {
        e.preventDefault();
        if (confirm('Are you sure you want to logout?')) {
            const result = await signOutUser();
            if (result.success) {
                // Unsubscribe from Firebase listener
                if (unsubscribeStocksListener) {
                    unsubscribeStocksListener();
                    unsubscribeStocksListener = null;
                }
                showAlert('info', 'Logged out successfully');
            }
        }
    });
    
    // Migrate data handler
    $('#migrateDataBtn').on('click', async function(e) {
        e.preventDefault();
        if (confirm('Migrate your local data to Firebase? This will upload all stocks from your browser storage.')) {
            const result = await migrateLocalStorageToFirebase();
            if (result.success) {
                showAlert('success', result.message);
            } else {
                showAlert('danger', result.error);
            }
        }
    });
}

/**
 * Show authentication modal
 * @param {string} mode - 'login' or 'signup'
 */
function showAuthModal(mode) {
    if (mode === 'login') {
        $('#loginForm').show();
        $('#signupForm').hide();
        $('#authModalTitle').text('Sign In');
    } else {
        $('#loginForm').hide();
        $('#signupForm').show();
        $('#authModalTitle').text('Create Account');
    }
    
    // Clear form inputs
    $('#loginEmail, #loginPassword').val('');
    $('#signupName, #signupEmail, #signupPassword, #signupConfirmPassword').val('');
    $('#authAlertContainer').html('');
    
    const modal = new bootstrap.Modal(document.getElementById('authModal'));
    modal.show();
}

/**
 * Show alert in auth modal
 * @param {string} type - Alert type (success, danger, warning, info)
 * @param {string} message - Alert message
 */
function showAuthAlert(type, message) {
    const container = $('#authAlertContainer');
    const alertHTML = `
        <div class="alert alert-${type} alert-dismissible fade show" role="alert">
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
    `;
    container.html(alertHTML);
}

/* ========================================
   Firebase Data Functions
   ======================================== */

/**
 * Load stocks from Firebase with real-time listener
 */
function loadStocksFromFirebase() {
    // Unsubscribe from previous listener if exists
    if (unsubscribeStocksListener) {
        unsubscribeStocksListener();
    }
    
    // Set up real-time listener
    unsubscribeStocksListener = listenToStocks((stocks) => {
        stocksData = stocks;
        renderTable();
        console.log('Stocks data updated:', stocks.length);
    });
}

/**
 * Clear all stocks from Firebase
 */
async function clearAllStocks() {
    const addBtn = $('#clearAllBtn');
    addBtn.prop('disabled', true).html('<span class="spinner-border spinner-border-sm me-1"></span> Deleting...');
    
    const result = await deleteAllStocks();
    
    addBtn.prop('disabled', false).html('<i class="bi bi-trash"></i> Clear All');
    
    if (result.success) {
        showAlert('info', result.message);
    } else {
        showAlert('danger', result.error);
    }
}

/* ========================================
   Stock Management Functions
   ======================================== */

/**
 * Add a new stock to Firebase
 */
async function addStock() {
    if (!isAuthenticated()) {
        showAlert('warning', 'Please sign in to add stocks');
        showAuthModal('login');
        return;
    }
    
    const input = $('#stockSymbol');
    const nameInput = $('#stockName');
    const symbol = input.val().trim().toUpperCase();
    const name = nameInput.val().trim();
    const addBtn = $('#addBtn');
    
    // Validation
    if (!symbol && !name) {
        showAlert('danger', 'Please enter either stock symbol or company name');
        return;
    }
    
    // Check for duplicates
    if (stocksData.some(s => s.symbol === symbol)) {
        showAlert('warning', 'This stock is already in the analysis');
        return;
    }
    
    // Show loading state
    addBtn.addClass('loading');
    addBtn.prop('disabled', true);
    
    // Create stock object with placeholder data
    const stockData = {
        symbol: symbol || 'N/A',
        name: name || 'N/A',
        data_available: true,
        // Initialize all metrics with placeholder
        current_price: 'Enter Data',
        market_cap: 'Enter Data',
        sector: 'Enter Data',
        industry: 'Enter Data',
        liquidity: 'Enter Data',
        quick_ratio: 'Enter Data',
        debt_to_equity: 'Enter Data',
        roe: 'Enter Data',
        investor_growth_ratio: 'Enter Data',
        roa: 'Enter Data',
        ebitda_current: 'Enter Data',
        ebitda_previous: 'Enter Data',
        dividend_yield: 'Enter Data',
        pe_ratio: 'Enter Data',
        forward_pe: 'Enter Data',
        industry_pe: 'Enter Data',
        price_to_book: 'Enter Data',
        price_to_sales: 'Enter Data',
        ps_trend: 'Enter Data',
        beta: 'Enter Data',
        promoter_holdings: 'Enter Data'
    };
    
    // Add to Firebase
    const result = await addStockToFirebase(stockData);
    
    // Clear form inputs
    input.val('');
    nameInput.val('');
    
    // Show message
    if (result.success) {
        const message = result.offline 
            ? `Stock ${symbol || name} added offline! Will sync when online.` 
            : `Stock ${symbol || name} added! Click "Edit" button to enter details.`;
        showAlert('success', message);
    } else {
        showAlert('danger', result.error);
    }
    
    // Remove loading state
    addBtn.removeClass('loading');
    addBtn.prop('disabled', false);
}

/**
 * Remove a stock from Firebase
 * @param {string} stockId - Stock ID to remove
 */
window.removeStock = async function(stockId) {
    const stock = stocksData.find(s => s.stock_id === stockId);
    const symbol = stock ? stock.symbol : stockId;
    
    if (confirm(`Remove ${symbol} from the analysis?`)) {
        const result = await deleteStockFromFirebase(stockId);
        
        if (result.success) {
            const message = result.offline 
                ? `Stock ${symbol} removed offline! Will sync when online.` 
                : `Stock ${symbol} removed successfully`;
            showAlert('info', message);
        } else {
            showAlert('danger', result.error);
        }
    }
};

/* ========================================
   Table Rendering Functions
   ======================================== */

/**
 * Render the comparison table with all stocks
 */
function renderTable() {
    const tbody = $('#metricsBody');
    const emptyState = $('#emptyState');
    const clearAllBtn = $('#clearAllBtn');
    const filterBtn = $('#filterBtn');
    const stockCount = $('#stockCount');
    
    // Show/hide empty state
    if (stocksData.length === 0) {
        emptyState.show();
        $('.table-container').hide();
        clearAllBtn.hide();
        filterBtn.hide();
        stockCount.text(0);
        return;
    }
    
    emptyState.hide();
    $('.table-container').show();
    clearAllBtn.show();
    filterBtn.show();
    
    // Update filter button badge
    updateFilterBadge();
    
    // Apply filters to get filtered data
    const filteredData = getFilteredData();
    
    // Update stock count badge
    if (Object.keys(activeFilters).length > 0) {
        stockCount.html(`${filteredData.length} of ${stocksData.length}`);
    } else {
        stockCount.text(stocksData.length);
    }
    
    // Build table rows - Each stock is a row
    let bodyHTML = '';
    
    if (filteredData.length === 0) {
        bodyHTML = `
            <tr>
                <td colspan="18" class="text-center py-4">
                    <i class="bi bi-funnel text-muted" style="font-size: 2rem;"></i>
                    <p class="text-muted mt-2 mb-0">No stocks match your filter criteria</p>
                    <button class="btn btn-sm btn-outline-primary mt-2" onclick="clearAllFilters()">Clear Filters</button>
                </td>
            </tr>
        `;
    } else {
        filteredData.forEach((stock, index) => {
            bodyHTML += `
                <tr>
                    <td class="text-center"><strong>${index + 1}</strong></td>
                    <td><strong>${stock.name}</strong><br><small class="text-muted">${stock.symbol}</small></td>
                    <td class="text-center">${formatValue('liquidity', stock.liquidity)}</td>
                    <td class="text-center">${formatValue('quick_ratio', stock.quick_ratio)}</td>
                    <td class="text-center">${formatValue('debt_to_equity', stock.debt_to_equity)}</td>
                    <td class="text-center">${formatValue('roe', stock.roe)}</td>
                    <td class="text-center">${formatValue('investor_growth_ratio', stock.investor_growth_ratio)}</td>
                    <td class="text-center">${formatValue('roa', stock.roa)}</td>
                    <td class="text-center">${formatValue('ebitda_current', stock.ebitda_current)}</td>
                    <td class="text-center">${formatValue('ebitda_previous', stock.ebitda_previous)}</td>
                    <td class="text-center">${formatValue('dividend_yield', stock.dividend_yield)}</td>
                    <td class="text-center">${formatValue('pe_ratio', stock.pe_ratio)}</td>
                    <td class="text-center">${formatValue('industry_pe', stock.industry_pe)}</td>
                    <td class="text-center">${formatValue('price_to_book', stock.price_to_book)}</td>
                    <td class="text-center">${formatValue('price_to_sales', stock.price_to_sales)}</td>
                    <td class="text-center">${formatValue('beta', stock.beta)}</td>
                    <td class="text-center">${formatValue('promoter_holdings', stock.promoter_holdings)}</td>
                    <td class="text-center">
                        <button class="btn btn-sm btn-success me-1" onclick="fetchStockData('${stock.symbol}', '${stock.stock_id}')" title="Fetch Data">
                            <i class="bi bi-cloud-download"></i> Fetch
                        </button>
                        <button class="btn btn-sm btn-primary me-1" onclick="openManualDataModal('${stock.symbol}', '${escapeSingleQuotes(stock.name)}', '${stock.stock_id}')" title="Edit">
                            <i class="bi bi-pencil"></i> Edit
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="removeStock('${stock.stock_id}')" title="Delete">
                            <i class="bi bi-trash"></i> Delete
                        </button>
                    </td>
                </tr>
            `;
        });
    }
    
    tbody.html(bodyHTML);
}

/**
 * Escape single quotes for HTML attributes
 * @param {string} str - String to escape
 * @returns {string} Escaped string
 */
function escapeSingleQuotes(str) {
    return str.replace(/'/g, "\\'");
}

/**
 * Format value for display in table
 * @param {string} key - Metric key
 * @param {*} value - Value to format
 * @returns {string} Formatted HTML string
 */
function formatValue(key, value) {
    if (value === null || value === undefined || value === 'N/A' || value === 'Enter Data') {
        return '<span class="text-muted">N/A</span>';
    }
    return value;
}

/* ========================================
   Alert Functions
   ======================================== */

/**
 * Show alert message to user
 * @param {string} type - Alert type (success, danger, warning, info)
 * @param {string} message - Alert message
 */
function showAlert(type, message) {
    const container = $('#alertContainer');
    const alertHTML = `
        <div class="alert alert-${type} alert-dismissible fade show" role="alert">
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
    `;
    container.html(alertHTML);
    
    // Auto-dismiss after 5 seconds
    setTimeout(() => {
        container.find('.alert').fadeOut(function() {
            $(this).remove();
        });
    }, 5000);
}

/* ========================================
   Modal Functions
   ======================================== */

/**
 * Open manual data entry modal for a stock
 * @param {string} symbol - Stock symbol
 * @param {string} name - Stock name
 * @param {string} stockId - Stock ID
 */
window.openManualDataModal = function(symbol, name, stockId) {
    $('#modalStockSymbol').val(symbol);
    $('#modalName').val(name);
    $('#modalStockId').val(stockId); // Use .val() for hidden input
    
    // Find existing stock data
    const stock = stocksData.find(s => s.stock_id === stockId);
    
    // Pre-fill metric fields if editing existing stock
    if (stock) {
        $('#modalLiquidity').val((stock.liquidity && stock.liquidity !== 'Enter Data') ? stock.liquidity : '');
        $('#modalQuickRatio').val((stock.quick_ratio && stock.quick_ratio !== 'Enter Data') ? stock.quick_ratio : '');
        $('#modalDebtEquity').val((stock.debt_to_equity && stock.debt_to_equity !== 'Enter Data') ? stock.debt_to_equity : '');
        $('#modalROE').val((stock.roe && stock.roe !== 'Enter Data') ? stock.roe : '');
        $('#modalInvestorGrowth').val((stock.investor_growth_ratio && stock.investor_growth_ratio !== 'Enter Data') ? stock.investor_growth_ratio : '');
        $('#modalROA').val((stock.roa && stock.roa !== 'Enter Data') ? stock.roa : '');
        $('#modalEBITDACurrent').val((stock.ebitda_current && stock.ebitda_current !== 'Enter Data') ? stock.ebitda_current : '');
        $('#modalEBITDAPrevious').val((stock.ebitda_previous && stock.ebitda_previous !== 'Enter Data') ? stock.ebitda_previous : '');
        $('#modalDividendYield').val((stock.dividend_yield && stock.dividend_yield !== 'Enter Data') ? stock.dividend_yield : '');
        $('#modalPE').val((stock.pe_ratio && stock.pe_ratio !== 'Enter Data') ? stock.pe_ratio : '');
        $('#modalIndustryPE').val((stock.industry_pe && stock.industry_pe !== 'Enter Data') ? stock.industry_pe : '');
        $('#modalPriceToBook').val((stock.price_to_book && stock.price_to_book !== 'Enter Data') ? stock.price_to_book : '');
        $('#modalPriceToSales').val((stock.price_to_sales && stock.price_to_sales !== 'Enter Data') ? stock.price_to_sales : '');
        $('#modalBeta').val((stock.beta && stock.beta !== 'Enter Data') ? stock.beta : '');
        $('#modalPromoterHoldings').val((stock.promoter_holdings && stock.promoter_holdings !== 'Enter Data') ? stock.promoter_holdings : '');
    } else {
        // Clear all metric fields for new stock
        $('#modalLiquidity, #modalQuickRatio, #modalDebtEquity, #modalROE, #modalInvestorGrowth, #modalROA, #modalEBITDACurrent, #modalEBITDAPrevious, #modalDividendYield, #modalPE, #modalIndustryPE, #modalPriceToBook, #modalPriceToSales, #modalBeta, #modalPromoterHoldings').val('');
    }
    
    // Set today's date as default for price data
    $('#modalDate').val(new Date().toISOString().split('T')[0]);
    $('#modalOpen, #modalHigh, #modalLow, #modalClose, #modalVolume').val('');
    
    // Show modal using Bootstrap 5
    const modal = new bootstrap.Modal(document.getElementById('manualDataModal'));
    modal.show();
};

/**
 * Submit manual data from modal form
 */
async function submitManualData() {
    const symbol = $('#modalStockSymbol').val();
    const name = $('#modalName').val();
    const stockId = $('#modalStockId').val(); // Use .val() for hidden input
    
    if (!stockId) {
        showAlert('danger', 'Stock ID not found');
        return;
    }
    
    // Gather all 13 fundamental metrics
    const metrics = {
        name: name,
        liquidity: $('#modalLiquidity').val() || 'Enter Data',
        quick_ratio: $('#modalQuickRatio').val() || 'Enter Data',
        debt_to_equity: $('#modalDebtEquity').val() || 'Enter Data',
        roe: $('#modalROE').val() || 'Enter Data',
        investor_growth_ratio: $('#modalInvestorGrowth').val() || 'Enter Data',
        roa: $('#modalROA').val() || 'Enter Data',
        ebitda_current: $('#modalEBITDACurrent').val() || 'Enter Data',
        ebitda_previous: $('#modalEBITDAPrevious').val() || 'Enter Data',
        dividend_yield: $('#modalDividendYield').val() || 'Enter Data',
        pe_ratio: $('#modalPE').val() || 'Enter Data',
        industry_pe: $('#modalIndustryPE').val() || 'Enter Data',
        price_to_book: $('#modalPriceToBook').val() || 'Enter Data',
        price_to_sales: $('#modalPriceToSales').val() || 'Enter Data',
        beta: $('#modalBeta').val() || 'Enter Data',
        promoter_holdings: $('#modalPromoterHoldings').val() || 'Enter Data'
    };
    
    // Update in Firebase
    const result = await updateStockInFirebase(stockId, metrics);
    
    if (result.success) {
        const message = result.offline 
            ? 'Data saved offline! Will sync when online.' 
            : 'Data saved successfully! Table updated.';
        showAlert('success', message);
        
        // Hide modal using Bootstrap 5
        bootstrap.Modal.getInstance(document.getElementById('manualDataModal')).hide();
    } else {
        showAlert('danger', result.error);
    }
}

/* ========================================
   Filter Functions
   ======================================== */

/**
 * Get unique values for a specific field from stocksData
 * @param {string} fieldName - Name of the field to extract values from
 * @returns {Array} Sorted array of unique values
 */
function getUniqueValues(fieldName) {
    const values = stocksData
        .map(stock => stock[fieldName])
        .filter(val => val && val !== 'Enter Data' && val !== 'N/A');
    
    // Remove duplicates and sort
    const uniqueValues = [...new Set(values)];
    
    // Sort numerically if all values are numbers, otherwise alphabetically
    if (fieldName === 'name') {
        return uniqueValues.sort((a, b) => a.localeCompare(b));
    } else {
        // Try to sort as numbers
        const allNumbers = uniqueValues.every(val => !isNaN(parseFloat(val)));
        if (allNumbers) {
            return uniqueValues.sort((a, b) => parseFloat(a) - parseFloat(b));
        }
        return uniqueValues.sort((a, b) => String(a).localeCompare(String(b)));
    }
}

/**
 * Open filter modal and populate dropdowns with current data
 */
function openFilterModal() {
    // Populate all filter dropdowns with unique values
    const fields = {
        'filterStockName': 'name',
        'filterLiquidity': 'liquidity',
        'filterQuickRatio': 'quick_ratio',
        'filterDebtEquity': 'debt_to_equity',
        'filterROE': 'roe',
        'filterInvestorGrowth': 'investor_growth_ratio',
        'filterROA': 'roa',
        'filterEBITDACurrent': 'ebitda_current',
        'filterEBITDAPrevious': 'ebitda_previous',
        'filterDividendYield': 'dividend_yield',
        'filterPE': 'pe_ratio',
        'filterIndustryPE': 'industry_pe',
        'filterPriceToBook': 'price_to_book',
        'filterPriceToSales': 'price_to_sales',
        'filterBeta': 'beta',
        'filterPromoterHoldings': 'promoter_holdings'
    };
    
    Object.keys(fields).forEach(selectId => {
        const fieldName = fields[selectId];
        const uniqueValues = getUniqueValues(fieldName);
        const currentValue = activeFilters[fieldName] || '';
        
        let options = `<option value="">${fieldName === 'name' ? 'All Stocks' : 'All'}</option>`;
        uniqueValues.forEach(value => {
            const selected = currentValue === String(value) ? 'selected' : '';
            options += `<option value="${value}" ${selected}>${value}</option>`;
        });
        
        $(`#${selectId}`).html(options);
    });
    
    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('filterModal'));
    modal.show();
}

/**
 * Apply filters from modal selections
 */
function applyFiltersFromModal() {
    // Collect active filters from modal
    activeFilters = {};
    $('.filter-select-modal').each(function() {
        const field = $(this).data('field');
        const value = $(this).val();
        if (value) {
            activeFilters[field] = value;
        }
    });
    
    // Close modal
    bootstrap.Modal.getInstance(document.getElementById('filterModal')).hide();
    
    // Re-render table with filtered data
    renderTable();
    
    // Show success message if filters applied
    if (Object.keys(activeFilters).length > 0) {
        showAlert('success', `Filters applied! Showing ${getFilteredData().length} of ${stocksData.length} stocks.`);
    }
}

/**
 * Update filter button badge count
 */
function updateFilterBadge() {
    const filterCount = Object.keys(activeFilters).length;
    const badge = $('#filterCount');
    
    if (filterCount > 0) {
        badge.text(filterCount).show();
        $('#filterBtn').removeClass('btn-outline-primary').addClass('btn-primary');
    } else {
        badge.hide();
        $('#filterBtn').removeClass('btn-primary').addClass('btn-outline-primary');
    }
}

/**
 * Get filtered stock data based on active filters
 * @returns {Array} Filtered array of stocks
 */
function getFilteredData() {
    if (Object.keys(activeFilters).length === 0) {
        return stocksData;
    }
    
    return stocksData.filter(stock => {
        // Check if stock matches all active filters (AND logic)
        return Object.keys(activeFilters).every(field => {
            const filterValue = activeFilters[field];
            const stockValue = stock[field];
            
            // Handle missing/invalid data
            if (!stockValue || stockValue === 'Enter Data' || stockValue === 'N/A') {
                return false;
            }
            
            // Compare values (convert to string for comparison)
            return String(stockValue) === String(filterValue);
        });
    });
}

/**
 * Clear all active filters
 */
window.clearAllFilters = function() {
    activeFilters = {};
    $('.filter-select-modal').val('');
    renderTable();
    showAlert('info', 'All filters cleared');
};

/* ========================================
   Data Fetching Functions
   ======================================== */

/**
 * Fetch stock data from external API (Future Implementation)
 * @param {string} symbol - Stock symbol
 * @param {string} stockId - Stock ID
 */
window.fetchStockData = function(symbol, stockId) {
    showAlert('info', `Fetch functionality for ${symbol} will be implemented soon. Use Edit button to enter data manually.`);
};
