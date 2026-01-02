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
 * - Offline support with sessionStorage fallback
 * 
 * Dependencies: jQuery, Bootstrap 5, Firebase
 * Data Storage: Firebase Realtime Database with sessionStorage backup
 * 
 * Performance Optimizations:
 * - Debounced rendering to prevent excessive DOM updates
 * - Request caching to avoid duplicate API calls
 * - Optimistic UI updates for faster perceived performance
 * - Event delegation for better memory usage
 * - DocumentFragment for efficient DOM insertion
 */

import { 
    initAuthListener, 
    onAuthStateChange, 
    signUpUser, 
    signInUser, 
    signInWithGoogle,
    signOutUser,
    getCurrentUser,
    isAuthenticated,
    resetPassword,
    changePassword
} from './firebase-auth-service.js';

import { 
    listenToStocks, 
    addStock as addStockToFirebase, 
    updateStock as updateStockInFirebase, 
    deleteStock as deleteStockFromFirebase, 
    deleteAllStocks,
    migrateSessionStorageToFirebase 
} from './firebase-database-service.js';
import { loadStockSymbols, slugToDisplayName, getStockSymbol } from './stock-dropdown.js';
import { makeFetchStockData, growwCrawler } from './fetch.js';
import { 
    debounce, 
    throttle, 
    setupGlobalErrorHandler, 
    logError, 
    escapeAttribute,
    perfMonitor,
    batchDOMUpdate
} from './utils.js';

/* ========================================
   Global Variables
   ======================================== */

// Store stocks data in memory (synced with Firebase)
let stocksData = [];

// Store active filters
let activeFilters = {};

// Firebase listener unsubscribe function
let unsubscribeStocksListener = null;

// Render state tracking to prevent excessive renders
let renderPending = false;
let lastRenderTimestamp = 0;
const MIN_RENDER_INTERVAL = 50; // Minimum ms between renders

/* ========================================
   Loading State Management
   ======================================== */

/**
 * Show loading overlay with optional message
 * @param {string} message - Optional loading message
 */
function showLoading(message = 'Loading...') {
    const overlay = $('#loadingOverlay');
    const loadingText = $('#loadingText');
    
    if (loadingText.length) {
        loadingText.text(message);
    }
    
    overlay.fadeIn(200);
}

/**
 * Hide loading overlay
 */
function hideLoading() {
    $('#loadingOverlay').fadeOut(200);
}

/**
 * Show loading state on a button
 * @param {jQuery} $button - jQuery button element
 * @param {string} originalText - Original button text to restore later
 */
function showButtonLoading($button, originalText) {
    $button.data('original-text', originalText);
    $button.prop('disabled', true);
    $button.addClass('loading');
}

/**
 * Hide loading state on a button
 * @param {jQuery} $button - jQuery button element
 */
function hideButtonLoading($button) {
    const originalText = $button.data('original-text');
    $button.prop('disabled', false);
    $button.removeClass('loading');
    if (originalText) {
        $button.html(originalText);
    }
}

/**
 * Check for preloaded cache data and render immediately
 * This runs before Firebase SDK loads for instant display
 */
function checkPreloadedCache() {
    if (window.__PRELOADED_STOCKS__ && window.__PRELOADED_STOCKS__.length > 0) {
        stocksData = window.__PRELOADED_STOCKS__;
        renderTable();
        hideLoading();
        return true;
    }
    return false;
}

// Handle page restoration from bfcache (back-forward cache)
// This ensures data is refreshed when user navigates back using browser buttons
window.addEventListener('pageshow', function(event) {
    if (event.persisted) {
        // Page was restored from bfcache
        // Reset state and reload data from Firebase
        stocksData = [];
        isAddingStock = false;
        isSubmitting = false;
        
        if (unsubscribeStocksListener) {
            unsubscribeStocksListener();
            unsubscribeStocksListener = null;
        }
        
        // Reload data
        if (isAuthenticated()) {
            loadStocksFromFirebase(false);
        } else {
            renderTable();
        }
    }
});

