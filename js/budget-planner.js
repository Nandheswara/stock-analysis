/**
 * Annual Personal Budget Planning & Events Dashboard - Controller
 * 
 * Handles rendering the yearly projections grid, managing CRUD goals/events,
 * presenting line/donut Chart.js analytics, and maintaining consistent auth states.
 */

import { 
    onAuthStateChange,
    signInUser,
    signUpUser,
    signInWithGoogle,
    signOutUser,
    resetPassword,
    initAuthListener
} from './firebase-auth-service.js';

import { 
    saveAnnualBudget,
    saveAnnualEvent,
    deleteAnnualEvent,
    saveAnnualGoal,
    deleteAnnualGoal,
    listenToAnnualData,
    listenToMonthlySnapshots
} from './firebase-finance-service.js';

import { escapeHtml } from './utils.js';

// ========================================
// State & Global Configurations
// ========================================

let currentYear = new Date().getFullYear().toString();
let annualBudgetData = null;
let annualEventsData = {};
let annualGoalsData = {};
let monthlySnapshotsData = {};

let unsubscribeAnnual = null;
let unsubscribeSnapshots = null;

let eventBreakdownChart = null;
let goalsBreakdownChart = null;

let isInitialLoad = true;
let eventToDeleteId = null;
let goalToDeleteId = null;

// Month mappings
const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const FULL_MONTH_NAMES = {
    "Jan": "January", "Feb": "February", "Mar": "March", "Apr": "April",
    "May": "May", "Jun": "June", "Jul": "July", "Aug": "August",
    "Sep": "September", "Oct": "October", "Nov": "November", "Dec": "December"
};

// ========================================
// Initialization & Auth Listener
// ========================================

document.addEventListener('DOMContentLoaded', () => {
    initAuthListener();
    initAuthUI();
    initYearNavigator();
    setupFormHandlers();
    initEncryptionBanner();

    // Redraw charts when the global theme is changed
    window.addEventListener('themechanged', () => {
        if (typeof renderCharts === 'function') {
            setTimeout(() => {
                renderCharts();
            }, 50);
        }
    });
});

function initAuthUI() {
    const authStateUnauth = document.getElementById('unauthenticatedState');
    const authStateAuth = document.getElementById('authenticatedState');
    const authLoadingSpinner = document.getElementById('authLoadingSpinner');
    const gateLoginBtn = document.getElementById('gateLoginBtn');

    onAuthStateChange((user) => {
        if (authLoadingSpinner) authLoadingSpinner.style.display = 'none';

        if (user) {
            if (authStateUnauth) authStateUnauth.style.display = 'none';
            if (authStateAuth) authStateAuth.style.display = 'block';
            
            // Start listeners
            isInitialLoad = true;
            setupSync();
        } else {
            if (authStateUnauth) authStateUnauth.style.display = 'block';
            if (authStateAuth) authStateAuth.style.display = 'none';
            cleanupSync();
        }
    });

    // Gate login click
    if (gateLoginBtn) {
        gateLoginBtn.addEventListener('click', (e) => {
            e.preventDefault();
            showAuthModal('login');
        });
    }

    // Bind navbar login / signup / logout triggers
    const bindNavbarElements = () => {
        document.getElementById('loginBtn')?.addEventListener('click', (e) => {
            e.preventDefault();
            showAuthModal('login');
        });

        document.getElementById('signupBtn')?.addEventListener('click', (e) => {
            e.preventDefault();
            showAuthModal('signup');
        });

        document.getElementById('logoutBtn')?.addEventListener('click', async (e) => {
            e.preventDefault();
            await signOutUser();
            showToast('Logged out successfully', 'success');
        });
    };

    if (document.getElementById('loginBtn')) {
        bindNavbarElements();
    } else {
        document.addEventListener('layoutReady', bindNavbarElements);
    }

    // Modal sub-elements togglers (login <-> signup <-> forgot password)
    document.getElementById('showSignupForm')?.addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('loginForm').style.display = 'none';
        document.getElementById('signupForm').style.display = 'block';
        document.getElementById('authModalTitle').textContent = 'Create Account';
    });

    document.getElementById('showLoginForm')?.addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('loginForm').style.display = 'block';
        document.getElementById('signupForm').style.display = 'none';
        document.getElementById('authModalTitle').textContent = 'Sign In';
    });

    document.getElementById('forgotPasswordLink')?.addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('loginForm').style.display = 'none';
        document.getElementById('forgotPasswordForm').style.display = 'block';
        document.getElementById('authModalTitle').textContent = 'Reset Password';
    });

    document.getElementById('backToLoginBtn')?.addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('forgotPasswordForm').style.display = 'none';
        document.getElementById('loginForm').style.display = 'block';
        document.getElementById('authModalTitle').textContent = 'Sign In';
    });
}

