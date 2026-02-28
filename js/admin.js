/**
 * Admin Control Panel JavaScript
 * 
 * Handles all admin functionality including:
 * - Admin authentication and access control
 * - User management (CRUD operations)
 * - User impersonation
 * - Audit logging
 * - System settings
 * - Announcements and maintenance mode
 * 
 * @module admin
 */

import { auth, database } from './firebase-config.js';
import { 
    onAuthStateChanged,
    sendPasswordResetEmail,
    createUserWithEmailAndPassword,
    deleteUser as firebaseDeleteUser,
    signInWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/11.1.0/firebase-auth.js";
import {
    ref,
    get,
    set,
    update,
    remove,
    push,
    onValue,
    query,
    orderByChild,
    limitToLast
} from "https://www.gstatic.com/firebasejs/11.1.0/firebase-database.js";

/* ========================================
   Constants
   ======================================== */

/**
 * Primary admin email - cannot be removed
 * This user has full admin privileges
 */
const PRIMARY_ADMIN_EMAIL = 'nandheswara21@gmail.com';

/**
 * Cached admin list from database
 */
let adminUsersCache = [];

const USERS_PER_PAGE = 10;
const AUDIT_LOGS_LIMIT = 100;

/* ========================================
   State Management
   ======================================== */

let currentUser = null;
let isAdmin = false;
let allUsers = [];
let filteredUsers = [];
let currentPage = 1;
let selectedUserId = null;
let impersonatedUserId = null;

/* ========================================
   Initialization
   ======================================== */

/**
 * Initialize the admin panel
 */
document.addEventListener('DOMContentLoaded', () => {
    initAuthListener();
    initAdminLoginForm();
});

/**
 * Initialize authentication listener
 */
function initAuthListener() {
    onAuthStateChanged(auth, async (user) => {
        hideLoading();
        
        if (!user) {
            showLoginModal();
            return;
        }
        
        currentUser = user;
        
        // Check if user is admin
        isAdmin = await checkAdminStatus(user);
        
        if (!isAdmin) {
            showAccessDenied();
            return;
        }
        
        // Hide login modal if open
        hideLoginModal();
        
        // User is admin, show admin panel
        showAdminPanel();
        initializeAdminPanel();
    });
}

/**
 * Initialize admin login form handlers
 */
function initAdminLoginForm() {
    const loginForm = document.getElementById('adminLoginForm');
    const googleSignInBtn = document.getElementById('adminGoogleSignInBtn');
    
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const email = document.getElementById('adminLoginEmail').value.trim();
            const password = document.getElementById('adminLoginPassword').value;
            const alertContainer = document.getElementById('adminAuthAlertContainer');
            
            // Clear previous errors
            if (alertContainer) {
                alertContainer.innerHTML = '';
            }
            
            try {
                const { signInWithEmailAndPassword } = await import('https://www.gstatic.com/firebasejs/11.1.0/firebase-auth.js');
                await signInWithEmailAndPassword(auth, email, password);
                // Auth state listener will handle the rest
            } catch (error) {
                console.error('Login error:', error);
                showAdminAuthError(getAuthErrorMessage(error.code));
            }
        });
    }
    
    if (googleSignInBtn) {
        googleSignInBtn.addEventListener('click', async () => {
            const alertContainer = document.getElementById('adminAuthAlertContainer');
            
            // Clear previous errors
            if (alertContainer) {
                alertContainer.innerHTML = '';
            }
            
            try {
                const { signInWithPopup, GoogleAuthProvider } = await import('https://www.gstatic.com/firebasejs/11.1.0/firebase-auth.js');
                const provider = new GoogleAuthProvider();
                await signInWithPopup(auth, provider);
                // Auth state listener will handle the rest
            } catch (error) {
                console.error('Google login error:', error);
                showAdminAuthError(getAuthErrorMessage(error.code));
            }
        });
    }
}

/**
 * Get user-friendly error message for auth errors
 * @param {string} errorCode - Firebase error code
 * @returns {string} User-friendly error message
 */
function getAuthErrorMessage(errorCode) {
    const errorMessages = {
        'auth/invalid-email': 'Invalid email address.',
        'auth/user-disabled': 'This account has been disabled.',
        'auth/user-not-found': 'No account found with this email.',
        'auth/wrong-password': 'Incorrect password.',
        'auth/invalid-credential': 'Invalid email or password.',
        'auth/too-many-requests': 'Too many failed attempts. Please try again later.',
        'auth/popup-closed-by-user': 'Sign-in popup was closed.',
        'auth/cancelled-popup-request': 'Sign-in was cancelled.',
        'auth/network-request-failed': 'Network error. Please check your connection.'
    };
    return errorMessages[errorCode] || 'An error occurred. Please try again.';
}

/**
 * Show error message in admin auth modal
 * @param {string} message - Error message to display
 */
function showAdminAuthError(message) {
    const alertContainer = document.getElementById('adminAuthAlertContainer');
    if (alertContainer) {
        alertContainer.innerHTML = `
            <div class="alert alert-danger alert-dismissible fade show" role="alert">
                <i class="bi bi-exclamation-triangle"></i> ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
            </div>
        `;
    }
}

/**
 * Show login modal
 */
function showLoginModal() {
    const modal = document.getElementById('adminAuthModal');
    const footer = document.getElementById('adminFooter');
    const content = document.getElementById('adminContent');
    const accessDenied = document.getElementById('accessDeniedOverlay');
    
    if (content) {
        content.style.display = 'none';
    }
    if (accessDenied) {
        accessDenied.style.display = 'none';
    }
    if (footer) {
        footer.style.display = 'block';
    }
    if (modal) {
        const bsModal = new bootstrap.Modal(modal);
        bsModal.show();
    }
}

/**
 * Hide login modal
 */
function hideLoginModal() {
    const modal = document.getElementById('adminAuthModal');
    if (modal) {
        const bsModal = bootstrap.Modal.getInstance(modal);
        if (bsModal) {
            bsModal.hide();
        }
    }
}

/**
 * Check if user has admin privileges
 * @param {Object} user - Firebase user object
 * @returns {Promise<boolean>}
 */
async function checkAdminStatus(user) {
    const userEmail = user.email?.toLowerCase();
    
    // Method 1: Check if primary admin
    if (userEmail === PRIMARY_ADMIN_EMAIL.toLowerCase()) {
        return true;
    }
    
    // Method 2: Check database admin list
    try {
        const adminsRef = ref(database, 'adminUsers');
        const snapshot = await get(adminsRef);
        
        if (snapshot.exists()) {
            const adminsData = snapshot.val();
            adminUsersCache = Object.entries(adminsData).map(([id, data]) => ({
                id,
                ...data
            }));
            
            const isInAdminList = adminUsersCache.some(
                admin => admin.email?.toLowerCase() === userEmail && admin.active !== false
            );
            
            if (isInAdminList) {
                return true;
            }
        }
    } catch (error) {
        console.error('Error checking admin list:', error);
    }
    
    // Method 3: Check user's role in their profile
    try {
        const userRef = ref(database, `users/${user.uid}/role`);
        const snapshot = await get(userRef);
        if (snapshot.exists() && snapshot.val() === 'admin') {
            return true;
        }
    } catch (error) {
        console.error('Error checking admin status:', error);
    }
    
    return false;
}

/**
 * Check if email is primary admin
 * @param {string} email - Email to check
 * @returns {boolean}
 */
function isPrimaryAdmin(email) {
    return email?.toLowerCase() === PRIMARY_ADMIN_EMAIL.toLowerCase();
}

/**
 * Show loading overlay
 */
function showLoading() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.style.display = 'flex';
    }
}

/**
 * Hide loading overlay
 */
function hideLoading() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.style.display = 'none';
    }
}

/**
 * Show access denied overlay
 */
function showAccessDenied() {
    const overlay = document.getElementById('accessDeniedOverlay');
    const content = document.getElementById('adminContent');
    
    if (overlay) {
        overlay.style.display = 'flex';
    }
    if (content) {
        content.style.display = 'none';
    }
}

/**
 * Show admin panel
 */
function showAdminPanel() {
    const overlay = document.getElementById('accessDeniedOverlay');
    const content = document.getElementById('adminContent');
    const userProfile = document.getElementById('userProfile');
    const footer = document.getElementById('adminFooter');
    
    if (overlay) {
        overlay.style.display = 'none';
    }
    if (content) {
        content.style.display = 'block';
    }
    if (footer) {
        footer.style.display = 'block';
    }
    
    // Ensure user profile is visible in navbar
    if (userProfile) {
        userProfile.style.setProperty('display', 'flex', 'important');
    }
    
    // Update user email in navbar
    const userEmailSpan = document.getElementById('userEmail');
    if (userEmailSpan && currentUser) {
        // Show display name if available, otherwise email prefix
        const displayText = currentUser.displayName || currentUser.email.split('@')[0];
        userEmailSpan.textContent = displayText;
    }
}

