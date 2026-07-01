/**
 * Theme Initializer Script
 * 
 * Executed synchronously in the document <head> to prevent dark-mode flash
 * for light-theme users during page layout parse.
 */
(function() {
    try {
        const stored = localStorage.getItem('theme');
        const prefersLight = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;
        if (stored === 'light' || (!stored && prefersLight)) {
            document.documentElement.classList.add('light-theme');
        }
    } catch (e) {}
})();
