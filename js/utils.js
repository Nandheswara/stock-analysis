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