/**
 * Initialize admin panel components
 */
async function initializeAdminPanel() {
    // Ensure primary admin is in the database
    await ensurePrimaryAdminExists();
    
    // Load all data
    await Promise.all([
        loadUsers(),
        loadAdminUsers(),
        loadAuditLogs(),
        loadActiveAnnouncements()
    ]);
    
    loadStats();
    loadRecentActivity();
    bindEventListeners();
    checkImpersonationStatus();
}

/**
 * Ensure primary admin exists in database
 */
async function ensurePrimaryAdminExists() {
    try {
        const adminsRef = ref(database, 'adminUsers');
        const snapshot = await get(adminsRef);
        
        let primaryAdminExists = false;
        
        if (snapshot.exists()) {
            const adminsData = snapshot.val();
            primaryAdminExists = Object.values(adminsData).some(
                admin => admin.email?.toLowerCase() === PRIMARY_ADMIN_EMAIL.toLowerCase()
            );
        }
        
        // Add primary admin if not exists
        if (!primaryAdminExists) {
            const newAdminRef = push(ref(database, 'adminUsers'));
            await set(newAdminRef, {
                email: PRIMARY_ADMIN_EMAIL.toLowerCase(),
                addedBy: 'system',
                addedByEmail: 'system',
                addedAt: Date.now(),
                notes: 'Primary system administrator',
                active: true,
                isPrimary: true
            });
            console.log('Primary admin initialized in database');
        }
    } catch (error) {
        console.error('Error ensuring primary admin exists:', error);
    }
}

/* ========================================
   Admin Management
   ======================================== */

/**
 * Load admin users from database
 */
async function loadAdminUsers() {
    try {
        const adminsRef = ref(database, 'adminUsers');
        const snapshot = await get(adminsRef);
        
        const tbody = document.getElementById('adminsTableBody');
        if (!tbody) return;
        
        // Always show primary admin first
        let html = `
            <tr class="table-warning">
                <td>
                    <div class="d-flex align-items-center gap-2">
                        <i class="bi bi-shield-fill text-warning"></i>
                        <strong>${PRIMARY_ADMIN_EMAIL}</strong>
                    </div>
                </td>
                <td><span class="badge bg-warning text-dark">Primary Admin</span></td>
                <td>System Default</td>
                <td><span class="badge badge-active">Active</span></td>
                <td>
                    <span class="text-muted">Protected</span>
                </td>
            </tr>
        `;
        
        if (snapshot.exists()) {
            const adminsData = snapshot.val();
            adminUsersCache = Object.entries(adminsData).map(([id, data]) => ({
                id,
                ...data
            }));
            
            adminUsersCache.forEach(admin => {
                // Skip if this is the primary admin email (already shown)
                if (admin.email?.toLowerCase() === PRIMARY_ADMIN_EMAIL.toLowerCase()) {
                    return;
                }
                
                html += `
                    <tr>
                        <td>${escapeHtml(admin.email)}</td>
                        <td>${escapeHtml(admin.addedByEmail || 'Unknown')}</td>
                        <td>${formatDate(admin.addedAt)}</td>
                        <td>
                            <span class="badge ${admin.active !== false ? 'badge-active' : 'badge-disabled'}">
                                ${admin.active !== false ? 'Active' : 'Inactive'}
                            </span>
                        </td>
                        <td>
                            <button class="btn btn-sm btn-outline-danger" onclick="removeAdminAccess('${admin.id}', '${escapeHtml(admin.email)}')" title="Remove Admin">
                                <i class="bi bi-shield-x"></i> Remove
                            </button>
                        </td>
                    </tr>
                `;
            });
        } else {
            adminUsersCache = [];
        }
        
        tbody.innerHTML = html;
        
    } catch (error) {
        console.error('Error loading admin users:', error);
        showToast('Error loading admin users', 'danger');
    }
}

/**
 * Add admin access
 * @param {Event} event - Form submit event
 */
async function addAdminAccess(event) {
    event.preventDefault();
    
    const email = document.getElementById('newAdminEmail').value.trim().toLowerCase();
    const notes = document.getElementById('adminNotes').value.trim();
    
    if (!email) {
        showToast('Please enter an email address', 'warning');
        return;
    }
    
    // Check if already primary admin
    if (isPrimaryAdmin(email)) {
        showToast('This email is already the primary admin', 'info');
        return;
    }
    
    // Check if already in admin list
    const existingAdmin = adminUsersCache.find(a => a.email?.toLowerCase() === email);
    if (existingAdmin && existingAdmin.active !== false) {
        showToast('This user already has admin access', 'warning');
        return;
    }
    
    try {
        const adminRef = push(ref(database, 'adminUsers'));
        await set(adminRef, {
            email: email,
            addedBy: currentUser.uid,
            addedByEmail: currentUser.email,
            addedAt: Date.now(),
            notes: notes || null,
            active: true
        });
        
        await logAuditAction('admin_added', null, `Granted admin access to: ${email}`);
        
        // Close modal
        bootstrap.Modal.getInstance(document.getElementById('addAdminModal')).hide();
        document.getElementById('addAdminForm').reset();
        
        // Refresh admin list
        await loadAdminUsers();
        
        showToast(`Admin access granted to ${email}`, 'success');
        
    } catch (error) {
        console.error('Error adding admin:', error);
        showToast(`Error: ${error.message}`, 'danger');
    }
}

/**
 * Remove admin access
 * @param {string} adminId - Admin record ID
 * @param {string} email - Admin email
 */
window.removeAdminAccess = async function(adminId, email) {
    // Prevent removing primary admin
    if (isPrimaryAdmin(email)) {
        showToast('Cannot remove primary admin access', 'danger');
        return;
    }
    
    // Prevent self-removal
    if (email.toLowerCase() === currentUser.email.toLowerCase()) {
        showToast('You cannot remove your own admin access', 'warning');
        return;
    }
    
    if (!confirm(`Are you sure you want to remove admin access for ${email}?`)) {
        return;
    }
    
    try {
        await remove(ref(database, `adminUsers/${adminId}`));
        
        await logAuditAction('admin_removed', null, `Revoked admin access from: ${email}`);
        
        await loadAdminUsers();
        
        showToast(`Admin access removed from ${email}`, 'success');
        
    } catch (error) {
        console.error('Error removing admin:', error);
        showToast(`Error: ${error.message}`, 'danger');
    }
};

/* ========================================
   User Management
   ======================================== */

/**
 * Load all users from database
 */
async function loadUsers() {
    try {
        const usersRef = ref(database, 'users');
        const snapshot = await get(usersRef);
        
        if (snapshot.exists()) {
            const usersData = snapshot.val();
            allUsers = Object.entries(usersData).map(([uid, data]) => ({
                uid,
                ...data,
                createdAt: data.createdAt || data.metadata?.createdAt || Date.now(),
                lastActive: data.lastActive || data.metadata?.lastLogin || null
            }));
            
            // Sort by creation date (newest first)
            allUsers.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
            
            filteredUsers = [...allUsers];
            renderUsersTable();
            updateStats();
            populateUserSuggestions();
        } else {
            allUsers = [];
            filteredUsers = [];
            renderEmptyUsersTable();
        }
    } catch (error) {
        console.error('Error loading users:', error);
        showToast('Error loading users', 'danger');
    }
}

/**
 * Populate user suggestions for autocomplete datalists
 */
function populateUserSuggestions() {
    const userSuggestions = document.getElementById('userSuggestions');
    const adminEmailSuggestions = document.getElementById('adminEmailSuggestions');
    
    // Clear existing options
    if (userSuggestions) {
        userSuggestions.innerHTML = '';
    }
    if (adminEmailSuggestions) {
        adminEmailSuggestions.innerHTML = '';
    }
    
    // Add user emails as options
    allUsers.forEach(user => {
        if (user.email) {
            const optionText = user.displayName 
                ? `${user.email} (${user.displayName})`
                : user.email;
            
            // Add to user search suggestions
            if (userSuggestions) {
                const option1 = document.createElement('option');
                option1.value = user.email;
                option1.textContent = optionText;
                userSuggestions.appendChild(option1);
            }
            
            // Add to admin email suggestions (only non-admin users)
            if (adminEmailSuggestions && user.role !== 'admin') {
                const option2 = document.createElement('option');
                option2.value = user.email;
                option2.textContent = optionText;
                adminEmailSuggestions.appendChild(option2);
            }
        }
    });
}

