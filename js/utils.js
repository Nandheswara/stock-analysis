/**
 * Utility Module for Equity Labs
 * 
 * Contains shared utility functions for:
 * - Performance optimization (debounce, throttle, memoization)
 * - Error handling and logging
 * - DOM manipulation helpers
 * - Request caching and deduplication
 * - Input validation
 * 
 * @module utils
 */

/* ========================================
   Performance Utilities
   ======================================== */

/**
 * Debounce function to limit execution rate
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @param {boolean} immediate - Execute on leading edge
 * @returns {Function} Debounced function
 */
export function debounce(func, wait = 250, immediate = false) {
    let timeout;
    
    return function executedFunction(...args) {
        const context = this;
        
        const later = () => {
            timeout = null;
            if (!immediate) {
                func.apply(context, args);
            }
        };
        
        const callNow = immediate && !timeout;
        
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        
        if (callNow) {
            func.apply(context, args);
        }
    };
}

/**
 * Throttle function to limit execution frequency
 * @param {Function} func - Function to throttle
 * @param {number} limit - Minimum time between calls in milliseconds
 * @returns {Function} Throttled function
 */
export function throttle(func, limit = 100) {
    let inThrottle;
    let lastArgs;
    let lastContext;
    
    return function throttledFunction(...args) {
        const context = this;
        
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            
            setTimeout(() => {
                inThrottle = false;
                if (lastArgs) {
                    func.apply(lastContext, lastArgs);
                    lastArgs = null;
                    lastContext = null;
                }
            }, limit);
        } else {
            lastArgs = args;
            lastContext = context;
        }
    };
}

/**
 * Memoize function results for expensive computations
 * @param {Function} func - Function to memoize
 * @param {number} maxCacheSize - Maximum cache entries (default: 100)
 * @returns {Function} Memoized function
 */
export function memoize(func, maxCacheSize = 100) {
    const cache = new Map();
    
    return function memoizedFunction(...args) {
        const key = JSON.stringify(args);
        
        if (cache.has(key)) {
            return cache.get(key);
        }
        
        const result = func.apply(this, args);
        
        // Limit cache size to prevent memory leaks
        if (cache.size >= maxCacheSize) {
            const firstKey = cache.keys().next().value;
            cache.delete(firstKey);
        }
        
        cache.set(key, result);
        return result;
    };
}

/**
 * Request deduplication and caching
 * Prevents duplicate in-flight requests
 */
class RequestCache {
    constructor(defaultTTL = 30000) {
        this.cache = new Map();
        this.pending = new Map();
        this.defaultTTL = defaultTTL;
    }
    
    /**
     * Get cached response or execute request
     * @param {string} key - Cache key
     * @param {Function} requestFn - Async function to execute
     * @param {number} ttl - Time-to-live in milliseconds
     * @returns {Promise} Cached or fresh response
     */
    async getOrFetch(key, requestFn, ttl = this.defaultTTL) {
        // Check cache first
        const cached = this.cache.get(key);
        if (cached && Date.now() < cached.expiry) {
            return cached.data;
        }
        
        // Check for pending request
        if (this.pending.has(key)) {
            return this.pending.get(key);
        }
        
        // Create new request
        const promise = requestFn().then((data) => {
            this.cache.set(key, {
                data,
                expiry: Date.now() + ttl
            });
            this.pending.delete(key);
            return data;
        }).catch((error) => {
            this.pending.delete(key);
            throw error;
        });
        
        this.pending.set(key, promise);
        return promise;
    }
    
    /**
     * Clear specific key or all cache
     * @param {string} key - Optional key to clear
     */
    clear(key) {
        if (key) {
            this.cache.delete(key);
            this.pending.delete(key);
        } else {
            this.cache.clear();
            this.pending.clear();
        }
    }
    
    /**
     * Clear expired entries
     */
    cleanup() {
        const now = Date.now();
        for (const [key, value] of this.cache.entries()) {
            if (now >= value.expiry) {
                this.cache.delete(key);
            }
        }
    }
}

// Export singleton instance for global request caching
export const requestCache = new RequestCache();

/* ========================================
   Error Handling Utilities
   ======================================== */

/**
 * Error types for better error categorization
 */
export const ErrorTypes = {
    NETWORK: 'NETWORK_ERROR',
    AUTH: 'AUTH_ERROR',
    VALIDATION: 'VALIDATION_ERROR',
    FIREBASE: 'FIREBASE_ERROR',
    TIMEOUT: 'TIMEOUT_ERROR',
    UNKNOWN: 'UNKNOWN_ERROR'
};

