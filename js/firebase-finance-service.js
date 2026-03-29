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
 * Add a bank account (with month-specific balance)
 */
export async function addBank(bankData, month) {
    const user = await getAuthenticatedUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    try {
        const banksRef = ref(database, `users/${user.uid}/finance/banks`);
        const newRef = push(banksRef);
        const data = {
            name: bankData.name,
            bankName: bankData.bankName,
            accountType: bankData.accountType || 'savings',
            color: bankData.color || '#3ddc84',
            updatedAt: Date.now(),
            balances: {}
        };
        // Store balance under the specified month
        if (month) {
            data.balances[month] = parseFloat(bankData.balance) || 0;
        }
        await set(newRef, data);
        return { success: true, id: newRef.key };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

/**
 * Update a bank account (month-specific balance)
 */
export async function updateBank(bankId, updates, month) {
    const user = await getAuthenticatedUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    try {
        const updateData = { updatedAt: Date.now() };
        // Copy non-balance fields
        if (updates.name !== undefined) updateData.name = updates.name;
        if (updates.bankName !== undefined) updateData.bankName = updates.bankName;
        if (updates.accountType !== undefined) updateData.accountType = updates.accountType;
        if (updates.color !== undefined) updateData.color = updates.color;

        // Store balance under the specific month
        if (updates.balance !== undefined && month) {
            updateData[`balances/${month}`] = parseFloat(updates.balance);
        }

        const bankRef = ref(database, `users/${user.uid}/finance/banks/${bankId}`);
        await update(bankRef, updateData);
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
 * Add a credit card (with month-specific outstanding)
 */
export async function addCreditCard(cardData, month) {
    const user = await getAuthenticatedUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    try {
        const cardsRef = ref(database, `users/${user.uid}/finance/creditCards`);
        const newRef = push(cardsRef);
        const data = {
            name: cardData.name,
            issuer: cardData.issuer,
            creditLimit: parseFloat(cardData.creditLimit) || 0,
            dueDate: cardData.dueDate || '',
            color: cardData.color || '#ff6b6b',
            updatedAt: Date.now(),
            balances: {}
        };
        // Store outstanding under the specified month
        if (month) {
            data.balances[month] = parseFloat(cardData.outstandingBalance) || 0;
        }
        await set(newRef, data);
        return { success: true, id: newRef.key };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

/**
 * Update a credit card (month-specific outstanding)
 */
export async function updateCreditCard(cardId, updates, month) {
    const user = await getAuthenticatedUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    try {
        const updateData = { updatedAt: Date.now() };
        // Copy non-balance fields
        if (updates.name !== undefined) updateData.name = updates.name;
        if (updates.issuer !== undefined) updateData.issuer = updates.issuer;
        if (updates.creditLimit !== undefined) updateData.creditLimit = parseFloat(updates.creditLimit);
        if (updates.dueDate !== undefined) updateData.dueDate = updates.dueDate;
        if (updates.color !== undefined) updateData.color = updates.color;

        // Store outstanding under the specific month
        if (updates.outstandingBalance !== undefined && month) {
            updateData[`balances/${month}`] = parseFloat(updates.outstandingBalance);
        }

        const cardRef = ref(database, `users/${user.uid}/finance/creditCards/${cardId}`);
        await update(cardRef, updateData);
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

/**
 * Copy bank and credit card balances from previous month to a target month.
 * Does NOT overwrite existing entries for the target month.
 * @param {string} targetMonth - "YYYY-MM" format
 * @returns {Promise<Object>} result with counts of copied entries
 */
export async function copyPreviousMonthData(targetMonth) {
    const user = await getAuthenticatedUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    try {
        // Calculate previous month
        const [year, mon] = targetMonth.split('-').map(Number);
        const prevDate = new Date(year, mon - 2, 1);
        const prevMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;

        const updates = {};
        let banksCopied = 0;
        let cardsCopied = 0;

        // Read current data
        const financeRef = ref(database, `users/${user.uid}/finance`);
        const snapshot = await get(financeRef);
        const data = snapshot.val() || {};

        // Copy bank balances
        if (data.banks) {
            Object.entries(data.banks).forEach(([bankId, bank]) => {
                // Get previous month balance (with backward compat)
                const prevBalance = bank.balances?.[prevMonth] ?? bank.balance ?? 0;
                // Only copy if target month doesn't already have data
                const targetBalance = bank.balances?.[targetMonth];
                if (targetBalance === undefined || targetBalance === null) {
                    updates[`banks/${bankId}/balances/${targetMonth}`] = prevBalance;
                    banksCopied++;
                }
            });
        }

        // Copy credit card balances
        if (data.creditCards) {
            Object.entries(data.creditCards).forEach(([cardId, card]) => {
                const prevOutstanding = card.balances?.[prevMonth] ?? card.outstandingBalance ?? 0;
                const targetOutstanding = card.balances?.[targetMonth];
                if (targetOutstanding === undefined || targetOutstanding === null) {
                    updates[`creditCards/${cardId}/balances/${targetMonth}`] = prevOutstanding;
                    cardsCopied++;
                }
            });
        }

        // Copy income
        if (data.income?.[prevMonth] && !data.income?.[targetMonth]) {
            updates[`income/${targetMonth}`] = {
                ...data.income[prevMonth],
                updatedAt: Date.now()
            };
        }

        if (Object.keys(updates).length > 0) {
            await update(financeRef, updates);
        }

        return {
            success: true,
            banksCopied,
            cardsCopied,
            prevMonth
        };
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

    // Track initial listener fires — all 4 listeners fire once on attach.
    // If we served cached data we can skip these initial fires entirely;
    // otherwise we batch them into a single callback after all 4 have reported.
    const TOTAL_LISTENERS = 4;
    let initialFiringCount = 0;
    let initialLoadDone = hasCache; // if cache was served, initial load is "done"
    let debounceTimer = null;

    function emitUpdate() {
        // Debounce: batch rapid listener firings into a single callback
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            callback({ ...store });
        }, 100);
    }

    function onListenerData(isInitialFire) {
        if (!initialLoadDone) {
            initialFiringCount++;
            if (initialFiringCount >= TOTAL_LISTENERS) {
                // All listeners have reported initial data — emit once
                initialLoadDone = true;
                emitUpdate();
            }
            return; // Don't emit individual initial fires
        }
        emitUpdate();
    }

    function setupListeners(uid) {
        // Categories listener
        const catRef = ref(database, `users/${uid}/finance/categories`);
        listeners.categories = onValue(catRef, (snapshot) => {
            store.categories = snapshot.val() || {};
            saveToCache(CACHE_KEYS.CATEGORIES, uid, store.categories);
            onListenerData();
        }, () => {});

        // Banks listener
        const banksRef = ref(database, `users/${uid}/finance/banks`);
        listeners.banks = onValue(banksRef, (snapshot) => {
            store.banks = snapshot.val() || {};
            saveToCache(CACHE_KEYS.BANKS, uid, store.banks);
            onListenerData();
        }, () => {});

        // Credit Cards listener
        const cardsRef = ref(database, `users/${uid}/finance/creditCards`);
        listeners.creditCards = onValue(cardsRef, (snapshot) => {
            store.creditCards = snapshot.val() || {};
            saveToCache(CACHE_KEYS.CREDIT_CARDS, uid, store.creditCards);
            onListenerData();
        }, () => {});

        // Income listener
        const incomeRef = ref(database, `users/${uid}/finance/income`);
        listeners.income = onValue(incomeRef, (snapshot) => {
            store.income = snapshot.val() || {};
            saveToCache(CACHE_KEYS.INCOME, uid, store.income);
            onListenerData();
        }, () => {});

        // Snapshots: load once, don't listen (snapshots are written by the UI,
        // listening to them would create an infinite render→write→listen loop)
        const snapRef = ref(database, `users/${uid}/finance/monthlySnapshots`);
        get(snapRef).then((snapshot) => {
            store.snapshots = snapshot.val() || {};
            saveToCache(CACHE_KEYS.SNAPSHOTS, uid, store.snapshots);
            // Trigger a re-render so charts that depend on snapshots actually get data
            if (initialLoadDone) {
                emitUpdate();
            }
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

        // Build all categories as a single object and write in one operation
        // to avoid triggering the listener 6 times
        const categoriesData = {};
        for (const cat of defaults) {
            const newRef = push(catRef);
            categoriesData[newRef.key] = {
                name: cat.name,
                icon: cat.icon,
                color: cat.color,
                createdAt: Date.now(),
                updatedAt: Date.now()
            };
        }
        await set(catRef, categoriesData);
    } catch (error) {
        console.error('Error creating default categories:', error);
    }
}

// ========================================
// UTILITY: Compute financial summary
// ========================================

/**
 * Compute financial metrics from raw data for a given month.
 * Bank/CC balances are read from month-specific `balances[month]` with
 * backward-compat fallback to top-level `balance`/`outstandingBalance`.
 *
 * Expenditure = Previous month CC bills + Bank account spends
 * Bank spends = Prev month bank total - Curr month bank total - Curr month income
 */
export function computeFinancialSummary(data, selectedMonth) {
    const { categories, banks, creditCards, income, snapshots } = data;

    // Parse previous month
    const [year, mon] = selectedMonth.split('-').map(Number);
    const prevDate = new Date(year, mon - 2, 1);
    const prevMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;

    // ── Category investments ──
    let monthCategoryTotal = 0;
    let prevMonthCategoryTotal = 0;
    const categoryBreakdown = {};

    Object.entries(categories).forEach(([catId, cat]) => {
        let catMonthTotal = 0;
        let catPrevTotal = 0;
        if (cat.items) {
            Object.values(cat.items).forEach(item => {
                if (item.month === selectedMonth) catMonthTotal += (item.amount || 0);
                if (item.month === prevMonth) catPrevTotal += (item.amount || 0);
            });
        }
        categoryBreakdown[catId] = catMonthTotal;
        monthCategoryTotal += catMonthTotal;
        prevMonthCategoryTotal += catPrevTotal;
    });

    const investedThisMonth = monthCategoryTotal;

    // ── Helper: get bank balance for a given month ──
    // If the new monthly format (balances obj) exists, return that month's value or 0.
    // Only fall back to old top-level `balance` for truly legacy data (no balances obj).
    function getBankBalance(bank, month) {
        if (bank.balances) {
            return bank.balances[month] || 0;
        }
        return bank.balance || 0;
    }

    // ── Helper: get CC outstanding for a given month ──
    function getCCOutstanding(card, month) {
        if (card.balances) {
            return card.balances[month] || 0;
        }
        return card.outstandingBalance || 0;
    }

    // ── Bank balances for selected month and previous month ──
    let totalBankBalance = 0;
    let prevMonthBankBalance = 0;
    Object.values(banks).forEach(bank => {
        totalBankBalance += getBankBalance(bank, selectedMonth);
        prevMonthBankBalance += getBankBalance(bank, prevMonth);
    });

    // ── Credit card outstanding for selected month and previous month ──
    let totalCreditCardOutstanding = 0;
    let prevMonthCCOutstanding = 0;
    Object.values(creditCards).forEach(card => {
        totalCreditCardOutstanding += getCCOutstanding(card, selectedMonth);
        prevMonthCCOutstanding += getCCOutstanding(card, prevMonth);
    });

    // ── Detect if this month has ANY data entered ──
    // If bank/CC/income are all empty for this month, treat it as an "empty" month
    // and show everything as 0 (until user copies or enters data)
    const hasMonthlyBankData = Object.values(banks).some(bank =>
        bank.balances && bank.balances[selectedMonth] !== undefined
    );
    const hasMonthlyCCData = Object.values(creditCards).some(card =>
        card.balances && card.balances[selectedMonth] !== undefined
    );
    const hasMonthlyIncome = !!(income[selectedMonth]);
    const isEmptyMonth = !hasMonthlyBankData && !hasMonthlyCCData && !hasMonthlyIncome
        && monthCategoryTotal === 0;

    // ── Category totals: cumulative up to selected month ──
    let cumulativeCategoryTotal = 0;
    Object.values(categories).forEach(cat => {
        if (cat.items) {
            Object.values(cat.items).forEach(item => {
                if (item.month && item.month <= selectedMonth) {
                    cumulativeCategoryTotal += (item.amount || 0);
                }
            });
        }
    });

    // ── Assets / Liabilities / Net Worth ──
    // If month is empty (no data entered), show all as 0
    const totalAssets = isEmptyMonth ? 0 : (totalBankBalance + cumulativeCategoryTotal);
    const totalLiabilities = isEmptyMonth ? 0 : totalCreditCardOutstanding;
    const netWorth = totalAssets - totalLiabilities;

    // ── Income ──
    const monthIncome = income[selectedMonth] || { salary: 0, otherIncome: 0, totalIncome: 0 };
    const prevMonthIncome = income[prevMonth] || { salary: 0, otherIncome: 0, totalIncome: 0 };

    // ── Expenditure (new formula) ──
    // Expenditure = Previous month CC bills + Bank account spends
    // Bank spends = Prev month overall balance - Current month overall balance - Current month income
    // If month is empty, expenditure is 0
    const bankSpends = isEmptyMonth ? 0 : Math.max(0, prevMonthBankBalance - totalBankBalance - (monthIncome.totalIncome || 0));
    const expenditure = isEmptyMonth ? 0 : (prevMonthCCOutstanding + bankSpends);

    // ── Savings rate ──
    const savings = Math.max(0, (monthIncome.totalIncome || 0) - expenditure);
    const savingsRate = (monthIncome.totalIncome || 0) > 0
        ? (savings / monthIncome.totalIncome) * 100
        : 0;

    // Previous month savings rate for comparison
    const prevMonthSnap = snapshots?.[prevMonth];
    const prevSavingsRate = prevMonthSnap && (prevMonthIncome.totalIncome || 0) > 0
        ? (((prevMonthIncome.totalIncome - (prevMonthSnap.totalExpenses || 0)) / prevMonthIncome.totalIncome) * 100)
        : null;

    return {
        monthCategoryTotal,
        prevMonthCategoryTotal,
        investedThisMonth,
        totalBankBalance: isEmptyMonth ? 0 : totalBankBalance,
        prevMonthBankBalance,
        totalCreditCardOutstanding: isEmptyMonth ? 0 : totalCreditCardOutstanding,
        prevMonthCCOutstanding,
        cumulativeCategoryTotal: isEmptyMonth ? 0 : cumulativeCategoryTotal,
        totalAssets,
        totalLiabilities,
        netWorth,
        monthIncome,
        expenditure,
        bankSpends,
        savings,
        savingsRate,
        prevSavingsRate,
        categoryBreakdown,
        selectedMonth,
        prevMonth,
        isEmptyMonth
    };
}
