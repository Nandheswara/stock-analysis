/**
 * Stock dropdown loader module
 * Exports `loadStockSymbols()` which populates `#stockSymbol` <select>
 * and initializes Select2 with a substring matcher.
 * 
 * The stocks.json contains Groww URL slugs (e.g., "tata-consultancy-services-ltd")
 * which we format for display as "Tata Consultancy Services Ltd (TCS)"
 */

/**
 * Convert slug to display name
 * Example: "tata-consultancy-services-ltd" -> "Tata Consultancy Services Ltd"
 * @param {string} slug - The Groww URL slug
 * @returns {string} - Formatted display name
 */
function slugToDisplayName(slug) {
    if (!slug) return slug;
    
    // Handle single letters (A, B, C) or already formatted names
    if (slug.length <= 3 && !slug.includes('-')) {
        return slug.toUpperCase();
    }
    
    // Convert slug to title case
    return slug
        .split('-')
        .map(word => {
            // Keep 'ltd' as 'Ltd', handle common abbreviations
            if (word.toLowerCase() === 'ltd') return 'Ltd';
            if (word.toLowerCase() === 'pvt') return 'Pvt';
            if (word.toLowerCase() === 'nse') return 'NSE';
            if (word.toLowerCase() === 'bse') return 'BSE';
            // Capitalize first letter
            return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
        })
        .join(' ');
}

/**
 * Generate a short symbol from slug for popular stocks
 * @param {string} slug - The Groww URL slug
 * @returns {string|null} - Short symbol or null
 */
function getStockSymbol(slug) {
    const symbolMap = {
        'tata-consultancy-services-ltd': 'TCS',
        'itc-ltd': 'ITC',
        'reliance-industries-ltd': 'RELIANCE',
        'hdfc-bank-ltd': 'HDFCBANK',
        'infosys-ltd': 'INFY',
        'icici-bank-ltd': 'ICICIBANK',
        'wipro-ltd': 'WIPRO',
        'state-bank-of-india': 'SBIN',
        'kotak-mahindra-bank-ltd': 'KOTAKBANK',
        'hcl-technologies-ltd': 'HCLTECH',
        'bharti-airtel-ltd': 'BHARTIARTL',
        'axis-bank-ltd': 'AXISBANK',
        'tata-motors-ltd': 'TATAMOTORS',
        'tata-steel-ltd': 'TATASTEEL',
        'sun-pharmaceutical-industries-ltd': 'SUNPHARMA',
        'maruti-suzuki-india-ltd': 'MARUTI',
        'hindustan-unilever-ltd': 'HINDUNILVR',
        'asian-paints-ltd': 'ASIANPAINT',
        'larsen-toubro-ltd': 'LT',
        'bajaj-finance-ltd': 'BAJFINANCE',
        'bajaj-finserv-ltd': 'BAJAJFINSV',
        'tech-mahindra-ltd': 'TECHM',
        'ultratech-cement-ltd': 'ULTRACEMCO',
        'titan-company-ltd': 'TITAN',
        'oil-natural-gas-corporation-ltd': 'ONGC',
        'ntpc-ltd': 'NTPC',
        'power-grid-corporation-of-india-ltd': 'POWERGRID',
        'jsw-steel-ltd': 'JSWSTEEL',
        'adani-ports-special-economic-zone-ltd': 'ADANIPORTS',
        'adani-enterprises-ltd': 'ADANIENT',
        'coal-india-ltd': 'COALINDIA',
        'dr-reddys-laboratories-ltd': 'DRREDDY',
        'cipla-ltd': 'CIPLA',
        'divis-laboratories-ltd': 'DIVISLAB',
        'nestle-india-ltd': 'NESTLEIND',
        'britannia-industries-ltd': 'BRITANNIA',
        'eicher-motors-ltd': 'EICHERMOT',
        'mahindra-mahindra-ltd': 'M&M',
        'hero-motocorp-ltd': 'HEROMOTOCO',
        'indusind-bank-ltd': 'INDUSINDBK',
        'grasim-industries-ltd': 'GRASIM',
        'upl-ltd': 'UPL',
        'bharat-petroleum-corporation-ltd': 'BPCL',
        'indian-oil-corporation-ltd': 'IOC',
        'sbi-life-insurance-company-ltd': 'SBILIFE',
        'hdfc-life-insurance-company-ltd': 'HDFCLIFE',
        'zomato-ltd': 'ZOMATO',
        'bharat-electronics-ltd': 'BEL',
        'gail-india-ltd': 'GAIL',
        'jio-financial-services-ltd': 'JIOFIN',
        'vodafone-idea-ltd': 'IDEA'
    };
    
    return symbolMap[slug.toLowerCase()] || null;
}