/**
 * Custom application error class
 */
export class AppError extends Error {
    constructor(message, type = ErrorTypes.UNKNOWN, context = {}) {
        super(message);
        this.name = 'AppError';
        this.type = type;
        this.context = context;
        this.timestamp = new Date().toISOString();
    }
}

/**
 * Global error handler for uncaught errors
 * @param {boolean} showToUser - Whether to show errors to user
 */
export function setupGlobalErrorHandler(showToUser = true) {
    // Handle uncaught promise rejections
    window.addEventListener('unhandledrejection', (event) => {
        const error = event.reason;
        logError('Unhandled Promise Rejection', error);
        
        if (showToUser) {
            showUserFriendlyError(error);
        }
        
        // Prevent default handling
        event.preventDefault();
    });
    
    // Handle uncaught errors
    window.addEventListener('error', (event) => {
        logError('Uncaught Error', event.error);
        
        if (showToUser) {
            showUserFriendlyError(event.error);
        }
        
        // Prevent error from bubbling
        return true;
    });
}

/**
 * Log error with context for debugging
 * @param {string} context - Error context/location
 * @param {Error} error - Error object
 * @param {Object} extra - Extra context data
 */
export function logError(context, error, extra = {}) {
    const errorInfo = {
        context,
        message: error?.message || String(error),
        stack: error?.stack,
        type: error?.type || ErrorTypes.UNKNOWN,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href,
        ...extra
    };
    
    // Log to console in development
    console.error(`[${context}]`, errorInfo);
    
    // In production, you could send to a logging service
    // sendToLoggingService(errorInfo);
}

/**
 * Show user-friendly error message
 * @param {Error} error - Error object
 */
function showUserFriendlyError(error) {
    // Use existing showAlert if available
    if (typeof window.showGlobalAlert === 'function') {
        const message = getUserFriendlyMessage(error);
        window.showGlobalAlert('danger', message);
    }
}

/**
 * Get user-friendly error message
 * @param {Error} error - Error object
 * @returns {string} User-friendly message
 */
export function getUserFriendlyMessage(error) {
    if (error instanceof AppError) {
        switch (error.type) {
            case ErrorTypes.NETWORK:
                return 'Network error. Please check your internet connection.';
            case ErrorTypes.AUTH:
                return 'Authentication error. Please sign in again.';
            case ErrorTypes.VALIDATION:
                return error.message || 'Invalid input. Please check your data.';
            case ErrorTypes.FIREBASE:
                return 'Database error. Please try again later.';
            case ErrorTypes.TIMEOUT:
                return 'Request timed out. Please try again.';
            default:
                return 'An unexpected error occurred. Please try again.';
        }
    }
    
    // Handle common error messages
    const message = error?.message?.toLowerCase() || '';
    
    if (message.includes('network') || message.includes('fetch')) {
        return 'Network error. Please check your internet connection.';
    }
    
    if (message.includes('permission') || message.includes('auth')) {
        return 'Permission denied. Please sign in again.';
    }
    
    if (message.includes('timeout')) {
        return 'Request timed out. Please try again.';
    }
    
    return 'An unexpected error occurred. Please try again.';
}

/**
 * Wrap async function with error handling
 * @param {Function} fn - Async function to wrap
 * @param {string} context - Error context for logging
 * @returns {Function} Wrapped function
 */
export function withErrorHandling(fn, context = 'Unknown') {
    return async function(...args) {
        try {
            return await fn.apply(this, args);
        } catch (error) {
            logError(context, error, { args });
            throw error;
        }
    };
}

/* ========================================
   DOM Utilities
   ======================================== */

/**
 * Batch DOM updates using requestAnimationFrame
 * @param {Function} updateFn - Function containing DOM updates
 * @returns {Promise} Resolves after next frame
 */
export function batchDOMUpdate(updateFn) {
    return new Promise((resolve) => {
        requestAnimationFrame(() => {
            updateFn();
            resolve();
        });
    });
}

/**
 * Create DOM elements efficiently using DocumentFragment
 * @param {string} html - HTML string
 * @returns {DocumentFragment} Fragment with elements
 */
export function createElementsFromHTML(html) {
    const template = document.createElement('template');
    template.innerHTML = html.trim();
    return template.content;
}

/**
 * Efficiently update table body with new content
 * Uses DocumentFragment for better performance
 * @param {HTMLElement} tbody - Table body element
 * @param {string} html - HTML content
 */
