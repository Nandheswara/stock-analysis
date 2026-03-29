/**
 * Finvu Account Aggregator Service
 *
 * Implements the RBI Account Aggregator (AA) framework using Finvu as the AA.
 * Manages:
 *  - Consent creation, storage (Firebase), and lifecycle management
 *  - Redirection to Finvu WebView for user consent approval
 *  - Financial Information (FI) session creation and data retrieval
 *  - Demo mode with realistic synthetic bank transaction data
 *
 * Architecture note:
 *  Direct Finvu REST API calls require a registered FIU client-id/secret plus
 *  JWE payload encryption, which must not happen in a browser context without a
 *  backend proxy.  When credentials are not configured this service operates in
 *  DEMO mode and returns synthetic data so the full UI is always exercisable.
 *
 * Firebase data schema:
 *  users/{uid}/bankConsents/{consentHandle}  – consent records
 *  users/{uid}/bankTransactions/{txnId}       – cached transactions
 *
 * @module finvu-service
 */

import { database } from './firebase-config.js';
import { getCurrentUser, waitForAuthReady } from './firebase-auth-service.js';
import {
    ref,
    set,
    get,
    update,
    remove,
    push
} from 'https://www.gstatic.com/firebasejs/11.1.0/firebase-database.js';

/* ========================================
   Constants
   ======================================== */

/** Finvu Production AA API base URL */
const FINVU_API_URL      = 'https://aaapi.finvu.in';
/** Finvu WebView URL – user is redirected here to complete consent */
const FINVU_WEBVIEW_URL  = 'https://webview.finvu.in';
/** CORS proxy (required for browser → Finvu API calls) */
const CORS_PROXY_URL     = window.location.hostname === 'localhost'
    ? 'http://localhost:8080/proxy'
    : '';
/** Max timeout for API calls (ms) */
const API_TIMEOUT_MS     = 5000;
/** Consent purpose code 101 = Wealth Management / Personal Finance */
const PURPOSE_CODE       = '101';

/**
 * FIU Credentials — replace these with your Finvu-registered FIU credentials.
 * Finvu AA is an RBI-authorised Account Aggregator. Access as an FIU requires
 * formal registration at https://finvu.in/developer
 * Leave as empty strings to always use demo mode.
 */
const FINVU_FIU_USERNAME  = '';  // e.g. 'your-fiu-username'
const FINVU_FIU_PASSWORD  = '';  // e.g. 'your-fiu-password'
export const FINVU_FIU_ENTITY_ID = ''; // e.g. 'Your-FIU-EntityId'

/** Returns true only when real, non-placeholder FIU credentials are configured */
function hasRealFIUCredentials() {
    return !!FINVU_FIU_USERNAME && !!FINVU_FIU_PASSWORD && !!FINVU_FIU_ENTITY_ID;
}
/** Default data range – last 6 months */
const DEFAULT_MONTHS     = 6;

/** Spending category configuration used by the categorisation engine */
const CATEGORY_CONFIG = [
    { name: 'Food & Dining',    color: '#ff6b6b', icon: 'bi-cup-hot-fill',     keywords: ['swiggy','zomato','dominos','pizza','kfc','mcdonalds','burger','restaurant','cafe','dining','food','eat','hotel'] },
    { name: 'Shopping',         color: '#ffb454', icon: 'bi-bag-fill',          keywords: ['amazon','flipkart','myntra','ajio','meesho','snapdeal','shop','store','mart','bazaar'] },
    { name: 'Bills & Utilities',color: '#7289ff', icon: 'bi-receipt-cutoff',    keywords: ['jio','airtel','vi','bsnl','bescom','tangedco','bbmp','water','electricity','bill','broadband','dth','recharge','utility','maintenance'] },
    { name: 'Transport',        color: '#3ddc84', icon: 'bi-car-front-fill',     keywords: ['ola','uber','rapido','redbus','irctc','metro','petrol','diesel','fuel','toll','parking','cab','taxi','auto','train','bus','flight'] },
    { name: 'Health',           color: '#20c997', icon: 'bi-heart-pulse-fill',  keywords: ['apollo','medically','1mg','pharmeasy','hospital','clinic','pharmacy','doctor','medicine','health','insurance'] },
    { name: 'Entertainment',    color: '#9b59b6', icon: 'bi-play-circle-fill',  keywords: ['netflix','prime','hotstar','spotify','youtube','bookmyshow','inox','pvr','gamez','entertainment','cinema'] },
    { name: 'Education',        color: '#f39c12', icon: 'bi-book-fill',         keywords: ['udemy','coursera','byju','unacademy','tuition','school','college','university','education','book'] },
    { name: 'Investment',       color: '#1abc9c', icon: 'bi-graph-up-arrow',    keywords: ['zerodha','groww','mutual fund','sip','nps','ppf','fd','deposit','invest','equity','mf','lic'] },
    { name: 'Salary / Income',  color: '#27ae60', icon: 'bi-cash-coin',         keywords: ['salary','credit','neft','rtgs','imps','bonus','income','stipend','dividend','interest'] },
    { name: 'Transfers',        color: '#adb5bd', icon: 'bi-arrow-left-right',  keywords: ['transfer','neft','rtgs','imps','upi','self'] },
];