export function loadStockSymbols() {
    const select = document.getElementById('stockSymbol');
    if (!select) return;
    
    // Destroy any existing Select2 instance
    if (window.jQuery && $(select).hasClass('select2-hidden-accessible')) {
        try { $(select).select2('destroy'); } catch(e) { /* ignore */ }
    }

    fetch('../resource/stocks.json')
        .then(resp => {
            if (!resp.ok) throw new Error('Network response was not ok');
            return resp.json();
        })
        .then(data => {
            if (!Array.isArray(data)) throw new Error('Invalid data');
            
            // Filter out single letters (A, B, C) and sort alphabetically
            const validStocks = data
                .filter(slug => slug && slug.length > 3 && slug.includes('-'))
                .sort((a, b) => slugToDisplayName(a).localeCompare(slugToDisplayName(b)));
            
            // Clear existing options except the placeholder
            select.innerHTML = '<option value=""></option>';
            
            // Add Manual Entry option at the top
            const manualOpt = document.createElement('option');
            manualOpt.value = '__manual__';
            manualOpt.textContent = '➕ Add Stock Manually (Not in list)';
            manualOpt.setAttribute('data-manual', 'true');
            select.appendChild(manualOpt);
            
            validStocks.forEach(slug => {
                const opt = document.createElement('option');
                opt.value = slug; // Store slug as value for easy URL building
                const displayName = slugToDisplayName(slug);
                const symbol = getStockSymbol(slug);
                // Show as "Company Name (SYMBOL)" or just "Company Name"
                opt.textContent = symbol ? `${displayName} (${symbol})` : displayName;
                opt.setAttribute('data-slug', slug);
                opt.setAttribute('data-display-name', displayName);
                if (symbol) opt.setAttribute('data-symbol', symbol);
                select.appendChild(opt);
            });

            // Initialize Select2 with enhanced search
            initSelect2(select);
            
            console.debug(`Loaded ${validStocks.length} stocks into dropdown`);
        })
        .catch(err => {
            console.warn('Failed to load symbols, using fallback', err);
            const fallback = [
                'tata-consultancy-services-ltd',
                'reliance-industries-ltd',
                'hdfc-bank-ltd',
                'infosys-ltd',
                'icici-bank-ltd'
            ];
            
            select.innerHTML = '<option value=""></option>';
            
            // Add Manual Entry option at the top for fallback too
            const manualOpt = document.createElement('option');
            manualOpt.value = '__manual__';
            manualOpt.textContent = '➕ Add Stock Manually (Not in list)';
            manualOpt.setAttribute('data-manual', 'true');
            select.appendChild(manualOpt);
            
            fallback.forEach(slug => {
                const opt = document.createElement('option');
                opt.value = slug;
                const displayName = slugToDisplayName(slug);
                const symbol = getStockSymbol(slug);
                opt.textContent = symbol ? `${displayName} (${symbol})` : displayName;
                opt.setAttribute('data-slug', slug);
                opt.setAttribute('data-display-name', displayName);
                if (symbol) opt.setAttribute('data-symbol', symbol);
                select.appendChild(opt);
            });

            initSelect2(select);
        });
}

/**
 * Initialize Select2 with custom matcher and theme-aware styling
 * @param {HTMLSelectElement} select - The select element
 */
function initSelect2(select) {
    if (!window.jQuery || !$(select).select2) {
        console.warn('Select2 not available');
        return;
    }
    
    // Custom matcher for searching by display name, symbol, or slug
    const customMatcher = function(params, data) {
        // If no search term, return all data
        if (!params.term || params.term.trim() === '') {
            return data;
        }
        
        const term = params.term.toLowerCase().trim();
        
        // Search in display text
        if (data.text && data.text.toLowerCase().includes(term)) {
            return data;
        }
        
        // Search in slug value
        if (data.id && data.id.toLowerCase().includes(term)) {
            return data;
        }
        
        // Search in data attributes (symbol)
        if (data.element) {
            const symbol = data.element.getAttribute('data-symbol');
            if (symbol && symbol.toLowerCase().includes(term)) {
                return data;
            }
        }
        
        return null;
    };

    $(select).select2({
        placeholder: 'Search or select a stock...',
        width: '100%',
        matcher: customMatcher,
        allowClear: true,
        dropdownAutoWidth: false,
        minimumInputLength: 0,
        language: {
            noResults: function() {
                return 'No stocks found';
            },
            searching: function() {
                return 'Searching...';
            },
            inputTooShort: function() {
                return 'Type to search stocks...';
            }
        },
        templateResult: formatStockOption,
        templateSelection: formatStockSelection
    });
    
    // Apply theme class to dropdown
    applySelect2Theme();
}

/**
 * Format stock option in dropdown
 * @param {object} data - Select2 data object
 * @returns {jQuery|string} - Formatted option
 */
function formatStockOption(data) {
    if (!data.id) {
        return data.text; // Placeholder
    }
    
    const $option = $('<div class="select2-stock-option"></div>');
    const displayName = data.element ? data.element.getAttribute('data-display-name') : data.text;
    const symbol = data.element ? data.element.getAttribute('data-symbol') : null;
    
    if (symbol) {
        $option.html(`
            <span class="stock-name">${displayName}</span>
            <span class="stock-symbol-badge">${symbol}</span>
        `);
    } else {
        $option.html(`<span class="stock-name">${displayName || data.text}</span>`);
    }
    
    return $option;
}

/**
 * Format selected stock
 * @param {object} data - Select2 data object
 * @returns {string} - Formatted selection text
 */
function formatStockSelection(data) {
    if (!data.id) {
        return data.text; // Placeholder
    }
    
    const symbol = data.element ? data.element.getAttribute('data-symbol') : null;
    const displayName = data.element ? data.element.getAttribute('data-display-name') : data.text;
    
    return symbol ? `${displayName} (${symbol})` : displayName;
}

/**
 * Apply theme to Select2 dropdown based on current body theme
 */
function applySelect2Theme() {
    const isLightTheme = document.body.classList.contains('light-theme');
    const $select2Container = $('.select2-container');
    
    if (isLightTheme) {
        $select2Container.addClass('select2-light-theme');
    } else {
        $select2Container.removeClass('select2-light-theme');
    }
}

// Listen for theme changes to update Select2 styling
if (typeof window !== 'undefined') {
    // Watch for theme changes
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.attributeName === 'class') {
                applySelect2Theme();
            }
        });
    });
    
    if (document.body) {
        observer.observe(document.body, { attributes: true });
    } else {
        document.addEventListener('DOMContentLoaded', function() {
            observer.observe(document.body, { attributes: true });
        });
    }
}

// Export utilities for use in other modules
export { slugToDisplayName, getStockSymbol };