export function updateTableBody(tbody, html) {
    // Clear existing content
    while (tbody.firstChild) {
        tbody.removeChild(tbody.firstChild);
    }
    
    // Use DocumentFragment for efficient insertion
    const fragment = createElementsFromHTML(`<table><tbody>${html}</tbody></table>`);
    const rows = fragment.querySelector('tbody');
    
    if (rows) {
        while (rows.firstChild) {
            tbody.appendChild(rows.firstChild);
        }
    }
}

/**
 * Check if element is in viewport
 * @param {HTMLElement} element - Element to check
 * @returns {boolean} True if visible
 */
export function isInViewport(element) {
    const rect = element.getBoundingClientRect();
    return (
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
        rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
}

/* ========================================
   Validation Utilities
   ======================================== */

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} True if valid
 */
export function isValidEmail(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
}

/**
 * Validate required fields
 * @param {Object} data - Data object to validate
 * @param {Array} required - Array of required field names
 * @returns {Object} Validation result with isValid and missing fields
 */
export function validateRequired(data, required) {
    const missing = required.filter(field => {
        const value = data[field];
        return value === undefined || value === null || value === '';
    });
    
    return {
        isValid: missing.length === 0,
        missing
    };
}

/**
 * Sanitize string for HTML output (XSS prevention)
 * @param {string} str - String to sanitize
 * @returns {string} Sanitized string
 */
export function sanitizeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

/** Alias for sanitizeHTML - prevents XSS by escaping HTML entities */
export const escapeHtml = sanitizeHTML;

/**
 * Escape string for use in HTML attributes
 * @param {string} str - String to escape
 * @returns {string} Escaped string
 */
export function escapeAttribute(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/'/g, '&#39;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

/* ========================================
   Performance Monitoring
   ======================================== */

/**
 * Simple performance monitor
 */
export const perfMonitor = {
    marks: new Map(),
    
    /**
     * Start timing
     * @param {string} name - Mark name
     */
    start(name) {
        this.marks.set(name, performance.now());
    },
    
    /**
     * End timing and log result
     * @param {string} name - Mark name
     * @returns {number} Duration in milliseconds
     */
    end(name) {
        const start = this.marks.get(name);
        if (!start) {
            console.warn(`No start mark found for: ${name}`);
            return 0;
        }
        
        const duration = performance.now() - start;
        this.marks.delete(name);
        
        // Log slow operations (> 100ms)
        if (duration > 100) {
        } else {
            
        }
        
        return duration;
    }
};

/* ========================================
   Local Storage Utilities
   ======================================== */

/**
 * Safe localStorage wrapper with error handling
 */
export const safeStorage = {
    /**
     * Get item from localStorage
     * @param {string} key - Storage key
     * @param {*} defaultValue - Default value if not found
     * @returns {*} Parsed value or default
     */
    get(key, defaultValue = null) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (error) {
            logError('localStorage.get', error, { key });
            return defaultValue;
        }
    },
    
    /**
     * Set item in localStorage
     * @param {string} key - Storage key
     * @param {*} value - Value to store
     * @returns {boolean} Success status
     */
    set(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (error) {
            logError('localStorage.set', error, { key });
            return false;
        }
    },
    
    /**
     * Remove item from localStorage
     * @param {string} key - Storage key
     */
    remove(key) {
        try {
            localStorage.removeItem(key);
        } catch (error) {
            logError('localStorage.remove', error, { key });
        }
    }
};

/* ========================================
   Export Default Object
   ======================================== */

export default {
    debounce,
    throttle,
    memoize,
    requestCache,
    ErrorTypes,
    AppError,
    setupGlobalErrorHandler,
    logError,
    getUserFriendlyMessage,
    withErrorHandling,
    batchDOMUpdate,
    createElementsFromHTML,
    updateTableBody,
    isInViewport,
    isValidEmail,
    validateRequired,
    sanitizeHTML,
    escapeAttribute,
    perfMonitor,
    safeStorage
};

/* ========================================
   Advanced DOM Utilities
   ======================================== */

/**
 * DOM element cache for performance optimization
 * Prevents repeated querySelector calls
 */
const elementCache = new Map();

/**
 * Cached getElementById for better performance
 * @param {string} id - Element ID
 * @param {boolean} fresh - Force fresh lookup
 * @returns {HTMLElement|null} Element or null
 */
export function getEl(id, fresh = false) {
    if (fresh || !elementCache.has(id)) {
        const el = document.getElementById(id);
        if (el) elementCache.set(id, el);
        return el;
    }
    return elementCache.get(id);
}

