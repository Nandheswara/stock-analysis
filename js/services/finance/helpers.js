/**
 * Shared Helpers for Firebase Finance Service Modules
 */

import { database } from '../../firebase-config.js';
import { getCurrentUser, waitForAuthReady } from '../../firebase-auth-service.js';
import { getEffectiveUserId } from '../../firebase-database-service.js';
import { 
    ref, 
    get, 
    update,
    remove
} from "https://www.gstatic.com/firebasejs/11.1.0/firebase-database.js";

export const CACHE_DURATION = 60 * 60 * 1000; // 1 hour

export const CACHE_KEYS = {
    CATEGORIES: 'financeCategories',
    BANKS: 'financeBanks',
    CREDIT_CARDS: 'financeCreditCards',
    LOANS: 'financeLoans',
    EXPENSES: 'financeExpenses',
    INSURANCE: 'financeInsurance',
    INCOME: 'financeIncome',
    TAXES: 'financeTaxes',
    SNAPSHOTS: 'financeSnapshots',
    EPFO: 'financeEPFO'
};

/**
 * Get authenticated user, waiting for auth if needed
 */
export async function getAuthenticatedUser() {
    let user = getCurrentUser();
    if (user && user._fromCache) {
        user = await waitForAuthReady();
    }
    return user;
}

/**
 * Get user finance ref
 */
export function getFinanceRef(path = '') {
    const userId = getEffectiveUserId();
    if (!userId) return null;
    return ref(database, `users/${userId}/finance${path ? '/' + path : ''}`);
}

export function saveToCache(key, userId, data) {
    try {
        const cacheKey = `${key}_${userId}`;
        localStorage.setItem(cacheKey, JSON.stringify(data));
        localStorage.setItem(`${cacheKey}_ts`, Date.now().toString());
    } catch (e) { /* silent */ }
}

export function loadFromCache(key, userId) {
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

export function inferMonthFromDate(date) {
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

export function normalizeMonthKey(month) {
    if (!month || typeof month !== 'string') return null;
    const match = month.trim().match(/^(\d{4})-(\d{1,2})$/);
    if (!match) return null;

    const [, yearStr, monthStr] = match;
    const monthNumber = Number(monthStr);
    if (Number.isNaN(monthNumber) || monthNumber < 1 || monthNumber > 12) return null;

    return `${yearStr}-${String(monthNumber).padStart(2, '0')}`;
}

export function toNumericAmount(value) {
    if (typeof value === 'number') return Number.isFinite(value) ? value : null;
    if (typeof value === 'string') {
        const cleaned = value.replace(/[^\d.-]/g, '');
        if (!cleaned) return null;
        const parsed = Number(cleaned);
        return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
}

export function isCategoryItemLike(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    return Object.prototype.hasOwnProperty.call(value, 'name')
        || Object.prototype.hasOwnProperty.call(value, 'amount')
        || Object.prototype.hasOwnProperty.call(value, 'month')
        || Object.prototype.hasOwnProperty.call(value, 'date');
}

export function isCardPaidForMonth(card, month) {
    if (card && card.paymentStatusByMonth && month && card.paymentStatusByMonth[month] !== undefined) {
        return Boolean(card.paymentStatusByMonth[month]);
    }
    return Boolean(card && card.isPaid);
}

export function getMonthFromTimestamp(timestamp) {
    const value = Number(timestamp) ? new Date(Number(timestamp)) : new Date(timestamp);
    if (Number.isNaN(value.getTime())) return null;
    return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}`;
}

export function normalizeCategoryItem(item) {
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

export function getCategoryItemMonth(item) {
    if (!item || typeof item !== 'object') return null;
    if (typeof item.month === 'string' && item.month) {
        return normalizeMonthKey(item.month) || item.month;
    }
    return inferMonthFromDate(item.date);
}

export function getCategoryIntroducedMonth(category) {
    if (!category || typeof category !== 'object') return null;
    const fromCreatedMonth = normalizeMonthKey(category.createdMonth);
    if (fromCreatedMonth) return fromCreatedMonth;
    if (category.createdAt) return normalizeMonthKey(getMonthFromTimestamp(category.createdAt));
    return null;
}

export function getCategoryCreatedMetric(category) {
    if (!category || typeof category !== 'object') return 0;
    if (category.createdAt) return Number(category.createdAt) || 0;
    const introducedMonth = getCategoryIntroducedMonth(category);
    if (!introducedMonth) return 0;
    return Number(String(introducedMonth).replace('-', '')) || 0;
}

export function getCategoryDisplayKey(category) {
    if (!category || typeof category !== 'object') return '';
    const normalizedName = (category.name || '').trim().toLowerCase();
    const icon = category.icon || '';
    const color = category.color || '';
    return `${normalizedName}|${icon}|${color}`;
}

export function selectRepresentativeCategory(groupEntries, monthKey) {
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

export function normalizeCategoryItemDates(categories) {
    return normalizeCategoryItemDatesWithDiff(categories).normalizedCategories;
}

export function normalizeCategoryItemsObject(rawItems) {
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

export function normalizeCategoryItemDatesWithDiff(categories) {
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

export async function persistNormalizedCategoryItems(uid, changes) {
    if (!uid || !Array.isArray(changes) || changes.length === 0) return;

    const updates = {};
    changes.forEach(({ categoryId, items }) => {
        updates[`categories/${categoryId}/items`] = items;
    });

    if (Object.keys(updates).length > 0) {
        await update(ref(database, `users/${uid}/finance`), updates);
    }
}

export function getSectionDbPath(type, uid, cardId = '') {
    let pathSegment = 'creditCards';
    if (type === 'loan') pathSegment = 'loans';
    else if (type === 'general-expense') pathSegment = 'expenses';
    else if (type === 'insurance') pathSegment = 'insurance';
    
    return cardId 
        ? `users/${uid}/finance/${pathSegment}/${cardId}`
        : `users/${uid}/finance/${pathSegment}`;
}

export async function findCardRefAndData(uid, cardId) {
    const paths = ['creditCards', 'loans', 'expenses', 'insurance'];
    for (const p of paths) {
        const cardRef = ref(database, `users/${uid}/finance/${p}/${cardId}`);
        const snapshot = await get(cardRef);
        if (snapshot.exists()) {
            return { ref: cardRef, card: snapshot.val(), pathSegment: p };
        }
    }
    return null;
}

export function getMonthsDifference(startMonth, targetMonth) {
    if (!startMonth || !targetMonth) return 0;
    const start = new Date(startMonth + '-01');
    const target = new Date(targetMonth + '-01');
    if (isNaN(start.getTime()) || isNaN(target.getTime())) return 0;
    return (target.getFullYear() - start.getFullYear()) * 12 + (target.getMonth() - start.getMonth());
}
