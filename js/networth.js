/**
 * Net Worth Tracker – Page Controller
 *
 * Responsibilities:
 *  - Auth gate: redirect when not logged in
 *  - User consent flow before any bank data is accessed (stored in Firebase per user)
 *  - Load transactions (demo or live) and render all UI sections
 *  - Monthly income/expense bar chart (Chart.js)
 *  - Category breakdown doughnut chart (Chart.js)
 *  - Transaction table with search + filter
 *  - Financial health score widget
 *  - Personalised suggestion cards
 *  - Revoke consent / disconnect bank
 *
 * @module networth
 */

import {
    initAuthListener,
    onAuthStateChange,
    signOutUser,
    getCurrentUser,
    getUserDetails,
    isAuthenticated,
    signUpUser,
    signInUser,
    signInWithGoogle,
    resetPassword,
} from './firebase-auth-service.js';

import {
    generateDemoTransactions,
    categoriseTransaction,
    buildMonthlySummary,
    buildCategoryBreakdown,
    computeHealthScore,
    generateSuggestions,
    saveConsentToFirebase,
    updateConsentInFirebase,
    getConsentsFromFirebase,
    revokeConsentInFirebase,
    saveTransactionsToFirebase,
    getTransactionsFromFirebase,
    clearTransactionsFromFirebase,
    buildWebviewUrl,
    authenticateFIU,
    createConsentRequest,
    fetchConsentStatus,
    createFISession,
    fetchFIData,
    isFIUConfigured,
    FINVU_FIU_ENTITY_ID,
} from './finvu-service.js';

/* ========================================
   Module-level state
   ======================================== */

let currentUser   = null;
let allTxns       = [];        // all loaded transactions
let filteredTxns  = [];        // current filtered view
let activeConsents = [];       // consents from Firebase
let barChart      = null;      // Chart.js instance
let donutChart    = null;      // Chart.js instance
let authModal     = null;

/** Cached Intl formatters for performance */
const fmtINR0 = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0, maximumFractionDigits: 0 });
const fmtINR2 = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2 });

/* ========================================
   Debounce utility
   ======================================== */

function debounce(fn, delay) {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), delay);
    };
}

/* ========================================
   Formatters
   ======================================== */

const INR  = n => fmtINR0.format(n);
const INR2 = n => fmtINR2.format(n);
const fmtDate = iso => {
    const d = new Date(iso);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};
const fmtMonthLabel = key => {
    const [y, m] = key.split('-');
    return new Date(parseInt(y), parseInt(m) - 1, 1).toLocaleString('en-IN', { month: 'short', year: '2-digit' });
};

/* ========================================
   DOMContentLoaded bootstrap
   ======================================== */

document.addEventListener('DOMContentLoaded', () => {
    initAuthListener();
    initBootstrapModals();
    setupAuthHandlers();

    onAuthStateChange(user => {
        currentUser = user;
        if (user) {
            showMainContent();
            initPage();
        } else {
            showAuthRequired();
        }
    });

    // Handle Finvu webview redirect callback (?finvu_status=ACCEPTED)
    handleFinvuRedirectCallback();
});

/* ========================================
   UI State helpers
   ======================================== */

function showLoading() {
    el('loadingState')?.style.setProperty('display', 'block');
    el('authRequiredMessage')?.style.setProperty('display', 'none');
    el('mainContent')?.style.setProperty('display', 'none');
}

function showAuthRequired() {
    el('loadingState')?.style.setProperty('display', 'none');
    el('authRequiredMessage')?.style.setProperty('display', 'block');
    el('mainContent')?.style.setProperty('display', 'none');
    el('authButtons')?.style.setProperty('display', 'flex', 'important');
    el('userProfile')?.style.setProperty('display', 'none', 'important');
}

function showMainContent() {
    el('loadingState')?.style.setProperty('display', 'none');
    el('authRequiredMessage')?.style.setProperty('display', 'none');
    el('mainContent')?.style.setProperty('display', 'block');
    el('authButtons')?.style.setProperty('display', 'none', 'important');
    el('userProfile')?.style.setProperty('display', 'flex', 'important');

    const userEmailEl = el('userEmail');
    const details = getUserDetails();
    if (userEmailEl && details) userEmailEl.textContent = details.displayName || details.email || 'User';
}

/* ========================================
   Page initialisation (called after auth)
   ======================================== */

async function initPage() {
    const user = getCurrentUser();
    if (!user) return;

    // Load existing consents from Firebase
    activeConsents = await getConsentsFromFirebase(user.uid);
    const liveConsents = activeConsents.filter(c => c.status === 'ACTIVE');

    if (liveConsents.length > 0) {
        // We have at least one approved consent — load transactions
        await loadAndRenderTransactions(user.uid, liveConsents[0]);
        renderLinkedAccounts(liveConsents);
        renderConsentStatusBar(liveConsents[0]);
        hideBanner();
    } else if (activeConsents.some(c => c.status === 'PENDING')) {
        // Pending consent — show pending state
        showPendingConsentState(activeConsents.find(c => c.status === 'PENDING'));
    } else {
        // No consent — show linking banner
        showConsentBanner();
    }

    setupUIEventListeners();
}