/**
 * Clear element cache (useful after DOM updates)
 */
export function clearElCache() {
    elementCache.clear();
}

/**
 * Set multiple element attributes at once
 * @param {HTMLElement} element - Target element
 * @param {Object} attrs - Attributes object
 */
export function setAttrs(element, attrs) {
    Object.entries(attrs).forEach(([key, value]) => {
        element.setAttribute(key, value);
    });
}

/**
 * Toggle multiple classes at once
 * @param {HTMLElement} element - Target element
 * @param {Array<string>} classes - Classes to toggle
 * @param {boolean} force - Force add (true) or remove (false)
 */
export function toggleClasses(element, classes, force) {
    classes.forEach(cls => element.classList.toggle(cls, force));
}

/**
 * Create element with attributes and content
 * @param {string} tag - HTML tag name
 * @param {Object} attrs - Attributes
 * @param {string|HTMLElement} content - Content
 * @returns {HTMLElement} Created element
 */
export function createElement(tag, attrs = {}, content = '') {
    const el = document.createElement(tag);
    setAttrs(el, attrs);
    if (typeof content === 'string') {
        el.innerHTML = content;
    } else if (content instanceof HTMLElement) {
        el.appendChild(content);
    }
    return el;
}

/* ========================================
   Advanced Array & Object Utilities
   ======================================== */

/**
 * Group array of objects by key
 * @param {Array} array - Array to group
 * @param {string|Function} key - Key or function to group by
 * @returns {Object} Grouped object
 */
export function groupBy(array, key) {
    const getKey = typeof key === 'function' ? key : (item) => item[key];
    return array.reduce((result, item) => {
        const groupKey = getKey(item);
        if (!result[groupKey]) result[groupKey] = [];
        result[groupKey].push(item);
        return result;
    }, {});
}

/**
 * Sort array of objects by multiple keys
 * @param {Array} array - Array to sort
 * @param {Array<Object>} sortBy - Array of {key, order} objects
 * @returns {Array} Sorted array
 */
export function multiSort(array, sortBy) {
    return [...array].sort((a, b) => {
        for (const { key, order = 'asc' } of sortBy) {
            const aVal = a[key];
            const bVal = b[key];
            if (aVal !== bVal) {
                const comparison = aVal < bVal ? -1 : 1;
                return order === 'asc' ? comparison : -comparison;
            }
        }
        return 0;
    });
}

/**
 * Remove duplicates from array based on key
 * @param {Array} array - Array to deduplicate
 * @param {string|Function} key - Key or function to identify duplicates
 * @returns {Array} Deduplicated array
 */
export function uniqueBy(array, key) {
    const getKey = typeof key === 'function' ? key : (item) => item[key];
    const seen = new Set();
    return array.filter(item => {
        const k = getKey(item);
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
    });
}

/**
 * Chunk array into smaller arrays
 * @param {Array} array - Array to chunk
 * @param {number} size - Chunk size
 * @returns {Array<Array>} Array of chunks
 */
export function chunk(array, size) {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
        chunks.push(array.slice(i, i + size));
    }
    return chunks;
}

/**
 * Deep clone object
 * @param {*} obj - Object to clone
 * @returns {*} Cloned object
 */
export function deepClone(obj) {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj);
    if (obj instanceof Array) return obj.map(item => deepClone(item));
    if (obj instanceof Object) {
        const cloned = {};
        Object.keys(obj).forEach(key => {
            cloned[key] = deepClone(obj[key]);
        });
        return cloned;
    }
}

/**
 * Pick specific keys from object
 * @param {Object} obj - Source object
 * @param {Array<string>} keys - Keys to pick
 * @returns {Object} New object with picked keys
 */
export function pick(obj, keys) {
    return keys.reduce((result, key) => {
        if (key in obj) result[key] = obj[key];
        return result;
    }, {});
}

/**
 * Omit specific keys from object
 * @param {Object} obj - Source object
 * @param {Array<string>} keys - Keys to omit
 * @returns {Object} New object without omitted keys
 */
export function omit(obj, keys) {
    const omitSet = new Set(keys);
    return Object.keys(obj).reduce((result, key) => {
        if (!omitSet.has(key)) result[key] = obj[key];
        return result;
    }, {});
}

/* ========================================
   Number & Date Formatting Utilities
   ======================================== */

/**
 * Format number in Indian numbering system (Lakhs/Crores)
 * @param {number} num - Number to format
 * @param {number} decimals - Decimal places
 * @returns {string} Formatted number
 */
