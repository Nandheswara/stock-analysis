/**
 * Firebase Finance Service
 * 
 * Handles all database operations for the Finance Tracker including:
 * - CRUD operations for investment categories and items
 * - CRUD operations for bank accounts
 * - CRUD operations for credit cards
 * - CRUD operations for monthly income
 * - Monthly snapshot computation and storage
 * - Real-time listeners with localStorage caching
 * - Impersonation support for admins
 * 
 * @module firebase-finance-service
 */

import { database } from './firebase-config.js';
import { getCurrentUser, waitForAuthReady } from './firebase-auth-service.js';
import { 
    ref, 
    set, 
    get, 
    update, 
    remove, 
    onValue, 
    push 
} from "https://www.gstatic.com/firebasejs/11.1.0/firebase-database.js";

/**
 * Cache keys
 */
const CACHE_KEYS = {
    CATEGORIES: 'financeCategories',
    BANKS: 'financeBanks',
    CREDIT_CARDS: 'financeCreditCards',
    INCOME: 'financeIncome',
    SNAPSHOTS: 'financeSnapshots'
};

const CACHE_DURATION = 60 * 60 * 1000; // 1 hour

let listeners = {};

/**
 * Get effective user ID (handles impersonation)
 */
function getEffectiveUserId() {
    const impersonatedUserId = sessionStorage.getItem('impersonatedUserId');
    if (impersonatedUserId) return impersonatedUserId;
    const user = getCurrentUser();
    return user ? user.uid : null;
}

/**
 * Get authenticated user, waiting for auth if needed
 */
async function getAuthenticatedUser() {
    let user = getCurrentUser();
    if (user && user._fromCache) {
        user = await waitForAuthReady();
    }
    return user;
}

/**
 * Get user finance ref
 */
function getFinanceRef(path = '') {
    const userId = getEffectiveUserId();
    if (!userId) return null;
    return ref(database, `users/${userId}/finance${path ? '/' + path : ''}`);
}

// ========================================
// localStorage Cache Helpers
// ========================================

function saveToCache(key, userId, data) {
    try {
        const cacheKey = `${key}_${userId}`;
        localStorage.setItem(cacheKey, JSON.stringify(data));
        localStorage.setItem(`${cacheKey}_ts`, Date.now().toString());
    } catch (e) { /* silent */ }
}

function loadFromCache(key, userId) {
    try {
        const cacheKey = `${key}_${userId}`;
        const cached = localStorage.getItem(cacheKey);
        const ts = localStorage.getItem(`${cacheKey}_ts`);
        if (cached && ts && (Date.now() - parseInt(ts)) < CACHE_DURATION) {
            return JSON.parse(cached);
        }
    } catch (e) { /* silent */ }
    return null;
}

// ========================================
// CATEGORIES CRUD
// ========================================

/**
 * Add a new category
 */
