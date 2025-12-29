// Theme Management for Stock Analysis Dashboard
// This file handles theme switching between dark and light modes

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
        // ignore storage errors
        console.warn('Unable to save theme preference');
    }
}

function toggleTheme() {
    const current = (localStorage.getItem('theme') === 'light') ? 'light' : 'dark';
    const next = current === 'light' ? 'dark' : 'light';
    applyTheme(next);
}

function initTheme() {
    let stored = null;
    try { 
        stored = localStorage.getItem('theme'); 
    } catch (e) { 
        stored = null; 
    }
    const prefersLight = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;
    const theme = stored ? stored : (prefersLight ? 'light' : 'dark');
    applyTheme(theme);
}

// Initialize theme when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    initTheme();
    
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
    }
});