export function formatIndianNumber(num, decimals = 2) {
    if (num === null || num === undefined || isNaN(num)) return '--';
    
    const absNum = Math.abs(num);
    const sign = num < 0 ? '-' : '';
    
    if (absNum >= 10000000) { // >= 1 Crore
        return sign + (absNum / 10000000).toFixed(decimals) + ' Cr';
    } else if (absNum >= 100000) { // >= 1 Lakh
        return sign + (absNum / 100000).toFixed(decimals) + ' L';
    } else if (absNum >= 1000) { // >= 1 Thousand
        return sign + (absNum / 1000).toFixed(decimals) + ' K';
    }
    return num.toFixed(decimals);
}

/**
 * Format currency in INR
 * @param {number} amount - Amount to format
 * @param {boolean} showSymbol - Show ₹ symbol
 * @returns {string} Formatted currency
 */
export function formatCurrency(amount, showSymbol = true) {
    if (amount === null || amount === undefined || isNaN(amount)) return '--';
    const formatted = amount.toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
    return showSymbol ? `₹${formatted}` : formatted;
}

/**
 * Format percentage
 * @param {number} value - Value to format
 * @param {number} decimals - Decimal places
 * @param {boolean} showSign - Show + for positive
 * @returns {string} Formatted percentage
 */
export function formatPercent(value, decimals = 2, showSign = true) {
    if (value === null || value === undefined || isNaN(value)) return '--';
    const sign = showSign && value > 0 ? '+' : '';
    return `${sign}${value.toFixed(decimals)}%`;
}

/**
 * Parse number from formatted Indian string
 * @param {string} str - Formatted string (e.g., "1.5 Cr", "₹50,000")
 * @returns {number} Parsed number
 */
export function parseIndianNumber(str) {
    if (!str || typeof str !== 'string') return 0;
    
    // Remove currency symbols and commas
    let num = str.replace(/[₹,]/g, '').trim();
    
    // Handle Cr/L/K suffixes
    const multipliers = { Cr: 10000000, L: 100000, K: 1000 };
    for (const [suffix, multiplier] of Object.entries(multipliers)) {
        if (num.endsWith(suffix)) {
            return parseFloat(num) * multiplier;
        }
    }
    
    return parseFloat(num) || 0;
}

/**
 * Format relative time (e.g., "2h ago", "3 days ago")
 * @param {Date|string|number} date - Date to format
 * @returns {string} Relative time string
 */
export function formatRelativeTime(date) {
    const now = new Date();
    const then = new Date(date);
    const diffMs = now - then;
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffSecs < 60) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
    
    return then.toLocaleDateString('en-IN', { 
        day: 'numeric', 
        month: 'short',
        year: diffDays > 365 ? 'numeric' : undefined
    });
}

/**
 * Format date in DD/MM/YYYY format
 * @param {Date|string} date - Date to format
 * @returns {string} Formatted date
 */
export function formatDate(date) {
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
}

/* ========================================
   Fetch & Network Utilities
   ======================================== */

/**
 * Fetch with retry logic and exponential backoff
 * @param {string} url - URL to fetch
 * @param {Object} options - Fetch options
 * @param {number} maxRetries - Maximum retry attempts
 * @returns {Promise<Response>} Fetch response
 */
export async function fetchWithRetry(url, options = {}, maxRetries = 3) {
    let lastError;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), options.timeout || 10000);
            
            const response = await fetch(url, {
                ...options,
                signal: controller.signal
            });
            
            clearTimeout(timeout);
            
            if (response.ok) return response;
            
            // Don't retry on 4xx errors (client errors)
            if (response.status >= 400 && response.status < 500) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
        } catch (error) {
            lastError = error;
            
            // Don't retry on abort or network errors if it's the last attempt
            if (attempt === maxRetries) break;
            
            // Exponential backoff: 1s, 2s, 4s, 8s...
            const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
    
    throw lastError || new Error('Fetch failed after retries');
}

/**
 * Parallel fetch with concurrency limit
 * @param {Array<string>} urls - URLs to fetch
 * @param {number} concurrency - Max concurrent requests
 * @param {Object} options - Fetch options
 * @returns {Promise<Array>} Array of responses
 */
