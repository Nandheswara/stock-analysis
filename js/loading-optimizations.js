/**
 * Critical Loading Optimizations for Equity Labs
 * 
 * This script handles:
 * - Preloading critical resources
 * - Lazy loading non-critical assets
 * - Connection hints for faster fetches
 * - Progressive loading indicators
 * 
 * Include this script in the <head> with defer attribute
 */

(function() {
    'use strict';
    
    /**
     * Resource preloader using link prefetch/preload
     */
    const ResourcePreloader = {
        /**
         * Preload critical JavaScript modules
         * @param {string[]} urls - Array of URLs to preload
         */
        preloadModules(urls) {
            urls.forEach(url => {
                const link = document.createElement('link');
                link.rel = 'modulepreload';
                link.href = url;
                document.head.appendChild(link);
            });
        },
        
        /**
         * Prefetch resources for future navigation
         * @param {string[]} urls - Array of URLs to prefetch
         */
        prefetchResources(urls) {
            // Only prefetch if connection is good
            if (navigator.connection) {
                const { effectiveType, saveData } = navigator.connection;
                if (saveData || effectiveType === '2g' || effectiveType === 'slow-2g') {
                    return; // Skip prefetching on slow connections
                }
            }
            
            urls.forEach(url => {
                const link = document.createElement('link');
                link.rel = 'prefetch';
                link.href = url;
                document.head.appendChild(link);
            });
        },
        
        /**
         * Add DNS prefetch for external domains
         * @param {string[]} domains - Array of domains to prefetch DNS
         */
        dnsPrefetch(domains) {
            domains.forEach(domain => {
                const link = document.createElement('link');
                link.rel = 'dns-prefetch';
                link.href = domain;
                document.head.appendChild(link);
            });
        }
    };
    
    /**
     * Image lazy loading with IntersectionObserver
     */
    const ImageLazyLoader = {
        observer: null,
        
        init() {
            if ('IntersectionObserver' in window) {
                this.observer = new IntersectionObserver((entries) => {
                    entries.forEach(entry => {
                        if (entry.isIntersecting) {
                            const img = entry.target;
                            if (img.dataset.src) {
                                img.src = img.dataset.src;
                                img.removeAttribute('data-src');
                            }
                            if (img.dataset.srcset) {
                                img.srcset = img.dataset.srcset;
                                img.removeAttribute('data-srcset');
                            }
                            img.classList.add('loaded');
                            this.observer.unobserve(img);
                        }
                    });
                }, {
                    rootMargin: '50px 0px',
                    threshold: 0.01
                });
            }
        },
        
        observe(images) {
            if (!this.observer) {
                this.init();
            }
            
            if (this.observer) {
                images.forEach(img => this.observer.observe(img));
            } else {
                // Fallback for browsers without IntersectionObserver
                images.forEach(img => {
                    if (img.dataset.src) {
                        img.src = img.dataset.src;
                    }
                });
            }
        }
    };
    
    /**
     * Script lazy loading
     */
    const ScriptLoader = {
        loaded: new Set(),
        
        /**
         * Load script dynamically
         * @param {string} src - Script URL
         * @param {Object} options - Loading options
         * @returns {Promise} Resolves when script is loaded
         */
        load(src, options = {}) {
            if (this.loaded.has(src)) {
                return Promise.resolve();
            }
            
            return new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = src;
                
                if (options.async !== false) {
                    script.async = true;
                }
                if (options.defer) {
                    script.defer = true;
                }
                if (options.type) {
                    script.type = options.type;
                }
                
                script.onload = () => {
                    this.loaded.add(src);
                    resolve();
                };
                script.onerror = reject;
                
                document.body.appendChild(script);
            });
        },
        
        /**
         * Load script when element becomes visible
         * @param {string} src - Script URL
         * @param {string} triggerSelector - CSS selector for trigger element
         * @param {Object} options - Loading options
         */
        loadOnVisible(src, triggerSelector, options = {}) {
            const trigger = document.querySelector(triggerSelector);
            if (!trigger) return;
            
            const observer = new IntersectionObserver((entries) => {
                if (entries[0].isIntersecting) {
                    this.load(src, options);
                    observer.disconnect();
                }
            }, { rootMargin: '100px' });
            
            observer.observe(trigger);
        }
    };
    
    /**
     * Performance timing helpers
     */
    const PerfTiming = {
        marks: {},
        
        mark(name) {
            this.marks[name] = performance.now();
        },
        
        measure(name, startMark) {
            const start = this.marks[startMark] || 0;
            const duration = performance.now() - start;
            
            // Log slow operations
            if (duration > 100) {
            }
            
            return duration;
        },
        
        /**
         * Report Core Web Vitals
         */
        reportWebVitals() {
            if ('PerformanceObserver' in window) {
                // LCP - Largest Contentful Paint
                const lcpObserver = new PerformanceObserver((list) => {
                    const entries = list.getEntries();
                    const lastEntry = entries[entries.length - 1];
                });
                
                try {
                    lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
                } catch (e) {
                    // Not supported
                }
                
                // FID - First Input Delay
                const fidObserver = new PerformanceObserver((list) => {
                    const entries = list.getEntries();
                    entries.forEach(entry => {
                    });
                });
                
                try {
                    fidObserver.observe({ type: 'first-input', buffered: true });
                } catch (e) {
                    // Not supported
                }
                
                // CLS - Cumulative Layout Shift
                let clsValue = 0;
                const clsObserver = new PerformanceObserver((list) => {
                    const entries = list.getEntries();
                    entries.forEach(entry => {
                        if (!entry.hadRecentInput) {
                            clsValue += entry.value;
                        }
                    });
                });
                
                try {
                    clsObserver.observe({ type: 'layout-shift', buffered: true });
                    
                    // Report final CLS on page unload
                    window.addEventListener('visibilitychange', () => {
                        if (document.visibilityState === 'hidden') {
                        }
                    });
                } catch (e) {
                    // Not supported
                }
            }
        }
    };
    
    /**
     * Connection-aware loading
     */
    const ConnectionAware = {
        isSlowConnection() {
            if (navigator.connection) {
                const { effectiveType, saveData } = navigator.connection;
                return saveData || effectiveType === '2g' || effectiveType === 'slow-2g';
            }
            return false;
        },
        
        /**
         * Get optimal image quality based on connection
         * @returns {string} Quality level: 'low', 'medium', or 'high'
         */
        getOptimalQuality() {
            if (!navigator.connection) return 'high';
            
            const { effectiveType, saveData } = navigator.connection;
            if (saveData || effectiveType === '2g' || effectiveType === 'slow-2g') {
                return 'low';
            }
            if (effectiveType === '3g') {
                return 'medium';
            }
            return 'high';
        }
    };
    
    // Expose utilities globally
    window.ResourcePreloader = ResourcePreloader;
    window.ImageLazyLoader = ImageLazyLoader;
    window.ScriptLoader = ScriptLoader;
    window.PerfTiming = PerfTiming;
    window.ConnectionAware = ConnectionAware;
    
    // Auto-initialize on DOM ready
    document.addEventListener('DOMContentLoaded', function() {
        // Initialize image lazy loading
        ImageLazyLoader.init();
        
        // Observe all images with data-src
        const lazyImages = document.querySelectorAll('img[data-src]');
        if (lazyImages.length > 0) {
            ImageLazyLoader.observe(lazyImages);
        }
        
        // Prefetch likely navigation targets
        const currentPage = window.location.pathname;
        const prefetchTargets = [];
        
        if (currentPage.includes('index.html') || currentPage === '/') {
            prefetchTargets.push('pages/analysis.html');
        } else if (currentPage.includes('analysis.html')) {
            prefetchTargets.push('pages/stock-manager.html');
        }
        
        if (prefetchTargets.length > 0) {
            // Delay prefetching to not compete with page load
            setTimeout(() => {
                ResourcePreloader.prefetchResources(prefetchTargets);
            }, 2000);
        }
        
        // Report Web Vitals in development (can be disabled in production)
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            PerfTiming.reportWebVitals();
        }
    });
    
})();
