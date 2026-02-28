/**
 * Global JavaScript for Stock Analysis Dashboard
 * 
 * This file contains shared functionality across all pages including:
 * - Theme management (dark/light mode switching)
 * - Theme persistence using sessionStorage
 * - System preference detection
 * - Maintenance mode checking
 * - Announcement display
 * - System settings enforcement
 * 
 * Dependencies: Firebase (loaded dynamically)
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
        sessionStorage.setItem('theme', theme);
    } catch (e) {
        // Ignore storage errors (e.g., in private browsing mode)
    }
}

/**
 * Toggle between light and dark themes
 */
function toggleTheme() {
    const current = (sessionStorage.getItem('theme') === 'light') ? 'light' : 'dark';
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
        stored = sessionStorage.getItem('theme'); 
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
   Maintenance Mode & Announcements
   ======================================== */

/**
 * Primary admin email - exempt from maintenance mode
 */
const PRIMARY_ADMIN_EMAIL = 'nandheswara21@gmail.com';

/**
 * Check if current page is the admin page
 */
function isAdminPage() {
    return window.location.pathname.includes('admin.html');
}

/**
 * Check maintenance mode and block access if enabled
 * Admin page is exempt so admins can log in and turn off maintenance
 */
async function checkMaintenanceMode() {
    // Skip check on admin page - admins need access to log in and turn off maintenance
    if (isAdminPage()) {
        return;
    }
    
    try {
        // Dynamically import Firebase modules
        const { database } = await import('./firebase-config.js');
        const { ref, get, set } = await import('https://www.gstatic.com/firebasejs/11.1.0/firebase-database.js');
        const { auth } = await import('./firebase-config.js');
        
        // Check maintenance mode setting
        const maintenanceRef = ref(database, 'maintenanceMode');
        const snapshot = await get(maintenanceRef);
        
        if (snapshot.exists()) {
            const maintenance = snapshot.val();
            
            if (maintenance.enabled === true) {
                // Check if estimated end time has passed - auto-disable maintenance
                if (maintenance.estimatedEndTime && Date.now() > maintenance.estimatedEndTime) {
                    // Maintenance period has ended, auto-disable it
                    try {
                        await set(maintenanceRef, {
                            ...maintenance,
                            enabled: false,
                            autoDisabledAt: Date.now(),
                            autoDisabledReason: 'Estimated end time reached'
                        });
                        console.log('Maintenance mode auto-disabled: estimated end time reached');
                        return; // Maintenance is now disabled, allow access
                    } catch (updateError) {
                        console.error('Failed to auto-disable maintenance:', updateError);
                        // If we can't update, still allow access since time has passed
                        return;
                    }
                }
                
                // Check if current user is admin (exempt from maintenance)
                const currentUser = auth.currentUser;
                
                if (currentUser) {
                    // Check if user is primary admin
                    if (currentUser.email?.toLowerCase() === PRIMARY_ADMIN_EMAIL.toLowerCase()) {
                        return; // Primary admin is exempt
                    }
                    
                    // Check if user is in admin list
                    const adminsRef = ref(database, 'adminUsers');
                    const adminsSnapshot = await get(adminsRef);
                    
                    if (adminsSnapshot.exists()) {
                        const admins = adminsSnapshot.val();
                        const isAdmin = Object.values(admins).some(
                            admin => admin.email?.toLowerCase() === currentUser.email?.toLowerCase() && admin.active !== false
                        );
                        
                        if (isAdmin) {
                            return; // Admin users are exempt
                        }
                    }
                    
                    // Check user role
                    const userRef = ref(database, `users/${currentUser.uid}/role`);
                    const userRoleSnapshot = await get(userRef);
                    
                    if (userRoleSnapshot.exists() && userRoleSnapshot.val() === 'admin') {
                        return; // Admin role users are exempt
                    }
                }
                
                // Show maintenance mode overlay
                showMaintenanceOverlay(maintenance.message, maintenance.estimatedEndTime);
            }
        }
    } catch (error) {
        console.error('Error checking maintenance mode:', error);
    }
}

/**
 * Show maintenance mode overlay
 * @param {string} message - Maintenance message
 * @param {number} estimatedEndTime - Estimated end timestamp
 */
function showMaintenanceOverlay(message, estimatedEndTime) {
    // Remove any existing overlay
    const existing = document.getElementById('maintenanceOverlay');
    if (existing) {
        existing.remove();
    }
    
    // Create overlay HTML
    const overlay = document.createElement('div');
    overlay.id = 'maintenanceOverlay';
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 99999;
        color: white;
    `;
    
    let endTimeHtml = '';
    if (estimatedEndTime) {
        const endDate = new Date(estimatedEndTime);
        endTimeHtml = `<p style="color: #ffc107; margin-top: 20px;">
            <i class="bi bi-clock"></i> Estimated completion: ${endDate.toLocaleString()}
        </p>`;
    }
    
    overlay.innerHTML = `
        <div style="text-align: center; padding: 40px; max-width: 600px;">
            <i class="bi bi-tools" style="font-size: 80px; color: #ffc107; margin-bottom: 20px; display: block;"></i>
            <h1 style="font-size: 2.5rem; margin-bottom: 20px;">Under Maintenance</h1>
            <p style="font-size: 1.2rem; color: #ccc; margin-bottom: 20px;">
                ${message || 'We are currently performing scheduled maintenance. Please check back soon.'}
            </p>
            ${endTimeHtml}
            <p style="color: #888; margin-top: 30px; font-size: 0.9rem;">
                We apologize for the inconvenience. The site will be back shortly.
            </p>
        </div>
    `;
    
    document.body.appendChild(overlay);
    
    // Prevent scrolling
    document.body.style.overflow = 'hidden';
}

/**
 * Check and display active announcements
 */
async function checkAnnouncements() {
    try {
        // Dynamically import Firebase modules
        const { database } = await import('./firebase-config.js');
        const { ref, get } = await import('https://www.gstatic.com/firebasejs/11.1.0/firebase-database.js');
        
        const announcementsRef = ref(database, 'announcements');
        const snapshot = await get(announcementsRef);
        
        if (snapshot.exists()) {
            const announcements = snapshot.val();
            const now = Date.now();
            
            // Find active, non-expired announcements
            const activeAnnouncements = Object.entries(announcements)
                .map(([id, announcement]) => ({ id, ...announcement }))
                .filter(a => {
                    // Check if active
                    if (a.active === false) return false;
                    
                    // Check if expired
                    if (a.expiresAt && a.expiresAt < now) return false;
                    
                    // Check if already dismissed in this session
                    const dismissed = sessionStorage.getItem(`announcement_dismissed_${a.id}`);
                    if (dismissed) return false;
                    
                    return true;
                })
                .sort((a, b) => b.createdAt - a.createdAt); // Most recent first
            
            // Display the most recent announcement
            if (activeAnnouncements.length > 0) {
                displayAnnouncement(activeAnnouncements[0]);
            }
        }
    } catch (error) {
        console.error('Error checking announcements:', error);
    }
}

/**
 * Display an announcement banner
 * @param {Object} announcement - Announcement object
 */
function displayAnnouncement(announcement) {
    // Remove any existing announcement banner
    const existing = document.getElementById('announcementBanner');
    if (existing) {
        existing.remove();
    }
    
    // Type-based styling
    const typeStyles = {
        info: { bg: '#0d6efd', icon: 'bi-info-circle' },
        warning: { bg: '#ffc107', icon: 'bi-exclamation-triangle', textColor: '#000' },
        success: { bg: '#198754', icon: 'bi-check-circle' },
        danger: { bg: '#dc3545', icon: 'bi-exclamation-octagon' }
    };
    
    const style = typeStyles[announcement.type] || typeStyles.info;
    
    // Create banner HTML
    const banner = document.createElement('div');
    banner.id = 'announcementBanner';
    banner.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        background: ${style.bg};
        color: ${style.textColor || 'white'};
        padding: 12px 20px;
        z-index: 9999;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 15px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.2);
    `;
    
    banner.innerHTML = `
        <i class="bi ${style.icon}" style="font-size: 1.2rem;"></i>
        <div style="flex: 1; max-width: 800px;">
            <strong>${escapeHtml(announcement.title)}</strong>
            <span style="margin-left: 10px;">${escapeHtml(announcement.message)}</span>
        </div>
        <button id="dismissAnnouncement" style="
            background: transparent;
            border: none;
            color: inherit;
            font-size: 1.5rem;
            cursor: pointer;
            padding: 0 10px;
            opacity: 0.7;
        " title="Dismiss">
            <i class="bi bi-x"></i>
        </button>
    `;
    
    document.body.appendChild(banner);
    
    // Adjust body padding to account for banner
    document.body.style.paddingTop = banner.offsetHeight + 'px';
    
    // Add dismiss handler
    document.getElementById('dismissAnnouncement').addEventListener('click', () => {
        sessionStorage.setItem(`announcement_dismissed_${announcement.id}`, 'true');
        banner.remove();
        document.body.style.paddingTop = '0';
    });
}

/**
 * Escape HTML to prevent XSS
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Check system settings and enforce restrictions
 */
async function checkSystemSettings() {
    // Skip on admin page
    if (isAdminPage()) {
        return;
    }
    
    try {
        const { database } = await import('./firebase-config.js');
        const { ref, get } = await import('https://www.gstatic.com/firebasejs/11.1.0/firebase-database.js');
        
        const settingsRef = ref(database, 'systemSettings');
        const snapshot = await get(settingsRef);
        
        if (snapshot.exists()) {
            const settings = snapshot.val();
            
            // Check if Analysis page is disabled
            if (settings.enableAnalysis === false && window.location.pathname.includes('analysis.html')) {
                showFeatureDisabledOverlay('Analysis');
            }
            
            // Check if Stock Manager page is disabled
            if (settings.enableStockManager === false && window.location.pathname.includes('stock-manager.html')) {
                showFeatureDisabledOverlay('Stock Manager');
            }
        }
    } catch (error) {
        console.error('Error checking system settings:', error);
    }
}

/**
 * Show feature disabled overlay
 * @param {string} featureName - Name of the disabled feature
 */
function showFeatureDisabledOverlay(featureName) {
    const overlay = document.createElement('div');
    overlay.id = 'featureDisabledOverlay';
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.9);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 99998;
        color: white;
    `;
    
    overlay.innerHTML = `
        <div style="text-align: center; padding: 40px; max-width: 500px;">
            <i class="bi bi-lock" style="font-size: 60px; color: #ffc107; margin-bottom: 20px; display: block;"></i>
            <h2 style="margin-bottom: 20px;">${featureName} Temporarily Unavailable</h2>
            <p style="color: #ccc; margin-bottom: 30px;">
                This feature has been temporarily disabled by the administrator.
            </p>
            <a href="${window.location.pathname.includes('/pages/') ? '../index.html' : 'index.html'}" 
               class="btn btn-primary" style="padding: 10px 30px;">
                <i class="bi bi-house"></i> Return to Home
            </a>
        </div>
    `;
    
    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';
}

/**
 * Check and display impersonation banner if admin is impersonating a user
 */
function checkImpersonation() {
    const impersonatedUserId = sessionStorage.getItem('impersonatedUserId');
    const impersonatedUserEmail = sessionStorage.getItem('impersonatedUserEmail');
    
    // Skip on admin page (it has its own banner)
    if (isAdminPage() || !impersonatedUserId) {
        return;
    }
    
    // Create impersonation banner
    const banner = document.createElement('div');
    banner.id = 'globalImpersonationBanner';
    banner.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        background: linear-gradient(90deg, #ff6b35, #f7931e);
        color: white;
        padding: 10px 20px;
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 15px;
        font-weight: 500;
        box-shadow: 0 2px 10px rgba(0,0,0,0.3);
    `;
    
    banner.innerHTML = `
        <i class="bi bi-person-badge" style="font-size: 1.3rem;"></i>
        <span>Viewing as: <strong>${escapeHtml(impersonatedUserEmail || impersonatedUserId)}</strong></span>
        <button id="stopGlobalImpersonation" style="
            background: rgba(255,255,255,0.2);
            border: 1px solid rgba(255,255,255,0.4);
            color: white;
            padding: 5px 15px;
            border-radius: 5px;
            cursor: pointer;
            font-weight: 500;
            margin-left: 10px;
        ">
            <i class="bi bi-x-circle"></i> Stop Impersonating
        </button>
        <a href="${window.location.pathname.includes('/pages/') ? 'admin.html' : 'pages/admin.html'}" style="
            background: rgba(255,255,255,0.2);
            border: 1px solid rgba(255,255,255,0.4);
            color: white;
            padding: 5px 15px;
            border-radius: 5px;
            text-decoration: none;
            font-weight: 500;
        ">
            <i class="bi bi-arrow-return-left"></i> Return to Admin
        </a>
    `;
    
    document.body.appendChild(banner);
    
    // Adjust body padding
    document.body.style.paddingTop = banner.offsetHeight + 'px';
    
    // Add stop impersonation handler
    document.getElementById('stopGlobalImpersonation').addEventListener('click', () => {
        sessionStorage.removeItem('impersonatedUserId');
        sessionStorage.removeItem('impersonatedUserEmail');
        sessionStorage.removeItem('originalAdminId');
        window.location.reload();
    });
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
    
    // Check impersonation immediately
    checkImpersonation();
    
    // Check maintenance mode and announcements after a small delay
    // to allow Firebase to initialize
    setTimeout(() => {
        checkMaintenanceMode();
        checkAnnouncements();
        checkSystemSettings();
    }, 500);
});