function showAuthModal(view = 'login') {
    if (typeof bootstrap === 'undefined') {
        console.error('Bootstrap not loaded');
        return;
    }
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    const forgotPasswordForm = document.getElementById('forgotPasswordForm');
    const title = document.getElementById('authModalTitle');

    document.getElementById('authAlertContainer').innerHTML = '';

    if (view === 'login') {
        if (loginForm) loginForm.style.display = 'block';
        if (signupForm) signupForm.style.display = 'none';
        if (forgotPasswordForm) forgotPasswordForm.style.display = 'none';
        if (title) title.textContent = 'Sign In';
    } else {
        if (loginForm) loginForm.style.display = 'none';
        if (signupForm) signupForm.style.display = 'block';
        if (forgotPasswordForm) forgotPasswordForm.style.display = 'none';
        if (title) title.textContent = 'Create Account';
    }

    const modalEl = document.getElementById('authModal');
    if (modalEl) {
        const modal = new bootstrap.Modal(modalEl);
        modal.show();
    }
}

function setupSync() {
    cleanupSync();

    // Listen to annual goals, events, and milestones
    unsubscribeAnnual = listenToAnnualData(currentYear, ({ budget, events, goals }) => {
        annualBudgetData = budget;
        annualEventsData = events || {};
        annualGoalsData = goals || {};
        updateAndRender();
    });

    // Listen to monthly snapshots
    unsubscribeSnapshots = listenToMonthlySnapshots((snapshots) => {
        monthlySnapshotsData = snapshots || {};
        updateAndRender();
    });
}

function cleanupSync() {
    if (unsubscribeAnnual) {
        unsubscribeAnnual();
        unsubscribeAnnual = null;
    }
    if (unsubscribeSnapshots) {
        unsubscribeSnapshots();
        unsubscribeSnapshots = null;
    }
}

// ========================================
// Year Navigation
// ========================================

function initYearNavigator() {
    const prevYearBtn = document.getElementById('prevYearBtn');
    const nextYearBtn = document.getElementById('nextYearBtn');
    const yearDisplay = document.getElementById('yearDisplay');

    if (yearDisplay) yearDisplay.textContent = currentYear;

    if (prevYearBtn) {
        prevYearBtn.addEventListener('click', () => {
            currentYear = (parseInt(currentYear) - 1).toString();
            if (yearDisplay) yearDisplay.textContent = currentYear;
            setupSync();
        });
    }

    if (nextYearBtn) {
        nextYearBtn.addEventListener('click', () => {
            currentYear = (parseInt(currentYear) + 1).toString();
            if (yearDisplay) yearDisplay.textContent = currentYear;
            setupSync();
        });
    }
}

// ========================================
// Calculations & Render Engine
// ========================================

function updateAndRender() {
    renderKPIs();
    renderYearlyGoals();
    renderEventsTimeline();
    renderCharts();
    isInitialLoad = false;
}

/**
 * Format Currency (Indian format: ₹ Lakhs/Crores local formatting)
 */