/* ========================================
   Consent banner management
   ======================================== */

function showConsentBanner() {
    el('consentBanner')?.style.setProperty('display', 'block');
    el('dashboardContent')?.style.setProperty('display', 'none');
}

function hideBanner() {
    el('consentBanner')?.style.setProperty('display', 'none');
    el('dashboardContent')?.style.setProperty('display', 'block');
}

function showPendingConsentState(consent) {
    const banner = el('consentBanner');
    if (!banner) return;
    banner.style.display = 'block';
    el('dashboardContent')?.style.setProperty('display', 'none');

    const btnWrap = el('consentBannerBtns');
    if (btnWrap) {
        btnWrap.innerHTML = `
            <div class="alert alert-warning d-inline-flex align-items-center gap-2 mb-3">
                <i class="bi bi-hourglass-split"></i>
                <span>Consent pending approval. Please complete the process in the Finvu app.</span>
            </div>
            <div class="d-flex gap-2 justify-content-center flex-wrap">
                <button class="btn btn-outline-warning" id="cancelConsentBtn">
                    <i class="bi bi-x-circle"></i> Cancel
                </button>
                <button class="btn btn-primary" id="retryConsentBtn">
                    <i class="bi bi-arrow-clockwise"></i> I have approved – refresh
                </button>
            </div>`;
        el('cancelConsentBtn')?.addEventListener('click', () => cancelPendingConsent(consent));
        el('retryConsentBtn')?.addEventListener('click', () => window.location.reload());
    }
}

/* ========================================
   Transaction loader
   ======================================== */

async function loadAndRenderTransactions(userId, consent) {
    console.log('[networth] Loading transactions for consent:', {
        consentHandle: consent.consentHandle,
        isDemoMode: consent.isDemoMode,
        hasSessionId: !!consent.sessionId,
        status: consent.status,
    });

    // 1. Try cached transactions in Firebase first
    let txns = await getTransactionsFromFirebase(userId);
    let dataSource = 'firebase-cache';

    // 2. If cache empty, attempt live fetch or fall back to demo
    if (txns.length === 0) {
        if (consent && !consent.isDemoMode && consent.sessionId) {
            console.log('[networth] Attempting live FI fetch with sessionId:', consent.sessionId);
            txns = await fetchLiveTransactions(consent);
            if (txns.length > 0) {
                console.log('[networth] Live fetch succeeded, saving to Firebase');
                await saveTransactionsToFirebase(userId, txns);
                dataSource = 'finvu-live';
            }
        }
        if (txns.length === 0) {
            console.log('[networth] No real data available, generating demo transactions');
            txns = generateDemoTransactions(6);
            await saveTransactionsToFirebase(userId, txns);
            dataSource = 'demo-generated';
            document.querySelectorAll('.demo-badge').forEach(b => b.style.removeProperty('display'));
            console.warn('[networth] ⚠️ DEMO MODE: Showing synthetic transaction data. Link a real bank account to see actual transactions.');
        }
    }

    // 3. Ensure all transactions have a category
    txns = txns.map(t => ({
        ...t,
        category: t.category || categoriseTransaction(t.narration, t.type).name,
    }));

    console.log(`[networth] Rendering ${txns.length} transactions (source: ${dataSource})`);

    allTxns = txns;
    filteredTxns = txns;

    renderSummaryCards();
    renderBarChart();
    renderDonutChart();
    renderTransactionTable(filteredTxns);
    renderHealthScore();
    renderSuggestions();
}

/**
 * Attempt to fetch live transactions via Finvu FI API.
 * Returns transaction array on success, empty array on failure.
 */
async function fetchLiveTransactions(consent) {
    try {
        const fiResult = await fetchFIData(consent.fiuToken, consent.sessionId);
        if (fiResult.ok && fiResult.data) {
            return normaliseFIData(fiResult.data);
        }
    } catch (err) {
        console.error('[networth] Live FI fetch failed:', err);
    }
    return [];
}

/**
 * Normalise raw Finvu FI data into our transaction format.
 */
