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
import { getEffectiveUserId } from './firebase-database-service.js';
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
    TAXES: 'financeTaxes',
    SNAPSHOTS: 'financeSnapshots',
    EPFO: 'financeEPFO'
};

const FINANCE_VIEW_SECTION_KEYS = Object.freeze([
    'financialSummary',
    'netWorth',
    'investmentCategories',
    'bankAccounts',
    'expenses',
    'insurance',
    'analytics'
]);

const FINANCE_VIEW_WIDGET_KEYS = Object.freeze([
    'summaryIncome',
    'summaryExpenditure',
    'summaryInvested',
    'summaryBankBalance',
    'summaryTax',
    'netWorthAssets',
    'netWorthLiabilities',
    'netWorthTotal',
    'netWorthEPFO',
    'analyticsInvestmentBreakdown',
    'analyticsNetWorthTrend',
    'analyticsIncomeExpense',
    'analyticsCategoryTrend'
]);

const FINANCE_VIEW_ITEM_KEYS = Object.freeze([
    'categories',
    'banks',
    'expenses',
    'insurance'
]);

const DEFAULT_FINANCE_VIEW_PREFERENCES = Object.freeze({
    sections: Object.freeze(FINANCE_VIEW_SECTION_KEYS.reduce((acc, key) => {
        acc[key] = true;
        return acc;
    }, {})),
    widgets: Object.freeze(FINANCE_VIEW_WIDGET_KEYS.reduce((acc, key) => {
        acc[key] = true;
        return acc;
    }, {})),
    items: Object.freeze(FINANCE_VIEW_ITEM_KEYS.reduce((acc, key) => {
        acc[key] = Object.freeze({});
        return acc;
    }, {}))
});

const CACHE_DURATION = 60 * 60 * 1000; // 1 hour

let listeners = {};

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

function cloneDefaultFinanceViewPreferences() {
    const items = FINANCE_VIEW_ITEM_KEYS.reduce((acc, key) => {
        acc[key] = {};
        return acc;
    }, {});

    return {
        sections: { ...DEFAULT_FINANCE_VIEW_PREFERENCES.sections },
        widgets: { ...DEFAULT_FINANCE_VIEW_PREFERENCES.widgets },
        items
    };
}

function normalizePreferenceMap(mapData) {
    if (!mapData || typeof mapData !== 'object') return {};

    return Object.entries(mapData).reduce((acc, [key, value]) => {
        if (typeof key === 'string' && key) {
            acc[key] = Boolean(value);
        }
        return acc;
    }, {});
}

function normalizeFinanceViewPreferences(preferences) {
    const normalized = cloneDefaultFinanceViewPreferences();
    if (!preferences || typeof preferences !== 'object') return normalized;

    const rawSections = preferences.sections && typeof preferences.sections === 'object'
        ? preferences.sections
        : {};

    FINANCE_VIEW_SECTION_KEYS.forEach((key) => {
        if (rawSections[key] !== undefined) {
            normalized.sections[key] = Boolean(rawSections[key]);
        }
    });

    const rawWidgets = preferences.widgets && typeof preferences.widgets === 'object'
        ? preferences.widgets
        : {};

    FINANCE_VIEW_WIDGET_KEYS.forEach((key) => {
        if (rawWidgets[key] !== undefined) {
            normalized.widgets[key] = Boolean(rawWidgets[key]);
        }
    });

    const rawItems = preferences.items && typeof preferences.items === 'object'
        ? preferences.items
        : {};

    FINANCE_VIEW_ITEM_KEYS.forEach((itemKey) => {
        normalized.items[itemKey] = normalizePreferenceMap(rawItems[itemKey]);
    });

    return normalized;
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

function inferMonthFromDate(date) {
    if (!date || typeof date !== 'string') return null;

    const canonicalMatch = date.trim().match(/^(\d{4})-(\d{1,2})(?:-\d{1,2})?/);
    if (canonicalMatch) {
        const [, yearStr, monthStr] = canonicalMatch;
        const monthNumber = Number(monthStr);
        if (!Number.isNaN(monthNumber) && monthNumber >= 1 && monthNumber <= 12) {
            return `${yearStr}-${String(monthNumber).padStart(2, '0')}`;
        }
    }

    const parsed = new Date(date);
    if (Number.isNaN(parsed.getTime())) return null;
    return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}`;
}

function normalizeMonthKey(month) {
    if (!month || typeof month !== 'string') return null;
    const match = month.trim().match(/^(\d{4})-(\d{1,2})$/);
    if (!match) return null;

    const [, yearStr, monthStr] = match;
    const monthNumber = Number(monthStr);
    if (Number.isNaN(monthNumber) || monthNumber < 1 || monthNumber > 12) return null;

    return `${yearStr}-${String(monthNumber).padStart(2, '0')}`;
}

function toNumericAmount(value) {
    if (typeof value === 'number') return Number.isFinite(value) ? value : null;
    if (typeof value === 'string') {
        const cleaned = value.replace(/[^\d.-]/g, '');
        if (!cleaned) return null;
        const parsed = Number(cleaned);
        return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
}

function isCategoryItemLike(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    return Object.prototype.hasOwnProperty.call(value, 'name')
        || Object.prototype.hasOwnProperty.call(value, 'amount')
        || Object.prototype.hasOwnProperty.call(value, 'month')
        || Object.prototype.hasOwnProperty.call(value, 'date');
}

function isCardPaidForMonth(card, month) {
    if (card && card.paymentStatusByMonth && month && card.paymentStatusByMonth[month] !== undefined) {
        return Boolean(card.paymentStatusByMonth[month]);
    }
    return Boolean(card && card.isPaid);
}

function getMonthFromTimestamp(timestamp) {
    const value = Number(timestamp) ? new Date(Number(timestamp)) : new Date(timestamp);
    if (Number.isNaN(value.getTime())) return null;
    return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}`;
}

function normalizeCategoryItem(item) {
    if (!item || typeof item !== 'object') return item;

    const normalizedItem = { ...item };
    const date = typeof normalizedItem.date === 'string' ? normalizedItem.date : null;
    const month = normalizeMonthKey(normalizedItem.month) || (typeof normalizedItem.month === 'string' ? normalizedItem.month : null);
    const inferredMonth = inferMonthFromDate(date);

    if (month) {
        normalizedItem.month = month;
        if (!date) {
            normalizedItem.date = `${month}-01`;
        } else if (inferredMonth && inferredMonth !== month) {
            normalizedItem.date = `${month}-01`;
        }
    } else if (inferredMonth) {
        normalizedItem.month = inferredMonth;
    }

    const numericAmount = toNumericAmount(normalizedItem.amount);
    if (numericAmount !== null) {
        normalizedItem.amount = numericAmount;
    }

    if (typeof normalizedItem.name !== 'string') {
        normalizedItem.name = normalizedItem.name === undefined || normalizedItem.name === null
            ? ''
            : String(normalizedItem.name);
    }

    if (typeof normalizedItem.notes !== 'string') {
        normalizedItem.notes = normalizedItem.notes === undefined || normalizedItem.notes === null
            ? ''
            : String(normalizedItem.notes);
    }

    return normalizedItem;
}

