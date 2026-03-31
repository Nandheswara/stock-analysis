/**
 * Stock dropdown loader module
 * Exports `loadStockSymbols()` which populates `#stockSymbol` <select>
 * and initializes Select2 with a substring matcher.
 * 
 * The stocks.json contains Groww URL slugs (e.g., "tata-consultancy-services-ltd")
 * which we format for display as "Tata Consultancy Services Ltd (TCS)"
 * 
 * Supports index-based filtering via #stockSource selector:
 * - All Stocks (stocks.json)
 * - NIFTY 50 / 100 / 200 / 500 (fetched live from NSE API, cached in sessionStorage)
 */

/* ========================================
   NSE Index API Configuration
   ======================================== */

/**
 * NSE API base URL for fetching index constituents
 * @type {string}
 */
const NSE_INDEX_API = 'https://www.nseindia.com/api/equity-stockIndices?index=';

/**
 * Map of dropdown values to NSE index names (URL-encoded)
 * @type {Object<string, string>}
 */
const NSE_INDEX_NAMES = {
    'nifty-50': 'NIFTY%2050',
    'nifty-100': 'NIFTY%20100',
    'nifty-200': 'NIFTY%20200',
    'nifty-500': 'NIFTY%20500'
};

/**
 * Path to the full stock universe file (used for "All Stocks" source)
 * @type {string}
 */
const ALL_STOCKS_FILE = '../resource/stocks.json';

/**
 * Dynamic map populated from NSE API responses — no hardcoded data.
 * Populated when index data is fetched (live or restored from cache).
 * Maps Groww slug → NSE symbol (e.g. "hdfc-bank-ltd" → "HDFCBANK")
 * @type {Map<string, string>}
 */
const dynamicSlugToSymbol = new Map();

/**
 * Cache TTL for index data in sessionStorage (24 hours)
 * Index constituents change semi-annually, so aggressive caching is safe.
 * @type {number}
 */
const INDEX_CACHE_TTL = 24 * 60 * 60 * 1000;

/**
 * CORS proxies to try for NSE API requests (in order of reliability)
 * @type {Array<function(string): string>}
 */