/**
 * Render users table
 */
function renderUsersTable() {
    const tbody = document.getElementById('usersTableBody');
    if (!tbody) return;
    
    if (filteredUsers.length === 0) {
        renderEmptyUsersTable();
        return;
    }
    
    const startIndex = (currentPage - 1) * USERS_PER_PAGE;
    const endIndex = startIndex + USERS_PER_PAGE;
    const pageUsers = filteredUsers.slice(startIndex, endIndex);
    
    const fragment = document.createDocumentFragment();
    
    pageUsers.forEach(user => {
        const tr = document.createElement('tr');
        const displayName = user.displayName || '';
        const email = user.email || '';
        // Show displayName first, then email prefix, then UID as last resort
        const userName = displayName || (email ? email.split('@')[0] : `User ${user.uid.substring(0, 8)}`);
        const displayEmail = email || 'No email';
        tr.innerHTML = `
            <td>
                <div class="user-cell">
                    <div class="user-avatar">${getInitials(displayName, email)}</div>
                    <div class="user-info">
                        <span class="name">${escapeHtml(userName)}</span>
                        <span class="email">${escapeHtml(displayEmail)}</span>
                    </div>
                </div>
            </td>
            <td>
                <span class="badge ${user.role === 'admin' ? 'badge-admin' : 'badge-user'}">
                    ${user.role === 'admin' ? 'Admin' : 'User'}
                </span>
            </td>
            <td>
                <span class="badge ${user.status === 'disabled' ? 'badge-disabled' : 'badge-active'}">
                    ${user.status === 'disabled' ? 'Disabled' : 'Active'}
                </span>
            </td>
            <td>${formatDate(user.lastActive)}</td>
            <td>${formatDate(user.createdAt)}</td>
            <td>
                <div class="action-btns">
                    <button class="btn btn-sm btn-outline-info" onclick="openUserActions('${user.uid}')" title="More Actions">
                        <i class="bi bi-three-dots"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-primary" onclick="openEditUser('${user.uid}')" title="Edit">
                        <i class="bi bi-pencil"></i>
                    </button>
                </div>
            </td>
        `;
        fragment.appendChild(tr);
    });
    
    tbody.innerHTML = '';
    tbody.appendChild(fragment);
    
    renderPagination();
}

/**
 * Render empty users table
 */