$(document).ready(function() {
    // Setup global error handler for better error management
    setupGlobalErrorHandler(false); // Don't auto-show errors, we handle manually
    
    // Reset state in case page is restored from bfcache (back-forward cache)
    // This prevents duplicate data when using browser back/forward buttons
    stocksData = [];
    isAddingStock = false;
    isSubmitting = false;
    
    // Unsubscribe any existing listener from previous session
    if (unsubscribeStocksListener) {
        unsubscribeStocksListener();
        unsubscribeStocksListener = null;
    }
    
    // IMMEDIATELY render cached data if available (before Firebase loads)
    const hadPreloadedData = checkPreloadedCache();
    
    // If no preloaded data, render empty table immediately for better UX
    if (!hadPreloadedData) {
        stocksData = [];
        renderTable();
    }
    
    // Initialize Firebase auth in parallel
    initAuthListener();
    
    onAuthStateChange((user) => {
        if (user) {
            // If we already rendered from cache, just set up listener for updates
            loadStocksFromFirebase(!hadPreloadedData);
        } else {
            stocksData = [];
            renderTable();
        }
    });
    
    setupAuthHandlers();
    // Load stock symbols for the dropdown (implemented in stock-dropdown.js)
    loadStockSymbols();
    
    // Setup auto-fill for company name when stock is selected from dropdown
    setupStockDropdownHandlers();
    
    // Setup event delegation for table actions (more efficient than individual listeners)
    setupTableEventDelegation();
    
    $('#addStockForm').on('submit', function(e) {
        e.preventDefault();
        addStock();
    });
    
    $('#clearAllBtn').on('click', function() {
        if (confirm('Remove all stocks from the analysis? This will delete them from Firebase.')) {
            clearAllStocks();
        }
    });
    
    $('#fetchAllBtn').on('click', function() {
        fetchAllStocks();
    });
    
    $('#saveDataBtn').on('click', function() {
        submitManualData();
    });
    
    $(document).on('click', '#filterBtn', function() {
        openFilterModal();
    });
    
    $(document).on('click', '#applyFiltersBtn', function() {
        applyFiltersFromModal();
    });
    
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
    $(document).on('click', '#loginBtn, #authPromptLoginBtn', function(e) {
        e.preventDefault();
        showAuthModal('login');
    });
    
    $(document).on('click', '#signupBtn, #authPromptSignupBtn', function(e) {
        e.preventDefault();
        showAuthModal('signup');
    });
    
    $(document).on('click', '#showSignupForm', function(e) {
        e.preventDefault();
        $('#loginForm').hide();
        $('#signupForm').show();
        $('#forgotPasswordForm').hide();
        $('#authModalTitle').text('Create Account');
    });
    
    $(document).on('click', '#showLoginForm, #backToLoginBtn', function(e) {
        e.preventDefault();
        $('#signupForm').hide();
        $('#forgotPasswordForm').hide();
        $('#loginForm').show();
        $('#authModalTitle').text('Sign In');
    });
    
    $(document).on('submit', '#loginForm', async function(e) {
        e.preventDefault();
        const email = $('#loginEmail').val();
        const password = $('#loginPassword').val();
        
        if (!email || !password) {
            showAuthAlert('danger', 'Please enter email and password');
            return;
        }
        
        const $submitBtn = $(this).find('button[type="submit"]');
        showButtonLoading($submitBtn, $submitBtn.html());
        
        const result = await signInUser(email, password);
        
        hideButtonLoading($submitBtn);
        
        if (result.success) {
            showAuthAlert('success', 'Signed in successfully!');
            setTimeout(() => {
                const modal = bootstrap.Modal.getInstance(document.getElementById('authModal'));
                if (modal) modal.hide();
            }, 1000);
        } else {
            showAuthAlert('danger', result.error);
        }
    });
    
    $(document).on('submit', '#signupForm', async function(e) {
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
        
        const $submitBtn = $(this).find('button[type="submit"]');
        showButtonLoading($submitBtn, $submitBtn.html());
        
        const result = await signUpUser(email, password, name);
        
        hideButtonLoading($submitBtn);
        
        if (result.success) {
            showAuthAlert('success', 'Account created successfully!');
            setTimeout(() => {
                const modal = bootstrap.Modal.getInstance(document.getElementById('authModal'));
                if (modal) modal.hide();
            }, 1000);
        } else {
            showAuthAlert('danger', result.error);
        }
    });
    
    $(document).on('click', '#googleSignInBtn, #googleSignUpBtn', async function(e) {
        e.preventDefault();
        
        const $btn = $(this);
        showButtonLoading($btn, $btn.html());
        
        const result = await signInWithGoogle();
        
        hideButtonLoading($btn);
        
        if (result.success) {
            showAuthAlert('success', 'Signed in with Google successfully!');
            setTimeout(() => {
                const modal = bootstrap.Modal.getInstance(document.getElementById('authModal'));
                if (modal) modal.hide();
            }, 1000);
        } else {
            showAuthAlert('danger', result.error);
        }
    });
    
    $(document).on('click', '#logoutBtn', async function(e) {
        e.preventDefault();
        if (confirm('Are you sure you want to logout?')) {
            showLoading('Logging out...');
            
            const result = await signOutUser();
            
            hideLoading();
            
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
    
    $(document).on('click', '#migrateDataBtn', async function(e) {
        e.preventDefault();
        if (confirm('Migrate your local data to Firebase? This will upload all stocks from your browser storage.')) {
            showLoading('Migrating data to Firebase...');
            
            const result = await migrateSessionStorageToFirebase();
            
            hideLoading();
            if (result.success) {
                showAlert('success', result.message);
            } else {
                showAlert('danger', result.error);
            }
        }
    });
    
    $(document).on('click', '#forgotPasswordLink', function(e) {
        e.preventDefault();
        showForgotPasswordModal();
    });
    
    $(document).on('click', '#sendResetEmailBtn', async function(e) {
        e.preventDefault();
        const email = $('#resetEmail').val().trim();
        
        if (!email) {
            showAuthAlert('danger', 'Please enter your email address');
            return;
        }
        
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            showAuthAlert('danger', 'Please enter a valid email address');
            return;
        }
        
        const $btn = $(this);
        showButtonLoading($btn, $btn.html());
        
        const result = await resetPassword(email);
        
        hideButtonLoading($btn);
        
        if (result.success) {
            showAuthAlert('success', result.message);
            setTimeout(() => {
                const modal = bootstrap.Modal.getInstance(document.getElementById('authModal'));
                if (modal) modal.hide();
                $('#resetEmail').val('');
            }, 2000);
        } else {
            showAuthAlert('danger', result.error);
        }
    });

    // Profile button now navigates to profile.html page directly via href
    // No need to intercept the click event

    // Password toggle buttons
    $(document).on('click', '.toggle-password', function() {
        const targetId = $(this).data('target');
        const $input = $('#' + targetId);
        const $icon = $(this).find('i');
        
        if ($input.attr('type') === 'password') {
            $input.attr('type', 'text');
            $icon.removeClass('bi-eye').addClass('bi-eye-slash');
        } else {
            $input.attr('type', 'password');
            $icon.removeClass('bi-eye-slash').addClass('bi-eye');
        }
    });
}

/**
 * Show alert in profile modal
 * @param {string} type - Alert type (success, danger, warning, info)
 * @param {string} message - Alert message
 */
function showProfileAlert(type, message) {
    const container = $('#profileAlertContainer');
    const alertHTML = `
        <div class="alert alert-${type} alert-dismissible fade show" role="alert">
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
    `;
    container.html(alertHTML);
}

/**
 * Show authentication modal
 * @param {string} mode - 'login' or 'signup'
 */
function showAuthModal(mode) {
    if (mode === 'login') {
        $('#loginForm').show();
        $('#signupForm').hide();
        $('#forgotPasswordForm').hide();
        $('#authModalTitle').text('Sign In');
    } else {
        $('#loginForm').hide();
        $('#signupForm').show();
        $('#forgotPasswordForm').hide();
        $('#authModalTitle').text('Create Account');
    }
    
    // Clear form inputs
    $('#loginEmail, #loginPassword').val('');
    $('#signupName, #signupEmail, #signupPassword, #signupConfirmPassword').val('');
    $('#resetEmail').val('');
    $('#authAlertContainer').html('');
    
    const modalElement = document.getElementById('authModal');
    if (!modalElement) {
        return;
    }
    
    let modal = bootstrap.Modal.getInstance(modalElement);
    if (!modal) {
        modal = new bootstrap.Modal(modalElement);
    }
    
    modal.show();
}

/**
 * Show forgot password modal
 */
function showForgotPasswordModal() {
    $('#loginForm').hide();
    $('#signupForm').hide();
    $('#forgotPasswordForm').show();
    $('#authModalTitle').text('Reset Password');
    $('#resetEmail').val('');
    $('#authAlertContainer').html('');
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

// Flag to prevent duplicate renders during stock operations
let isAddingStock = false;

// Flag to prevent duplicate form submissions
let isSubmitting = false;

/**
 * Load stocks from Firebase with real-time listener
 * Optimized for instant loading with localStorage cache
 * @param {boolean} showLoadingIndicator - Whether to show loading indicator
 */
function loadStocksFromFirebase(showLoadingIndicator = true) {
    // Check if we already have preloaded data
    if (window.__CACHE_HIT__ && stocksData.length > 0) {
        showLoadingIndicator = false;
    }
    
    // Check if we have cached data - if so, skip loading indicator
    if (showLoadingIndicator) {
        const user = getCurrentUser();
        const cacheKey = user ? `stocksCache_${user.uid || user._fromCache}` : null;
        
        if (cacheKey) {
            try {
                const cached = localStorage.getItem(cacheKey);
                if (cached && JSON.parse(cached).length > 0) {
                    showLoadingIndicator = false;
                }
            } catch (e) {
                // Silent fail
            }
        }
    }
    
    // Only show loading if no cached data available
    if (showLoadingIndicator) {
        showLoading('Loading your stocks...');
    }
    
    if (unsubscribeStocksListener) {
        unsubscribeStocksListener();
    }
    
    unsubscribeStocksListener = listenToStocks((stocks) => {
        // Skip update if we're in the middle of adding a stock (prevents double render)
        if (isAddingStock) {
            return;
        }
        
        // Check if data actually changed using comprehensive comparison
        const hasDataChanged = checkStocksDataChanged(stocks, stocksData);
        
        if (hasDataChanged) {
            stocksData = stocks;
            renderTable();
        }
        hideLoading();
    });
}

/**
 * Check if stocks data has changed (IDs, count, or any field content)
 * @param {Array} newStocks - New stocks from Firebase
 * @param {Array} oldStocks - Current stocks in memory
 * @returns {boolean} True if data has changed
 */
function checkStocksDataChanged(newStocks, oldStocks) {
    // Check count
    if (newStocks.length !== oldStocks.length) {
        return true;
    }
    
    // Check if IDs changed
    const newStockIds = newStocks.map(s => s.stock_id).sort().join(',');
    const oldStockIds = oldStocks.map(s => s.stock_id).sort().join(',');
    
    if (newStockIds !== oldStockIds) {
        return true;
    }
    
    // Check if any stock content changed (all editable fields)
    for (const newStock of newStocks) {
        const oldStock = oldStocks.find(s => s.stock_id === newStock.stock_id);
        
        if (!oldStock) {
            return true;
        }
        
        // Compare all fields that can be updated
        const fieldsToCompare = [
            'name', 'symbol', 'liquidity', 'quick_ratio', 'debt_to_equity',
            'roe', 'investor_growth_ratio', 'roa', 'ebitda_current', 
            'ebitda_previous', 'dividend_yield', 'pe_ratio', 'industry_pe',
            'price_to_book', 'price_to_sales', 'beta', 'promoter_holdings'
        ];
        
        for (const field of fieldsToCompare) {
            if (newStock[field] !== oldStock[field]) {
                return true;
            }
        }
    }
    
    return false;
}

/**
 * Clear all stocks from Firebase
 */
async function clearAllStocks() {
    if (!isAuthenticated()) {
        showAlert('warning', 'Please sign in to clear stocks');
        showAuthModal('login');
        return;
    }
    
    const $clearBtn = $('#clearAllBtn');
    showButtonLoading($clearBtn, $clearBtn.html());
    
    const result = await deleteAllStocks();
    
    hideButtonLoading($clearBtn);
    
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
 * Optimized for faster response with optimistic UI update
 */
async function addStock() {
    // Prevent duplicate submissions (double-click protection)
    if (isSubmitting) {
        return;
    }
    
    if (!isAuthenticated()) {
        showAlert('warning', 'Please sign in to add stocks');
        showAuthModal('login');
        return;
    }
    
    const input = $('#stockSymbol');
    const nameInput = $('#stockName');
    const manualSymbolInput = $('#manualStockSymbol');
    const addBtn = $('#addBtn');
    
    // Get the slug from dropdown (value) and selected option data
    const dropdownValue = input.val() ? input.val().trim() : '';
    const isManualEntry = dropdownValue === '__manual__';
    const selectedOption = input.find('option:selected');
    const displayName = selectedOption.attr('data-display-name') || selectedOption.text() || '';
    const stockSymbol = selectedOption.attr('data-symbol') || '';
    const manualName = nameInput.val().trim();
    const manualSymbol = manualSymbolInput.length ? manualSymbolInput.val().trim() : '';
    
    // Handle manual entry vs dropdown selection
    let symbol, name, nseSymbol;
    
    if (isManualEntry) {
        // Manual entry mode
        if (!manualName) {
            showAlert('danger', 'Please enter the company name');
            return;
        }
        // For manual entry, generate a slug from company name
        symbol = manualName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        name = manualName;
        nseSymbol = manualSymbol.toUpperCase() || '';
    } else if (dropdownValue) {
        // Selected from dropdown
        symbol = dropdownValue;
        name = manualName || displayName || dropdownValue;
        nseSymbol = stockSymbol;
    } else {
        // Neither manual nor dropdown selection
        showAlert('danger', 'Please select a stock from dropdown or choose "Add Stock Manually"');
        return;
    }
    
    if (!symbol && !name) {
        showAlert('danger', 'Please select a stock from dropdown or enter company name');
        return;
    }
    
    // Check for duplicate stock BEFORE clearing inputs
    if (symbol && symbol !== 'N/A' && stocksData.some(s => s.symbol === symbol)) {
        showAlert('warning', 'This stock is already in the analysis');
        return;
    }
    
    // Check for duplicate by name as well
    if (name && name !== 'N/A' && stocksData.some(s => s.name.toLowerCase() === name.toLowerCase())) {
        showAlert('warning', 'A stock with this name is already in the analysis');
        return;
    }
    
    // Set submission flag to prevent duplicate submissions
    isSubmitting = true;
    
    // Show button loading state only (no overlay)
    const originalBtnHtml = addBtn.html();
    addBtn.html('<span class="spinner-border spinner-border-sm" role="status"></span>');
    addBtn.prop('disabled', true);
    
    // Clear inputs immediately for better UX
    if (window.jQuery && input.hasClass('select2-hidden-accessible')) {
        input.val(null).trigger('change'); // Reset Select2
    } else {
        input.val('');
    }
    nameInput.val('');
    nameInput.prop('readonly', false);
    if (manualSymbolInput.length) {
        manualSymbolInput.val('');
        $('#manualSymbolGroup').addClass('d-none');
    }
    
    const stockData = {
        symbol: symbol, // Store slug for Groww URL
        name: name,
        stock_symbol: nseSymbol, // Store NSE/BSE symbol if available
        is_manual_entry: isManualEntry, // Track if this was manually added
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
    
    // Optimistic UI update - add stock to local array immediately
    const tempStockId = `stock_${Date.now()}`;
    const optimisticStock = {
        ...stockData,
        stock_id: tempStockId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    
    // Set flag to prevent Firebase listener from causing duplicate render
    isAddingStock = true;
    
    // Add to local data and render immediately (optimistic update)
    stocksData.push(optimisticStock);
    renderTable();
    
    // Now save to Firebase in background - pass the tempStockId to ensure consistency
    const result = await addStockToFirebase(stockData, tempStockId);
    
    // Restore button state
    addBtn.html(originalBtnHtml);
    addBtn.prop('disabled', false);
    
    if (result.success) {
        const message = result.offline 
            ? `Stock ${symbol || name} added offline! Will sync when online.` 
            : `Stock ${symbol || name} added! Click "Edit" button to enter details.`;
        showAlert('success', message);
        
        // No need to update stock ID since we pass the same ID to Firebase
        // The optimistic stock and Firebase stock now share the same ID
    } else {
        // Remove optimistic stock on failure
        stocksData = stocksData.filter(s => s.stock_id !== tempStockId);
        renderTable();
        showAlert('danger', result.error);
    }
    
    // Clear the flag after a short delay to ensure Firebase listener doesn't add duplicate
    // This delay allows time for the Firebase listener callback to fire and be ignored
    setTimeout(() => {
        isAddingStock = false;
        isSubmitting = false;
    }, 500);
}

/**
 * Remove a stock from Firebase
 * @param {string} stockId - Stock ID to remove
 */
window.removeStock = async function(stockId) {
    if (!isAuthenticated()) {
        showAlert('warning', 'Please sign in to remove stocks');
        showAuthModal('login');
        return;
    }
    
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
 * Debounced render function to prevent excessive DOM updates
 * Uses requestAnimationFrame for smoother rendering
 */
const debouncedRender = debounce(() => {
    renderTableInternal();
}, 16); // ~60fps

/**
 * Render the comparison table with all stocks
 * Uses debouncing to prevent excessive renders
 */
function renderTable() {
    const now = performance.now();
    
    // Prevent rapid successive renders
    if (now - lastRenderTimestamp < MIN_RENDER_INTERVAL) {
        if (!renderPending) {
            renderPending = true;
            debouncedRender();
        }
        return;
    }
    
    lastRenderTimestamp = now;
    renderPending = false;
    renderTableInternal();
}

/**
 * Internal render function - actual DOM manipulation
 * Optimized with DocumentFragment and batch updates
 */
function renderTableInternal() {
    perfMonitor.start('renderTable');
    
    const tbody = document.getElementById('metricsBody');
    const emptyState = document.getElementById('emptyState');
    const clearAllBtn = document.getElementById('clearAllBtn');
    const filterBtn = document.getElementById('filterBtn');
    const fetchAllBtn = document.getElementById('fetchAllBtn');
    const stockCount = document.getElementById('stockCount');
    const tableContainer = document.querySelector('.table-container');
    
    if (stocksData.length === 0) {
        emptyState.style.display = 'block';
        tableContainer.style.display = 'none';
        clearAllBtn.style.display = 'none';
        filterBtn.style.display = 'none';
        fetchAllBtn.style.display = 'none';
        stockCount.textContent = '0';
        perfMonitor.end('renderTable');
        return;
    }
    
    emptyState.style.display = 'none';
    tableContainer.style.display = 'block';
    clearAllBtn.style.display = 'inline-block';
    filterBtn.style.display = 'inline-block';
    fetchAllBtn.style.display = 'inline-block';
    
    updateFilterBadge();
    
    const filteredData = getFilteredData();
    
    if (Object.keys(activeFilters).length > 0) {
        stockCount.innerHTML = `${filteredData.length} of ${stocksData.length}`;
    } else {
        stockCount.textContent = stocksData.length;
    }
    
    // Use DocumentFragment for efficient DOM insertion
    const fragment = document.createDocumentFragment();
    
    if (filteredData.length === 0) {
        const emptyRow = document.createElement('tr');
        emptyRow.innerHTML = `
            <td colspan="19" class="text-center py-4">
                <i class="bi bi-funnel text-muted" style="font-size: 2rem;"></i>
                <p class="text-muted mt-2 mb-0">No stocks match your filter criteria</p>
                <button class="btn btn-sm btn-outline-primary mt-2" onclick="clearAllFilters()">Clear Filters</button>
            </td>
        `;
        fragment.appendChild(emptyRow);
    } else {
        // Build rows using DocumentFragment for better performance
        filteredData.forEach((stock, index) => {
            const row = document.createElement('tr');
            const displaySymbol = stock.stock_symbol || stock.symbol;
            const escapedName = escapeAttribute(stock.name || '');
            const escapedSymbol = escapeAttribute(stock.symbol || '');
            
            row.innerHTML = `
                <td class="text-center"><strong>${index + 1}</strong></td>
                <td class="text-muted"><strong>${escapeAttribute(stock.name)}</strong><br><small class="text-primary">${escapeAttribute(displaySymbol)}</small></td>
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
                <td class="text-center performance-cell"></td>
                <td class="text-center">
                    <button class="btn btn-sm btn-success me-1" data-action="fetch" data-symbol="${escapedSymbol}" data-id="${stock.stock_id}" title="Fetch Data from Groww">
                        <i class="bi bi-cloud-download"></i> Fetch
                    </button>
                    <button class="btn btn-sm btn-primary me-1" data-action="edit" data-symbol="${escapedSymbol}" data-name="${escapedName}" data-id="${stock.stock_id}" title="Edit">
                        <i class="bi bi-pencil"></i> Edit
                    </button>
                    <button class="btn btn-sm btn-danger" data-action="delete" data-id="${stock.stock_id}" title="Delete">
                        <i class="bi bi-trash"></i> Delete
                    </button>
                </td>
            `;
            fragment.appendChild(row);
        });
    }
    
    // Batch DOM update - clear and append in one operation
    batchDOMUpdate(() => {
        tbody.innerHTML = '';
        tbody.appendChild(fragment);
    });
    
    perfMonitor.end('renderTable');
}

/**
 * Setup event handlers for stock symbol dropdown
 * Handles auto-fill of company name and manual entry mode
 */
function setupStockDropdownHandlers() {
    const stockSymbolSelect = $('#stockSymbol');
    const stockNameInput = $('#stockName');
    const manualSymbolGroup = $('#manualSymbolGroup');
    const manualSymbolInput = $('#manualStockSymbol');
    
    // Handle stock selection change (works with Select2)
    stockSymbolSelect.on('select2:select change', function(e) {
        const selectedValue = $(this).val();
        const selectedOption = $(this).find('option:selected');
        
        if (selectedValue === '__manual__') {
            // Manual entry mode - show manual symbol input, enable name input
            stockNameInput.prop('readonly', false);
            stockNameInput.val('');
            stockNameInput.attr('placeholder', 'Enter company name manually');
            
            // Show manual symbol input if it exists
            if (manualSymbolGroup.length) {
                manualSymbolGroup.removeClass('d-none');
                manualSymbolInput.prop('required', true);
            }
            
            // Focus on name input for manual entry
            stockNameInput.focus();
        } else if (selectedValue) {
            // Stock selected from list - auto-fill company name
            const displayName = selectedOption.attr('data-display-name') || selectedOption.text();
            const symbol = selectedOption.attr('data-symbol');
            
            // Auto-fill company name
            stockNameInput.val(displayName);
            stockNameInput.prop('readonly', true);
            
            // Hide manual symbol input
            if (manualSymbolGroup.length) {
                manualSymbolGroup.addClass('d-none');
                manualSymbolInput.prop('required', false);
                manualSymbolInput.val('');
            }
        } else {
            // No selection - reset form
            stockNameInput.val('');
            stockNameInput.prop('readonly', false);
            stockNameInput.attr('placeholder', 'e.g., Tata Consultancy Services');
            
            // Hide manual symbol input
            if (manualSymbolGroup.length) {
                manualSymbolGroup.addClass('d-none');
                manualSymbolInput.prop('required', false);
                manualSymbolInput.val('');
            }
        }
    });
    
    // Handle Select2 clear
    stockSymbolSelect.on('select2:clear', function() {
        stockNameInput.val('');
        stockNameInput.prop('readonly', false);
        stockNameInput.attr('placeholder', 'e.g., Tata Consultancy Services');
        
        if (manualSymbolGroup.length) {
            manualSymbolGroup.addClass('d-none');
            manualSymbolInput.prop('required', false);
            manualSymbolInput.val('');
        }
    });
}

/**
 * Setup event delegation for table action buttons
 * Uses single event listener on parent instead of individual listeners per button
 * This improves memory usage and performance for large tables
 */
function setupTableEventDelegation() {
    const metricsBody = document.getElementById('metricsBody');
    if (!metricsBody) return;
    
    // Use single click handler with event delegation
    metricsBody.addEventListener('click', async function(e) {
        // Find the button that was clicked (handle clicks on icon inside button)
        const button = e.target.closest('button[data-action]');
        if (!button) return;
        
        const action = button.dataset.action;
        const stockId = button.dataset.id;
        const symbol = button.dataset.symbol;
        const name = button.dataset.name;
        
        switch (action) {
            case 'fetch':
                if (symbol && stockId) {
                    fetchStockData(symbol, stockId);
                }
                break;
            case 'edit':
                if (symbol && name && stockId) {
                    openManualDataModal(symbol, name, stockId);
                }
                break;
            case 'delete':
                if (stockId) {
                    removeStock(stockId);
                }
                break;
            default:
                logError('Unknown table action', new Error(`Unknown action: ${action}`));
        }
    });
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
    if (!isAuthenticated()) {
        showAlert('warning', 'Please sign in to edit stock data');
        showAuthModal('login');
        return;
    }
    
    $('#modalStockSymbol').val(symbol);
    $('#modalName').val(name);
    $('#modalStockId').val(stockId);
    
    const stock = stocksData.find(s => s.stock_id === stockId);
    
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
        $('#modalLiquidity, #modalQuickRatio, #modalDebtEquity, #modalROE, #modalInvestorGrowth, #modalROA, #modalEBITDACurrent, #modalEBITDAPrevious, #modalDividendYield, #modalPE, #modalIndustryPE, #modalPriceToBook, #modalPriceToSales, #modalBeta, #modalPromoterHoldings').val('');
    }
    
    $('#modalDate').val(new Date().toISOString().split('T')[0]);
    $('#modalOpen, #modalHigh, #modalLow, #modalClose, #modalVolume').val('');
    
    const modal = new bootstrap.Modal(document.getElementById('manualDataModal'));
    modal.show();
};

/**
 * Submit manual data from modal form
 */
async function submitManualData() {
    if (!isAuthenticated()) {
        showAlert('warning', 'Please sign in to save stock data');
        showAuthModal('login');
        return;
    }
    
    const symbol = $('#modalStockSymbol').val();
    const name = $('#modalName').val();
    const stockId = $('#modalStockId').val();
    
    if (!stockId) {
        showAlert('danger', 'Stock ID not found');
        return;
    }
    
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
    
    const result = await updateStockInFirebase(stockId, metrics);
    
    if (result.success) {
        const message = result.offline 
            ? 'Data saved offline! Will sync when online.' 
            : 'Data saved successfully! Table updated.';
        showAlert('success', message);
        
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
    
    const uniqueValues = [...new Set(values)];
    
    if (fieldName === 'name') {
        return uniqueValues.sort((a, b) => a.localeCompare(b));
    } else {
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
    
    const modal = new bootstrap.Modal(document.getElementById('filterModal'));
    modal.show();
}

/**
 * Apply filters from modal selections
 */
function applyFiltersFromModal() {
    activeFilters = {};
    $('.filter-select-modal').each(function() {
        const field = $(this).data('field');
        const value = $(this).val();
        if (value) {
            activeFilters[field] = value;
        }
    });
    
    bootstrap.Modal.getInstance(document.getElementById('filterModal')).hide();
    
    renderTable();
    
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
        return Object.keys(activeFilters).every(field => {
            const filterValue = activeFilters[field];
            const stockValue = stock[field];
            
            if (!stockValue || stockValue === 'Enter Data' || stockValue === 'N/A') {
                return false;
            }
            
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

// Data fetching moved to `js/fetch.js`. Create a fetchStockData bound to this module's
// data and UI helpers using the provided factory, then expose it globally for
// the inline onclick handlers in the table HTML.
const fetchStockData = makeFetchStockData({
    getStocksData: () => stocksData,
    renderTable,
    showAlert,
    updateStockInFirebase
});
window.fetchStockData = fetchStockData;
// Backwards compatibility: expose crawler object on window
window.growwCrawler = growwCrawler;

/**
 * Fetch data for all stocks in the portfolio sequentially
 * Adds a delay between requests to avoid rate limiting
 */
async function fetchAllStocks() {
    if (stocksData.length === 0) {
        showAlert('warning', 'No stocks to fetch data for. Add some stocks first.');
        return;
    }
    
    const totalStocks = stocksData.length;
    const $fetchAllBtn = $('#fetchAllBtn');
    const originalBtnHtml = $fetchAllBtn.html();
    
    // Disable the button during fetch
    $fetchAllBtn.prop('disabled', true);
    
    showAlert('info', `Starting to fetch data for ${totalStocks} stocks. This may take a while...`);
    
    let successCount = 0;
    let failCount = 0;
    const delayBetweenRequests = 2000; // 2 seconds delay between requests to avoid rate limiting
    
    for (let i = 0; i < stocksData.length; i++) {
        const stock = stocksData[i];
        const progress = i + 1;
        
        // Update button text to show progress
        $fetchAllBtn.html(`<i class="bi bi-hourglass-split"></i> ${progress}/${totalStocks}`);
        
        try {
            // Skip if no symbol available
            if (!stock.symbol) {
                console.warn(`Skipping stock ${stock.name || stock.stock_id}: No symbol available`);
                failCount++;
                continue;
            }
            
            await fetchStockData(stock.symbol, stock.stock_id);
            successCount++;
            
        } catch (error) {
            console.error(`Error fetching data for ${stock.symbol}:`, error);
            failCount++;
        }
        
        // Add delay before next request (except for the last one)
        if (i < stocksData.length - 1) {
            await new Promise(resolve => setTimeout(resolve, delayBetweenRequests));
        }
    }
    
    // Restore button
    $fetchAllBtn.prop('disabled', false);
    $fetchAllBtn.html(originalBtnHtml);
    
    // Show summary
    if (failCount === 0) {
        showAlert('success', `Successfully fetched data for all ${successCount} stocks!`);
    } else {
        showAlert('warning', `Fetch complete: ${successCount} succeeded, ${failCount} failed. Check console for details.`);
    }
}