function getCategoryItemMonth(item) {
    if (!item || typeof item !== 'object') return null;
    if (typeof item.month === 'string' && item.month) {
        return normalizeMonthKey(item.month) || item.month;
    }
    return inferMonthFromDate(item.date);
}

function getCategoryIntroducedMonth(category) {
    if (!category || typeof category !== 'object') return null;
    const fromCreatedMonth = normalizeMonthKey(category.createdMonth);
    if (fromCreatedMonth) return fromCreatedMonth;
    if (category.createdAt) return normalizeMonthKey(getMonthFromTimestamp(category.createdAt));
    return null;
}

function getCategoryCreatedMetric(category) {
    if (!category || typeof category !== 'object') return 0;
    if (category.createdAt) return Number(category.createdAt) || 0;
    const introducedMonth = getCategoryIntroducedMonth(category);
    if (!introducedMonth) return 0;
    return Number(String(introducedMonth).replace('-', '')) || 0;
}

function getCategoryDisplayKey(category) {
    if (!category || typeof category !== 'object') return '';
    const normalizedName = (category.name || '').trim().toLowerCase();
    const icon = category.icon || '';
    const color = category.color || '';
    return `${normalizedName}|${icon}|${color}`;
}

function selectRepresentativeCategory(groupEntries, monthKey) {
    if (!Array.isArray(groupEntries) || groupEntries.length === 0) return null;
    if (!monthKey) return groupEntries[0];

    return groupEntries.reduce((best, current) => {
        if (!best) return current;

        const bestMonthItemsCount = best.itemEntries.filter(({ month }) => (normalizeMonthKey(month) || month) === monthKey).length;
        const currentMonthItemsCount = current.itemEntries.filter(({ month }) => (normalizeMonthKey(month) || month) === monthKey).length;
        if (currentMonthItemsCount > bestMonthItemsCount) return current;
        if (currentMonthItemsCount < bestMonthItemsCount) return best;

        const bestIntroducedMonth = getCategoryIntroducedMonth(best.cat);
        const currentIntroducedMonth = getCategoryIntroducedMonth(current.cat);

        const bestIntroducedThisMonth = bestIntroducedMonth === monthKey;
        const currentIntroducedThisMonth = currentIntroducedMonth === monthKey;
        if (currentIntroducedThisMonth && !bestIntroducedThisMonth) return current;
        if (bestIntroducedThisMonth && !currentIntroducedThisMonth) return best;

        const bestCreated = getCategoryCreatedMetric(best.cat);
        const currentCreated = getCategoryCreatedMetric(current.cat);
        return currentCreated > bestCreated ? current : best;
    }, null);
}

function normalizeCategoryItemDates(categories) {
    return normalizeCategoryItemDatesWithDiff(categories).normalizedCategories;
}

function normalizeCategoryItemsObject(rawItems) {
    if (!rawItems || typeof rawItems !== 'object' || Array.isArray(rawItems)) {
        return { normalizedItems: {}, changed: Boolean(rawItems) };
    }

    const normalizedItems = {};
    let changed = false;

    Object.entries(rawItems).forEach(([entryKey, entryValue]) => {
        if (!entryValue || typeof entryValue !== 'object' || Array.isArray(entryValue)) {
            changed = true;
            return;
        }

        const entryMonth = normalizeMonthKey(entryKey);

        if (isCategoryItemLike(entryValue)) {
            const normalizedItem = normalizeCategoryItem({
                ...entryValue,
                month: normalizeMonthKey(getCategoryItemMonth(entryValue)) || entryMonth || entryValue.month,
                date: entryValue.date || ((normalizeMonthKey(getCategoryItemMonth(entryValue)) || entryMonth) ? `${normalizeMonthKey(getCategoryItemMonth(entryValue)) || entryMonth}-01` : undefined)
            });
            normalizedItems[entryKey] = normalizedItem;

            if (entryMonth || JSON.stringify(normalizedItem) !== JSON.stringify(entryValue)) {
                changed = true;
            }
            return;
        }

        if (entryMonth) {
            changed = true;
        }

        Object.entries(entryValue).forEach(([nestedItemId, nestedItem]) => {
            if (!nestedItem || typeof nestedItem !== 'object' || Array.isArray(nestedItem) || !isCategoryItemLike(nestedItem)) {
                changed = true;
                return;
            }

            const nestedMonth = normalizeMonthKey(getCategoryItemMonth(nestedItem)) || entryMonth;
            const normalizedNested = normalizeCategoryItem({
                ...nestedItem,
                month: nestedMonth || nestedItem.month,
                date: nestedItem.date || (nestedMonth ? `${nestedMonth}-01` : undefined)
            });

            let targetItemId = nestedItemId;
            if (Object.prototype.hasOwnProperty.call(normalizedItems, targetItemId)) {
                targetItemId = `${entryKey}_${nestedItemId}`;
                changed = true;
            }

            normalizedItems[targetItemId] = normalizedNested;
        });
    });

    if (!changed && Object.keys(rawItems).length !== Object.keys(normalizedItems).length) {
        changed = true;
    }

    return { normalizedItems, changed };
}

function normalizeCategoryItemDatesWithDiff(categories) {
    if (!categories || typeof categories !== 'object') {
        return { normalizedCategories: categories, changedCategories: [] };
    }

    const changedCategories = [];
    const normalizedCategories = Object.entries(categories).reduce((normalizedCategories, [catId, cat]) => {
        if (!cat || typeof cat !== 'object' || !cat.items) {
            normalizedCategories[catId] = cat;
            return normalizedCategories;
        }

        const { normalizedItems, changed } = normalizeCategoryItemsObject(cat.items);
        if (changed) {
            changedCategories.push({ categoryId: catId, items: normalizedItems });
        }

        normalizedCategories[catId] = { ...cat, items: normalizedItems };
        return normalizedCategories;
    }, {});

    return { normalizedCategories, changedCategories };
}