export async function fetchParallel(urls, concurrency = 5, options = {}) {
    const results = [];
    const chunks = chunk(urls, concurrency);
    
    for (const urlChunk of chunks) {
        const responses = await Promise.allSettled(
            urlChunk.map(url => fetchWithRetry(url, options))
        );
        results.push(...responses.map((r, i) => ({
            url: urlChunk[i],
            status: r.status,
            value: r.status === 'fulfilled' ? r.value : null,
            error: r.status === 'rejected' ? r.reason : null
        })));
    }
    
    return results;
}

/**
 * Parse JSON with error handling
 * @param {string} text - JSON string
 * @param {*} fallback - Fallback value on error
 * @returns {*} Parsed JSON or fallback
 */
export function safeJSONParse(text, fallback = null) {
    try {
        return JSON.parse(text);
    } catch {
        return fallback;
    }
}

/* ========================================
   Data Transformation Utilities
   ======================================== */

/**
 * Safely get nested object property
 * @param {Object} obj - Source object
 * @param {string} path - Dot-separated path
 * @param {*} defaultValue - Default if not found
 * @returns {*} Value at path or default
 */
export function getNestedValue(obj, path, defaultValue = undefined) {
    const keys = path.split('.');
    let current = obj;
    
    for (const key of keys) {
        if (current === null || current === undefined) {
            return defaultValue;
        }
        current = current[key];
    }
    
    return current !== undefined ? current : defaultValue;
}

/**
 * Set nested object property
 * @param {Object} obj - Target object
 * @param {string} path - Dot-separated path
 * @param {*} value - Value to set
 */
export function setNestedValue(obj, path, value) {
    const keys = path.split('.');
    const lastKey = keys.pop();
    let current = obj;
    
    for (const key of keys) {
        if (!(key in current) || typeof current[key] !== 'object') {
            current[key] = {};
        }
        current = current[key];
    }
    
    current[lastKey] = value;
}

/**
 * Flatten nested object
 * @param {Object} obj - Object to flatten
 * @param {string} prefix - Key prefix
 * @returns {Object} Flattened object
 */
export function flattenObject(obj, prefix = '') {
    return Object.keys(obj).reduce((acc, key) => {
        const fullKey = prefix ? `${prefix}.${key}` : key;
        if (obj[key] && typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
            Object.assign(acc, flattenObject(obj[key], fullKey));
        } else {
            acc[fullKey] = obj[key];
        }
        return acc;
    }, {});
}

/**
 * Capitalize first letter of string
 * @param {string} str - String to capitalize
 * @returns {string} Capitalized string
 */
export function capitalizeFirst(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/**
 * Convert string to title case
 * @param {string} str - String to convert
 * @returns {string} Title cased string
 */
export function toTitleCase(str) {
    if (!str) return '';
    return str.split(' ').map(word => capitalizeFirst(word)).join(' ');
}

/**
 * Truncate string with ellipsis
 * @param {string} str - String to truncate
 * @param {number} maxLength - Maximum length
 * @returns {string} Truncated string
 */
export function truncate(str, maxLength) {
    if (!str || str.length <= maxLength) return str;
    return str.slice(0, maxLength - 3) + '...';
}

/**
 * Sleep/delay utility
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise} Promise that resolves after delay
 */
export function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Generate unique ID
 * @param {string} prefix - Optional prefix
 * @returns {string} Unique ID
 */
export function generateId(prefix = '') {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 9);
    return `${prefix}${timestamp}${random}`;
}

/**
 * Check if value is empty (null, undefined, '', [], {})
 * @param {*} value - Value to check
 * @returns {boolean} True if empty
 */
export function isEmpty(value) {
    if (value === null || value === undefined) return true;
    if (typeof value === 'string') return value.trim() === '';
    if (Array.isArray(value)) return value.length === 0;
    if (typeof value === 'object') return Object.keys(value).length === 0;
    return false;
}

/* ========================================
   Logging Utilities
   ======================================== */

/**
 * Centralized logging utility with environment awareness
 * @param {string} level - Log level (log, info, warn, error)
 * @param {string} message - Log message
 * @param {Object} [context] - Additional context
 */
export function log(level = 'log', message, context = {}) {
    // Skip logs in production except errors
    const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    
    if (!isDevelopment && level !== 'error') {
        return;
    }
    
    const logData = {
        level,
        message,
        context,
        timestamp: new Date().toISOString(),
        url: window.location.href
    };
    
    // Use appropriate console method
    const consoleMethod = console[level] || console.log;
    
    if (isDevelopment) {
        // Formatted logging in development
        consoleMethod(`[${level.toUpperCase()}] ${message}`, context);
    } else {
        // JSON logging for production (easier to parse)
        consoleMethod(JSON.stringify(logData));
    }
}
