/**
 * Modular Bank Accounts Domain Service
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
import { getAuthenticatedUser } from './helpers.js';

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

        const updates = {
            [`balances/${month}`]: null,
            updatedAt: Date.now()
        };

        const legacyMonth = bank.createdMonth || null;
        if (legacyMonth === month && remainingMonths.length > 0) {
            updates.createdMonth = remainingMonths.sort()[0];
        }

        await update(bankRef, updates);
        return { success: true, removedMonth: true, deletedWholeRecord: false };
    } catch (error) {
        return { success: false, error: error.message };
    }
}