function formatCurrency(amount) {
    if (amount === undefined || amount === null || isNaN(amount)) return '₹0';
    return '₹' + Math.abs(amount).toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

function renderKPIs() {
    const incomeGoal = annualBudgetData?.incomeGoal || 0;
    const savingsRate = annualBudgetData?.savingsGoalRate || 0;
    
    // 1. Annual Income Target
    const incomeMode = annualBudgetData?.incomeMode || 'fetch';
    let totalIncomeYear = 0;
    
    if (incomeMode === 'manual') {
        totalIncomeYear = parseFloat(annualBudgetData?.manualIncomeValue || 0);
    } else {
        if (monthlySnapshotsData) {
            Object.entries(monthlySnapshotsData).forEach(([monthKey, snap]) => {
                if (monthKey.startsWith(currentYear)) {
                    totalIncomeYear += parseFloat(snap.income || 0);
                }
            });
        }
    }
    const completionPercent = incomeGoal > 0 ? Math.round((totalIncomeYear / incomeGoal) * 100) : 0;
    document.getElementById('annualIncomeGoalValue').textContent = formatCurrency(incomeGoal);
    document.getElementById('annualSavingsRateText').textContent = `${formatCurrency(totalIncomeYear)} YTD (${completionPercent}% achieved)`;

    // 2. Yearly Goals Tracked
    const goals = Object.values(annualGoalsData || {});
    const totalGoals = goals.length;
    const completedGoals = goals.filter(g => {
        const target = parseFloat(g.targetAmount) || 1;
        const current = parseFloat(g.currentAmount) || 0;
        return g.status === 'Achieved' || current >= target;
    }).length;
    const completionRate = totalGoals > 0 ? Math.round((completedGoals / totalGoals) * 100) : 0;

    document.getElementById('totalGoalsValue').textContent = totalGoals;
    document.getElementById('goalsStatusSummary').textContent = `${completedGoals} Completed`;

    // 3. Goal Completion Rate
    document.getElementById('goalsCompletionRateValue').textContent = `${completionRate}%`;
    document.getElementById('goalsCompletionSubtext').textContent = `${completedGoals} of ${totalGoals} achieved`;

    // 4. Event Funding Required
    let totalEventCost = 0;
    let scheduledEventsCount = 0;
    if (annualEventsData) {
        Object.values(annualEventsData).forEach(ev => {
            totalEventCost += parseFloat(ev.estimatedCost || 0);
            scheduledEventsCount++;
        });
    }
    document.getElementById('eventFundingNeededValue').textContent = formatCurrency(totalEventCost);
    document.getElementById('eventSummaryText').textContent = `${scheduledEventsCount} Scheduled Event${scheduledEventsCount === 1 ? '' : 's'}`;

    // 5. Yearly Expenses So Far
    const expenseMode = annualBudgetData?.expenseMode || 'fetch';
    let totalExpensesYear = 0;
    let monthsWithLogsCount = 0;
    
    if (expenseMode === 'manual') {
        totalExpensesYear = parseFloat(annualBudgetData?.manualExpenseValue || 0);
    } else {
        if (monthlySnapshotsData) {
            Object.entries(monthlySnapshotsData).forEach(([monthKey, snap]) => {
                if (monthKey.startsWith(currentYear)) {
                    totalExpensesYear += parseFloat(snap.totalExpenses || 0);
                    if (parseFloat(snap.totalExpenses || 0) > 0) {
                        monthsWithLogsCount++;
                    }
                }
            });
        }
    }
    
    const expensesValEl = document.getElementById('yearlyExpensesValue');
    const expensesSubEl = document.getElementById('yearlyExpensesSubtext');
    if (expensesValEl) expensesValEl.textContent = formatCurrency(totalExpensesYear);
    if (expensesSubEl) {
        expensesSubEl.textContent = expenseMode === 'manual' 
            ? `Logged for ${currentYear}` 
            : `${monthsWithLogsCount} month${monthsWithLogsCount === 1 ? '' : 's'} logged in ${currentYear}`;
    }
}



function renderYearlyGoals() {
    const container = document.getElementById('goalsContainer');
    if (!container) return;

    container.innerHTML = '';
    const goals = Object.values(annualGoalsData);

    if (goals.length === 0) {
        container.innerHTML = `
            <div class="text-center py-5 text-secondary grid-full-width">
                <i class="bi bi-trophy" style="font-size: 2.5rem; display:block;" class="mb-2"></i>
                No yearly goals configured yet. Click 'Add Goal' to create one!
            </div>
        `;
        return;
    }

    // Sort: In Progress first, Achieved last
    goals.sort((a, b) => {
        if (a.status === 'Achieved' && b.status !== 'Achieved') return 1;
        if (a.status !== 'Achieved' && b.status === 'Achieved') return -1;
        return a.name.localeCompare(b.name);
    });

    goals.forEach(goal => {
        const target = parseFloat(goal.targetAmount) || 1;
        const current = parseFloat(goal.currentAmount) || 0;
        const percent = Math.min(100, Math.round((current / target) * 100));
        const isAchieved = goal.status === 'Achieved' || percent >= 100;
        const itemClass = isAchieved ? 'goal-item achieved' : 'goal-item';

        const div = document.createElement('div');
        div.className = itemClass;
        div.innerHTML = `
            <div class="goal-header">
                <h5 class="goal-title">${escapeHtml(goal.name)}</h5>
                <span class="goal-percentage">${percent}%</span>
            </div>
            <div class="goal-progress-bar-wrapper">
                <div class="goal-progress-bar" style="width: ${percent}%;"></div>
            </div>
            <div class="goal-footer">
                <div class="d-flex align-items-center gap-2">
                    <span class="goal-category-badge">${escapeHtml(goal.category)}</span>
                    <span class="text-muted" style="font-size:0.75rem;">${formatCurrency(current)} / ${formatCurrency(target)}</span>
                </div>
                <div class="d-flex gap-1">
                    <button class="btn-icon-only btn-sm" onclick="openEditGoalModal('${goal.id}')" title="Edit Goal Progress">
                        <i class="bi bi-pencil-square" style="font-size:0.75rem;"></i>
                    </button>
                    <button class="btn-icon-only btn-icon-danger btn-sm" onclick="confirmDeleteGoal('${goal.id}')" title="Delete Goal">
                        <i class="bi bi-trash" style="font-size:0.75rem;"></i>
                    </button>
                </div>
            </div>
        `;
        container.appendChild(div);
    });
}

function renderEventsTimeline() {
    const container = document.getElementById('timelineEventsContainer');
    if (!container) return;

    container.innerHTML = '';
    
    // Sort events by month order
    const events = Object.values(annualEventsData);
    
    if (events.length === 0) {
        container.classList.add('empty-timeline');
        container.innerHTML = `
            <div class="text-center py-5 text-secondary">
                <i class="bi bi-calendar-x" style="font-size: 2.5rem; display:block;" class="mb-2"></i>
                No events planned for ${currentYear}. Click 'Add Event' to schedule.
            </div>
        `;
        return;
    }

    container.classList.remove('empty-timeline');

    events.sort((a, b) => {
        return MONTH_NAMES.indexOf(a.month) - MONTH_NAMES.indexOf(b.month);
    });

    events.forEach(ev => {
        const statusClass = `status-${(ev.status || 'Planned').toLowerCase()}`;
        let statusBadgeClass = 'badge bg-secondary';
        
        if (ev.status === 'Paid') statusBadgeClass = 'badge bg-success';
        else if (ev.status === 'Confirmed') statusBadgeClass = 'badge bg-info text-dark';
        else if (ev.status === 'Planned') statusBadgeClass = 'badge bg-primary';
        else if (ev.status === 'Postponed') statusBadgeClass = 'badge bg-warning text-dark';
        else if (ev.status === 'Unplanned') statusBadgeClass = 'badge bg-secondary';

        const div = document.createElement('div');
        div.className = `timeline-item ${statusClass}`;
        div.innerHTML = `
            <div class="timeline-marker">
                <i class="bi bi-calendar-event"></i>
            </div>
            <div class="timeline-content">
                <div class="timeline-header">
                    <h5 class="timeline-title">${ev.name}</h5>
                    <span class="timeline-cost" title="Estimated Cost">
                        ${formatCurrency(ev.estimatedCost)}
                    </span>
                </div>
                <div class="timeline-meta">
                    <div class="d-flex align-items-center gap-2 flex-wrap">
                        <span class="timeline-date-badge">${FULL_MONTH_NAMES[ev.month]}</span>
                        <span class="${statusBadgeClass}">${ev.status || 'Planned'}</span>
                    </div>
                    <div class="d-flex gap-1 ms-auto">
                        <button class="btn-icon-only btn-sm" onclick="openEditEventModal('${ev.id}')" title="Edit Event">
                            <i class="bi bi-pencil-square" style="font-size:0.75rem;"></i>
                        </button>
                        <button class="btn-icon-only btn-icon-danger btn-sm" onclick="confirmDeleteEvent('${ev.id}')" title="Delete Event">
                            <i class="bi bi-trash" style="font-size:0.75rem;"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
        container.appendChild(div);
    });
}

function renderCharts() {
    const textColor = getComputedStyle(document.body).getPropertyValue('--text-primary').trim() || '#e2e8f0';
    const gridColor = getComputedStyle(document.body).getPropertyValue('--border-color').trim() || '#1e293b';
    // Events timeline monthly cost bar chart
    const eventCtx = document.getElementById('eventBreakdownChart');
    if (eventCtx) {
        if (eventBreakdownChart) eventBreakdownChart.destroy();
        
        const monthlyCosts = {
            "Jan": 0, "Feb": 0, "Mar": 0, "Apr": 0, "May": 0, "Jun": 0,
            "Jul": 0, "Aug": 0, "Sep": 0, "Oct": 0, "Nov": 0, "Dec": 0
        };
        
        let hasEvents = false;
        if (annualEventsData) {
            Object.values(annualEventsData).forEach(ev => {
                const month = ev.month || 'Jan';
                const cost = parseFloat(ev.estimatedCost || 0);
                if (monthlyCosts[month] !== undefined) {
                    monthlyCosts[month] += cost;
                    if (cost > 0) hasEvents = true;
                }
            });
        }
        
        const chartMonths = Object.keys(monthlyCosts);
        const chartData = Object.values(monthlyCosts);
        
        eventBreakdownChart = new Chart(eventCtx, {
            type: 'bar',
            data: {
                labels: chartMonths,
                datasets: [{
                    label: 'Event Cost',
                    data: chartData,
                    backgroundColor: '#22d3ee',
                    borderRadius: 4,
                    maxBarThickness: 25
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: (ctx) => `Cost: ${formatCurrency(ctx.raw)}`
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: { color: textColor, font: { family: 'Inter', size: 10 } }
                    },
                    y: {
                        grid: { color: gridColor },
                        ticks: { color: textColor, font: { family: 'Inter', size: 10 } }
                    }
                }
            }
        });
    }

    // Goals breakdown horizontal bar chart
    const goalsCtx = document.getElementById('goalsBreakdownChart');
    if (goalsCtx) {
        if (goalsBreakdownChart) goalsBreakdownChart.destroy();
        
        const goals = Object.values(annualGoalsData || {});
        const labels = goals.map(g => g.name || 'Unnamed');
        const targets = goals.map(g => parseFloat(g.targetAmount || 0));
        const currents = goals.map(g => parseFloat(g.currentAmount || 0));
        
        const hasGoals = goals.length > 0;
        
        goalsBreakdownChart = new Chart(goalsCtx, {
            type: 'bar',
            data: {
                labels: hasGoals ? labels : ['No Goals Configured'],
                datasets: [
                    {
                        label: 'Current Savings',
                        data: hasGoals ? currents : [0],
                        backgroundColor: '#34d399',
                        borderRadius: 4,
                        maxBarThickness: 25
                    },
                    {
                        label: 'Target Amount',
                        data: hasGoals ? targets : [1],
                        backgroundColor: 'rgba(129, 140, 248, 0.25)',
                        borderColor: '#818cf8',
                        borderWidth: 1.5,
                        borderRadius: 4,
                        maxBarThickness: 25
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                indexAxis: 'y',
                plugins: {
                    legend: {
                        position: 'top',
                        labels: { color: textColor, font: { family: 'Inter', size: 11 }, usePointStyle: true }
                    },
                    tooltip: {
                        callbacks: {
                            label: (ctx) => {
                                return `${ctx.dataset.label}: ${formatCurrency(ctx.raw)}`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { color: gridColor },
                        ticks: { color: textColor, font: { family: 'Inter', size: 10 } }
                    },
                    y: {
                        grid: { display: false },
                        ticks: { color: textColor, font: { family: 'Inter', size: 10 } }
                    }
                }
            }
        });
    }
}

// ========================================
// Form & Dialog Submission Handlers
// ========================================

function setupFormHandlers() {
    // A. Navbar Auth Submissions & Handlers
    const loginFormSubmit = document.getElementById('loginForm');
    if (loginFormSubmit) {
        loginFormSubmit.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('loginEmail').value;
            const password = document.getElementById('loginPassword').value;
            const submitBtn = loginFormSubmit.querySelector('button[type="submit"]');
            const originalBtnText = submitBtn?.innerHTML;

            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Signing in...';
            }
            try {
                const result = await signInUser(email, password);
                if (result.success) {
                    const modalEl = document.getElementById('authModal');
                    const modal = bootstrap.Modal.getInstance(modalEl);
                    if (modal) modal.hide();
                    showToast('Welcome back!', 'success');
                } else {
                    document.getElementById('authAlertContainer').innerHTML = `<div class="alert alert-danger py-2">${escapeHtml(result.error || 'Sign-in failed')}</div>`;
                }
            } finally {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = originalBtnText;
                }
            }
        });
    }

    const signupFormSubmit = document.getElementById('signupForm');
    if (signupFormSubmit) {
        signupFormSubmit.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('signupName').value;
            const email = document.getElementById('signupEmail').value;
            const password = document.getElementById('signupPassword').value;
            const confirm = document.getElementById('signupConfirmPassword').value;

            if (password !== confirm) {
                document.getElementById('authAlertContainer').innerHTML = '<div class="alert alert-danger py-2">Passwords do not match</div>';
                return;
            }

            const submitBtn = signupFormSubmit.querySelector('button[type="submit"]');
            const originalBtnText = submitBtn?.innerHTML;

            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Creating account...';
            }

            try {
                const result = await signUpUser(email, password, name);
                if (result.success) {
                    const modalEl = document.getElementById('authModal');
                    const modal = bootstrap.Modal.getInstance(modalEl);
                    if (modal) modal.hide();
                    showToast('Account created successfully!', 'success');
                } else {
                    document.getElementById('authAlertContainer').innerHTML = `<div class="alert alert-danger py-2">${escapeHtml(result.error || 'Sign-up failed')}</div>`;
                }
            } finally {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = originalBtnText;
                }
            }
        });
    }

    // Google Sign in triggers
    const googleBtn = document.getElementById('googleSignInBtn');
    const googleUpBtn = document.getElementById('googleSignUpBtn');

    const handleGoogleAuth = async (e) => {
        const btn = e ? e.currentTarget : null;
        const originalHtml = btn ? btn.innerHTML : '';
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Connecting...';
        }
        try {
            const result = await signInWithGoogle();
            if (result.success) {
                const modalEl = document.getElementById('authModal');
                const modal = bootstrap.Modal.getInstance(modalEl);
                if (modal) modal.hide();
                showToast('Successfully authenticated with Google!', 'success');
            } else {
                document.getElementById('authAlertContainer').innerHTML = `<div class="alert alert-danger py-2">${escapeHtml(result.error || 'Google connection failed')}</div>`;
            }
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = originalHtml;
            }
        }
    };

    if (googleBtn) googleBtn.addEventListener('click', handleGoogleAuth);
    if (googleUpBtn) googleUpBtn.addEventListener('click', handleGoogleAuth);

    // Forgot password link triggers
    document.getElementById('sendResetEmailBtn')?.addEventListener('click', async () => {
        const email = document.getElementById('resetEmail').value;
        if (!email) {
            document.getElementById('authAlertContainer').innerHTML = '<div class="alert alert-danger py-2">Please enter an email address</div>';
            return;
        }
        const result = await resetPassword(email);
        const container = document.getElementById('authAlertContainer');
        if (result.success) {
            container.innerHTML = `<div class="alert alert-success py-2">${escapeHtml(result.message || 'Password reset link sent!')}</div>`;
        } else {
            container.innerHTML = `<div class="alert alert-danger py-2">${escapeHtml(result.error || 'Reset failed')}</div>`;
        }
    });

    // 1. Edit targets goal form
    const editGoalsForm = document.getElementById('editAnnualGoalForm');
    if (editGoalsForm) {
        editGoalsForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const incomeGoal = parseFloat(document.getElementById('annualIncomeGoalInput').value) || 0;
            const incomeMode = document.getElementById('incomeSourceSelect').value || 'fetch';
            const manualIncomeValue = parseFloat(document.getElementById('manualIncomeInput').value) || 0;
            
            const updatedBudget = {
                ...annualBudgetData,
                incomeGoal,
                incomeMode,
                manualIncomeValue,
                savingsGoalRate: 0
            };

            const result = await saveAnnualBudget(currentYear, updatedBudget);
            if (result.success) {
                const modalEl = document.getElementById('editAnnualGoalModal');
                const modal = bootstrap.Modal.getInstance(modalEl);
                if (modal) modal.hide();
                showToast('Yearly targets updated!', 'success');
            } else {
                const alertContainer = document.getElementById('annualGoalAlert');
                if (alertContainer) {
                    alertContainer.innerHTML = `<div class="alert alert-danger py-2">${result.error}</div>`;
                }
            }
        });
    }

    const editExpensesForm = document.getElementById('editYearlyExpensesForm');
    if (editExpensesForm) {
        editExpensesForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const expenseMode = document.getElementById('expenseSourceSelect').value || 'fetch';
            const manualExpenseValue = parseFloat(document.getElementById('manualExpenseInput').value) || 0;
            
            const updatedBudget = {
                ...annualBudgetData,
                expenseMode,
                manualExpenseValue
            };

            const result = await saveAnnualBudget(currentYear, updatedBudget);
            if (result.success) {
                const modalEl = document.getElementById('editYearlyExpensesModal');
                const modal = bootstrap.Modal.getInstance(modalEl);
                if (modal) modal.hide();
                showToast('Yearly expenses settings saved!', 'success');
            } else {
                const alertContainer = document.getElementById('yearlyExpensesAlert');
                if (alertContainer) {
                    alertContainer.innerHTML = `<div class="alert alert-danger py-2">${result.error}</div>`;
                }
            }
        });
    }

    // 3. Add/Edit event form
    const eventForm = document.getElementById('eventForm');
    if (eventForm) {
        eventForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const eventId = document.getElementById('eventIdInput').value || null;
            
            const eventData = {
                name: document.getElementById('eventNameInput').value.trim(),
                month: document.getElementById('eventMonthInput').value,
                category: 'Other',
                estimatedCost: parseFloat(document.getElementById('eventEstInput').value) || 0,
                actualCost: 0,
                status: document.getElementById('eventStatusInput').value
            };

            try {
                const result = await saveAnnualEvent(currentYear, eventId, eventData);
                if (result.success) {
                    const modalEl = document.getElementById('eventModal');
                    const modal = bootstrap.Modal.getInstance(modalEl);
                    if (modal) modal.hide();
                    showToast(eventId ? 'Event updated!' : 'Event scheduled!', 'success');
                } else {
                    showToast(`Failed to save event: ${result.error}`, 'error');
                }
            } catch (err) {
                showToast(`An error occurred: ${err.message}`, 'error');
            }
        });
    }

    // 4. Confirm Delete Event click
    const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
    if (confirmDeleteBtn) {
        confirmDeleteBtn.addEventListener('click', async () => {
            if (eventToDeleteId) {
                try {
                    const result = await deleteAnnualEvent(currentYear, eventToDeleteId);
                    if (result.success) {
                        const modalEl = document.getElementById('deleteConfirmModal');
                        const modal = bootstrap.Modal.getInstance(modalEl);
                        if (modal) modal.hide();
                        showToast('Event deleted successfully', 'success');
                    } else {
                        showToast(`Failed to delete event: ${result.error}`, 'error');
                    }
                } catch (err) {
                    showToast(`Error deleting event: ${err.message}`, 'error');
                }
                eventToDeleteId = null;
            }
        });
    }

    // 5. Add/Edit Yearly Goal form
    const goalFormSubmit = document.getElementById('goalForm');
    if (goalFormSubmit) {
        goalFormSubmit.addEventListener('submit', async (e) => {
            e.preventDefault();
            const goalId = document.getElementById('goalIdInput').value || null;
            const target = parseFloat(document.getElementById('goalTargetInput').value) || 1;
            const current = parseFloat(document.getElementById('goalCurrentInput').value) || 0;
            
            const goalData = {
                name: document.getElementById('goalNameInput').value.trim(),
                targetAmount: target,
                currentAmount: current,
                category: document.getElementById('goalCategoryInput').value,
                status: (current >= target) ? 'Achieved' : 'In Progress'
            };

            try {
                const result = await saveAnnualGoal(currentYear, goalId, goalData);
                if (result.success) {
                    const modalEl = document.getElementById('goalModal');
                    const modal = bootstrap.Modal.getInstance(modalEl);
                    if (modal) modal.hide();
                    showToast(goalId ? 'Goal updated!' : 'Goal created!', 'success');
                } else {
                    showToast(`Failed to save goal: ${result.error}`, 'error');
                }
            } catch (err) {
                showToast(`An error occurred: ${err.message}`, 'error');
            }
        });
    }

    // 6. Confirm Delete Goal click
    const confirmDeleteGoalBtn = document.getElementById('confirmDeleteGoalBtn');
    if (confirmDeleteGoalBtn) {
        confirmDeleteGoalBtn.addEventListener('click', async () => {
            if (goalToDeleteId) {
                const result = await deleteAnnualGoal(currentYear, goalToDeleteId);
                if (result.success) {
                    const modalEl = document.getElementById('deleteGoalConfirmModal');
                    const modal = bootstrap.Modal.getInstance(modalEl);
                    if (modal) modal.hide();
                    showToast('Goal deleted successfully', 'success');
                }
                goalToDeleteId = null;
            }
        });
    }
}

// ========================================
// Toast Notifications
// ========================================

function showToast(message, type = 'info') {
    let container = document.getElementById('financeToastContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'financeToastContainer';
        container.className = 'finance-toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `finance-toast ${type}`;
    const icons = { success: 'bi-check-circle', error: 'bi-x-circle', info: 'bi-info-circle', warning: 'bi-exclamation-triangle' };
    toast.innerHTML = `<i class="bi ${icons[type] || icons.info}"></i> ${escapeHtml(message)}`;
    container.appendChild(toast);
    
    // Trigger transition entry
    setTimeout(() => toast.classList.add('show'), 10);

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
    
    return toast;
}

// ========================================
// Encryption Banner
// ========================================

function initEncryptionBanner() {
    const banner = document.getElementById('encryptionBanner');
    const closeBtn = document.getElementById('closeEncryptionBanner');
    if (!banner || !closeBtn) return;

    try {
        if (sessionStorage.getItem('encryptionBannerDismissed') === '1') {
            banner.style.display = 'none';
        }
    } catch (e) {
        // Ignore sessionStorage error
    }

    closeBtn.addEventListener('click', () => {
        banner.style.display = 'none';
        try {
            sessionStorage.setItem('encryptionBannerDismissed', '1');
        } catch (e) {
            // Ignore sessionStorage error
        }
    });
}

// ========================================
// Modal View Triggers (Bound to window scope)
// ========================================

window.toggleIncomeSourceField = function() {
    const select = document.getElementById('incomeSourceSelect');
    const container = document.getElementById('manualIncomeFieldContainer');
    const input = document.getElementById('manualIncomeInput');
    if (!select || !container || !input) return;
    const source = select.value;
    if (source === 'manual') {
        container.style.display = 'block';
        input.required = true;
    } else {
        container.style.display = 'none';
        input.required = false;
    }
};

window.toggleExpenseSourceField = function() {
    const select = document.getElementById('expenseSourceSelect');
    const container = document.getElementById('manualExpenseFieldContainer');
    const input = document.getElementById('manualExpenseInput');
    if (!select || !container || !input) return;
    const source = select.value;
    if (source === 'manual') {
        container.style.display = 'block';
        input.required = true;
    } else {
        container.style.display = 'none';
        input.required = false;
    }
};

window.openEditAnnualGoalModal = function() {
    const modalEl = document.getElementById('editAnnualGoalModal');
    if (!modalEl) return;

    document.getElementById('annualGoalAlert').innerHTML = '';
    document.getElementById('annualIncomeGoalInput').value = annualBudgetData?.incomeGoal || 0;
    
    const incomeMode = annualBudgetData?.incomeMode || 'fetch';
    document.getElementById('incomeSourceSelect').value = incomeMode;
    document.getElementById('manualIncomeInput').value = annualBudgetData?.manualIncomeValue || 0;
    
    window.toggleIncomeSourceField();

    const modal = new bootstrap.Modal(modalEl);
    modal.show();
};

window.openEditYearlyExpensesModal = function() {
    const modalEl = document.getElementById('editYearlyExpensesModal');
    if (!modalEl) return;

    document.getElementById('yearlyExpensesAlert').innerHTML = '';
    
    const expenseMode = annualBudgetData?.expenseMode || 'fetch';
    document.getElementById('expenseSourceSelect').value = expenseMode;
    document.getElementById('manualExpenseInput').value = annualBudgetData?.manualExpenseValue || 0;
    
    window.toggleExpenseSourceField();

    const modal = new bootstrap.Modal(modalEl);
    modal.show();
};



window.openAddEventModal = function() {
    const modalEl = document.getElementById('eventModal');
    if (!modalEl) return;

    document.getElementById('eventModalTitle').innerHTML = '<i class="bi bi-calendar-plus"></i> Add Annual Event';
    document.getElementById('eventIdInput').value = '';
    document.getElementById('eventForm').reset();
    document.getElementById('eventStatusInput').value = 'Planned';

    const modal = new bootstrap.Modal(modalEl);
    modal.show();
};

window.openEditEventModal = function(eventId) {
    const modalEl = document.getElementById('eventModal');
    const ev = annualEventsData[eventId];
    if (!modalEl || !ev) return;

    document.getElementById('eventModalTitle').innerHTML = '<i class="bi bi-pencil-square"></i> Edit Annual Event';
    document.getElementById('eventIdInput').value = eventId;
    
    document.getElementById('eventNameInput').value = ev.name || '';
    document.getElementById('eventMonthInput').value = ev.month || 'Jan';
    document.getElementById('eventEstInput').value = ev.estimatedCost || 0;
    document.getElementById('eventStatusInput').value = ev.status || 'Planned';

    const modal = new bootstrap.Modal(modalEl);
    modal.show();
};

window.confirmDeleteEvent = function(eventId) {
    const modalEl = document.getElementById('deleteConfirmModal');
    if (!modalEl) return;

    eventToDeleteId = eventId;
    const modal = new bootstrap.Modal(modalEl);
    modal.show();
};

window.openAddGoalModal = function() {
    const modalEl = document.getElementById('goalModal');
    if (!modalEl) return;

    document.getElementById('goalModalTitle').innerHTML = '<i class="bi bi-trophy"></i> Add Yearly Goal';
    document.getElementById('goalIdInput').value = '';
    document.getElementById('goalForm').reset();
    document.getElementById('goalCategoryInput').value = 'Savings';

    const modal = new bootstrap.Modal(modalEl);
    modal.show();
};

window.openEditGoalModal = function(goalId) {
    const modalEl = document.getElementById('goalModal');
    const goal = annualGoalsData[goalId];
    if (!modalEl || !goal) return;

    document.getElementById('goalModalTitle').innerHTML = '<i class="bi bi-pencil-square"></i> Edit Yearly Goal';
    document.getElementById('goalIdInput').value = goalId;
    
    document.getElementById('goalNameInput').value = goal.name || '';
    document.getElementById('goalTargetInput').value = goal.targetAmount || 1;
    document.getElementById('goalCurrentInput').value = goal.currentAmount || 0;
    document.getElementById('goalCategoryInput').value = goal.category || 'Savings';

    const modal = new bootstrap.Modal(modalEl);
    modal.show();
};

window.confirmDeleteGoal = function(goalId) {
    const modalEl = document.getElementById('deleteGoalConfirmModal');
    if (!modalEl) return;

    goalToDeleteId = goalId;
    const modal = new bootstrap.Modal(modalEl);
    modal.show();
};
