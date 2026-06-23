/**
 * Modular Investments (Categories & Items) Domain Service
 */

import { database } from '../../firebase-config.js';
import { 
    ref, 
    set, 
    get, 
    update, 
    remove, 
    push 
} from "https://www.gstatic.com/firebasejs/11.1.0/firebase-database.js";
import { 
    getAuthenticatedUser,
    normalizeMonthKey,
    getMonthFromTimestamp,
    normalizeCategoryItemsObject,
    normalizeCategoryItem
} from './helpers.js';

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
            const itemMonth = normalizeMonthKey(item.month) || item.month;
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