const CORS_PROXIES = [
    (u) => `http://localhost:8080/proxy?url=${encodeURIComponent(u)}`,
    (u) => `https://api.allorigins.win/get?url=${encodeURIComponent(u)}`,
    (u) => `https://corsproxy.org/?${encodeURIComponent(u)}`,
    (u) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(u)}`
];

/* ========================================
   NSE API Fetch Utilities
   ======================================== */

/**
 * Retrieve cached index data from sessionStorage
 * @param {string} cacheKey - The cache key
 * @returns {{ slugs: string[], symbolMap: Object<string, string> }|null}
 */
function getCachedIndex(cacheKey) {
    try {
        const raw = sessionStorage.getItem(cacheKey);
        if (!raw) return null;
        const cached = JSON.parse(raw);
        if (cached && cached.expiry > Date.now() && Array.isArray(cached.slugs)) {
            return { slugs: cached.slugs, symbolMap: cached.symbolMap || {} };
        }
        sessionStorage.removeItem(cacheKey);
    } catch {
        // Ignore JSON parse errors
    }
    return null;
}

/**
 * Store index data in sessionStorage
 * @param {string} cacheKey - The cache key
 * @param {string[]} slugs - Array of Groww slugs
 * @param {Object<string, string>} symbolMap - slug → NSE symbol mapping
 */
function setCachedIndex(cacheKey, slugs, symbolMap) {
    try {
        sessionStorage.setItem(cacheKey, JSON.stringify({
            slugs,
            symbolMap,
            expiry: Date.now() + INDEX_CACHE_TTL
        }));
    } catch {
        // sessionStorage full or unavailable — silently ignore
    }
}

/**
 * Restore dynamic symbol maps from a symbolMap object (e.g. from cache)
 * @param {Object<string, string>} symbolMap - slug → NSE symbol
 */
function restoreDynamicMaps(symbolMap) {
    if (!symbolMap) return;
    for (const [slug, symbol] of Object.entries(symbolMap)) {
        dynamicSlugToSymbol.set(slug, symbol);
    }
}

/**
 * Convert an NSE company name to a Groww-style URL slug
 * Example: "HDFC Bank Limited" → "hdfc-bank-ltd"
 * @param {string} companyName - Full company name from NSE API
 * @returns {string} - Groww-compatible slug
 */
function companyNameToSlug(companyName) {
    if (!companyName) return '';
    return companyName
        .toLowerCase()
        .replace(/&/g, '-')
        .replace(/\./g, '')
        .replace(/['']/g, '')
        .replace(/limited$/i, 'ltd')
        .replace(/limited/gi, 'ltd')
        .trim()
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/[^a-z0-9-]/g, '')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
}

/**
 * Fetch JSON from NSE API through CORS proxies with fallback
 * @param {string} nseUrl - The NSE API URL
 * @returns {Promise<Object>} - Parsed JSON response
 */
async function fetchNseJson(nseUrl) {
    for (let i = 0; i < CORS_PROXIES.length; i++) {
        const proxyUrl = CORS_PROXIES[i](nseUrl);
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);

            const resp = await fetch(proxyUrl, {
                signal: controller.signal,
                headers: {
                    'Accept': 'application/json, text/plain, */*',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });
            clearTimeout(timeoutId);

            if (!resp.ok) throw new Error(`Proxy ${i + 1} returned ${resp.status}`);

            let text = await resp.text();

            // allorigins.win wraps response in { contents: "..." }
            if (proxyUrl.includes('api.allorigins.win/get')) {
                try {
                    const wrapper = JSON.parse(text);
                    text = wrapper.contents || text;
                } catch {
                    // Not wrapped — use as-is
                }
            }

            const json = JSON.parse(text);
            if (json && Array.isArray(json.data)) {
                return json;
            }
            throw new Error('Invalid JSON structure');
        } catch {
            // Try next proxy
        }
    }
    throw new Error('All proxies failed for NSE API');
}

/**
 * Fetch index constituents from NSE API and convert to Groww slugs.
 * Builds slug↔symbol mappings dynamically from the API response.
 * @param {string} sourceKey - e.g. "nifty-50", "nifty-100"
 * @returns {Promise<{ slugs: string[], symbolMap: Object<string, string> }>}
 */
async function fetchIndexFromNse(sourceKey) {
    const indexParam = NSE_INDEX_NAMES[sourceKey];
    if (!indexParam) throw new Error(`Unknown index: ${sourceKey}`);

    const nseUrl = `${NSE_INDEX_API}${indexParam}`;
    const json = await fetchNseJson(nseUrl);

    const slugs = [];
    const symbolMap = {};

    for (const item of json.data) {
        // Skip the index row itself (priority 1) or missing symbol
        if (item.priority === 1 || !item.symbol) continue;

        const nseSymbol = item.symbol.toUpperCase();
        const companyName = (item.meta && item.meta.companyName) || '';
        if (!companyName) continue;

        const slug = companyNameToSlug(companyName);
        if (!slug) continue;

        slugs.push(slug);
        symbolMap[slug] = nseSymbol;

        // Populate the module-level dynamic map
        dynamicSlugToSymbol.set(slug, nseSymbol);
    }

    return { slugs, symbolMap };
}

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
 * Get the NSE symbol for a stock slug from the dynamic map.
 * The map is populated automatically when index data is fetched from NSE.
 * @param {string} slug - The Groww URL slug
 * @returns {string|null} - NSE symbol or null if not resolved yet
 */
function getStockSymbol(slug) {
    if (!slug) return null;
    return dynamicSlugToSymbol.get(slug.toLowerCase()) || null;
}

/**
 * Populate the stock dropdown from a given array of slugs
 * @param {HTMLSelectElement} select - The stock dropdown element
 * @param {string[]} data - Array of Groww URL slugs
 */
function populateStockSelect(select, data) {
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
        opt.value = slug;
        const displayName = slugToDisplayName(slug);
        const symbol = getStockSymbol(slug);
        opt.textContent = symbol ? `${displayName} (${symbol})` : displayName;
        opt.setAttribute('data-slug', slug);
        opt.setAttribute('data-display-name', displayName);
        if (symbol) opt.setAttribute('data-symbol', symbol);
        select.appendChild(opt);
    });

    // Initialize Select2 with enhanced search
    initSelect2(select);
}

/**
 * Fetch stock slugs from a JSON resource file
 * @param {string} sourceFile - Path to the JSON resource
 * @returns {Promise<string[]>} Array of stock slugs
 */
async function fetchStockData(sourceFile) {
    const resp = await fetch(sourceFile);
    if (!resp.ok) throw new Error('Network response was not ok');
    const data = await resp.json();
    if (!Array.isArray(data)) throw new Error('Invalid data');
    return data;
}

/**
 * Show an error state in the stock dropdown
 * @param {HTMLSelectElement} select - The dropdown element
 * @param {string} message - Error message to display
 */
function showDropdownError(select, message) {
    select.innerHTML = '';
    const opt = document.createElement('option');
    opt.value = '';
    opt.textContent = message;
    select.appendChild(opt);
    initSelect2(select);
}

/**
 * Load stock symbols into the dropdown.
 * - "All Stocks" loads from the static stocks.json master file.
 * - Index sources (nifty-50, etc.) fetch live from NSE API with sessionStorage caching.
 *
 * Flow for index sources:
 *   1. Check sessionStorage cache → if valid, restore symbol maps & use it
 *   2. Fetch live from NSE API → cache result & use it
 *   3. If both fail → show error state in dropdown
 *
 * @param {string} [source='all'] - Source key (all, nifty-50, nifty-100, nifty-200, nifty-500)
 */
function loadStockSymbols(source) {
    const select = document.getElementById('stockSymbol');
    if (!select) return;

    // Destroy any existing Select2 instance
    if (window.jQuery && $(select).hasClass('select2-hidden-accessible')) {
        try { $(select).select2('destroy'); } catch (e) { /* ignore */ }
    }

    const sourceKey = source || 'all';

    // "All Stocks" loads from the master stock list
    if (sourceKey === 'all') {
        fetchStockData(ALL_STOCKS_FILE)
            .then(data => populateStockSelect(select, data))
            .catch(() => showDropdownError(select, 'Failed to load stocks. Please refresh.'));
        return;
    }

    // For index sources — try cache first, then live NSE API
    const cacheKey = `nse_index_${sourceKey}`;
    const cached = getCachedIndex(cacheKey);
    if (cached) {
        restoreDynamicMaps(cached.symbolMap);
        populateStockSelect(select, cached.slugs);
        return;
    }

    // Show loading state in dropdown
    select.innerHTML = '<option value="">Loading index data from NSE...</option>';

    fetchIndexFromNse(sourceKey)
        .then(({ slugs, symbolMap }) => {
            setCachedIndex(cacheKey, slugs, symbolMap);
            populateStockSelect(select, slugs);
        })
        .catch(() => {
            showDropdownError(select, 'Failed to fetch index data. Please try again.');
        });
}

/**
 * Initialize the stock source selector and bind change event
 * Reloads the stock dropdown when the user picks a different index
 */
function initStockSourceSelector() {
    const sourceSelect = document.getElementById('stockSource');
    if (!sourceSelect) return;

    sourceSelect.addEventListener('change', () => {
        loadStockSymbols(sourceSelect.value);
    });
}

/**
 * Initialize Select2 with custom matcher and theme-aware styling
 * @param {HTMLSelectElement} select - The select element
 */
function initSelect2(select) {
    if (!window.jQuery || !$(select).select2) {
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
export { loadStockSymbols, slugToDisplayName, getStockSymbol, initStockSourceSelector };
