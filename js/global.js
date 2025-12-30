/**
 * Global JavaScript for Stock Analysis Dashboard
 * 
 * This file contains shared functionality across all pages including:
 * - Theme management (dark/light mode switching)
 * - Theme persistence using localStorage
 * - System preference detection
 * 
 * Dependencies: None (Vanilla JavaScript)
 * Usage: Include this file in all pages
 */

/* ========================================
   Theme Management
   ======================================== */

/**
 * Apply the specified theme to the page
 * @param {string} theme - The theme to apply ('light' or 'dark')
 */
function applyTheme(theme) {
    if (theme === 'light') {
        document.body.classList.add('light-theme');
        const icon = document.getElementById('themeIcon');
        if (icon) { 
            icon.className = 'bi bi-sun-fill'; 
        }
    } else {
        document.body.classList.remove('light-theme');
        const icon = document.getElementById('themeIcon');
        if (icon) { 
            icon.className = 'bi bi-moon-fill'; 
        }
    }
    
    try {
        localStorage.setItem('theme', theme);
    } catch (e) {
        // Ignore storage errors (e.g., in private browsing mode)
    }
}

/**
 * Toggle between light and dark themes
 */
function toggleTheme() {
    const current = (localStorage.getItem('theme') === 'light') ? 'light' : 'dark';
    const next = current === 'light' ? 'dark' : 'light';
    applyTheme(next);
}

/**
 * Initialize theme based on saved preference or system preference
 */
function initTheme() {
    let stored = null;
    
    // Try to get stored theme preference
    try { 
        stored = localStorage.getItem('theme'); 
    } catch (e) { 
        stored = null; 
    }
    
    // Detect system preference
    const prefersLight = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;
    
    // Use stored preference if available, otherwise use system preference
    const theme = stored ? stored : (prefersLight ? 'light' : 'dark');
    applyTheme(theme);
}

/* ========================================
   Event Listeners
   ======================================== */

/**
 * Initialize theme when DOM is ready
 */
document.addEventListener('DOMContentLoaded', function() {
    // Initialize theme
    initTheme();
    
    // Add event listener to theme toggle button
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
    }
});