async function persistNormalizedCategoryItems(uid, changes) {
    if (!uid || !Array.isArray(changes) || changes.length === 0) return;

    const updates = {};
    changes.forEach(({ categoryId, items }) => {
        updates[`categories/${categoryId}/items`] = items;
    });

    if (Object.keys(updates).length > 0) {
        await update(ref(database, `users/${uid}/finance`), updates);
    }
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
            createdMonth: categoryData.createdMonth || new Date().toISOString().slice(0, 7),
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

/**
 * Delete only the selected month's entries for a category.
 * If the category was introduced in that month and no entries remain,
 * the whole category is removed.
 */
export async function deleteCategoryForMonth(categoryId, month) {
    const user = await getAuthenticatedUser();
    if (!user) return { success: false, error: 'Not authenticated' };
    if (!categoryId) return { success: false, error: 'Category ID is required' };
    if (!month) return { success: false, error: 'Month is required' };

    try {
        const catRef = ref(database, `users/${user.uid}/finance/categories/${categoryId}`);
        const snapshot = await get(catRef);

        if (!snapshot.exists()) {
            return { success: true, removedMonth: false, deletedWholeRecord: false, removedItemsCount: 0 };
        }

        const category = snapshot.val() || {};
        const items = category.items && typeof category.items === 'object' ? category.items : {};
        const normalizedMonth = normalizeMonthKey(month) || month;
        const introducedMonth = normalizeMonthKey(category.createdMonth)
            || (category.createdAt ? normalizeMonthKey(getMonthFromTimestamp(category.createdAt)) : null);

        const { normalizedItems } = normalizeCategoryItemsObject(items);
        const remainingItems = {};
        let removedItemsCount = 0;
        const remainingMonths = new Set();

        Object.entries(normalizedItems).forEach(([itemId, item]) => {
            const itemMonth = normalizeMonthKey(getCategoryItemMonth(item)) || getCategoryItemMonth(item);
            if (itemMonth === normalizedMonth) {
                removedItemsCount += 1;
                return;
            }

            remainingItems[itemId] = normalizeCategoryItem(item);
            if (itemMonth) {
                remainingMonths.add(itemMonth);
            }
        });

        const hasRemainingItems = Object.keys(remainingItems).length > 0;
        const shouldDeleteWholeCategory = introducedMonth === normalizedMonth && !hasRemainingItems;

        if (shouldDeleteWholeCategory) {
            await remove(catRef);
            return {
                success: true,
                removedMonth: true,
                deletedWholeRecord: true,
                removedItemsCount
            };
        }

        const shouldAdjustIntroducedMonth = introducedMonth === normalizedMonth && hasRemainingItems;
        if (removedItemsCount === 0 && !shouldAdjustIntroducedMonth) {
            return {
                success: true,
                removedMonth: false,
                deletedWholeRecord: false,
                removedItemsCount: 0
            };
        }

        const updates = {
            items: remainingItems,
            updatedAt: Date.now()
        };

        if (shouldAdjustIntroducedMonth && remainingMonths.size > 0) {
            updates.createdMonth = Array.from(remainingMonths).sort()[0];
        }

        await update(catRef, updates);

        return {
            success: true,
            removedMonth: removedItemsCount > 0 || shouldAdjustIntroducedMonth,
            deletedWholeRecord: false,
            removedItemsCount
        };
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
        const itemMonth = typeof itemData.month === 'string' ? itemData.month : null;
        let itemDate = typeof itemData.date === 'string' ? itemData.date : null;

        if (!itemDate && itemMonth) {
            itemDate = `${itemMonth}-01`;
        } else if (!itemDate) {
            itemDate = new Date().toISOString().split('T')[0];
        }

        const data = normalizeCategoryItem({
            name: itemData.name,
            amount: parseFloat(itemData.amount) || 0,
            month: itemMonth,
            date: itemDate,
            notes: itemData.notes || '',
            updatedAt: Date.now()
        });
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
        const normalizedUpdates = normalizeCategoryItem({ ...updates, updatedAt: Date.now() });
        const itemRef = ref(database, `users/${user.uid}/finance/categories/${categoryId}/items/${itemId}`);
        await update(itemRef, normalizedUpdates);
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
            createdAt: Date.now(),
            createdMonth: month || new Date().toISOString().slice(0, 7),
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

/**
 * Delete only the selected month's bank balance for an account.
 * If no month balances remain, removes the whole bank account record.
 */
export async function deleteBankForMonth(bankId, month) {
    const user = await getAuthenticatedUser();
    if (!user) return { success: false, error: 'Not authenticated' };
    if (!month) return { success: false, error: 'Month is required' };

    try {
        const bankRef = ref(database, `users/${user.uid}/finance/banks/${bankId}`);
        const snapshot = await get(bankRef);
        if (!snapshot.exists()) {
            return { success: false, error: 'Bank account not found' };
        }

        const bank = snapshot.val() || {};
        const balances = bank.balances && typeof bank.balances === 'object' ? bank.balances : null;

        // Legacy records without month map are treated as single-month entries.
        if (!balances) {
            const legacyMonth = bank.createdMonth || null;
            if (legacyMonth && legacyMonth !== month) {
                return { success: true, removedMonth: false, deletedWholeRecord: false };
            }
            await remove(bankRef);
            return { success: true, removedMonth: true, deletedWholeRecord: true };
        }

        if (balances[month] === undefined) {
            return { success: true, removedMonth: false, deletedWholeRecord: false };
        }

        const remainingMonths = Object.keys(balances).filter((key) => key !== month && balances[key] !== undefined && balances[key] !== null);
        if (remainingMonths.length === 0) {
            await remove(bankRef);
            return { success: true, removedMonth: true, deletedWholeRecord: true };
        }

        await update(bankRef, {
            [`balances/${month}`]: null,
            updatedAt: Date.now()
        });

        return { success: true, removedMonth: true, deletedWholeRecord: false };
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
        const parsedCoverageAmount = parseFloat(cardData.coverageAmount) || 0;
        const data = {
            type: cardData.type || 'credit-card',
            name: cardData.name,
            issuer: cardData.issuer,
            insuranceCategory: cardData.insuranceCategory || '',
            policyNumber: cardData.policyNumber || '',
            insuranceStartDate: cardData.insuranceStartDate || cardData.expenseDate || '',
            insuranceValidUpto: cardData.insuranceValidUpto || cardData.dueDate || '',
            coverageAmount: parsedCoverageAmount,
            insuranceStatus: cardData.insuranceStatus || '',
            creditLimit: parseFloat(cardData.creditLimit) || 0,
            dueDate: cardData.dueDate || '',
            isPaid: cardData.isPaid || false,
            interestRate: parseFloat(cardData.interestRate) || 0,
            expenseDate: cardData.expenseDate || '',
            notes: cardData.notes || '',
            color: cardData.color || '#ff6b6b',
            createdAt: Date.now(),
            createdMonth: month || new Date().toISOString().slice(0, 7),
            updatedAt: Date.now(),
            balances: {},
            monthlyLimits: {},
            paymentStatusByMonth: {},
            insuranceByMonth: {}
        };
        // Store outstanding and month-specific limit under the specified month
        if (month) {
            data.balances[month] = parseFloat(cardData.outstandingBalance) || 0;
            data.monthlyLimits[month] = parseFloat(cardData.creditLimit) || 0;
            data.paymentStatusByMonth[month] = Boolean(cardData.isPaid);
            if (data.type === 'insurance') {
                data.insuranceByMonth[month] = {
                    name: data.name || '',
                    issuer: data.issuer || '',
                    insuranceCategory: data.insuranceCategory || '',
                    policyNumber: data.policyNumber || '',
                    insuranceStartDate: data.insuranceStartDate || '',
                    insuranceValidUpto: data.insuranceValidUpto || '',
                    coverageAmount: parsedCoverageAmount,
                    insuranceStatus: data.insuranceStatus || '',
                    notes: data.notes || '',
                    color: data.color || '#ff6b6b'
                };
            }
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
        const isInsuranceUpdate = updates.type === 'insurance';
        const monthInsurancePath = month && isInsuranceUpdate ? `insuranceByMonth/${month}` : null;

        // Copy non-balance fields
        if (updates.type !== undefined) updateData.type = updates.type;
        if (updates.name !== undefined) {
            if (monthInsurancePath) updateData[`${monthInsurancePath}/name`] = updates.name;
            else updateData.name = updates.name;
        }
        if (updates.issuer !== undefined) {
            if (monthInsurancePath) updateData[`${monthInsurancePath}/issuer`] = updates.issuer;
            else updateData.issuer = updates.issuer;
        }
        if (updates.insuranceCategory !== undefined) {
            if (monthInsurancePath) updateData[`${monthInsurancePath}/insuranceCategory`] = updates.insuranceCategory;
            else updateData.insuranceCategory = updates.insuranceCategory;
        }
        if (updates.policyNumber !== undefined) {
            if (monthInsurancePath) updateData[`${monthInsurancePath}/policyNumber`] = updates.policyNumber;
            else updateData.policyNumber = updates.policyNumber;
        }
        if (updates.insuranceStartDate !== undefined) {
            if (monthInsurancePath) updateData[`${monthInsurancePath}/insuranceStartDate`] = updates.insuranceStartDate;
            else updateData.insuranceStartDate = updates.insuranceStartDate;
        }
        if (updates.insuranceValidUpto !== undefined) {
            if (monthInsurancePath) updateData[`${monthInsurancePath}/insuranceValidUpto`] = updates.insuranceValidUpto;
            else updateData.insuranceValidUpto = updates.insuranceValidUpto;
        }
        if (updates.coverageAmount !== undefined) {
            const parsedCoverageAmount = parseFloat(updates.coverageAmount) || 0;
            if (monthInsurancePath) updateData[`${monthInsurancePath}/coverageAmount`] = parsedCoverageAmount;
            else updateData.coverageAmount = parsedCoverageAmount;
        }
        if (updates.insuranceStatus !== undefined) {
            if (monthInsurancePath) updateData[`${monthInsurancePath}/insuranceStatus`] = updates.insuranceStatus;
            else updateData.insuranceStatus = updates.insuranceStatus;
        }
        if (updates.creditLimit !== undefined && !isInsuranceUpdate) {
            if (month) {
                updateData[`monthlyLimits/${month}`] = parseFloat(updates.creditLimit);
            } else {
                updateData.creditLimit = parseFloat(updates.creditLimit);
            }
        }
        if (updates.dueDate !== undefined && !isInsuranceUpdate) updateData.dueDate = updates.dueDate;
        if (updates.isPaid !== undefined && !isInsuranceUpdate) {
            if (month) {
                updateData[`paymentStatusByMonth/${month}`] = Boolean(updates.isPaid);
            } else {
                updateData.isPaid = Boolean(updates.isPaid);
            }
        }
        if (updates.interestRate !== undefined && !isInsuranceUpdate) updateData.interestRate = parseFloat(updates.interestRate);
        if (updates.expenseDate !== undefined && !isInsuranceUpdate) updateData.expenseDate = updates.expenseDate;
        if (updates.notes !== undefined) {
            if (monthInsurancePath) updateData[`${monthInsurancePath}/notes`] = updates.notes;
            else updateData.notes = updates.notes;
        }
        if (updates.color !== undefined) {
            if (monthInsurancePath) updateData[`${monthInsurancePath}/color`] = updates.color;
            else updateData.color = updates.color;
        }

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

/**
 * Delete only the selected month's expense/insurance value for a card record.
 * If no month balances remain, removes the whole card record.
 */
export async function deleteCreditCardForMonth(cardId, month) {
    const user = await getAuthenticatedUser();
    if (!user) return { success: false, error: 'Not authenticated' };
    if (!month) return { success: false, error: 'Month is required' };

    try {
        const cardRef = ref(database, `users/${user.uid}/finance/creditCards/${cardId}`);
        const snapshot = await get(cardRef);
        if (!snapshot.exists()) {
            return { success: false, error: 'Expense entry not found' };
        }

        const card = snapshot.val() || {};
        const balances = card.balances && typeof card.balances === 'object' ? card.balances : null;

        // Legacy records without month map are treated as single-month entries.
        if (!balances) {
            const legacyMonth = card.createdMonth || null;
            if (legacyMonth && legacyMonth !== month) {
                return { success: true, removedMonth: false, deletedWholeRecord: false };
            }
            await remove(cardRef);
            return { success: true, removedMonth: true, deletedWholeRecord: true };
        }

        if (balances[month] === undefined) {
            return { success: true, removedMonth: false, deletedWholeRecord: false };
        }

        const remainingMonths = Object.keys(balances).filter((key) => key !== month && balances[key] !== undefined && balances[key] !== null);
        if (remainingMonths.length === 0) {
            await remove(cardRef);
            return { success: true, removedMonth: true, deletedWholeRecord: true };
        }

        await update(cardRef, {
            [`balances/${month}`]: null,
            [`monthlyLimits/${month}`]: null,
            [`paymentStatusByMonth/${month}`]: null,
            [`insuranceByMonth/${month}`]: null,
            updatedAt: Date.now()
        });

        return { success: true, removedMonth: true, deletedWholeRecord: false };
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
 * Save monthly tax values
 * @param {string} month - "YYYY-MM" format
 * @param {Object} taxData - { tax }
 */
export async function saveTax(month, taxData) {
    const user = await getAuthenticatedUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    try {
        const taxRef = ref(database, `users/${user.uid}/finance/taxes/${month}`);
        const taxValue = parseFloat(taxData.tax) || 0;
        const data = {
            tax: taxValue,
            updatedAt: Date.now()
        };
        await set(taxRef, data);
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

/**
 * Get tax for a specific month
 */
export async function getTax(month) {
    const user = await getAuthenticatedUser();
    if (!user) return null;

    try {
        const taxRef = ref(database, `users/${user.uid}/finance/taxes/${month}`);
        const snapshot = await get(taxRef);
        return snapshot.exists() ? snapshot.val() : null;
    } catch (error) {
        return null;
    }
}

/**
 * Save monthly EPFO value
 * @param {string} month - "YYYY-MM" format
 * @param {Object} epfoData - { value }
 */
export async function saveEPFO(month, epfoData) {
    const user = await getAuthenticatedUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    try {
        const epfoRef = ref(database, `users/${user.uid}/finance/epfo/${month}`);
        const value = parseFloat(epfoData.value) || 0;
        const data = {
            value,
            updatedAt: Date.now()
        };
        await set(epfoRef, data);
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

/**
 * Get EPFO value for a specific month
 */
export async function getEPFO(month) {
    const user = await getAuthenticatedUser();
    if (!user) return null;

    try {
        const epfoRef = ref(database, `users/${user.uid}/finance/epfo/${month}`);
        const snapshot = await get(epfoRef);
        return snapshot.exists() ? snapshot.val() : null;
    } catch (error) {
        return null;
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
// VIEW PREFERENCES
// ========================================

/**
 * Get finance tracker view preferences for the current user.
 */
export async function getFinanceViewPreferences() {
    const user = await getAuthenticatedUser();
    if (!user) {
        return { success: false, error: 'Not authenticated', preferences: cloneDefaultFinanceViewPreferences() };
    }

    try {
        const prefRef = ref(database, `users/${user.uid}/finance/preferences/view`);
        const snapshot = await get(prefRef);
        const preferences = normalizeFinanceViewPreferences(snapshot.exists() ? snapshot.val() : null);
        return { success: true, preferences };
    } catch (error) {
        return {
            success: false,
            error: error.message,
            preferences: cloneDefaultFinanceViewPreferences()
        };
    }
}

/**
 * Save finance tracker view preferences for the current user.
 */
export async function saveFinanceViewPreferences(preferences) {
    const user = await getAuthenticatedUser();
    if (!user) {
        return { success: false, error: 'Not authenticated', preferences: cloneDefaultFinanceViewPreferences() };
    }

    try {
        const normalizedPreferences = normalizeFinanceViewPreferences(preferences);
        const prefRef = ref(database, `users/${user.uid}/finance/preferences/view`);
        await set(prefRef, {
            ...normalizedPreferences,
            updatedAt: Date.now()
        });
        return { success: true, preferences: normalizedPreferences };
    } catch (error) {
        return {
            success: false,
            error: error.message,
            preferences: cloneDefaultFinanceViewPreferences()
        };
    }
}

/**
 * Get full raw finance node for the authenticated user.
 * Useful for Firebase-compatible JSON export/import workflows.
 */
export async function getFinanceRawData() {
    const user = await getAuthenticatedUser();
    if (!user) {
        return { success: false, error: 'Not authenticated', data: {} };
    }

    try {
        const financeRef = ref(database, `users/${user.uid}/finance`);
        const snapshot = await get(financeRef);
        return {
            success: true,
            data: snapshot.exists() ? snapshot.val() : {}
        };
    } catch (error) {
        return {
            success: false,
            error: error.message,
            data: {}
        };
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
 * Copy selected finance sections from any source month to any target month.
 * @param {string} sourceMonth - "YYYY-MM" format
 * @param {string} targetMonth - "YYYY-MM" format
 * @param {Object} options - copy options
 * @returns {Promise<Object>} copy result with section-wise counts
 */
export async function copyFinanceDataBetweenMonths(sourceMonth, targetMonth, options = {}) {
    const user = await getAuthenticatedUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    try {
        const normalizedSourceMonth = normalizeMonthKey(sourceMonth) || sourceMonth;
        const normalizedTargetMonth = normalizeMonthKey(targetMonth) || targetMonth;

        if (!sourceMonth || !targetMonth) {
            return { success: false, error: 'Source and target month are required' };
        }

        if (normalizedSourceMonth === normalizedTargetMonth) {
            return { success: false, error: 'Source and target month must be different' };
        }

        const {
            includeCategories = true,
            includeBanks = true,
            includeExpenses = true,
            includeInsurance = true,
            includeIncome = true,
            includeTaxes = true,
            includeEPFO = true,
            overwriteExisting = false,
            replaceCategories = false,
            replaceInsurance = false
        } = options;

        const updates = {};
        let banksCopied = 0;
        let expensesCopied = 0;
        let insuranceCopied = 0;
        let monthlyLimitsCopied = 0;
        let paymentStatusCopied = 0;
        let categoryItemsCopied = 0;
        let incomeCopied = 0;
        let taxesCopied = 0;
        let epfoCopied = 0;
        let categorySourceItemsFound = 0;
        let categoryItemsSkipped = 0;
        let categoryItemsFailed = 0;
        let categorySourceItemsInvalid = 0;
        const shouldReplaceCategoryItems = includeCategories && (overwriteExisting || replaceCategories);
        const shouldReplaceInsuranceItems = includeInsurance && (overwriteExisting || replaceInsurance);

        const shouldWriteTargetValue = (targetValue) => overwriteExisting || targetValue === undefined || targetValue === null;

        // Read current data
        const financeRef = ref(database, `users/${user.uid}/finance`);
        const snapshot = await get(financeRef);
        const data = snapshot.val() || {};

        // Copy bank balances
        if (includeBanks && data.banks) {
            Object.entries(data.banks).forEach(([bankId, bank]) => {
                const sourceBalance = bank.balances?.[normalizedSourceMonth] ?? bank.balance;
                const hasSourceData = bank.balances?.[normalizedSourceMonth] !== undefined || (!bank.balances && bank.balance !== undefined);
                const targetBalance = bank.balances?.[normalizedTargetMonth];

                if (hasSourceData && shouldWriteTargetValue(targetBalance)) {
                    updates[`banks/${bankId}/balances/${normalizedTargetMonth}`] = parseFloat(sourceBalance) || 0;
                    banksCopied++;
                }
            });
        }

        // Copy expenses/insurance balances and statuses
        if ((includeExpenses || includeInsurance) && data.creditCards) {
            const deletedInsuranceCardIds = new Set();

            Object.entries(data.creditCards).forEach(([cardId, card]) => {
                const cardType = card.type || 'credit-card';
                const isInsuranceCard = cardType === 'insurance';
                if (isInsuranceCard && !includeInsurance) return;
                if (!isInsuranceCard && !includeExpenses) return;

                const cardCreatedMonth = normalizeMonthKey(card.createdMonth)
                    || (card.createdAt ? normalizeMonthKey(getMonthFromTimestamp(card.createdAt)) : null);

                const sourceOutstanding = card.balances?.[normalizedSourceMonth] ?? card.outstandingBalance;
                const hasSourceOutstanding = card.balances?.[normalizedSourceMonth] !== undefined || (!card.balances && card.outstandingBalance !== undefined);
                const targetOutstanding = card.balances?.[normalizedTargetMonth];

                if (isInsuranceCard && shouldReplaceInsuranceItems && !hasSourceOutstanding) {
                    const hasTargetOutstanding = targetOutstanding !== undefined;
                    const balanceMonths = card.balances && typeof card.balances === 'object'
                        ? Object.keys(card.balances)
                        : [];
                    const remainingBalanceMonths = balanceMonths
                        .map((monthKey) => normalizeMonthKey(monthKey) || monthKey)
                        .filter((monthKey) => monthKey && monthKey !== normalizedTargetMonth)
                        .sort();

                    const shouldDeleteInsuranceCard = (hasTargetOutstanding || cardCreatedMonth === normalizedTargetMonth)
                        && remainingBalanceMonths.length === 0;

                    if (shouldDeleteInsuranceCard) {
                        updates[`creditCards/${cardId}`] = null;
                        deletedInsuranceCardIds.add(cardId);
                        return;
                    }

                    if (hasTargetOutstanding) {
                        updates[`creditCards/${cardId}/balances/${normalizedTargetMonth}`] = null;
                    }

                    if (cardCreatedMonth === normalizedTargetMonth && remainingBalanceMonths.length > 0) {
                        updates[`creditCards/${cardId}/createdMonth`] = remainingBalanceMonths[0];
                    }
                }

                if (isInsuranceCard && deletedInsuranceCardIds.has(cardId)) {
                    return;
                }

                const canWriteTargetOutstanding = isInsuranceCard && shouldReplaceInsuranceItems
                    ? hasSourceOutstanding
                    : (hasSourceOutstanding && shouldWriteTargetValue(targetOutstanding));

                if (canWriteTargetOutstanding) {
                    updates[`creditCards/${cardId}/balances/${normalizedTargetMonth}`] = parseFloat(sourceOutstanding) || 0;
                    if (isInsuranceCard) insuranceCopied++;
                    else expensesCopied++;
                }

                if (!isInsuranceCard) {
                    const sourceLimit = card.monthlyLimits?.[normalizedSourceMonth] ?? card.creditLimit;
                    const hasSourceLimit = card.monthlyLimits?.[normalizedSourceMonth] !== undefined || card.creditLimit !== undefined;
                    const targetLimit = card.monthlyLimits?.[normalizedTargetMonth];

                    if (hasSourceLimit && shouldWriteTargetValue(targetLimit)) {
                        updates[`creditCards/${cardId}/monthlyLimits/${normalizedTargetMonth}`] = parseFloat(sourceLimit) || 0;
                        monthlyLimitsCopied++;
                    }

                    const sourcePaymentStatus = card.paymentStatusByMonth?.[normalizedSourceMonth] ?? card.isPaid;
                    const hasSourcePaymentStatus = card.paymentStatusByMonth?.[normalizedSourceMonth] !== undefined || card.isPaid !== undefined;
                    const targetPaymentStatus = card.paymentStatusByMonth?.[normalizedTargetMonth];

                    if (hasSourcePaymentStatus && shouldWriteTargetValue(targetPaymentStatus)) {
                        updates[`creditCards/${cardId}/paymentStatusByMonth/${normalizedTargetMonth}`] = Boolean(sourcePaymentStatus);
                        paymentStatusCopied++;
                    }
                }
            });
        }

        // Copy category items from source month to target month

        if (includeCategories && data.categories) {
            const extractCategoryEntries = (categoryItems) => {
                if (!categoryItems || typeof categoryItems !== 'object') return [];

                const entries = [];
                Object.entries(categoryItems).forEach(([entryKey, entryValue]) => {
                    if (!entryValue || typeof entryValue !== 'object') return;

                    const directMonth = getCategoryItemMonth(entryValue);
                    const looksLikeItem = isCategoryItemLike(entryValue);
                    if (directMonth || looksLikeItem) {
                        entries.push({
                            path: entryKey,
                            item: normalizeCategoryItem(entryValue),
                            month: directMonth || normalizeMonthKey(entryKey)
                        });
                        return;
                    }

                    const groupedMonth = normalizeMonthKey(entryKey);
                    Object.entries(entryValue).forEach(([nestedItemId, nestedItem]) => {
                        if (!nestedItem || typeof nestedItem !== 'object') return;
                        const nestedMonth = normalizeMonthKey(getCategoryItemMonth(nestedItem)) || groupedMonth;
                        entries.push({
                            path: `${entryKey}/${nestedItemId}`,
                            item: normalizeCategoryItem({
                                ...nestedItem,
                                month: nestedMonth || nestedItem.month,
                                date: nestedItem.date || (nestedMonth ? `${nestedMonth}-01` : undefined)
                            }),
                            month: nestedMonth
                        });
                    });
                });

                return entries;
            };

            const categoryGroups = Object.entries(data.categories).reduce((groups, [catId, cat]) => {
                if (!cat || typeof cat !== 'object') return groups;
                const groupKey = getCategoryDisplayKey(cat) || catId;
                if (!groups[groupKey]) {
                    groups[groupKey] = [];
                }

                groups[groupKey].push({
                    catId,
                    cat,
                    itemEntries: extractCategoryEntries(cat.items)
                });

                return groups;
            }, {});

            for (const groupEntries of Object.values(categoryGroups)) {
                const sourceRepresentative = selectRepresentativeCategory(groupEntries, normalizedSourceMonth) || groupEntries[0];
                const sourceEntries = sourceRepresentative?.itemEntries
                    ? sourceRepresentative.itemEntries.filter(({ month }) => (normalizeMonthKey(month) || month) === normalizedSourceMonth)
                    : [];

                if (sourceEntries.length === 0) continue;
                categorySourceItemsFound += sourceEntries.length;

                const writableGroupEntries = groupEntries.filter(({ cat }) => typeof cat?.name === 'string' && cat.name.trim().length > 0);
                const representativeCandidates = writableGroupEntries.length > 0 ? writableGroupEntries : groupEntries;
                const targetRepresentative = selectRepresentativeCategory(representativeCandidates, normalizedTargetMonth) || representativeCandidates[0];
                if (!targetRepresentative) continue;

                const targetEntries = groupEntries.flatMap(({ catId, itemEntries }) => (
                    itemEntries
                        .filter(({ month }) => (normalizeMonthKey(month) || month) === normalizedTargetMonth)
                        .map((entry) => ({ ...entry, catId }))
                ));

                const targetItemSet = new Set((shouldReplaceCategoryItems ? [] : targetEntries)
                        .map(({ item }) => {
                            const itemName = typeof item.name === 'string' ? item.name.trim() : '';
                            const itemAmount = toNumericAmount(item.amount);
                            if (!itemName || itemAmount === null) return null;
                            const itemMonth = normalizeMonthKey(getCategoryItemMonth(item)) || normalizedTargetMonth;
                            const itemDate = typeof item.date === 'string' && item.date ? item.date : `${itemMonth}-01`;
                            const itemNotes = typeof item.notes === 'string' ? item.notes : '';
                            return `${itemName}|${itemAmount}|${itemNotes}|${itemDate}`;
                        })
                        .filter(Boolean));

                const preparedCopies = [];

                sourceEntries.forEach(({ item }) => {
                    const itemName = typeof item.name === 'string' ? item.name.trim() : '';
                    const itemAmount = toNumericAmount(item.amount);
                    if (!itemName || itemAmount === null) {
                        categorySourceItemsInvalid++;
                        categoryItemsSkipped++;
                        return;
                    }

                    const itemNotes = typeof item.notes === 'string' ? item.notes : '';
                    const itemKey = `${itemName}|${itemAmount}|${itemNotes}|${normalizedTargetMonth}-01`;
                    if (targetItemSet.has(itemKey)) {
                        categoryItemsSkipped++;
                        return;
                    }

                    targetItemSet.add(itemKey);

                    const newItemId = push(ref(database, `users/${user.uid}/finance/categories/${targetRepresentative.catId}/items`)).key;
                    if (!newItemId) {
                        categoryItemsFailed++;
                        return;
                    }

                    const copiedItem = normalizeCategoryItem({
                        name: itemName,
                        amount: itemAmount,
                        month: normalizedTargetMonth,
                        date: `${normalizedTargetMonth}-01`,
                        notes: itemNotes,
                        updatedAt: Date.now()
                    });

                    preparedCopies.push({
                        catId: targetRepresentative.catId,
                        itemId: newItemId,
                        item: copiedItem
                    });
                });

                // Prevent data loss: only clear target-month entries when there is something valid to paste.
                if (preparedCopies.length === 0) {
                    continue;
                }

                if (shouldReplaceCategoryItems) {
                    targetEntries.forEach(({ catId, path }) => {
                        updates[`categories/${catId}/items/${path}`] = null;
                    });
                }

                preparedCopies.forEach(({ catId, itemId, item: copiedItem }) => {
                    updates[`categories/${catId}/items/${itemId}`] = copiedItem;
                    categoryItemsCopied++;
                });
            }
        }

        // Copy income
        if (includeIncome && data.income?.[normalizedSourceMonth] && shouldWriteTargetValue(data.income?.[normalizedTargetMonth])) {
            updates[`income/${normalizedTargetMonth}`] = {
                ...data.income[normalizedSourceMonth],
                updatedAt: Date.now()
            };
            incomeCopied++;
        }

        // Copy taxes
        if (includeTaxes && data.taxes?.[normalizedSourceMonth] && shouldWriteTargetValue(data.taxes?.[normalizedTargetMonth])) {
            updates[`taxes/${normalizedTargetMonth}`] = {
                ...data.taxes[normalizedSourceMonth],
                updatedAt: Date.now()
            };
            taxesCopied++;
        }

        // Copy EPFO value
        if (includeEPFO && data.epfo?.[normalizedSourceMonth] && shouldWriteTargetValue(data.epfo?.[normalizedTargetMonth])) {
            updates[`epfo/${normalizedTargetMonth}`] = {
                ...data.epfo[normalizedSourceMonth],
                updatedAt: Date.now()
            };
            epfoCopied++;
        }

        if (Object.keys(updates).length > 0) {
            await update(financeRef, updates);
        }

        return {
            success: true,
            sourceMonth: normalizedSourceMonth,
            targetMonth: normalizedTargetMonth,
            banksCopied,
            expensesCopied,
            insuranceCopied,
            monthlyLimitsCopied,
            paymentStatusCopied,
            taxesCopied,
            epfoCopied,
            incomeCopied,
            categoryItemsCopied,
            categorySourceItemsFound,
            categoryItemsSkipped,
            categoryItemsFailed,
            categorySourceItemsInvalid,
            overwriteExisting,
            replaceCategories: shouldReplaceCategoryItems
        };
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
    if (!targetMonth) {
        return { success: false, error: 'Target month is required' };
    }

    const [year, mon] = targetMonth.split('-').map(Number);
    const prevDate = new Date(year, mon - 2, 1);
    const prevMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;

    const result = await copyFinanceDataBetweenMonths(prevMonth, targetMonth, {
        includeCategories: true,
        includeBanks: true,
        includeExpenses: true,
        includeInsurance: true,
        includeIncome: true,
        includeTaxes: true,
        includeEPFO: true,
        overwriteExisting: false,
        replaceCategories: false
    });

    if (!result.success) return result;

    return {
        success: true,
        banksCopied: result.banksCopied,
        cardsCopied: (result.expensesCopied || 0) + (result.insuranceCopied || 0),
        taxesCopied: result.taxesCopied,
        epfoCopied: result.epfoCopied,
        categoryItemsCopied: result.categoryItemsCopied,
        prevMonth
    };
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
        callback({ categories: {}, banks: {}, creditCards: {}, income: {}, taxes: {}, snapshots: {} });
        return () => {};
    }

    // Serve cached data first
    const cachedCategories = loadFromCache(CACHE_KEYS.CATEGORIES, userId);
    const cachedBanks = loadFromCache(CACHE_KEYS.BANKS, userId);
    const cachedCards = loadFromCache(CACHE_KEYS.CREDIT_CARDS, userId);
    const cachedIncome = loadFromCache(CACHE_KEYS.INCOME, userId);
    const cachedTaxes = loadFromCache(CACHE_KEYS.TAXES, userId);
    const cachedSnapshots = loadFromCache(CACHE_KEYS.SNAPSHOTS, userId);
    const cachedEPFO = loadFromCache(CACHE_KEYS.EPFO, userId);

    const hasCache = cachedCategories || cachedBanks || cachedCards || cachedIncome || cachedTaxes || cachedSnapshots || cachedEPFO;

    // Data store
    const store = {
        categories: cachedCategories || {},
        banks: cachedBanks || {},
        creditCards: cachedCards || {},
        income: cachedIncome || {},
        taxes: cachedTaxes || {},
        snapshots: cachedSnapshots || {},
        epfo: cachedEPFO || {}
    };

    if (hasCache) {
        const normalizedCategories = normalizeCategoryItemDates(cachedCategories || {});
        queueMicrotask(() => callback({
            categories: normalizedCategories,
            banks: cachedBanks || {},
            creditCards: cachedCards || {},
            income: cachedIncome || {},
            taxes: cachedTaxes || {},
            snapshots: cachedSnapshots || {},
            epfo: cachedEPFO || {}
        }));
        store.categories = normalizedCategories;
    }

    // Track initial listener fires — all 5 listeners fire once on attach.
    // If we served cached data we can skip these initial fires entirely;
    // otherwise we batch them into a single callback after all 5 have reported.
    const TOTAL_LISTENERS = 6;
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
            const { normalizedCategories, changedCategories } = normalizeCategoryItemDatesWithDiff(snapshot.val() || {});
            store.categories = normalizedCategories;
            saveToCache(CACHE_KEYS.CATEGORIES, uid, store.categories);
            if (changedCategories.length > 0) {
                persistNormalizedCategoryItems(uid, changedCategories).catch(() => {});
            }
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

        // Taxes listener
        const taxesRef = ref(database, `users/${uid}/finance/taxes`);
        listeners.taxes = onValue(taxesRef, (snapshot) => {
            store.taxes = snapshot.val() || {};
            saveToCache(CACHE_KEYS.TAXES, uid, store.taxes);
            onListenerData();
        }, () => {});

        // EPFO listener
        const epfoRef = ref(database, `users/${uid}/finance/epfo`);
        listeners.epfo = onValue(epfoRef, (snapshot) => {
            store.epfo = snapshot.val() || {};
            saveToCache(CACHE_KEYS.EPFO, uid, store.epfo);
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
        const createdMonth = new Date().toISOString().slice(0, 7);
        for (const cat of defaults) {
            const newRef = push(catRef);
            categoriesData[newRef.key] = {
                name: cat.name,
                icon: cat.icon,
                color: cat.color,
                createdAt: Date.now(),
                createdMonth,
                updatedAt: Date.now()
            };
        }
        await set(catRef, categoriesData);
    } catch (error) {
        // Error creating default categories is non-critical, silently continue
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
 * Expenditure = Current month non-insurance card charges
 * Bank spends = Prev month bank total - Curr month bank total - Curr month income
 * When previous-month balances are unavailable, bank spends are estimated from income and current balance.
 */
export function computeFinancialSummary(data, selectedMonth) {
    const { categories, banks, creditCards, income, taxes, snapshots } = data;

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

    // ── Helper: get CC outstanding ONLY if unpaid and only for credit-style liabilities ──
    function getCCOutstandingIfUnpaid(card, month) {
        if (card.type === 'general-expense' || card.type === 'insurance') {
            return 0; // General expenses are not treated as ongoing liabilities
        }
        if (isCardPaidForMonth(card, month)) {
            return 0; // Exclude paid liabilities from liabilities
        }
        if (card.balances) {
            return card.balances[month] || 0;
        }
        return card.outstandingBalance || 0;
    }

    function isInsuranceCard(card) {
        return (card.type || 'credit-card') === 'insurance';
    }

    // ── Helper: get CC charges for the selected month (excluding insurance)
    function getCCCharges(card, month) {
        if (isInsuranceCard(card)) {
            return 0;
        }
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
    // Count non-insurance charges for expenditure, but only unpaid for liabilities.
    let totalCreditCardOutstanding = 0;
    let totalCreditCardCharges = 0;
    let totalPaidCharges = 0;
    let totalUnpaidCharges = 0;
    let prevMonthCCOutstanding = 0;
    Object.values(creditCards).forEach(card => {
        const charges = getCCCharges(card, selectedMonth);
        const isPaidForSelectedMonth = isCardPaidForMonth(card, selectedMonth);
        totalCreditCardCharges += charges;
        if (isPaidForSelectedMonth) {
            totalPaidCharges += charges;
        } else {
            totalUnpaidCharges += charges;
        }
        totalCreditCardOutstanding += getCCOutstandingIfUnpaid(card, selectedMonth);
        prevMonthCCOutstanding += getCCOutstandingIfUnpaid(card, prevMonth);
    });
    const currentMonthCCOutstanding = totalCreditCardCharges;

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
    // Use ONLY current month values to match what's visible in the UI
    // This prevents confusion where old investments from hidden months are counted
    const hasAnyMonthData = hasMonthlyBankData || hasMonthlyCCData || hasMonthlyIncome || monthCategoryTotal > 0;
    const epfoValue = (hasAnyMonthData && data.epfo && data.epfo[selectedMonth]) ? parseFloat(data.epfo[selectedMonth].value) || 0 : 0;
    // Use monthCategoryTotal (current month only) instead of cumulativeCategoryTotal
    const totalAssets = hasAnyMonthData ? (totalBankBalance + monthCategoryTotal + epfoValue) : 0;
    const totalLiabilities = hasAnyMonthData ? totalCreditCardOutstanding : 0;
    const netWorth = totalAssets - totalLiabilities;

    // ── Income ──
    const monthIncome = income[selectedMonth] || { salary: 0, otherIncome: 0, totalIncome: 0 };
    const prevMonthIncome = income[prevMonth] || { salary: 0, otherIncome: 0, totalIncome: 0 };

    // ── Expenditure (new formula) ──
    // Expenditure = Current month non-insurance card charges
    // Bank spends = Prev month overall balance - Current month overall balance - Current month income
    // If month is empty, expenditure is 0
    const hasPreviousBankData = Object.values(banks).some(bank => bank.balances && bank.balances[prevMonth] !== undefined);
    const bankSpends = isEmptyMonth ? 0 : (hasPreviousBankData
        ? Math.max(0, prevMonthBankBalance - totalBankBalance - (monthIncome.totalIncome || 0))
        : (hasMonthlyBankData ? Math.max(0, (monthIncome.totalIncome || 0) - totalBankBalance) : 0));
    const expenditure = isEmptyMonth ? 0 : totalCreditCardCharges;

    // ── Savings rate ──
    const savings = Math.max(0, (monthIncome.totalIncome || 0) - expenditure);
    const savingsRate = (monthIncome.totalIncome || 0) > 0
        ? (savings / monthIncome.totalIncome) * 100
        : 0;

    const monthTax = taxes?.[selectedMonth] || { tax: 0 };
    const tax = parseFloat(monthTax.tax) || 0;

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
        currentMonthCCOutstanding: isEmptyMonth ? 0 : currentMonthCCOutstanding,
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
        epfoValue,
        tax,
        totalPaidCharges,
        totalUnpaidCharges,
        selectedMonth,
        prevMonth,
        isEmptyMonth
    };
}