function renderEmptyUsersTable() {
    const tbody = document.getElementById('usersTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = `
        <tr>
            <td colspan="6">
                <div class="empty-state">
                    <i class="bi bi-people"></i>
                    <h5>No Users Found</h5>
                    <p>No users match your current filters.</p>
                </div>
            </td>
        </tr>
    `;
    
    document.getElementById('usersPagination').innerHTML = '';
}

/**
 * Render pagination
 */
function renderPagination() {
    const pagination = document.getElementById('usersPagination');
    if (!pagination) return;
    
    const totalPages = Math.ceil(filteredUsers.length / USERS_PER_PAGE);
    
    if (totalPages <= 1) {
        pagination.innerHTML = '';
        return;
    }
    
    let html = '';
    
    // Previous button
    html += `
        <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
            <a class="page-link" href="#" onclick="changePage(${currentPage - 1}); return false;">
                <i class="bi bi-chevron-left"></i>
            </a>
        </li>
    `;
    
    // Page numbers
    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
            html += `
                <li class="page-item ${i === currentPage ? 'active' : ''}">
                    <a class="page-link" href="#" onclick="changePage(${i}); return false;">${i}</a>
                </li>
            `;
        } else if (i === currentPage - 2 || i === currentPage + 2) {
            html += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
        }
    }
    
    // Next button
    html += `
        <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
            <a class="page-link" href="#" onclick="changePage(${currentPage + 1}); return false;">
                <i class="bi bi-chevron-right"></i>
            </a>
        </li>
    `;
    
    pagination.innerHTML = html;
}

/**
 * Change page
 * @param {number} page - Page number
 */
window.changePage = function(page) {
    const totalPages = Math.ceil(filteredUsers.length / USERS_PER_PAGE);
    if (page < 1 || page > totalPages) return;
    
    currentPage = page;
    renderUsersTable();
};

/**
 * Filter users based on search and filters
 */
function filterUsers() {
    const searchTerm = document.getElementById('userSearchInput')?.value.toLowerCase() || '';
    const roleFilter = document.getElementById('userRoleFilter')?.value || 'all';
    const statusFilter = document.getElementById('userStatusFilter')?.value || 'all';
    
    filteredUsers = allUsers.filter(user => {
        const matchesSearch = !searchTerm || 
            (user.email && user.email.toLowerCase().includes(searchTerm)) ||
            (user.displayName && user.displayName.toLowerCase().includes(searchTerm));
        
        const matchesRole = roleFilter === 'all' || user.role === roleFilter;
        
        const matchesStatus = statusFilter === 'all' || 
            (statusFilter === 'active' && user.status !== 'disabled') ||
            (statusFilter === 'disabled' && user.status === 'disabled');
        
        return matchesSearch && matchesRole && matchesStatus;
    });
    
    currentPage = 1;
    renderUsersTable();
}

/* ========================================
   User Actions
   ======================================== */

/**
 * Open user actions modal
 * @param {string} userId - User ID
 */
window.openUserActions = function(userId) {
    selectedUserId = userId;
    const user = allUsers.find(u => u.uid === userId);
    
    if (!user) {
        showToast('User not found', 'danger');
        return;
    }
    
    // Populate modal
    document.getElementById('detailUserEmail').textContent = user.email;
    document.getElementById('detailUserName').textContent = user.displayName || 'Not set';
    
    const roleSpan = document.getElementById('detailUserRole');
    roleSpan.textContent = user.role === 'admin' ? 'Admin' : 'User';
    roleSpan.className = `badge ${user.role === 'admin' ? 'badge-admin' : 'badge-user'}`;
    
    const statusSpan = document.getElementById('detailUserStatus');
    statusSpan.textContent = user.status === 'disabled' ? 'Disabled' : 'Active';
    statusSpan.className = `badge ${user.status === 'disabled' ? 'badge-disabled' : 'badge-active'}`;
    
    document.getElementById('detailUserCreated').textContent = formatDate(user.createdAt, true);
    document.getElementById('detailUserLastActive').textContent = formatDate(user.lastActive, true);
    
    // Update toggle status button based on current user status
    updateToggleStatusButton(user.status || 'active');
    
    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('userActionsModal'));
    modal.show();
};

/**
 * Open edit user modal
 * @param {string} userId - User ID
 */
window.openEditUser = function(userId) {
    selectedUserId = userId;
    const user = allUsers.find(u => u.uid === userId);
    
    if (!user) {
        showToast('User not found', 'danger');
        return;
    }
    
    document.getElementById('editUserId').value = userId;
    document.getElementById('editUserEmail').value = user.email;
    document.getElementById('editUserDisplayName').value = user.displayName || '';
    document.getElementById('editUserRole').value = user.role || 'user';
    document.getElementById('editUserStatus').value = user.status || 'active';
    document.getElementById('editUserNotes').value = user.adminNotes || '';
    
    const modal = new bootstrap.Modal(document.getElementById('editUserModal'));
    modal.show();
};

/**
 * Toggle user status (enable/disable)
 */
async function toggleUserStatus() {
    const user = allUsers.find(u => u.uid === selectedUserId);
    
    if (!user) {
        showToast('User not found', 'danger');
        return;
    }
    
    // Prevent disabling primary admin
    if (user.email === PRIMARY_ADMIN_EMAIL) {
        showToast('Cannot disable the primary admin account', 'danger');
        return;
    }
    
    const newStatus = user.status === 'disabled' ? 'active' : 'disabled';
    const actionText = newStatus === 'disabled' ? 'disable' : 'enable';
    
    if (!confirm(`Are you sure you want to ${actionText} this user account?`)) {
        return;
    }
    
    try {
        await update(ref(database, `users/${selectedUserId}`), {
            status: newStatus,
            statusChangedAt: Date.now(),
            statusChangedBy: currentUser.uid
        });
        
        await logAuditAction(
            newStatus === 'disabled' ? 'user_disabled' : 'user_enabled',
            selectedUserId,
            `${newStatus === 'disabled' ? 'Disabled' : 'Enabled'} user: ${user.email}`
        );
        
        showToast(`User account ${newStatus === 'disabled' ? 'disabled' : 'enabled'} successfully`, 'success');
        
        // Update local data
        user.status = newStatus;
        renderUsersTable();
        updateStats();
        
        // Update toggle button in modal
        updateToggleStatusButton(newStatus);
        
        // Update status badge in modal
        const statusSpan = document.getElementById('detailUserStatus');
        statusSpan.textContent = newStatus === 'disabled' ? 'Disabled' : 'Active';
        statusSpan.className = `badge ${newStatus === 'disabled' ? 'badge-disabled' : 'badge-active'}`;
        
    } catch (error) {
        console.error('Error toggling user status:', error);
        showToast(`Error: ${error.message}`, 'danger');
    }
}

/**
 * Update toggle status button appearance based on current status
 * @param {string} status - Current user status
 */
function updateToggleStatusButton(status) {
    const btn = document.getElementById('toggleUserStatusBtn');
    const icon = document.getElementById('toggleStatusIcon');
    const text = document.getElementById('toggleStatusText');
    const subtext = document.getElementById('toggleStatusSubtext');
    
    if (!btn || !icon || !text || !subtext) return;
    
    if (status === 'disabled') {
        // User is disabled, show enable option
        btn.className = 'action-btn action-btn-success';
        icon.className = 'bi bi-toggle-off';
        text.textContent = 'Enable Account';
        subtext.textContent = 'Allow user login';
    } else {
        // User is active, show disable option
        btn.className = 'action-btn action-btn-warning';
        icon.className = 'bi bi-toggle-on';
        text.textContent = 'Disable Account';
        subtext.textContent = 'Prevent user login';
    }
}

/**
 * Add new user
 * Creates user in Firebase Auth and database
 * Note: This uses client-side approach which temporarily signs out admin
 * For production, use Firebase Admin SDK via Cloud Functions
 * @param {Event} event - Form submit event
 */
async function addUser(event) {
    event.preventDefault();
    
    const email = document.getElementById('newUserEmail').value.trim().toLowerCase();
    const password = document.getElementById('newUserPassword').value;
    const displayName = document.getElementById('newUserDisplayName').value.trim();
    const role = document.getElementById('newUserRole').value;
    const sendWelcome = document.getElementById('sendWelcomeEmail').checked;
    
    if (!email || !password) {
        showToast('Please fill in all required fields', 'warning');
        return;
    }
    
    if (password.length < 6) {
        showToast('Password must be at least 6 characters', 'warning');
        return;
    }
    
    try {
        showToast('Creating user... Please wait, you will be briefly signed out.', 'info');
        
        // Store current admin credentials
        const adminEmail = currentUser.email;
        const adminUid = currentUser.uid;
        
        // Create new user in Firebase Auth
        // This will sign out the current admin temporarily
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const newUser = userCredential.user;
        
        // Create user data in database using the actual Firebase Auth UID
        const userRef = ref(database, `users/${newUser.uid}`);
        await set(userRef, {
            email: email,
            displayName: displayName || null,
            role: role,
            status: 'active',
            createdAt: Date.now(),
            createdBy: adminUid,
            lastActive: Date.now(),
            requirePasswordChange: true,
            metadata: {
                createdAt: Date.now(),
                lastLogin: null
            }
        });
        
        // If role is admin, add to adminUsers list as well
        if (role === 'admin') {
            const adminRef = push(ref(database, 'adminUsers'));
            await set(adminRef, {
                email: email,
                addedBy: adminUid,
                addedByEmail: adminEmail,
                addedAt: Date.now(),
                notes: 'Added during user creation',
                active: true
            });
        }
        
        // Log action (using stored admin info since we're now signed in as new user)
        const logRef = push(ref(database, 'adminLogs'));
        await set(logRef, {
            timestamp: Date.now(),
            adminId: adminUid,
            adminEmail: adminEmail,
            action: 'user_created',
            targetUserId: newUser.uid,
            details: `Created user: ${email}${role === 'admin' ? ' (with admin access)' : ''}`
        });
        
        // Queue welcome email if requested
        if (sendWelcome) {
            const emailRef = push(ref(database, 'emailQueue'));
            await set(emailRef, {
                recipients: 'single',
                recipientEmails: [email],
                recipientCount: 1,
                subject: 'Welcome to Equity Labs',
                body: `Hello${displayName ? ' ' + displayName : ''},\n\nYour account has been created.\n\nEmail: ${email}\nTemporary Password: ${password}\n\nPlease login and change your password.\n\nBest regards,\nEquity Labs`,
                createdAt: Date.now(),
                createdBy: adminUid,
                createdByEmail: adminEmail,
                status: 'pending',
                type: 'welcome'
            });
        }
        
        // Sign out the newly created user
        await auth.signOut();
        
        // Close modal
        bootstrap.Modal.getInstance(document.getElementById('addUserModal'))?.hide();
        
        // Reset form
        document.getElementById('addUserForm').reset();
        
        // Show success message with instructions to re-login
        showToast(`User ${email} created successfully! Please login again as admin.`, 'success');
        
        // Redirect to login after a delay
        setTimeout(() => {
            window.location.reload();
        }, 2000);
        
    } catch (error) {
        console.error('Error creating user:', error);
        let errorMessage = error.message;
        
        if (error.code === 'auth/email-already-in-use') {
            errorMessage = 'This email is already registered. Use a different email.';
        } else if (error.code === 'auth/invalid-email') {
            errorMessage = 'Invalid email address format.';
        } else if (error.code === 'auth/weak-password') {
            errorMessage = 'Password is too weak. Use at least 6 characters.';
        }
        
        showToast(`Error creating user: ${errorMessage}`, 'danger');
    }
}

/**
 * Update user
 * @param {Event} event - Form submit event
 */
async function updateUser(event) {
    event.preventDefault();
    
    const userId = document.getElementById('editUserId').value;
    const displayName = document.getElementById('editUserDisplayName').value.trim();
    const role = document.getElementById('editUserRole').value;
    const status = document.getElementById('editUserStatus').value;
    const notes = document.getElementById('editUserNotes').value.trim();
    
    try {
        const userRef = ref(database, `users/${userId}`);
        await update(userRef, {
            displayName: displayName || null,
            role: role,
            status: status,
            adminNotes: notes || null,
            updatedAt: Date.now(),
            updatedBy: currentUser.uid
        });
        
        const user = allUsers.find(u => u.uid === userId);
        await logAuditAction('role_changed', userId, `Updated user: ${user?.email}`);
        
        bootstrap.Modal.getInstance(document.getElementById('editUserModal')).hide();
        await loadUsers();
        
        showToast('User updated successfully', 'success');
        
    } catch (error) {
        console.error('Error updating user:', error);
        showToast(`Error updating user: ${error.message}`, 'danger');
    }
}

/**
 * Send password reset email
 */
async function sendResetPassword() {
    const user = allUsers.find(u => u.uid === selectedUserId);
    
    if (!user) {
        showToast('User not found', 'danger');
        return;
    }
    
    try {
        await sendPasswordResetEmail(auth, user.email);
        await logAuditAction('password_reset', selectedUserId, `Sent password reset to: ${user.email}`);
        
        showToast(`Password reset email sent to ${user.email}`, 'success');
        
    } catch (error) {
        console.error('Error sending password reset:', error);
        showToast(`Error: ${error.message}`, 'danger');
    }
}

/**
 * Delete user
 */
async function deleteUser() {
    const confirmInput = document.getElementById('deleteConfirmInput').value;
    
    if (confirmInput !== 'DELETE') {
        showToast('Please type DELETE to confirm', 'warning');
        return;
    }
    
    const user = allUsers.find(u => u.uid === selectedUserId);
    
    if (!user) {
        showToast('User not found', 'danger');
        return;
    }
    
    try {
        // Delete user data from database
        await remove(ref(database, `users/${selectedUserId}`));
        await remove(ref(database, `stocks/${selectedUserId}`));
        await remove(ref(database, `portfolio/${selectedUserId}`));
        
        await logAuditAction('user_deleted', selectedUserId, `Deleted user: ${user.email}`);
        
        // Close modals
        bootstrap.Modal.getInstance(document.getElementById('deleteConfirmModal'))?.hide();
        bootstrap.Modal.getInstance(document.getElementById('userActionsModal'))?.hide();
        
        await loadUsers();
        showToast(`User ${user.email} deleted successfully`, 'success');
        
        selectedUserId = null;
        document.getElementById('deleteConfirmInput').value = '';
        
    } catch (error) {
        console.error('Error deleting user:', error);
        showToast(`Error deleting user: ${error.message}`, 'danger');
    }
}

/* ========================================
   User Impersonation
   ======================================== */

/**
 * Start impersonating a user
 */
async function impersonateUser() {
    const user = allUsers.find(u => u.uid === selectedUserId);
    
    if (!user) {
        showToast('User not found', 'danger');
        return;
    }
    
    try {
        // Store impersonation data in sessionStorage
        sessionStorage.setItem('impersonatedUserId', selectedUserId);
        sessionStorage.setItem('impersonatedUserEmail', user.email);
        sessionStorage.setItem('originalAdminId', currentUser.uid);
        
        await logAuditAction('impersonation', selectedUserId, `Started impersonating: ${user.email}`);
        
        showToast(`Now impersonating ${user.email}`, 'info');
        
        // Close modal and show impersonation banner
        bootstrap.Modal.getInstance(document.getElementById('userActionsModal')).hide();
        showImpersonationBanner(user.email);
        
    } catch (error) {
        console.error('Error starting impersonation:', error);
        showToast(`Error: ${error.message}`, 'danger');
    }
}

/**
 * Stop impersonating
 */
async function stopImpersonation() {
    const impersonatedEmail = sessionStorage.getItem('impersonatedUserEmail');
    
    sessionStorage.removeItem('impersonatedUserId');
    sessionStorage.removeItem('impersonatedUserEmail');
    sessionStorage.removeItem('originalAdminId');
    
    hideImpersonationBanner();
    
    await logAuditAction('impersonation', null, `Stopped impersonating: ${impersonatedEmail}`);
    
    showToast('Impersonation ended', 'success');
}

/**
 * Check impersonation status on load
 */
function checkImpersonationStatus() {
    const impersonatedEmail = sessionStorage.getItem('impersonatedUserEmail');
    
    if (impersonatedEmail) {
        showImpersonationBanner(impersonatedEmail);
    }
}

/**
 * Show impersonation banner
 * @param {string} email - Impersonated user email
 */
function showImpersonationBanner(email) {
    const banner = document.getElementById('impersonationBanner');
    const emailSpan = document.getElementById('impersonatedUser');
    
    if (banner && emailSpan) {
        emailSpan.textContent = email;
        banner.style.display = 'block';
    }
}

/**
 * Hide impersonation banner
 */
function hideImpersonationBanner() {
    const banner = document.getElementById('impersonationBanner');
    if (banner) {
        banner.style.display = 'none';
    }
}

/**
 * Get impersonated user ID (for other modules to use)
 * @returns {string|null}
 */
export function getImpersonatedUserId() {
    return sessionStorage.getItem('impersonatedUserId');
}

/* ========================================
   View User Data
   ======================================== */

/**
 * View user's stocks and portfolio data
 */
async function viewUserData() {
    const user = allUsers.find(u => u.uid === selectedUserId);
    
    if (!user) {
        showToast('User not found', 'danger');
        return;
    }
    
    document.getElementById('dataUserEmail').textContent = user.email;
    
    // Close actions modal, open data modal
    bootstrap.Modal.getInstance(document.getElementById('userActionsModal')).hide();
    
    const dataModal = new bootstrap.Modal(document.getElementById('viewUserDataModal'));
    dataModal.show();
    
    // Load stocks data
    try {
        const stocksRef = ref(database, `stocks/${selectedUserId}`);
        const stocksSnapshot = await get(stocksRef);
        
        const stocksContent = document.getElementById('userStocksContent');
        
        if (stocksSnapshot.exists()) {
            const stocks = stocksSnapshot.val();
            const stocksArray = Object.values(stocks);
            
            stocksContent.innerHTML = `
                <div class="table-responsive">
                    <table class="table table-dark table-sm">
                        <thead>
                            <tr>
                                <th>Symbol</th>
                                <th>Name</th>
                                <th>Added</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${stocksArray.map(s => `
                                <tr>
                                    <td>${escapeHtml(s.symbol || 'N/A')}</td>
                                    <td>${escapeHtml(s.name || s.stockName || 'N/A')}</td>
                                    <td>${formatDate(s.addedAt || s.createdAt)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
                <p class="text-muted mt-2">Total: ${stocksArray.length} stocks</p>
            `;
        } else {
            stocksContent.innerHTML = `
                <div class="empty-state">
                    <i class="bi bi-graph-up"></i>
                    <h5>No Stocks</h5>
                    <p>This user has no analysis stocks.</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading stocks:', error);
        document.getElementById('userStocksContent').innerHTML = `
            <div class="alert alert-danger">Error loading stocks data</div>
        `;
    }
    
    // Load portfolio data
    try {
        const portfolioRef = ref(database, `portfolio/${selectedUserId}`);
        const portfolioSnapshot = await get(portfolioRef);
        
        const portfolioContent = document.getElementById('userPortfolioContent');
        
        if (portfolioSnapshot.exists()) {
            const portfolio = portfolioSnapshot.val();
            const portfolioArray = Object.values(portfolio);
            
            portfolioContent.innerHTML = `
                <div class="table-responsive">
                    <table class="table table-dark table-sm">
                        <thead>
                            <tr>
                                <th>Stock</th>
                                <th>Qty</th>
                                <th>Avg Price</th>
                                <th>Investment</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${portfolioArray.map(p => `
                                <tr>
                                    <td>${escapeHtml(p.stockName || p.symbol || 'N/A')}</td>
                                    <td>${p.quantity || 0}</td>
                                    <td>₹${(p.avgPrice || 0).toFixed(2)}</td>
                                    <td>₹${((p.quantity || 0) * (p.avgPrice || 0)).toFixed(2)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
                <p class="text-muted mt-2">Total: ${portfolioArray.length} holdings</p>
            `;
        } else {
            portfolioContent.innerHTML = `
                <div class="empty-state">
                    <i class="bi bi-wallet2"></i>
                    <h5>No Portfolio</h5>
                    <p>This user has no portfolio holdings.</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading portfolio:', error);
        document.getElementById('userPortfolioContent').innerHTML = `
            <div class="alert alert-danger">Error loading portfolio data</div>
        `;
    }
}

/**
 * Delete all user data
 */
async function deleteUserData() {
    if (!confirm('Are you sure you want to delete ALL data for this user? This cannot be undone.')) {
        return;
    }
    
    const user = allUsers.find(u => u.uid === selectedUserId);
    
    try {
        await remove(ref(database, `stocks/${selectedUserId}`));
        await remove(ref(database, `portfolio/${selectedUserId}`));
        
        await logAuditAction('data_deleted', selectedUserId, `Deleted all data for: ${user?.email}`);
        
        showToast('User data deleted successfully', 'success');
        
        // Refresh the view
        viewUserData();
        
    } catch (error) {
        console.error('Error deleting user data:', error);
        showToast(`Error: ${error.message}`, 'danger');
    }
}

/* ========================================
   Statistics
   ======================================== */

/**
 * Load statistics
 */
async function loadStats() {
    // Stats will be updated after loading users
}

/**
 * Update statistics display
 */
function updateStats() {
    const totalUsers = allUsers.length;
    
    // Count admin users from both user role and adminUsersCache
    const adminEmails = new Set();
    
    // Add admins from user role field
    allUsers.forEach(u => {
        if (u.role === 'admin' && u.email) {
            adminEmails.add(u.email.toLowerCase());
        }
    });
    
    // Add admins from adminUsersCache
    if (Array.isArray(adminUsersCache) && adminUsersCache.length > 0) {
        adminUsersCache.forEach(admin => {
            if (admin.email) {
                adminEmails.add(admin.email.toLowerCase());
            }
        });
    }
    
    // Also add the primary admin
    adminEmails.add(PRIMARY_ADMIN_EMAIL.toLowerCase());
    
    const adminUsers = adminEmails.size;
    const disabledUsers = allUsers.filter(u => u.status === 'disabled').length;
    
    // Calculate active users (last 7 days)
    const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    const activeUsers = allUsers.filter(u => u.lastActive && u.lastActive > sevenDaysAgo).length;
    
    document.getElementById('totalUsersCount').textContent = totalUsers;
    document.getElementById('activeUsersCount').textContent = activeUsers;
    document.getElementById('adminUsersCount').textContent = adminUsers;
    document.getElementById('disabledUsersCount').textContent = disabledUsers;
}

/* ========================================
   Audit Logging
   ======================================== */

/**
 * Log admin action
 * @param {string} action - Action type
 * @param {string} targetUserId - Target user ID
 * @param {string} details - Action details
 */
async function logAuditAction(action, targetUserId, details) {
    try {
        const logRef = push(ref(database, 'adminLogs'));
        await set(logRef, {
            timestamp: Date.now(),
            adminId: currentUser.uid,
            adminEmail: currentUser.email,
            action: action,
            targetUserId: targetUserId,
            details: details
        });
    } catch (error) {
        console.error('Error logging action:', error);
    }
}

/**
 * Load audit logs
 */
async function loadAuditLogs() {
    try {
        const logsRef = query(
            ref(database, 'adminLogs'),
            orderByChild('timestamp'),
            limitToLast(AUDIT_LOGS_LIMIT)
        );
        
        onValue(logsRef, (snapshot) => {
            const tbody = document.getElementById('auditLogsBody');
            if (!tbody) return;
            
            if (snapshot.exists()) {
                const logs = [];
                snapshot.forEach(child => {
                    logs.push({ id: child.key, ...child.val() });
                });
                
                // Sort by timestamp descending
                logs.sort((a, b) => b.timestamp - a.timestamp);
                
                tbody.innerHTML = logs.map(log => `
                    <tr>
                        <td>${formatDate(log.timestamp, true)}</td>
                        <td>${escapeHtml(log.adminEmail)}</td>
                        <td><span class="badge bg-secondary">${formatActionType(log.action)}</span></td>
                        <td>${log.targetUserId ? escapeHtml(log.targetUserId.substring(0, 8) + '...') : '-'}</td>
                        <td>${escapeHtml(log.details || '-')}</td>
                    </tr>
                `).join('');
            } else {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="5" class="text-center py-3 text-muted">No audit logs found</td>
                    </tr>
                `;
            }
        });
    } catch (error) {
        console.error('Error loading audit logs:', error);
    }
}

/**
 * Load recent activity
 */
async function loadRecentActivity() {
    try {
        const logsRef = query(
            ref(database, 'adminLogs'),
            orderByChild('timestamp'),
            limitToLast(10)
        );
        
        onValue(logsRef, (snapshot) => {
            const feed = document.getElementById('activityFeed');
            if (!feed) return;
            
            if (snapshot.exists()) {
                const activities = [];
                snapshot.forEach(child => {
                    activities.push({ id: child.key, ...child.val() });
                });
                
                activities.sort((a, b) => b.timestamp - a.timestamp);
                
                feed.innerHTML = activities.map(activity => `
                    <div class="activity-item">
                        <div class="activity-icon ${getActivityIconClass(activity.action)}">
                            <i class="bi ${getActivityIcon(activity.action)}"></i>
                        </div>
                        <div class="activity-content">
                            <p>${escapeHtml(activity.details || formatActionType(activity.action))}</p>
                            <span class="time">${getRelativeTime(activity.timestamp)}</span>
                        </div>
                    </div>
                `).join('');
            } else {
                feed.innerHTML = `
                    <div class="empty-state py-4">
                        <i class="bi bi-activity"></i>
                        <p>No recent activity</p>
                    </div>
                `;
            }
        });
    } catch (error) {
        console.error('Error loading activity:', error);
    }
}

/* ========================================
   Announcements
   ======================================== */

/**
 * Load active announcements
 */
async function loadActiveAnnouncements() {
    const container = document.getElementById('activeAnnouncementsList');
    if (!container) return;
    
    try {
        const announcementsRef = ref(database, 'announcements');
        const snapshot = await get(announcementsRef);
        
        if (!snapshot.exists()) {
            container.innerHTML = '<p class="text-muted text-center mb-0">No active announcements</p>';
            return;
        }
        
        const announcements = [];
        const now = Date.now();
        
        snapshot.forEach((child) => {
            const data = child.val();
            // Only show active and non-expired announcements
            if (data.active !== false && (!data.expiresAt || data.expiresAt > now)) {
                announcements.push({
                    id: child.key,
                    ...data
                });
            }
        });
        
        if (announcements.length === 0) {
            container.innerHTML = '<p class="text-muted text-center mb-0">No active announcements</p>';
            return;
        }
        
        // Sort by createdAt descending
        announcements.sort((a, b) => b.createdAt - a.createdAt);
        
        const typeIcons = {
            info: 'bi-info-circle',
            warning: 'bi-exclamation-triangle',
            success: 'bi-check-circle',
            danger: 'bi-x-octagon'
        };
        
        const typeColors = {
            info: '#0dcaf0',
            warning: '#ffc107',
            success: '#198754',
            danger: '#dc3545'
        };
        
        container.innerHTML = announcements.map(ann => `
            <div class="announcement-item d-flex justify-content-between align-items-start mb-2 p-2" style="background: rgba(255,255,255,0.05); border-radius: 8px; border-left: 3px solid ${typeColors[ann.type] || typeColors.info};">
                <div class="flex-grow-1">
                    <div class="d-flex align-items-center gap-2 mb-1">
                        <i class="bi ${typeIcons[ann.type] || typeIcons.info}" style="color: ${typeColors[ann.type] || typeColors.info}"></i>
                        <strong style="font-size: 0.9rem;">${escapeHtml(ann.title)}</strong>
                    </div>
                    <p class="mb-1 text-muted" style="font-size: 0.8rem;">${escapeHtml(ann.message).substring(0, 100)}${ann.message.length > 100 ? '...' : ''}</p>
                    <small class="text-muted">${formatDate(ann.createdAt)}${ann.expiresAt ? ` · Expires ${formatDate(ann.expiresAt)}` : ''}</small>
                </div>
                <button class="btn btn-sm btn-outline-danger ms-2" onclick="deleteAnnouncement('${ann.id}')" title="Delete">
                    <i class="bi bi-trash"></i>
                </button>
            </div>
        `).join('');
        
    } catch (error) {
        console.error('Error loading announcements:', error);
        container.innerHTML = '<p class="text-danger text-center mb-0">Error loading announcements</p>';
    }
}

/**
 * Delete an announcement
 * @param {string} announcementId - The announcement ID to delete
 */
async function deleteAnnouncement(announcementId) {
    if (!confirm('Are you sure you want to delete this announcement?')) {
        return;
    }
    
    try {
        await remove(ref(database, `announcements/${announcementId}`));
        await logAuditAction('announcement_deleted', null, `Deleted announcement: ${announcementId}`);
        showToast('Announcement deleted successfully', 'success');
        loadActiveAnnouncements(); // Refresh the list
    } catch (error) {
        console.error('Error deleting announcement:', error);
        showToast(`Error: ${error.message}`, 'danger');
    }
}

// Make deleteAnnouncement available globally for onclick
window.deleteAnnouncement = deleteAnnouncement;

/**
 * Create announcement
 * @param {Event} event - Form submit event
 */
async function createAnnouncement(event) {
    event.preventDefault();
    
    const title = document.getElementById('announcementTitle').value.trim();
    const message = document.getElementById('announcementMessage').value.trim();
    const type = document.getElementById('announcementType').value;
    const expiryDays = parseInt(document.getElementById('announcementExpiry').value);
    
    try {
        const announcementRef = push(ref(database, 'announcements'));
        await set(announcementRef, {
            title: title,
            message: message,
            type: type,
            createdAt: Date.now(),
            createdBy: currentUser.uid,
            expiresAt: expiryDays > 0 ? Date.now() + (expiryDays * 24 * 60 * 60 * 1000) : null,
            active: true
        });
        
        await logAuditAction('announcement_created', null, `Created announcement: ${title}`);
        
        bootstrap.Modal.getInstance(document.getElementById('announcementModal')).hide();
        document.getElementById('announcementForm').reset();
        
        showToast('Announcement published successfully', 'success');
        loadActiveAnnouncements(); // Refresh the list
        
    } catch (error) {
        console.error('Error creating announcement:', error);
        showToast(`Error: ${error.message}`, 'danger');
    }
}

/* ========================================
   System Settings
   ======================================== */

/**
 * Save system settings
 * @param {Event} event - Form submit event
 */
async function saveSystemSettings(event) {
    event.preventDefault();
    
    const settings = {
        allowRegistration: document.getElementById('allowRegistration').checked,
        requireEmailVerification: document.getElementById('requireEmailVerification').checked,
        enableAnalysis: document.getElementById('enableAnalysis').checked,
        enableStockManager: document.getElementById('enableStockManager').checked,
        maxStocksPerUser: parseInt(document.getElementById('maxStocksPerUser').value),
        maxPortfolioItems: parseInt(document.getElementById('maxPortfolioItems').value),
        updatedAt: Date.now(),
        updatedBy: currentUser.uid
    };
    
    try {
        await set(ref(database, 'systemSettings'), settings);
        
        await logAuditAction('settings_updated', null, 'Updated system settings');
        
        bootstrap.Modal.getInstance(document.getElementById('systemSettingsModal')).hide();
        
        showToast('Settings saved successfully', 'success');
        
    } catch (error) {
        console.error('Error saving settings:', error);
        showToast(`Error: ${error.message}`, 'danger');
    }
}

/**
 * Save maintenance mode settings
 * @param {Event} event - Form submit event
 */
async function saveMaintenanceMode(event) {
    event.preventDefault();
    
    const enabled = document.getElementById('enableMaintenanceMode').checked;
    const message = document.getElementById('maintenanceMessage').value.trim();
    const endTime = document.getElementById('estimatedEndTime').value;
    
    try {
        await set(ref(database, 'maintenanceMode'), {
            enabled: enabled,
            message: message || 'We are currently performing scheduled maintenance.',
            estimatedEndTime: endTime ? new Date(endTime).getTime() : null,
            updatedAt: Date.now(),
            updatedBy: currentUser.uid
        });
        
        await logAuditAction('maintenance_mode', null, `Maintenance mode ${enabled ? 'enabled' : 'disabled'}`);
        
        bootstrap.Modal.getInstance(document.getElementById('maintenanceModal')).hide();
        
        showToast(`Maintenance mode ${enabled ? 'enabled' : 'disabled'}`, enabled ? 'warning' : 'success');
        
    } catch (error) {
        console.error('Error updating maintenance mode:', error);
        showToast(`Error: ${error.message}`, 'danger');
    }
}

/* ========================================
   Export & Backup
   ======================================== */

/**
 * Export users to CSV
 */
function exportUsers() {
    if (allUsers.length === 0) {
        showToast('No users to export', 'warning');
        return;
    }
    
    const headers = ['Email', 'Display Name', 'Role', 'Status', 'Created At', 'Last Active'];
    const rows = allUsers.map(user => [
        user.email,
        user.displayName || '',
        user.role || 'user',
        user.status || 'active',
        user.createdAt ? new Date(user.createdAt).toISOString() : '',
        user.lastActive ? new Date(user.lastActive).toISOString() : ''
    ]);
    
    const csvContent = [headers, ...rows]
        .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        .join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `users_export_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    
    showToast('Users exported successfully', 'success');
}

/**
 * Backup all data
 */
async function backupData() {
    showToast('Creating backup...', 'info');
    
    try {
        const snapshot = await get(ref(database));
        
        if (snapshot.exists()) {
            const data = snapshot.val();
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `backup_${new Date().toISOString().split('T')[0]}.json`;
            link.click();
            
            await logAuditAction('backup_created', null, 'Created full database backup');
            
            showToast('Backup created successfully', 'success');
        }
    } catch (error) {
        console.error('Error creating backup:', error);
        showToast(`Error: ${error.message}`, 'danger');
    }
}

/* ========================================
   Event Listeners
   ======================================== */

/**
 * Bind all event listeners
 */
function bindEventListeners() {
    // Search and filters
    document.getElementById('userSearchInput')?.addEventListener('input', debounce(filterUsers, 300));
    document.getElementById('userRoleFilter')?.addEventListener('change', filterUsers);
    document.getElementById('userStatusFilter')?.addEventListener('change', filterUsers);
    
    // Refresh button
    document.getElementById('refreshUsersBtn')?.addEventListener('click', loadUsers);
    
    // Add user form
    document.getElementById('addUserForm')?.addEventListener('submit', addUser);
    
    // Add admin form
    document.getElementById('addAdminForm')?.addEventListener('submit', addAdminAccess);
    
    // Edit user form
    document.getElementById('editUserForm')?.addEventListener('submit', updateUser);
    
    // Generate password button
    document.getElementById('generatePasswordBtn')?.addEventListener('click', () => {
        const password = generatePassword();
        document.getElementById('newUserPassword').value = password;
    });
    
    // User action buttons
    document.getElementById('impersonateUserBtn')?.addEventListener('click', impersonateUser);
    document.getElementById('resetPasswordBtn')?.addEventListener('click', sendResetPassword);
    document.getElementById('toggleUserStatusBtn')?.addEventListener('click', toggleUserStatus);
    document.getElementById('viewUserDataBtn')?.addEventListener('click', viewUserData);
    document.getElementById('deleteUserBtn')?.addEventListener('click', () => {
        const user = allUsers.find(u => u.uid === selectedUserId);
        document.getElementById('deleteConfirmMessage').textContent = 
            `Are you sure you want to delete ${user?.email}?`;
        const modal = new bootstrap.Modal(document.getElementById('deleteConfirmModal'));
        modal.show();
    });
    
    // Delete confirmation
    document.getElementById('deleteConfirmInput')?.addEventListener('input', (e) => {
        const btn = document.getElementById('confirmDeleteBtn');
        btn.disabled = e.target.value !== 'DELETE';
    });
    document.getElementById('confirmDeleteBtn')?.addEventListener('click', deleteUser);
    
    // Delete user data button
    document.getElementById('deleteUserDataBtn')?.addEventListener('click', deleteUserData);
    
    // Stop impersonation
    document.getElementById('stopImpersonationBtn')?.addEventListener('click', stopImpersonation);
    
    // Quick actions
    document.getElementById('exportUsersBtn')?.addEventListener('click', exportUsers);
    document.getElementById('backupDataBtn')?.addEventListener('click', backupData);
    
    // Announcement form
    document.getElementById('announcementForm')?.addEventListener('submit', createAnnouncement);
    
    // System settings form
    document.getElementById('systemSettingsForm')?.addEventListener('submit', saveSystemSettings);
    
    // Maintenance form
    document.getElementById('maintenanceForm')?.addEventListener('submit', saveMaintenanceMode);
    
    // Logout button
    document.getElementById('logoutBtn')?.addEventListener('click', async (e) => {
        e.preventDefault();
        try {
            await auth.signOut();
            window.location.href = '../index.html';
        } catch (error) {
            console.error('Error signing out:', error);
        }
    });
    
    // Audit log filter
    document.getElementById('auditLogFilter')?.addEventListener('change', filterAuditLogs);
    
    // Clear logs button
    document.getElementById('clearLogsBtn')?.addEventListener('click', clearOldLogs);
    
    // Bulk email form
    document.getElementById('bulkEmailForm')?.addEventListener('submit', sendBulkEmail);
    
    // Load settings when modals are shown
    document.getElementById('systemSettingsModal')?.addEventListener('show.bs.modal', loadSystemSettings);
    document.getElementById('maintenanceModal')?.addEventListener('show.bs.modal', loadMaintenanceSettings);
}

/**
 * Clear old audit logs (older than 30 days)
 */
async function clearOldLogs() {
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    
    if (!confirm('Are you sure you want to delete audit logs older than 30 days? This action cannot be undone.')) {
        return;
    }
    
    try {
        showToast('Clearing old logs...', 'info');
        
        const logsRef = ref(database, 'adminLogs');
        const snapshot = await get(logsRef);
        
        if (snapshot.exists()) {
            const logs = snapshot.val();
            const deletePromises = [];
            let deletedCount = 0;
            
            Object.entries(logs).forEach(([logId, log]) => {
                if (log.timestamp && log.timestamp < thirtyDaysAgo) {
                    deletePromises.push(remove(ref(database, `adminLogs/${logId}`)));
                    deletedCount++;
                }
            });
            
            if (deletePromises.length > 0) {
                await Promise.all(deletePromises);
                await logAuditAction('logs_cleared', null, `Cleared ${deletedCount} logs older than 30 days`);
                showToast(`Successfully deleted ${deletedCount} old logs`, 'success');
            } else {
                showToast('No logs older than 30 days found', 'info');
            }
        } else {
            showToast('No audit logs found', 'info');
        }
    } catch (error) {
        console.error('Error clearing logs:', error);
        showToast(`Error: ${error.message}`, 'danger');
    }
}

/**
 * Send bulk email to users
 * Note: Requires backend email service (Firebase Functions with SendGrid/Mailgun)
 * This implementation prepares the data and logs the action
 * @param {Event} event - Form submit event
 */
async function sendBulkEmail(event) {
    event.preventDefault();
    
    const recipients = document.getElementById('emailRecipients').value;
    const subject = document.getElementById('emailSubject').value.trim();
    const body = document.getElementById('emailBody').value.trim();
    
    if (!subject || !body) {
        showToast('Please fill in all required fields', 'warning');
        return;
    }
    
    // Filter users based on recipient selection
    let targetUsers = [];
    switch (recipients) {
        case 'all':
            targetUsers = allUsers.filter(u => u.email);
            break;
        case 'active':
            targetUsers = allUsers.filter(u => u.email && u.status !== 'disabled');
            break;
        case 'admins':
            targetUsers = allUsers.filter(u => u.email && u.role === 'admin');
            break;
    }
    
    if (targetUsers.length === 0) {
        showToast('No users found matching the selected criteria', 'warning');
        return;
    }
    
    try {
        showToast(`Preparing to send email to ${targetUsers.length} users...`, 'info');
        
        // Store email request in database for Cloud Function processing
        // In a production environment, a Cloud Function would listen to this
        // and send emails via SendGrid, Mailgun, or similar service
        const emailRequestRef = push(ref(database, 'emailQueue'));
        await set(emailRequestRef, {
            recipients: recipients,
            recipientEmails: targetUsers.map(u => u.email),
            recipientCount: targetUsers.length,
            subject: subject,
            body: body,
            createdAt: Date.now(),
            createdBy: currentUser.uid,
            createdByEmail: currentUser.email,
            status: 'pending'
        });
        
        await logAuditAction('bulk_email_queued', null, `Queued bulk email to ${targetUsers.length} ${recipients} users: ${subject}`);
        
        // Close modal and reset form
        bootstrap.Modal.getInstance(document.getElementById('bulkEmailModal')).hide();
        document.getElementById('bulkEmailForm').reset();
        
        showToast(`Email queued for ${targetUsers.length} users. Note: Actual sending requires a configured email service (Cloud Functions).`, 'success');
        
    } catch (error) {
        console.error('Error queueing bulk email:', error);
        showToast(`Error: ${error.message}`, 'danger');
    }
}

/**
 * Load system settings into modal
 */
async function loadSystemSettings() {
    try {
        const settingsRef = ref(database, 'systemSettings');
        const snapshot = await get(settingsRef);
        
        if (snapshot.exists()) {
            const settings = snapshot.val();
            
            document.getElementById('allowRegistration').checked = settings.allowRegistration !== false;
            document.getElementById('requireEmailVerification').checked = settings.requireEmailVerification === true;
            document.getElementById('enableAnalysis').checked = settings.enableAnalysis !== false;
            document.getElementById('enableStockManager').checked = settings.enableStockManager !== false;
            document.getElementById('maxStocksPerUser').value = settings.maxStocksPerUser || 100;
            document.getElementById('maxPortfolioItems').value = settings.maxPortfolioItems || 200;
        }
    } catch (error) {
        console.error('Error loading system settings:', error);
    }
}

/**
 * Load maintenance settings into modal
 */
async function loadMaintenanceSettings() {
    try {
        const maintenanceRef = ref(database, 'maintenanceMode');
        const snapshot = await get(maintenanceRef);
        
        if (snapshot.exists()) {
            const settings = snapshot.val();
            
            document.getElementById('enableMaintenanceMode').checked = settings.enabled === true;
            document.getElementById('maintenanceMessage').value = settings.message || '';
            
            if (settings.estimatedEndTime) {
                const date = new Date(settings.estimatedEndTime);
                const localDateTime = date.toISOString().slice(0, 16);
                document.getElementById('estimatedEndTime').value = localDateTime;
            }
        }
    } catch (error) {
        console.error('Error loading maintenance settings:', error);
    }
}

/**
 * Filter audit logs
 */
function filterAuditLogs() {
    const filter = document.getElementById('auditLogFilter').value;
    const rows = document.querySelectorAll('#auditLogsBody tr');
    
    rows.forEach(row => {
        if (filter === 'all') {
            row.style.display = '';
        } else {
            const actionCell = row.querySelector('td:nth-child(3)');
            const actionType = actionCell?.textContent.toLowerCase().replace(/\s/g, '_') || '';
            row.style.display = actionType.includes(filter) ? '' : 'none';
        }
    });
}

/* ========================================
   Utility Functions
   ======================================== */

/**
 * Escape HTML to prevent XSS
 * @param {string} text - Text to escape
 * @returns {string}
 */
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Get user initials from display name or email
 * @param {string} displayName - User display name
 * @param {string} email - User email
 * @returns {string}
 */
function getInitials(displayName, email) {
    // Try display name first
    if (displayName && displayName.trim()) {
        const nameParts = displayName.trim().split(/\s+/);
        if (nameParts.length >= 2) {
            return (nameParts[0][0] + nameParts[1][0]).toUpperCase();
        }
        return displayName.substring(0, 2).toUpperCase();
    }
    
    // Fall back to email
    if (email && email.trim()) {
        const parts = email.split('@')[0].split(/[._-]/);
        if (parts.length >= 2) {
            return (parts[0][0] + parts[1][0]).toUpperCase();
        }
        return email.substring(0, 2).toUpperCase();
    }
    
    // Return user icon if nothing available
    return 'U';
}

/**
 * Format date
 * @param {number} timestamp - Timestamp
 * @param {boolean} includeTime - Include time
 * @returns {string}
 */
function formatDate(timestamp, includeTime = false) {
    if (!timestamp) return 'Never';
    
    const date = new Date(timestamp);
    const options = {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    };
    
    if (includeTime) {
        options.hour = '2-digit';
        options.minute = '2-digit';
    }
    
    return date.toLocaleDateString('en-US', options);
}

/**
 * Get relative time string
 * @param {number} timestamp - Timestamp
 * @returns {string}
 */
function getRelativeTime(timestamp) {
    if (!timestamp) return 'Unknown';
    
    const now = Date.now();
    const diff = now - timestamp;
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    
    return formatDate(timestamp);
}

/**
 * Format action type for display
 * @param {string} action - Action type
 * @returns {string}
 */
function formatActionType(action) {
    const actionMap = {
        'user_created': 'User Created',
        'user_deleted': 'User Deleted',
        'role_changed': 'Role Changed',
        'password_reset': 'Password Reset',
        'impersonation': 'Impersonation',
        'settings_updated': 'Settings Updated',
        'announcement_created': 'Announcement',
        'maintenance_mode': 'Maintenance',
        'backup_created': 'Backup',
        'data_deleted': 'Data Deleted',
        'admin_added': 'Admin Added',
        'admin_removed': 'Admin Removed'
    };
    
    return actionMap[action] || action;
}

/**
 * Get activity icon class
 * @param {string} action - Action type
 * @returns {string}
 */
function getActivityIconClass(action) {
    const classMap = {
        'user_created': 'user-added',
        'user_deleted': 'user-deleted',
        'password_reset': 'password-reset',
        'impersonation': 'impersonation',
        'admin_added': 'user-added',
        'admin_removed': 'user-deleted',
        'login': 'login'
    };
    
    return classMap[action] || 'login';
}

/**
 * Get activity icon
 * @param {string} action - Action type
 * @returns {string}
 */
function getActivityIcon(action) {
    const iconMap = {
        'user_created': 'bi-person-plus',
        'user_deleted': 'bi-person-x',
        'password_reset': 'bi-key',
        'impersonation': 'bi-person-badge',
        'settings_updated': 'bi-sliders',
        'announcement_created': 'bi-megaphone',
        'maintenance_mode': 'bi-tools',
        'backup_created': 'bi-cloud-arrow-up',
        'admin_added': 'bi-shield-plus',
        'admin_removed': 'bi-shield-x'
    };
    
    return iconMap[action] || 'bi-activity';
}

/**
 * Generate random password
 * @returns {string}
 */
function generatePassword() {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%';
    let password = '';
    for (let i = 0; i < 12; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
}

/**
 * Debounce function
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in ms
 * @returns {Function}
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Show toast notification
 * @param {string} message - Toast message
 * @param {string} type - Toast type (success, danger, warning, info)
 */
function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    
    const toastId = `toast-${Date.now()}`;
    const bgClass = {
        success: 'bg-success',
        danger: 'bg-danger',
        warning: 'bg-warning',
        info: 'bg-info'
    }[type] || 'bg-info';
    
    const toastHtml = `
        <div id="${toastId}" class="toast" role="alert" aria-live="assertive" aria-atomic="true">
            <div class="toast-header ${bgClass} text-white">
                <i class="bi ${type === 'success' ? 'bi-check-circle' : type === 'danger' ? 'bi-x-circle' : type === 'warning' ? 'bi-exclamation-triangle' : 'bi-info-circle'} me-2"></i>
                <strong class="me-auto">${type.charAt(0).toUpperCase() + type.slice(1)}</strong>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
            <div class="toast-body">
                ${escapeHtml(message)}
            </div>
        </div>
    `;
    
    container.insertAdjacentHTML('beforeend', toastHtml);
    
    const toastElement = document.getElementById(toastId);
    const toast = new bootstrap.Toast(toastElement, { delay: 4000 });
    toast.show();
    
    toastElement.addEventListener('hidden.bs.toast', () => {
        toastElement.remove();
    });
}