export async function addCategory(categoryData) {
    const user = await getAuthenticatedUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    try {
        const categoriesRef = ref(database, `users/${user.uid}/finance/categories`);
        const newRef = push(categoriesRef);
        const data = {
            name: categoryData.name,
            icon: categoryData.icon || 'bi-folder',
            color: categoryData.color || '#7289ff',
            createdAt: Date.now(),
            updatedAt: Date.now()
        };
        await set(newRef, data);
        return { success: true, id: newRef.key };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

/**
 * Update a category
 */
export async function updateCategory(categoryId, updates) {
    const user = await getAuthenticatedUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    try {
        const catRef = ref(database, `users/${user.uid}/finance/categories/${categoryId}`);
        await update(catRef, { ...updates, updatedAt: Date.now() });
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

/**
 * Delete a category and all its items
 */
export async function deleteCategory(categoryId) {
    const user = await getAuthenticatedUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    try {
        const catRef = ref(database, `users/${user.uid}/finance/categories/${categoryId}`);
        await remove(catRef);
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// ========================================
// CATEGORY ITEMS CRUD
// ========================================

/**
 * Add item to a category
 */
export async function addCategoryItem(categoryId, itemData) {
    const user = await getAuthenticatedUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    try {
        const itemsRef = ref(database, `users/${user.uid}/finance/categories/${categoryId}/items`);
        const newRef = push(itemsRef);
        const data = {
            name: itemData.name,
            amount: parseFloat(itemData.amount) || 0,
            month: itemData.month, // "YYYY-MM" format
            date: itemData.date || new Date().toISOString().split('T')[0],
            notes: itemData.notes || '',
            updatedAt: Date.now()
        };
        await set(newRef, data);
        return { success: true, id: newRef.key };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

/**
 * Update a category item
 */
export async function updateCategoryItem(categoryId, itemId, updates) {
    const user = await getAuthenticatedUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    try {
        const itemRef = ref(database, `users/${user.uid}/finance/categories/${categoryId}/items/${itemId}`);
        await update(itemRef, { ...updates, updatedAt: Date.now() });
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

/**
 * Delete a category item
 */
export async function deleteCategoryItem(categoryId, itemId) {
    const user = await getAuthenticatedUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    try {
        const itemRef = ref(database, `users/${user.uid}/finance/categories/${categoryId}/items/${itemId}`);
        await remove(itemRef);
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// ========================================
// BANK ACCOUNTS CRUD
// ========================================

/**
 * Add a bank account
 */
export async function addBank(bankData) {
    const user = await getAuthenticatedUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    try {
        const banksRef = ref(database, `users/${user.uid}/finance/banks`);
        const newRef = push(banksRef);
        const data = {
            name: bankData.name,
            bankName: bankData.bankName,
            accountType: bankData.accountType || 'savings',
            balance: parseFloat(bankData.balance) || 0,
            color: bankData.color || '#3ddc84',
            updatedAt: Date.now()
        };
        await set(newRef, data);
        return { success: true, id: newRef.key };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

/**
 * Update a bank account
 */
export async function updateBank(bankId, updates) {
    const user = await getAuthenticatedUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    try {
        const bankRef = ref(database, `users/${user.uid}/finance/banks/${bankId}`);
        if (updates.balance !== undefined) updates.balance = parseFloat(updates.balance);
        await update(bankRef, { ...updates, updatedAt: Date.now() });
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

/**
 * Delete a bank account
 */
export async function deleteBank(bankId) {
    const user = await getAuthenticatedUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    try {
        const bankRef = ref(database, `users/${user.uid}/finance/banks/${bankId}`);
        await remove(bankRef);
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// ========================================
// CREDIT CARDS CRUD
// ========================================

/**
 * Add a credit card
 */
export async function addCreditCard(cardData) {
    const user = await getAuthenticatedUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    try {
        const cardsRef = ref(database, `users/${user.uid}/finance/creditCards`);
        const newRef = push(cardsRef);
        const data = {
            name: cardData.name,
            issuer: cardData.issuer,
            outstandingBalance: parseFloat(cardData.outstandingBalance) || 0,
            creditLimit: parseFloat(cardData.creditLimit) || 0,
            dueDate: cardData.dueDate || '',
            color: cardData.color || '#ff6b6b',
            updatedAt: Date.now()
        };
        await set(newRef, data);
        return { success: true, id: newRef.key };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

/**
 * Update a credit card
 */
export async function updateCreditCard(cardId, updates) {
    const user = await getAuthenticatedUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    try {
        const cardRef = ref(database, `users/${user.uid}/finance/creditCards/${cardId}`);
        if (updates.outstandingBalance !== undefined) updates.outstandingBalance = parseFloat(updates.outstandingBalance);
        if (updates.creditLimit !== undefined) updates.creditLimit = parseFloat(updates.creditLimit);
        await update(cardRef, { ...updates, updatedAt: Date.now() });
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

/**
 * Delete a credit card
 */
export async function deleteCreditCard(cardId) {
    const user = await getAuthenticatedUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    try {
        const cardRef = ref(database, `users/${user.uid}/finance/creditCards/${cardId}`);
        await remove(cardRef);
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// ========================================
// INCOME CRUD
// ========================================

/**
 * Save monthly income
 * @param {string} month - "YYYY-MM" format
 * @param {Object} incomeData - { salary, otherIncome }
 */
export async function saveIncome(month, incomeData) {
    const user = await getAuthenticatedUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    try {
        const incomeRef = ref(database, `users/${user.uid}/finance/income/${month}`);
        const salary = parseFloat(incomeData.salary) || 0;
        const otherIncome = parseFloat(incomeData.otherIncome) || 0;
        const data = {
            salary,
            otherIncome,
            totalIncome: salary + otherIncome,
            updatedAt: Date.now()
        };
        await set(incomeRef, data);
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

/**
 * Get income for a specific month
 */
export async function getIncome(month) {
    const user = await getAuthenticatedUser();
    if (!user) return null;

    try {
        const incomeRef = ref(database, `users/${user.uid}/finance/income/${month}`);
        const snapshot = await get(incomeRef);
        return snapshot.exists() ? snapshot.val() : null;
    } catch (error) {
        return null;
    }
}

// ========================================
// MONTHLY SNAPSHOTS
// ========================================

/**
 * Save/update a monthly snapshot
 */
export async function saveMonthlySnapshot(month, snapshotData) {
    const user = await getAuthenticatedUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    try {
        const snapRef = ref(database, `users/${user.uid}/finance/monthlySnapshots/${month}`);
        const data = {
            ...snapshotData,
            timestamp: Date.now()
        };
        await set(snapRef, data);
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// ========================================
// REAL-TIME LISTENERS
// ========================================

/**
 * Listen to all finance data changes
 * @param {Function} callback - Called with { categories, banks, creditCards, income, snapshots }
 * @returns {Function} Unsubscribe function
 */
export function listenToFinanceData(callback) {
    let user = getCurrentUser();
    const userId = user?.uid;

    // Clean up existing listeners
    unsubscribeAll();

    if (!userId) {
        callback({ categories: {}, banks: {}, creditCards: {}, income: {}, snapshots: {} });
        return () => {};
    }

    // Serve cached data first
    const cachedCategories = loadFromCache(CACHE_KEYS.CATEGORIES, userId);
    const cachedBanks = loadFromCache(CACHE_KEYS.BANKS, userId);
    const cachedCards = loadFromCache(CACHE_KEYS.CREDIT_CARDS, userId);
    const cachedIncome = loadFromCache(CACHE_KEYS.INCOME, userId);
    const cachedSnapshots = loadFromCache(CACHE_KEYS.SNAPSHOTS, userId);

    const hasCache = cachedCategories || cachedBanks || cachedCards;
    if (hasCache) {
        queueMicrotask(() => callback({
            categories: cachedCategories || {},
            banks: cachedBanks || {},
            creditCards: cachedCards || {},
            income: cachedIncome || {},
            snapshots: cachedSnapshots || {}
        }));
    }

    // Data store
    const store = {
        categories: cachedCategories || {},
        banks: cachedBanks || {},
        creditCards: cachedCards || {},
        income: cachedIncome || {},
        snapshots: cachedSnapshots || {}
    };

    let isFirstCallback = hasCache;
    let debounceTimer = null;

    function emitUpdate() {
        // Debounce: batch rapid listener firings into a single callback
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            callback({ ...store });
        }, 100);
    }

    function setupListeners(uid) {
        // Categories listener
        const catRef = ref(database, `users/${uid}/finance/categories`);
        listeners.categories = onValue(catRef, (snapshot) => {
            store.categories = snapshot.val() || {};
            saveToCache(CACHE_KEYS.CATEGORIES, uid, store.categories);
            if (isFirstCallback) { isFirstCallback = false; return; }
            emitUpdate();
        }, () => {});

        // Banks listener
        const banksRef = ref(database, `users/${uid}/finance/banks`);
        listeners.banks = onValue(banksRef, (snapshot) => {
            store.banks = snapshot.val() || {};
            saveToCache(CACHE_KEYS.BANKS, uid, store.banks);
            emitUpdate();
        }, () => {});

        // Credit Cards listener
        const cardsRef = ref(database, `users/${uid}/finance/creditCards`);
        listeners.creditCards = onValue(cardsRef, (snapshot) => {
            store.creditCards = snapshot.val() || {};
            saveToCache(CACHE_KEYS.CREDIT_CARDS, uid, store.creditCards);
            emitUpdate();
        }, () => {});

        // Income listener
        const incomeRef = ref(database, `users/${uid}/finance/income`);
        listeners.income = onValue(incomeRef, (snapshot) => {
            store.income = snapshot.val() || {};
            saveToCache(CACHE_KEYS.INCOME, uid, store.income);
            emitUpdate();
        }, () => {});

        // Snapshots: load once, don't listen (snapshots are written by the UI,
        // listening to them would create an infinite render→write→listen loop)
        const snapRef = ref(database, `users/${uid}/finance/monthlySnapshots`);
        get(snapRef).then((snapshot) => {
            store.snapshots = snapshot.val() || {};
            saveToCache(CACHE_KEYS.SNAPSHOTS, uid, store.snapshots);
        }).catch(() => {});
    }

    // If cached user, wait for auth then setup
    if (user && user._fromCache) {
        waitForAuthReady().then((confirmedUser) => {
            if (confirmedUser) {
                setupListeners(confirmedUser.uid);
            }
        });
    } else if (user) {
        setupListeners(user.uid);
    }

    return () => unsubscribeAll();
}

/**
 * Unsubscribe from all listeners
 */
function unsubscribeAll() {
    Object.values(listeners).forEach(unsub => {
        if (typeof unsub === 'function') unsub();
    });
    listeners = {};
}

// ========================================
// DEFAULT CATEGORIES
// ========================================

/**
 * Create default categories for new users
 */
export async function createDefaultCategories() {
    const user = await getAuthenticatedUser();
    if (!user) return;

    try {
        const catRef = ref(database, `users/${user.uid}/finance/categories`);
        const snapshot = await get(catRef);
        
        // Only create defaults if no categories exist
        if (snapshot.exists()) return;

        const defaults = [
            { name: 'Mutual Funds', icon: 'bi-graph-up-arrow', color: '#7289ff' },
            { name: 'Gold', icon: 'bi-gem', color: '#ffb454' },
            { name: 'Fixed Deposits', icon: 'bi-safe', color: '#3ddc84' },
            { name: 'Insurance', icon: 'bi-shield-check', color: '#ff6b6b' },
            { name: 'Real Estate', icon: 'bi-house-door', color: '#e066ff' },
            { name: 'PPF/NPS', icon: 'bi-piggy-bank', color: '#00bcd4' }
        ];

        for (const cat of defaults) {
            const newRef = push(catRef);
            await set(newRef, {
                name: cat.name,
                icon: cat.icon,
                color: cat.color,
                createdAt: Date.now(),
                updatedAt: Date.now()
            });
        }
    } catch (error) {
        console.error('Error creating default categories:', error);
    }
}

// ========================================
// UTILITY: Compute financial summary
// ========================================

/**
 * Compute financial metrics from raw data for a given month
 */
export function computeFinancialSummary(data, selectedMonth) {
    const { categories, banks, creditCards, income, snapshots } = data;

    // Total category investments for selected month
    let monthCategoryTotal = 0;
    let prevMonthCategoryTotal = 0;
    const categoryBreakdown = {};

    // Parse previous month
    const [year, mon] = selectedMonth.split('-').map(Number);
    const prevDate = new Date(year, mon - 2, 1);
    const prevMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;

    Object.entries(categories).forEach(([catId, cat]) => {
        let catMonthTotal = 0;
        let catPrevTotal = 0;
        if (cat.items) {
            Object.values(cat.items).forEach(item => {
                if (item.month === selectedMonth) {
                    catMonthTotal += (item.amount || 0);
                }
                if (item.month === prevMonth) {
                    catPrevTotal += (item.amount || 0);
                }
            });
        }
        categoryBreakdown[catId] = catMonthTotal;
        monthCategoryTotal += catMonthTotal;
        prevMonthCategoryTotal += catPrevTotal;
    });

    // Investment made this month = new category items this month
    const investedThisMonth = monthCategoryTotal;

    // Total bank balance (always current)
    let totalBankBalance = 0;
    Object.values(banks).forEach(bank => {
        totalBankBalance += (bank.balance || 0);
    });

    // Total credit card outstanding (liability)
    let totalCreditCardOutstanding = 0;
    Object.values(creditCards).forEach(card => {
        totalCreditCardOutstanding += (card.outstandingBalance || 0);
    });

    // All-time category totals
    let allTimeCategoryTotal = 0;
    Object.values(categories).forEach(cat => {
        if (cat.items) {
            Object.values(cat.items).forEach(item => {
                allTimeCategoryTotal += (item.amount || 0);
            });
        }
    });

    // Total Assets = bank balances + all category investments
    const totalAssets = totalBankBalance + allTimeCategoryTotal;

    // Total Liabilities = credit card outstanding
    const totalLiabilities = totalCreditCardOutstanding;

    // Net Worth = Assets - Liabilities
    const netWorth = totalAssets - totalLiabilities;

    // Income for selected month
    const monthIncome = income[selectedMonth] || { salary: 0, otherIncome: 0, totalIncome: 0 };

    // Expenditure = Income - Invested - (bank balance change estimations)
    // Simplified: expenditure = credit card outstanding (for the month)
    // More precise: if income is entered, expenditure = income - invested - (savings increase)
    const expenditure = Math.max(0, (monthIncome.totalIncome || 0) - investedThisMonth);

    return {
        monthCategoryTotal,
        prevMonthCategoryTotal,
        investedThisMonth,
        totalBankBalance,
        totalCreditCardOutstanding,
        allTimeCategoryTotal,
        totalAssets,
        totalLiabilities,
        netWorth,
        monthIncome,
        expenditure,
        categoryBreakdown,
        selectedMonth,
        prevMonth
    };
}
