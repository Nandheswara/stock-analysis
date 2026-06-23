/**
 * Navigation and Layout Centralization Loader
 * 
 * Dynamically fetches and injects the common navbar and footer components
 * across all pages. Auto-adjusts relative URLs for pages inside subfolders
 * and sets active navigation states.
 */

(function() {
    'use strict';

    // Determine current folder depth
    const isSubfolder = window.location.pathname.includes('/pages/');
    const prefix = isSubfolder ? '../' : '';
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';

    /**
     * Helper to adjust relative hrefs inside dynamic HTML elements
     * @param {HTMLElement} container - Root element containing links to rewrite
     */
    function adjustUrls(container) {
        if (!isSubfolder) return; // No rewriting needed for root files

        const links = container.querySelectorAll('a');
        links.forEach(link => {
            const href = link.getAttribute('href');
            if (!href || href.startsWith('#') || href.startsWith('http') || href.startsWith('javascript:')) {
                return;
            }

            if (href === 'index.html') {
                link.setAttribute('href', '../index.html');
            } else if (href.startsWith('pages/')) {
                // Strip "pages/" from the link, e.g. "pages/analysis.html" -> "analysis.html"
                link.setAttribute('href', href.replace('pages/', ''));
            }
        });
    }

    /**
     * Sets active CSS classes on navbar links matching current page
     * @param {HTMLElement} navbar - The injected navbar element
     */
    function setActiveState(navbar) {
        // Map current page filename to element IDs
        const pageIdMap = {
            'index.html': 'navHomeLink',
            'analysis.html': 'navAnalysisLink',
            'stock-manager.html': 'navStockManagerLink',
            'news.html': 'navNewsLink',
            'finance-tracker.html': 'navFinanceTrackerLink'
        };

        const activeId = pageIdMap[currentPage];
        if (activeId) {
            const activeLink = navbar.querySelector(`#${activeId}`);
            if (activeLink) {
                activeLink.classList.add('active');
            }
        }
    }

    /**
     * Initializes components injection
     */
    async function initLayout() {
        try {
            // Load Navbar
            const navPlaceholder = document.getElementById('navbar-placeholder');
            if (navPlaceholder) {
                const navResp = await fetch(`${prefix}components/navbar.html`);
                if (navResp.ok) {
                    const navHtml = await navResp.text();
                    // Insert content
                    navPlaceholder.outerHTML = navHtml;
                    
                    // Retrieve navbar element after replace
                    const navElement = document.querySelector('nav.navbar');
                    if (navElement) {
                        adjustUrls(navElement);
                        setActiveState(navElement);

                        // Show admin badge if on admin page
                        if (currentPage === 'admin.html') {
                            const badge = navElement.querySelector('#adminNavbarBadge');
                            if (badge) badge.style.display = 'inline-block';
                        }
                    }
                }
            }

            // Load Footer
            const footerPlaceholder = document.getElementById('footer-placeholder') || document.getElementById('adminFooter');
            if (footerPlaceholder) {
                const footerResp = await fetch(`${prefix}components/footer.html`);
                if (footerResp.ok) {
                    const footerHtml = await footerResp.text();
                    
                    // Determine existing footer wrapper ID/attributes to preserve custom classes
                    const originalId = footerPlaceholder.id;
                    const originalClass = footerPlaceholder.className;
                    const originalStyle = footerPlaceholder.getAttribute('style') || '';

                    // Create new footer element
                    const footer = document.createElement('footer');
                    if (originalId && originalId !== 'footer-placeholder') {
                        footer.id = originalId;
                    }
                    footer.className = originalClass || 'bg-dark text-white text-center py-4 mt-5';
                    if (originalStyle) {
                        footer.setAttribute('style', originalStyle);
                    }
                    footer.innerHTML = footerHtml;
                    
                    adjustUrls(footer);
                    footerPlaceholder.replaceWith(footer);
                }
            }

            // Dispatch custom event to notify other scripts that navbar/footer are ready in the DOM
            document.dispatchEvent(new CustomEvent('layoutReady', {
                detail: { isSubfolder, prefix }
            }));

        } catch (error) {
            console.error('Failed to load centralized layout components:', error);
        }
    }

    // Load layout components immediately
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initLayout);
    } else {
        initLayout();
    }
})();