function normaliseFIData(fiData) {
    const txns = [];
    const accounts = fiData?.FI || fiData?.fi || [];

    for (const account of (Array.isArray(accounts) ? accounts : [])) {
        const transactions = account?.Transactions?.Transaction ||
                             account?.transactions?.transaction || [];

        for (const tx of (Array.isArray(transactions) ? transactions : [])) {
            txns.push({
                txnId: tx.txnId || `fi_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
                type: tx.type === 'CREDIT' ? 'CREDIT' : 'DEBIT',
                amount: parseFloat(tx.amount) || 0,
                narration: tx.narration || tx.reference || 'Unknown',
                mode: tx.mode || 'UPI',
                date: tx.transactionTimestamp || tx.valueDate || new Date().toISOString(),
                balance: parseFloat(tx.currentBalance) || 0,
                reference: tx.reference || '',
                category: categoriseTransaction(tx.narration || '', tx.type).name,
            });
        }
    }

    return txns.sort((a, b) => new Date(b.date) - new Date(a.date));
}

/* ========================================
   Summary cards
   ======================================== */

function renderSummaryCards() {
    const now      = new Date();
    const currMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const prevMonth = (() => {
        const d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    })();

    const monthly = buildMonthlySummary(allTxns);
    const thisM   = monthly.find(m => m.month === currMonth) || { income: 0, expense: 0, savings: 0 };
    const prevM   = monthly.find(m => m.month === prevMonth) || { income: 0, expense: 0, savings: 0 };

    const totalNetWorth = allTxns.reduce((s, t) => {
        return s + (t.type === 'CREDIT' ? t.amount : -t.amount);
    }, 0);

    setText('cardNetWorth', INR(Math.abs(totalNetWorth)));
    setText('cardNetWorthSub', totalNetWorth >= 0 ? '▲ Positive balance' : '▼ Negative balance');
    setClass('cardNetWorthSub', totalNetWorth >= 0 ? 'nw-card-sub positive' : 'nw-card-sub negative');

    setText('cardIncome',  INR(thisM.income));
    const incDiff = thisM.income - prevM.income;
    setText('cardIncomeSub', `${incDiff >= 0 ? '▲' : '▼'} ${INR(Math.abs(incDiff))} vs last month`);
    setClass('cardIncomeSub', incDiff >= 0 ? 'nw-card-sub positive' : 'nw-card-sub negative');

    setText('cardExpense', INR(thisM.expense));
    const expDiff = thisM.expense - prevM.expense;
    setText('cardExpenseSub', `${expDiff >= 0 ? '▲' : '▼'} ${INR(Math.abs(expDiff))} vs last month`);
    setClass('cardExpenseSub', expDiff >= 0 ? 'nw-card-sub negative' : 'nw-card-sub positive');

    const savRate = thisM.income > 0 ? ((thisM.income - thisM.expense) / thisM.income * 100).toFixed(1) : '0.0';
    setText('cardSavings', INR(thisM.savings));
    setText('cardSavingsSub', `Savings rate: ${savRate}%`);
    setClass('cardSavingsSub', parseFloat(savRate) >= 20 ? 'nw-card-sub positive' : 'nw-card-sub');

}

/* ========================================
   Bar chart (income vs expense by month)
   ======================================== */

function renderBarChart() {
    const monthly = buildMonthlySummary(allTxns);
    const labels  = monthly.map(m => fmtMonthLabel(m.month));
    const income  = monthly.map(m => m.income);
    const expense = monthly.map(m => m.expense);

    const canvas = el('incomeExpenseChart');
    if (!canvas) return;

    if (barChart) barChart.destroy();

    const ctx = canvas.getContext('2d');
    barChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [
                {
                    label: 'Income',
                    data: income,
                    backgroundColor: 'rgba(61, 220, 132, 0.7)',
                    borderColor: '#3ddc84',
                    borderWidth: 1,
                    borderRadius: 4,
                },
                {
                    label: 'Expenses',
                    data: expense,
                    backgroundColor: 'rgba(255, 107, 107, 0.7)',
                    borderColor: '#ff6b6b',
                    borderWidth: 1,
                    borderRadius: 4,
                },
            ],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { labels: { color: '#adb5bd', font: { size: 12 } } },
                tooltip: {
                    callbacks: {
                        label: ctx => ` ${ctx.dataset.label}: ${INR2(ctx.raw)}`,
                    },
                },
            },
            scales: {
                x: { ticks: { color: '#adb5bd' }, grid: { color: 'rgba(255,255,255,0.05)' } },
                y: {
                    ticks: {
                        color: '#adb5bd',
                        callback: v => '₹' + (v >= 1000 ? `${(v/1000).toFixed(0)}k` : v),
                    },
                    grid: { color: 'rgba(255,255,255,0.05)' },
                },
            },
        },
    });
}

/* ========================================
   Donut chart (spending by category)
   ======================================== */

function renderDonutChart() {
    const cats   = buildCategoryBreakdown(allTxns).slice(0, 8);
    const labels = cats.map(c => c.name);
    const data   = cats.map(c => c.total);
    const colors = cats.map(c => c.color);

    const canvas = el('categoryChart');
    if (!canvas) return;

    if (donutChart) donutChart.destroy();

    const ctx = canvas.getContext('2d');
    donutChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels,
            datasets: [{
                data,
                backgroundColor: colors,
                borderColor: 'rgba(17,18,24,0.8)',
                borderWidth: 2,
                hoverOffset: 6,
            }],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '65%',
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: '#adb5bd',
                        font: { size: 11 },
                        padding: 10,
                        boxWidth: 12,
                    },
                },
                tooltip: {
                    callbacks: {
                        label: ctx => ` ${ctx.label}: ${INR2(ctx.raw)}`,
                    },
                },
            },
        },
    });
}

/* ========================================
   Transaction table
   ======================================== */

function renderTransactionTable(txns) {
    const tbody = el('txnTableBody');
    const emptyState = el('txnEmpty');
    if (!tbody) return;

    if (txns.length === 0) {
        tbody.innerHTML = '';
        emptyState?.style.setProperty('display', 'block');
        return;
    }

    emptyState?.style.setProperty('display', 'none');

    tbody.innerHTML = txns.map(t => {
        const cat = categoriseTransaction(t.narration, t.type);
        const catUsed = t.category || cat.name;
        const catCfg  = { color: cat.color, icon: cat.icon };

        return `
        <tr>
            <td>
                <span class="txn-type-badge ${t.type === 'CREDIT' ? 'credit' : 'debit'}">
                    <i class="bi bi-arrow-${t.type === 'CREDIT' ? 'down' : 'up'}-short"></i>
                </span>
            </td>
            <td>${fmtDate(t.date)}</td>
            <td>
                <span class="txn-narration" title="${escHtml(t.narration)}">${escHtml(t.narration)}</span>
            </td>
            <td>
                <span class="txn-category-pill" style="background:${catCfg.color}22;color:${catCfg.color}">
                    <i class="bi ${catCfg.icon}"></i> ${catUsed}
                </span>
            </td>
            <td>
                <span class="${t.type === 'CREDIT' ? 'txn-amount-credit' : 'txn-amount-debit'}">
                    ${t.type === 'CREDIT' ? '+' : '-'}${INR2(t.amount)}
                </span>
            </td>
            <td><span class="txn-mode-badge">${escHtml(t.mode || 'UPI')}</span></td>
            <td class="text-muted" style="font-size:0.78rem;">${INR2(t.balance || 0)}</td>
        </tr>`;
    }).join('');
}

/* ========================================
   Linked accounts panel
   ======================================== */

function renderLinkedAccounts(consents) {
    const container = el('linkedAccountsContainer');
    if (!container) return;

    container.innerHTML = consents.map(c => `
        <div class="linked-account-card mb-2" id="account-${c.consentHandle}">
            <div class="account-bank-logo"><i class="bi bi-bank2"></i></div>
            <div class="account-details">
                <div class="account-bank-name">${escHtml(c.bankName || 'Linked Bank Account')}</div>
                <div class="account-masked-num">${escHtml(c.accountMasked || 'XXXX XXXX XXXX 1234')}</div>
                <span class="account-type-badge">${escHtml(c.accountType || 'DEPOSIT')}</span>
            </div>
            <div class="account-balance">
                <div class="d-flex align-items-center gap-1 mb-1">
                    <span class="account-status-dot"></span>
                    <small style="color:var(--accent-success);font-size:0.75rem;">Active</small>
                </div>
                <div>
                    <button class="btn btn-outline-danger revoke-btn" data-handle="${escHtml(c.consentHandle)}" aria-label="Revoke bank account access">
                        <i class="bi bi-x-circle"></i> Revoke
                    </button>
                </div>
            </div>
        </div>`
    ).join('');

    // Attach revoke handlers
    container.querySelectorAll('.revoke-btn').forEach(btn => {
        btn.addEventListener('click', () => handleRevokeConsent(btn.dataset.handle));
    });
}

/* ========================================
   Consent status bar
   ======================================== */

function renderConsentStatusBar(consent) {
    const bar = el('consentStatusBar');
    if (!bar) return;

    const expires = consent.expiresAt ? new Date(consent.expiresAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A';

    bar.innerHTML = `
        <div class="consent-status-card">
            <span class="status-icon"><i class="bi bi-shield-fill-check"></i></span>
            <div class="status-info">
                <strong>Bank account connected via Finvu AA</strong>
                <p>Consent active · Expires <strong>${expires}</strong> · Purpose: Wealth management</p>
            </div>
            <button class="btn btn-sm btn-sync btn-outline-primary" id="syncBtn" aria-label="Sync latest transactions">
                <i class="bi bi-arrow-clockwise"></i> Sync
            </button>
        </div>`;

    el('syncBtn')?.addEventListener('click', handleSync);
}

/* ========================================
   Health score widget
   ======================================== */

function renderHealthScore() {
    const result  = computeHealthScore(allTxns);
    const scoreEl = el('healthScoreNumber');
    const labelEl = el('healthScoreLabel');
    const ringEl  = el('healthScoreRing');

    if (scoreEl) { scoreEl.textContent = result.score; scoreEl.style.color = result.color; }
    if (labelEl) { labelEl.textContent = result.label; labelEl.style.color = result.color; }

    // SVG ring progress
    if (ringEl) {
        const r = 62;
        const circumference = 2 * Math.PI * r;
        const dash = (result.score / 100) * circumference;
        ringEl.innerHTML = `
            <svg class="health-score-ring" viewBox="0 0 140 140" aria-hidden="true">
                <circle cx="70" cy="70" r="${r}" fill="none" stroke="var(--border-color)" stroke-width="10"/>
                <circle cx="70" cy="70" r="${r}" fill="none" stroke="${result.color}" stroke-width="10"
                    stroke-dasharray="${dash.toFixed(1)} ${circumference.toFixed(1)}"
                    stroke-dashoffset="${(circumference / 4).toFixed(1)}"
                    stroke-linecap="round"
                    style="transition: stroke-dasharray 0.6s ease"/>
            </svg>`;
    }

    // Component bars
    const c = result.components || {};
    renderHealthBar('barSavings',    c.savingsScore || 0,   40,  '#3ddc84');
    renderHealthBar('barInvestment', c.investScore  || 0,   30,  '#7289ff');
    renderHealthBar('barConsistency',c.consistencyScore||0, 30,  '#ffb454');
    setText('valSavings',     `${c.savingsScore || 0}/40`);
    setText('valInvestment',  `${c.investScore  || 0}/30`);
    setText('valConsistency', `${c.consistencyScore || 0}/30`);
}

function renderHealthBar(id, value, max, color) {
    const fill = el(id);
    if (fill) {
        fill.style.width = `${Math.round((value / max) * 100)}%`;
        fill.style.backgroundColor = color;
    }
}

/* ========================================
   Suggestions cards
   ======================================== */

function renderSuggestions() {
    const list = generateSuggestions(allTxns);
    const container = el('suggestionsContainer');
    if (!container) return;

    container.innerHTML = list.map(s => `
        <div class="suggestion-item">
            <div class="suggestion-icon ${s.type}">
                <i class="bi ${s.icon}"></i>
            </div>
            <div class="suggestion-text">
                <h6>${escHtml(s.title)}</h6>
                <p>${escHtml(s.body)}</p>
            </div>
        </div>`
    ).join('');
}

/* ========================================
   Consent modal – open/submit
   ======================================== */

function openConsentModal() {
    const modal = bootstrap.Modal.getOrCreateInstance(el('consentModal'));
    modal.show();
}

async function handleConsentSubmit() {
    const agreeCheckbox = el('consentAgreeCheckbox');
    const mobileInput   = el('consentMobile');
    const alertEl       = el('consentModalAlert');

    if (!agreeCheckbox?.checked) {
        showInlineAlert(alertEl, 'Please read and agree to the consent terms before proceeding.', 'warning');
        return;
    }

    const mobile = (mobileInput?.value || '').trim().replace(/\D/g, '');
    if (mobile.length !== 10) {
        showInlineAlert(alertEl, 'Please enter a valid 10-digit mobile number linked to your bank account.', 'danger');
        return;
    }

    const submitBtn = el('consentSubmitBtn');
    const origLabel = submitBtn?.innerHTML;
    if (submitBtn) { submitBtn.disabled = true; submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Processing…'; }

    try {
        await doConsentSubmit(mobile, alertEl, submitBtn, origLabel);
    } catch (err) {
        console.error('[networth] Consent submit error:', err);
        showInlineAlert(alertEl, 'Something went wrong. Please try again.', 'danger');
        resetBtn(submitBtn, origLabel);
    }
}

async function doConsentSubmit(mobile, alertEl, submitBtn, origLabel) {
    const user = getCurrentUser();
    if (!user) {
        showInlineAlert(alertEl, 'Session expired. Please sign in again.', 'danger');
        resetBtn(submitBtn, origLabel);
        return;
    }

    // Build consent record
    const now     = new Date();
    const expiry  = new Date(now);
    expiry.setFullYear(expiry.getFullYear() + 1);
    const fromDate = new Date(now);
    fromDate.setMonth(fromDate.getMonth() - 6);

    // Attempt real Finvu consent flow (requires CORS proxy + registered FIU credentials)
    // See FINVU_FIU_USERNAME / PASSWORD / ENTITY_ID constants in finvu-service.js
    const customerHandle = `${mobile}@finvu`;
    const authResult = await authenticateFIU();  // credentials read from finvu-service.js config
    console.log('[networth] FIU auth result:', { ok: authResult.ok, error: authResult.error });

    if (authResult.ok && authResult.token) {
        // Live flow: create consent at Finvu
        const consentResult = await createConsentRequest(
            authResult.token, customerHandle, FINVU_FIU_ENTITY_ID,
            fromDate.toISOString(), expiry.toISOString()
        );

        if (consentResult.ok && consentResult.consentHandle) {
            const consentRecord = {
                consentHandle: consentResult.consentHandle,
                status: 'PENDING',
                customerMobile: `****${mobile.slice(-4)}`,
                bankName: 'Bank Account (via Finvu AA)',
                accountMasked: '',
                accountType: 'DEPOSIT',
                consentTypes: ['TRANSACTIONS', 'PROFILE', 'SUMMARY'],
                fiTypes: ['DEPOSIT'],
                purposeText: 'Wealth management and personal finance analysis',
                dataRangeFrom: fromDate.toISOString(),
                dataRangeTo: expiry.toISOString(),
                expiresAt: expiry.toISOString(),
                createdAt: Date.now(),
                updatedAt: Date.now(),
                userConsentGiven: true,
                userConsentTimestamp: Date.now(),
                fiuToken: authResult.token,
                isDemoMode: false,
            };

            const saved = await saveConsentToFirebase(user.uid, consentRecord);
            if (!saved) {
                showInlineAlert(alertEl, 'Failed to save consent. Please try again.', 'danger');
                resetBtn(submitBtn, origLabel);
                return;
            }

            bootstrap.Modal.getInstance(el('consentModal'))?.hide();

            // Redirect to Finvu WebView for user approval
            const returnUrl = `${window.location.origin}${window.location.pathname}?finvu_status=CALLBACK&handle=${consentResult.consentHandle}`;
            const webviewUrl = buildWebviewUrl(consentResult.consentHandle, mobile, returnUrl);
            window.location.href = webviewUrl;
            return;
        }
    }

    // Fallback: Finvu API not reachable – create consent with demo data
    const consentHandle = `consent_${Date.now()}_${user.uid.slice(0, 8)}`;
    const consentRecord = {
        consentHandle,
        status: 'ACTIVE',
        customerMobile: `****${mobile.slice(-4)}`,
        bankName: 'Bank Account (via Finvu AA)',
        accountMasked: `XXXX ${mobile.slice(-4)}`,
        accountType: 'DEPOSIT',
        consentTypes: ['TRANSACTIONS', 'PROFILE', 'SUMMARY'],
        fiTypes: ['DEPOSIT'],
        purposeText: 'Wealth management and personal finance analysis',
        dataRangeFrom: fromDate.toISOString(),
        dataRangeTo: expiry.toISOString(),
        expiresAt: expiry.toISOString(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
        userConsentGiven: true,
        userConsentTimestamp: Date.now(),
        isDemoMode: true,
    };

    console.info(
        '[networth] ℹ️  Demo mode active.\n'
        + '  Reason: ' + authResult.error + '\n'
        + '  To use real bank data:\n'
        + '  1. Register as an FIU at https://finvu.in/developer\n'
        + '  2. Set FINVU_FIU_USERNAME, FINVU_FIU_PASSWORD, FINVU_FIU_ENTITY_ID in js/finvu-service.js\n'
        + '  3. Run a CORS proxy on localhost:8080'
    );

    const saved = await saveConsentToFirebase(user.uid, consentRecord);
    if (!saved) {
        showInlineAlert(alertEl, 'Failed to save consent. Please try again.', 'danger');
        resetBtn(submitBtn, origLabel);
        return;
    }

    bootstrap.Modal.getInstance(el('consentModal'))?.hide();

    activeConsents = [consentRecord];
    await loadAndRenderTransactions(user.uid, consentRecord);
    renderLinkedAccounts([consentRecord]);
    renderConsentStatusBar(consentRecord);
    hideBanner();
}

/* ========================================
   Finvu redirect callback handler
   ======================================== */

async function handleFinvuRedirectCallback() {
    const params = new URLSearchParams(window.location.search);
    const status = params.get('finvu_status');
    const handle = params.get('handle');

    if (!status || !handle) return;

    // Clean URL
    window.history.replaceState({}, '', window.location.pathname);

    const user = await waitForUser();
    if (!user) return;

    if (status === 'CALLBACK' || status === 'ACCEPTED') {
        const consents = await getConsentsFromFirebase(user.uid);
        const consent = consents.find(c => c.consentHandle === handle);

        if (consent && consent.fiuToken) {
            const statusResult = await fetchConsentStatus(consent.fiuToken, handle);
            if (statusResult.ok && statusResult.status === 'ACTIVE') {
                await updateConsentInFirebase(user.uid, handle, {
                    status: 'ACTIVE',
                    consentId: statusResult.consentId,
                    isDemoMode: false,  // ← Real Finvu consent, not demo
                });
                const session = await createFISession(
                    consent.fiuToken, statusResult.consentId,
                    consent.dataRangeFrom, consent.dataRangeTo
                );
                if (session.ok) {
                    await updateConsentInFirebase(user.uid, handle, { 
                        sessionId: session.sessionId,
                        isDemoMode: false,  // ← Real session created
                    });
                    console.log('[networth] Real FI session created, real data will load on next sync');
                }
            } else {
                await updateConsentInFirebase(user.uid, handle, { status: 'REJECTED' });
            }
        } else {
            // Demo approval (no FIU token) - keep isDemoMode: true
            await updateConsentInFirebase(user.uid, handle, {
                status: 'ACTIVE',
                bankName: 'Linked Bank Account (Demo Mode)',
                isDemoMode: true,
            });
        }
    } else {
        await updateConsentInFirebase(user.uid, handle, { status: 'REJECTED' });
    }
}

/* ========================================
   Sync handler
   ======================================== */

async function handleSync() {
    const syncBtn = el('syncBtn');
    const icon    = syncBtn?.querySelector('i');
    if (icon) icon.classList.add('spinning');
    if (syncBtn) syncBtn.disabled = true;

    const user = getCurrentUser();
    if (!user) return;

    const liveConsent = activeConsents.find(c => c.status === 'ACTIVE');
    
    console.log('[networth] Sync clicked. Consent state:', {
        isDemoMode: liveConsent?.isDemoMode,
        hasSessionId: !!liveConsent?.sessionId,
        status: liveConsent?.status,
    });

    if (liveConsent && !liveConsent.isDemoMode && liveConsent.sessionId) {
        console.log('[networth] ✓ Real mode - fetching live transactions');
        const liveTxns = await fetchLiveTransactions(liveConsent);
        if (liveTxns.length > 0) {
            await clearTransactionsFromFirebase(user.uid);
            await saveTransactionsToFirebase(user.uid, liveTxns);
            console.log('[networth] Real transactions saved');
        }
    } else {
        console.log('[networth] ⚠️ Demo mode - generating demo transactions');
        const txns = generateDemoTransactions(6);
        await clearTransactionsFromFirebase(user.uid);
        await saveTransactionsToFirebase(user.uid, txns);
        alert('📊 DEMO MODE: Showing sample transactions only.\n\nTo see your real bank data:\n1. Click "Link Bank Account"\n2. Complete the approval process\n3. Your data will appear here');
    }

    await loadAndRenderTransactions(user.uid, liveConsent);

    setTimeout(() => {
        if (icon) icon.classList.remove('spinning');
        if (syncBtn) syncBtn.disabled = false;
    }, 800);
}

/* ========================================
   Revoke / cancel helpers
   ======================================== */

async function handleRevokeConsent(consentHandle) {
    if (!confirm('Are you sure you want to disconnect this bank account? All transaction data cached locally will be removed.')) return;

    const user = getCurrentUser();
    if (!user) return;

    await revokeConsentInFirebase(user.uid, consentHandle);
    await clearTransactionsFromFirebase(user.uid);

    activeConsents = activeConsents.filter(c => c.consentHandle !== consentHandle);
    allTxns = [];
    filteredTxns = [];

    if (barChart)   { barChart.destroy();   barChart = null; }
    if (donutChart) { donutChart.destroy(); donutChart = null; }

    el('consentStatusBar').innerHTML = '';
    showConsentBanner();
}

async function cancelPendingConsent(consent) {
    const user = getCurrentUser();
    if (!user) return;
    await revokeConsentInFirebase(user.uid, consent.consentHandle);
    showConsentBanner();
    el('consentBannerBtns').innerHTML = `
        <button class="btn btn-primary btn-lg" id="linkBankBtn">
            <i class="bi bi-bank2"></i> Link Bank Account
        </button>`;
    el('linkBankBtn')?.addEventListener('click', openConsentModal);
}

/* ========================================
   Transaction filter + search
   ======================================== */

function setupUIEventListeners() {
    // Consent banner button
    el('linkBankBtn')?.addEventListener('click', openConsentModal);
    el('linkBankBtnTop')?.addEventListener('click', openConsentModal);

    // Consent modal submit
    el('consentSubmitBtn')?.addEventListener('click', handleConsentSubmit);

    // Debounced transaction search
    el('txnSearch')?.addEventListener('input', debounce(() => applyFilters(), 250));

    // Transaction type filter buttons
    document.querySelectorAll('.txn-filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.txn-filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            applyFilters();
        });
    });

    // Period tab for charts
    document.querySelectorAll('.period-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.period-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            const months = parseInt(tab.dataset.months || '6');
            filterByPeriod(months);
        });
    });

    // Logout
    el('logoutBtn')?.addEventListener('click', async e => {
        e.preventDefault();
        await signOutUser();
        window.location.href = '../index.html';
    });
}

function applyFilters() {
    const searchVal  = (el('txnSearch')?.value || '').toLowerCase();
    const activeBtn  = document.querySelector('.txn-filter-btn.active');
    const typeFilter = activeBtn?.dataset.filter || 'ALL';
    const catFilter  = activeBtn?.dataset.cat || '';

    filteredTxns = allTxns.filter(t => {
        const matchSearch = !searchVal || t.narration.toLowerCase().includes(searchVal) || (t.category || '').toLowerCase().includes(searchVal);
        const matchType   = typeFilter === 'ALL' || t.type === typeFilter;
        const matchCat    = !catFilter || (t.category || '') === catFilter;
        return matchSearch && matchType && matchCat;
    });

    renderTransactionTable(filteredTxns);
}

function filterByPeriod(months) {
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - months);
    const periodTxns = allTxns.filter(t => new Date(t.date) >= cutoff);
    // Re-render charts with filtered data
    const savedAll = allTxns;
    allTxns = periodTxns;
    renderBarChart();
    renderDonutChart();
    renderHealthScore();
    renderSuggestions();
    allTxns = savedAll;
}

/* ========================================
   Auth handlers
   ======================================== */

function initBootstrapModals() {
    const authModalEl = el('authModal');
    if (authModalEl) authModal = new bootstrap.Modal(authModalEl);
}

function setupAuthHandlers() {
    el('loginBtn')?.addEventListener('click', () => showAuthModal('login'));
    el('signupBtn')?.addEventListener('click', () => showAuthModal('signup'));
    el('authPromptLoginBtn')?.addEventListener('click', () => showAuthModal('login'));
    el('authPromptSignupBtn')?.addEventListener('click', () => showAuthModal('signup'));

    el('showSignupForm')?.addEventListener('click', e => { e.preventDefault(); switchAuthForm('signup'); });
    el('showLoginForm')?.addEventListener('click',  e => { e.preventDefault(); switchAuthForm('login');  });
    el('forgotPasswordLink')?.addEventListener('click', e => { e.preventDefault(); switchAuthForm('forgotPassword'); });
    el('backToLoginBtn')?.addEventListener('click',     e => { e.preventDefault(); switchAuthForm('login'); });

    el('loginForm')?.addEventListener('submit', async e => { e.preventDefault(); await handleLogin(); });
    el('signupForm')?.addEventListener('submit', async e => { e.preventDefault(); await handleSignup(); });
    el('googleSignInBtn')?.addEventListener('click', handleGoogleAuth);
    el('googleSignUpBtn')?.addEventListener('click', handleGoogleAuth);
    el('sendResetEmailBtn')?.addEventListener('click', handlePasswordReset);
}

function showAuthModal(mode) {
    switchAuthForm(mode);
    authModal?.show();
}

function switchAuthForm(form) {
    ['loginForm', 'signupForm', 'forgotPasswordForm'].forEach(id => {
        const f = el(id);
        if (f) f.style.display = 'none';
    });
    const titles = { login: 'Sign In', signup: 'Create Account', forgotPassword: 'Reset Password' };
    const target = form === 'forgotPassword' ? 'forgotPasswordForm'
                 : form === 'signup'         ? 'signupForm'
                 : 'loginForm';
    const f = el(target);
    if (f) f.style.display = 'block';
    setText('authModalTitle', titles[form] || 'Sign In');
    el('authAlertContainer') && (el('authAlertContainer').innerHTML = '');
}

async function handleLogin() {
    const email    = el('loginEmail')?.value.trim();
    const password = el('loginPassword')?.value;
    const alertEl  = el('authAlertContainer');
    const btn      = document.querySelector('#loginForm button[type=submit]');
    const orig     = btn?.innerHTML;

    if (btn) { btn.disabled = true; btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Signing in…'; }

    const result = await signInUser(email, password);
    if (result.success) {
        authModal?.hide();
    } else {
        showInlineAlert(alertEl, result.error, 'danger');
    }
    resetBtn(btn, orig);
}

async function handleSignup() {
    const name     = el('signupName')?.value.trim();
    const email    = el('signupEmail')?.value.trim();
    const pass     = el('signupPassword')?.value;
    const confirm  = el('signupConfirmPassword')?.value;
    const alertEl  = el('authAlertContainer');
    const btn      = document.querySelector('#signupForm button[type=submit]');
    const orig     = btn?.innerHTML;

    if (pass !== confirm) { showInlineAlert(alertEl, 'Passwords do not match.', 'danger'); return; }
    if (btn) { btn.disabled = true; btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Creating…'; }

    const result = await signUpUser(email, pass, name);
    if (result.success) {
        authModal?.hide();
    } else {
        showInlineAlert(alertEl, result.error, 'danger');
    }
    resetBtn(btn, orig);
}

async function handleGoogleAuth() {
    const result = await signInWithGoogle();
    if (result.success) authModal?.hide();
    else showInlineAlert(el('authAlertContainer'), result.error, 'danger');
}

async function handlePasswordReset() {
    const email   = el('resetEmail')?.value.trim();
    const alertEl = el('authAlertContainer');
    const result  = await resetPassword(email);
    if (result.success) showInlineAlert(alertEl, result.message, 'success');
    else                showInlineAlert(alertEl, result.error,   'danger');
}

/* ========================================
   Utility helpers
   ======================================== */

function el(id) { return document.getElementById(id); }
function setText(id, text) { const e = el(id); if (e) e.textContent = text; }
function setClass(id, cls) { const e = el(id); if (e) e.className = cls; }

function escHtml(str) {
    return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

function showInlineAlert(container, message, type = 'danger') {
    if (!container) return;
    container.innerHTML = `
        <div class="alert alert-${type} alert-dismissible fade show py-2" role="alert">
            ${escHtml(message)}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        </div>`;
    if (type === 'success') setTimeout(() => { container.innerHTML = ''; }, 5000);
}

function resetBtn(btn, orig) {
    if (btn) { btn.disabled = false; btn.innerHTML = orig; }
}

async function waitForUser(timeoutMs = 5000) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
        const u = getCurrentUser();
        if (u && !u._fromCache) return u;
        await new Promise(r => setTimeout(r, 200));
    }
    return getCurrentUser();
}