/* ========================================
   Helpers
   ======================================== */

/**
 * Build ISO timestamp string
 * @param {Date} [d]
 * @returns {string}
 */
function isoTs(d = new Date()) {
    return d.toISOString();
}

/**
 * Generate a compact UUID-like txn id
 * @returns {string}
 */
function uid() {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Format a number as INR string (no symbol, just formatted number for storage)
 * @param {number} n
 * @returns {string}
 */
function fmtINR(n) {
    return new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

/**
 * Categorise a transaction based on its narration string.
 * Falls through to 'Others' when no keywords match.
 * @param {string} narration
 * @param {'CREDIT'|'DEBIT'} type
 * @returns {Object} category config entry
 */
export function categoriseTransaction(narration, type) {
    const lower = (narration || '').toLowerCase();

    // Salary / income handling – prioritise for CREDIT transactions
    if (type === 'CREDIT') {
        const incomeEntry = CATEGORY_CONFIG.find(c => c.name === 'Salary / Income');
        if (incomeEntry.keywords.some(k => lower.includes(k))) return incomeEntry;
    }

    for (const cat of CATEGORY_CONFIG) {
        if (cat.keywords.some(k => lower.includes(k))) return cat;
    }

    return { name: 'Others', color: '#6c757d', icon: 'bi-three-dots', keywords: [] };
}

/** All category names (for charts / filters) */
export function getAllCategories() {
    return CATEGORY_CONFIG.map(c => ({ name: c.name, color: c.color, icon: c.icon }));
}

/* ========================================
   Demo / Synthetic Data Generator
   ======================================== */

/**
 * Generate realistic synthetic bank transactions for the last N months.
 * Used when Finvu API credentials are not configured (DEMO mode).
 *
 * @param {number} [months=6] – number of past months to generate data for
 * @returns {Array<Object>}
 */
export function generateDemoTransactions(months = DEFAULT_MONTHS) {
    const now = new Date();
    const txns = [];

    // Monthly salary income – always present
    for (let m = months - 1; m >= 0; m--) {
        const d = new Date(now.getFullYear(), now.getMonth() - m, 1);
        txns.push({
            txnId: uid(),
            type: 'CREDIT',
            amount: 85000 + Math.round(Math.random() * 5000),
            narration: 'NEFT SALARY CREDIT - ACME CORP LTD',
            mode: 'NEFT',
            date: new Date(d.getFullYear(), d.getMonth(), 1 + Math.floor(Math.random() * 3)).toISOString(),
            balance: 0,
            reference: `SAL${uid()}`,
            category: 'Salary / Income',
        });
    }

    // Recurring expenses templates
    const recurringExpenses = [
        { narration: 'JIO POSTPAID BILL',              amount: 999,   mode: 'UPI',  category: 'Bills & Utilities' },
        { narration: 'BESCOM ELECTRICITY BILL',         amount: 1850,  mode: 'NEFT', category: 'Bills & Utilities' },
        { narration: 'NETFLIX SUBSCRIPTION',            amount: 649,   mode: 'UPI',  category: 'Entertainment' },
        { narration: 'SPOTIFY PREMIUM',                 amount: 119,   mode: 'UPI',  category: 'Entertainment' },
        { narration: 'AMAZON PRIME MEMBERSHIP',         amount: 299,   mode: 'UPI',  category: 'Entertainment' },
        { narration: 'APT MAINTENANCE',                 amount: 3000,  mode: 'NEFT', category: 'Bills & Utilities' },
        { narration: 'HDFC HOME LOAN EMI',              amount: 22000, mode: 'NACH', category: 'Bills & Utilities' },
        { narration: 'GROWW MUTUAL FUND SIP',           amount: 5000,  mode: 'NACH', category: 'Investment' },
        { narration: 'NPS CONTRIBUTION',                amount: 3000,  mode: 'NACH', category: 'Investment' },
    ];

    // Variable expenses
    const variableExpenses = [
        { narration: 'SWIGGY ORDER',          min: 150,  max: 700,  mode: 'UPI',  category: 'Food & Dining',    freq: 8 },
        { narration: 'ZOMATO ORDER',          min: 100,  max: 650,  mode: 'UPI',  category: 'Food & Dining',    freq: 6 },
        { narration: 'AMAZON SHOPPING',       min: 500,  max: 5000, mode: 'UPI',  category: 'Shopping',          freq: 4 },
        { narration: 'FLIPKART PURCHASE',     min: 300,  max: 3500, mode: 'UPI',  category: 'Shopping',          freq: 3 },
        { narration: 'OLA RIDE',              min: 80,   max: 450,  mode: 'UPI',  category: 'Transport',         freq: 10 },
        { narration: 'PETROL PUMP BHARATH',   min: 1000, max: 3000, mode: 'UPI',  category: 'Transport',         freq: 2 },
        { narration: 'APOLLO PHARMACY',       min: 200,  max: 1500, mode: 'UPI',  category: 'Health',            freq: 1 },
        { narration: 'BOOKMYSHOW TICKETS',    min: 300,  max: 1200, mode: 'UPI',  category: 'Entertainment',     freq: 2 },
        { narration: 'RESTAURANT DINING',     min: 400,  max: 2000, mode: 'UPI',  category: 'Food & Dining',    freq: 3 },
        { narration: 'UDEMY COURSE',          min: 399,  max: 3499, mode: 'UPI',  category: 'Education',         freq: 1 },
        { narration: 'MYNTRA FASHION',        min: 500,  max: 4000, mode: 'UPI',  category: 'Shopping',          freq: 2 },
        { narration: 'UBER EATS',             min: 100,  max: 500,  mode: 'UPI',  category: 'Food & Dining',    freq: 4 },
        { narration: 'IRCTC TRAIN BOOKING',   min: 300,  max: 2500, mode: 'UPI',  category: 'Transport',         freq: 1 },
        { narration: 'COFFEE SHOP CCD',       min: 200,  max: 600,  mode: 'UPI',  category: 'Food & Dining',    freq: 5 },
    ];

    for (let m = months - 1; m >= 0; m--) {
        const year  = new Date(now.getFullYear(), now.getMonth() - m, 1).getFullYear();
        const month = new Date(now.getFullYear(), now.getMonth() - m, 1).getMonth();

        // Add recurring
        recurringExpenses.forEach(exp => {
            const variance = Math.round((Math.random() - 0.5) * exp.amount * 0.05);
            txns.push({
                txnId: uid(),
                type: 'DEBIT',
                amount: exp.amount + variance,
                narration: exp.narration,
                mode: exp.mode,
                date: new Date(year, month, 5 + Math.floor(Math.random() * 8)).toISOString(),
                balance: 0,
                reference: uid(),
                category: exp.category,
            });
        });

        // Add variable
        variableExpenses.forEach(exp => {
            const count = Math.floor(exp.freq * (0.7 + Math.random() * 0.6));
            for (let i = 0; i < count; i++) {
                const amount = Math.round(exp.min + Math.random() * (exp.max - exp.min));
                txns.push({
                    txnId: uid(),
                    type: 'DEBIT',
                    amount,
                    narration: exp.narration,
                    mode: exp.mode,
                    date: new Date(year, month, 1 + Math.floor(Math.random() * 27)).toISOString(),
                    balance: 0,
                    reference: uid(),
                    category: exp.category,
                });
            }
        });

        // Occasional freelance income
        if (Math.random() > 0.5) {
            txns.push({
                txnId: uid(),
                type: 'CREDIT',
                amount: 5000 + Math.round(Math.random() * 20000),
                narration: 'NEFT FREELANCE PAYMENT',
                mode: 'NEFT',
                date: new Date(year, month, 15 + Math.floor(Math.random() * 10)).toISOString(),
                balance: 0,
                reference: uid(),
                category: 'Salary / Income',
            });
        }
    }

    // Sort by date descending and compute running balance (simple approximation)
    txns.sort((a, b) => new Date(b.date) - new Date(a.date));
    let balance = 125000 + Math.round(Math.random() * 30000);
    txns.forEach(t => {
        t.balance = balance;
        balance += t.type === 'DEBIT' ? t.amount : -t.amount;
    });

    return txns;
}

/* ========================================
   Finvu API Helpers (via CORS proxy)
   ======================================== */

/**
 * Call Finvu API through the local CORS proxy.
 * Returns { ok, data, error }.
 *
 * @param {string} endpoint – relative path e.g. '/v2/consent'
 * @param {Object} options  – fetch options (method, headers, body)
 * @param {string} [token]  – Bearer token
 * @returns {Promise<{ok: boolean, data: any, error: string|null}>}
 */
async function callFinvuApi(endpoint, options = {}, token = null) {
    // Skip API calls entirely when no CORS proxy is available (static hosting)
    if (!CORS_PROXY_URL) {
        return { ok: false, data: null, error: 'No backend proxy configured' };
    }

    const targetUrl = encodeURIComponent(`${FINVU_API_URL}${endpoint}`);
    const proxyUrl = `${CORS_PROXY_URL}?url=${targetUrl}`;

    const headers = {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        ...(options.headers || {}),
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

    try {
        const res = await fetch(proxyUrl, { ...options, headers, signal: controller.signal });
        clearTimeout(timeoutId);
        const data = await res.json().catch(() => ({}));
        return { ok: res.ok, data, error: res.ok ? null : (data.message || `HTTP ${res.status}`) };
    } catch (err) {
        clearTimeout(timeoutId);
        return { ok: false, data: null, error: err.name === 'AbortError' ? 'Request timed out' : err.message };
    }
}

/**
 * Returns whether real Finvu FIU credentials are configured.
 * Exported so the UI can check before attempting the real flow.
 */
export function isFIUConfigured() {
    return hasRealFIUCredentials() && !!CORS_PROXY_URL;
}

/**
 * Authenticate the FIU with Finvu and obtain a bearer token.
 * Automatically uses the configured FINVU_FIU_USERNAME / PASSWORD constants.
 * Returns {ok: false} immediately if credentials are not configured.
 * @returns {Promise<{ok: boolean, token?: string, error?: string}>}
 */
export async function authenticateFIU() {
    if (!hasRealFIUCredentials()) {
        console.info('[finvu-service] No real FIU credentials configured — skipping API call, using demo mode.');
        console.info('[finvu-service] To enable real bank data: set FINVU_FIU_USERNAME, FINVU_FIU_PASSWORD, FINVU_FIU_ENTITY_ID in finvu-service.js');
        return { ok: false, error: 'No FIU credentials configured' };
    }
    if (!CORS_PROXY_URL) {
        console.info('[finvu-service] No CORS proxy available on this host — skipping API call.');
        return { ok: false, error: 'No CORS proxy available' };
    }
    const result = await callFinvuApi('/v1/user/login', {
        method: 'POST',
        body: JSON.stringify({ username: FINVU_FIU_USERNAME, password: FINVU_FIU_PASSWORD }),
    });
    if (result.ok && result.data?.token) {
        return { ok: true, token: result.data.token };
    }
    console.warn('[finvu-service] FIU authentication failed:', result.error);
    return { ok: false, error: result.error || 'Authentication failed' };
}

/**
 * Create a consent request at Finvu and obtain a ConsentHandle.
 * @param {string}   token          – FIU bearer token from authenticateFIU()
 * @param {string}   customerHandle – Customer AA handle (mobile@finvu)
 * @param {string}   fiuEntityId    – Registered FIU entity ID
 * @param {string}   dataRangeFrom  – ISO date string (start of data range)
 * @param {string}   dataRangeTo    – ISO date string (end of data range)
 * @returns {Promise<{ok: boolean, consentHandle?: string, error?: string}>}
 */
export async function createConsentRequest(token, customerHandle, fiuEntityId, dataRangeFrom, dataRangeTo) {
    const txnId = uid();
    const now   = new Date();
    const expiry = new Date(now);
    expiry.setFullYear(expiry.getFullYear() + 1);

    const payload = {
        ver: '2.0',
        timestamp: isoTs(),
        txnid: txnId,
        ConsentDetail: {
            consentStart: isoTs(now),
            consentExpiry: isoTs(expiry),
            consentMode: 'VIEW',
            fetchType: 'PERIODIC',
            consentTypes: ['TRANSACTIONS', 'PROFILE', 'SUMMARY'],
            fiTypes: ['DEPOSIT', 'CREDIT_CARD', 'RECURRING_DEPOSIT'],
            DataConsumer: { id: fiuEntityId },
            Customer: { id: customerHandle },
            Purpose: {
                code: PURPOSE_CODE,
                refUri: 'https://api.rebit.org.in/aa/purpose/101.xml',
                text: 'Wealth management and personal finance analysis',
                Category: { type: 'Personal Finance' },
            },
            FIDataRange: { from: dataRangeFrom, to: dataRangeTo },
            DataLife: { unit: 'YEAR', value: 1 },
            Frequency: { unit: 'DAY', value: 1 },
            DataFilter: [{ type: 'TRANSACTIONAMOUNT', operator: '>=', value: '0' }],
        },
    };

    const result = await callFinvuApi('/v2/consent', {
        method: 'POST',
        body: JSON.stringify(payload),
    }, token);

    if (result.ok && result.data?.ConsentHandle) {
        return { ok: true, consentHandle: result.data.ConsentHandle };
    }
    console.warn('[finvu-service] createConsentRequest failed:', result.error, result.data);
    return { ok: false, error: result.error || 'Failed to create consent request' };
}

/**
 * Build the Finvu WebView URL to redirect the user for consent approval.
 * @param {string} consentHandle   – from createConsentRequest()
 * @param {string} customerMobile  – 10-digit mobile number
 * @param {string} redirectUrl     – URL to return to after consent
 * @returns {string}
 */
export function buildWebviewUrl(consentHandle, customerMobile, redirectUrl) {
    const params = new URLSearchParams({
        consentHandleId: consentHandle,
        mobile: customerMobile,
        redirect_url: redirectUrl,
    });
    return `${FINVU_WEBVIEW_URL}?${params.toString()}`;
}

/**
 * Fetch consent status from Finvu.
 * @param {string} token          – FIU bearer token
 * @param {string} consentHandle  – ConsentHandle returned at creation
 * @returns {Promise<{ok: boolean, status?: string, consentId?: string, error?: string}>}
 */
export async function fetchConsentStatus(token, consentHandle) {
    const result = await callFinvuApi(`/v2/Consent/fetch/${consentHandle}`, {
        method: 'GET',
    }, token);

    if (result.ok && result.data?.ConsentStatus) {
        return {
            ok: true,
            status: result.data.ConsentStatus,
            consentId: result.data.id || result.data.consentId,
        };
    }
    return { ok: false, error: result.error || 'Could not fetch consent status' };
}

/**
 * Create a Financial Information (FI) fetch session.
 * @param {string} token      – FIU bearer token
 * @param {string} consentId  – Approved consent ID
 * @param {string} from       – ISO date (data range start)
 * @param {string} to         – ISO date (data range end)
 * @returns {Promise<{ok: boolean, sessionId?: string, error?: string}>}
 */
export async function createFISession(token, consentId, from, to) {
    const payload = {
        ver: '2.0',
        timestamp: isoTs(),
        txnid: uid(),
        FIDataRange: { from, to },
        Consent: { id: consentId },
    };

    const result = await callFinvuApi('/v2/FI/request', {
        method: 'POST',
        body: JSON.stringify(payload),
    }, token);

    if (result.ok && result.data?.sessionId) {
        return { ok: true, sessionId: result.data.sessionId };
    }
    return { ok: false, error: result.error || 'Failed to create FI session' };
}

/**
 * Fetch the financial data for a session.
 * NOTE: In a real integration, the data payload is JWE-encrypted and must be
 * decrypted server-side. This function returns the raw response for inspection.
 * @param {string} token      – FIU bearer token
 * @param {string} sessionId  – from createFISession()
 * @returns {Promise<{ok: boolean, data?: any, error?: string}>}
 */
export async function fetchFIData(token, sessionId) {
    const result = await callFinvuApi(`/v2/FI/fetch/${sessionId}`, {
        method: 'GET',
    }, token);

    return result;
}

/* ========================================
   Firebase – Consent Operations
   ======================================== */

/**
 * Persist a consent record to Firebase under the current user.
 * @param {string} userId
 * @param {Object} consentData
 * @returns {Promise<boolean>}
 */
export async function saveConsentToFirebase(userId, consentData) {
    try {
        const handle = consentData.consentHandle || uid();
        const consentRef = ref(database, `users/${userId}/bankConsents/${handle}`);
        await set(consentRef, {
            ...consentData,
            updatedAt: Date.now(),
        });
        return true;
    } catch (err) {
        console.error('[finvu-service] saveConsent error', err);
        return false;
    }
}

/**
 * Update specific fields of an existing consent record.
 * @param {string} userId
 * @param {string} consentHandle
 * @param {Object} updates
 * @returns {Promise<boolean>}
 */
export async function updateConsentInFirebase(userId, consentHandle, updates) {
    try {
        const consentRef = ref(database, `users/${userId}/bankConsents/${consentHandle}`);
        await update(consentRef, { ...updates, updatedAt: Date.now() });
        return true;
    } catch (err) {
        console.error('[finvu-service] updateConsent error', err);
        return false;
    }
}

/**
 * Load all consent records for a user from Firebase.
 * @param {string} userId
 * @returns {Promise<Array<Object>>}
 */
export async function getConsentsFromFirebase(userId) {
    try {
        const consentsRef = ref(database, `users/${userId}/bankConsents`);
        const snapshot = await get(consentsRef);
        if (!snapshot.exists()) return [];
        const data = snapshot.val();
        return Object.entries(data).map(([handle, rec]) => ({ ...rec, consentHandle: handle }));
    } catch (err) {
        console.error('[finvu-service] getConsents error', err);
        return [];
    }
}

/**
 * Revoke / delete a consent record from Firebase.
 * @param {string} userId
 * @param {string} consentHandle
 * @returns {Promise<boolean>}
 */
export async function revokeConsentInFirebase(userId, consentHandle) {
    try {
        const consentRef = ref(database, `users/${userId}/bankConsents/${consentHandle}`);
        await update(consentRef, { status: 'REVOKED', updatedAt: Date.now() });
        return true;
    } catch (err) {
        console.error('[finvu-service] revokeConsent error', err);
        return false;
    }
}

/* ========================================
   Firebase – Transaction Operations
   ======================================== */

/**
 * Save a batch of transactions to Firebase for caching.
 * @param {string}        userId
 * @param {Array<Object>} transactions
 * @returns {Promise<boolean>}
 */
export async function saveTransactionsToFirebase(userId, transactions) {
    try {
        const writes = {};
        transactions.forEach(txn => {
            writes[txn.txnId] = {
                ...txn,
                fetchedAt: Date.now(),
            };
        });
        // Write transactions to user's bankTransactions node
        const txnRef = ref(database, `users/${userId}/bankTransactions`);
        await update(txnRef, writes);
        return true;
    } catch (err) {
        console.error('[finvu-service] saveTransactions error', err);
        return false;
    }
}

/**
 * Load cached transactions for a user from Firebase.
 * @param {string}  userId
 * @param {number}  [limit=200] – maximum number of transactions to return
 * @returns {Promise<Array<Object>>}
 */
export async function getTransactionsFromFirebase(userId, limit = 200) {
    try {
        const txnsRef = ref(database, `users/${userId}/bankTransactions`);
        const snapshot = await get(txnsRef);
        if (!snapshot.exists()) return [];
        const data = snapshot.val();
        const txns = Object.values(data).sort((a, b) => new Date(b.date) - new Date(a.date));
        return txns.slice(0, limit);
    } catch (err) {
        console.error('[finvu-service] getTransactions error', err);
        return [];
    }
}

/**
 * Clear all cached transactions for a user (e.g. after revoking consent).
 * @param {string} userId
 * @returns {Promise<boolean>}
 */
export async function clearTransactionsFromFirebase(userId) {
    try {
        const txnsRef = ref(database, `users/${userId}/bankTransactions`);
        await remove(txnsRef);
        return true;
    } catch (err) {
        console.error('[finvu-service] clearTransactions error', err);
        return false;
    }
}

/* ========================================
   Financial Analysis Engine
   ======================================== */

/**
 * Aggregate transactions into a monthly summary.
 * @param {Array<Object>} transactions
 * @returns {Array<{month: string, income: number, expense: number, savings: number}>}
 */
export function buildMonthlySummary(transactions) {
    const map = {};

    transactions.forEach(txn => {
        const d = new Date(txn.date);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        if (!map[key]) map[key] = { month: key, income: 0, expense: 0 };
        if (txn.type === 'CREDIT') map[key].income  += txn.amount;
        else                        map[key].expense += txn.amount;
    });

    return Object.values(map)
        .map(m => ({ ...m, savings: m.income - m.expense }))
        .sort((a, b) => a.month.localeCompare(b.month));
}

/**
 * Aggregate debit (expense) amounts by category.
 * @param {Array<Object>} transactions
 * @returns {Array<{name: string, total: number, color: string, icon: string, count: number}>}
 */
export function buildCategoryBreakdown(transactions) {
    const map = {};

    transactions
        .filter(t => t.type === 'DEBIT')
        .forEach(t => {
            const cat = t.category || 'Others';
            if (!map[cat]) map[cat] = { name: cat, total: 0, count: 0 };
            map[cat].total += t.amount;
            map[cat].count += 1;
        });

    // Merge in colour / icon data
    return Object.values(map)
        .map(item => {
            const cfg = CATEGORY_CONFIG.find(c => c.name === item.name)
                || { color: '#6c757d', icon: 'bi-three-dots' };
            return { ...item, color: cfg.color, icon: cfg.icon };
        })
        .sort((a, b) => b.total - a.total);
}

/**
 * Compute a Financial Health Score (0–100) based on:
 *  - Savings rate (40 pts)  – target 20 %
 *  - Investment ratio (30 pts) – target 15 % of income
 *  - Expense consistency (30 pts) – variance penalty
 *
 * @param {Array<Object>} transactions
 * @returns {{ score: number, label: string, color: string, components: Object }}
 */
export function computeHealthScore(transactions) {
    const monthly = buildMonthlySummary(transactions);
    if (monthly.length === 0) return { score: 0, label: 'No Data', color: '#6c757d', components: {} };

    const totalIncome    = monthly.reduce((s, m) => s + m.income,  0);
    const totalExpense   = monthly.reduce((s, m) => s + m.expense, 0);
    const totalSavings   = totalIncome - totalExpense;

    const investTxns     = transactions.filter(t => t.category === 'Investment' && t.type === 'DEBIT');
    const totalInvested  = investTxns.reduce((s, t) => s + t.amount, 0);

    // Savings rate score (max 40)
    const savingsRate    = totalIncome > 0 ? (totalSavings / totalIncome) * 100 : 0;
    const savingsScore   = Math.min(40, Math.round((savingsRate / 20) * 40));

    // Investment score (max 30)
    const investRate     = totalIncome > 0 ? (totalInvested / totalIncome) * 100 : 0;
    const investScore    = Math.min(30, Math.round((investRate / 15) * 30));

    // Expense consistency score (max 30)
    const avgExp = monthly.reduce((s, m) => s + m.expense, 0) / monthly.length;
    const variance = monthly.reduce((s, m) => s + Math.pow(m.expense - avgExp, 2), 0) / monthly.length;
    const stddev = Math.sqrt(variance);
    const cv = avgExp > 0 ? stddev / avgExp : 1;
    const consistencyScore = Math.min(30, Math.round((1 - Math.min(cv, 1)) * 30));

    const score = savingsScore + investScore + consistencyScore;

    let label, color;
    if      (score >= 80) { label = 'Excellent'; color = '#3ddc84'; }
    else if (score >= 60) { label = 'Good';      color = '#ffb454'; }
    else if (score >= 40) { label = 'Fair';      color = '#fd7e14'; }
    else                  { label = 'Needs Work';color = '#ff6b6b'; }

    return {
        score,
        label,
        color,
        components: { savingsScore, investScore, consistencyScore, savingsRate, investRate },
    };
}

/**
 * Generate personalised financial suggestions based on transaction patterns.
 * @param {Array<Object>} transactions
 * @returns {Array<{title: string, body: string, type: 'warning'|'success'|'info'|'danger'}>}
 */
export function generateSuggestions(transactions) {
    const suggestions = [];
    const monthly    = buildMonthlySummary(transactions);
    const cats       = buildCategoryBreakdown(transactions);

    if (monthly.length === 0) return [];

    const totalIncome  = monthly.reduce((s, m) => s + m.income,  0);
    const totalExpense = monthly.reduce((s, m) => s + m.expense, 0);
    const savingsRate  = totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome) * 100 : 0;
    const avgMonthly   = monthly.reduce((s, m) => s + m.income, 0) / monthly.length;
    const emergencyFund = avgMonthly * 6;

    // Savings rate suggestion
    if (savingsRate < 10) {
        suggestions.push({ title: 'Low savings rate detected', body: `You are saving only ${savingsRate.toFixed(1)}% of your income. Financial experts recommend saving at least 20%. Try reducing discretionary spends by ₹5,000–₹10,000 per month.`, type: 'danger', icon: 'bi-exclamation-triangle-fill' });
    } else if (savingsRate < 20) {
        suggestions.push({ title: 'Boost your savings', body: `Your savings rate is ${savingsRate.toFixed(1)}%. With a small increase to 20% you could save an extra ₹${fmtINR(avgMonthly * 0.05)} per month.`, type: 'warning', icon: 'bi-piggy-bank-fill' });
    } else {
        suggestions.push({ title: 'Great savings discipline!', body: `You maintain a solid savings rate of ${savingsRate.toFixed(1)}%. Keep it up and consider increasing SIP contributions.`, type: 'success', icon: 'bi-check-circle-fill' });
    }

    // Food spend suggestion
    const foodCat = cats.find(c => c.name === 'Food & Dining');
    if (foodCat && totalIncome > 0 && (foodCat.total / totalIncome) * 100 > 15) {
        suggestions.push({ title: 'High food & dining spend', body: `Food & dining accounts for ${((foodCat.total / totalIncome) * 100).toFixed(1)}% of your income. Consider meal-prepping or reducing food delivery orders by 2–3 per week to save ~₹1,500/month.`, type: 'warning', icon: 'bi-cup-hot-fill' });
    }

    // Investment suggestion
    const investCat = cats.find(c => c.name === 'Investment');
    if (!investCat || (investCat && totalIncome > 0 && (investCat.total / totalIncome) * 100 < 5)) {
        suggestions.push({ title: 'Start or increase investments', body: 'You are investing less than 5% of your income. Even a monthly SIP of ₹2,000 in an index fund can grow significantly over time due to compounding.', type: 'info', icon: 'bi-graph-up-arrow' });
    }

    // Emergency fund reminder
    suggestions.push({ title: 'Build an emergency fund', body: `Keep at least ₹${fmtINR(emergencyFund)} (6× monthly income) in a liquid FD or high-yield savings account to cover unexpected expenses.`, type: 'info', icon: 'bi-shield-fill-check' });

    // Entertainment spend
    const entCat = cats.find(c => c.name === 'Entertainment');
    if (entCat && totalIncome > 0 && (entCat.total / totalIncome) * 100 > 8) {
        suggestions.push({ title: 'Review entertainment subscriptions', body: 'Entertainment spending is above 8% of your income. Review active subscriptions — you may be paying for services you barely use.', type: 'warning', icon: 'bi-play-circle-fill' });
    }

    // 50/30/20 rule
    const needs = totalExpense;
    const needsPct = totalIncome > 0 ? (needs / totalIncome) * 100 : 0;
    if (needsPct > 70) {
        suggestions.push({ title: '50/30/20 budget rule', body: `Your total expenses are ${needsPct.toFixed(0)}% of income. The 50/30/20 rule recommends: 50% needs, 30% wants, 20% savings. Aim to reduce total expenses below 80% of income.`, type: 'info', icon: 'bi-pie-chart-fill' });
    }

    return suggestions;
}
