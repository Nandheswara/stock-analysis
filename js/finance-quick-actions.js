/**
 * Finance Quick Actions Module
 * 
 * Provides interactive inline payment status dropdowns and handlers
 * for Credit Cards, Loans, and General Expenses to allow one-click status updates
 * directly on the page without opening popup modals.
 * 
 * Modularized in this dedicated file to avoid merge conflicts with other branches.
 * 
 * @module finance-quick-actions
 */

let quickActionsBridge = {
    getFinanceData: () => ({}),
    getCurrentMonth: () => new Date().toISOString().slice(0, 7),
    updateCreditCard: null,
    showToast: (msg, type) => console.log(`[Toast] ${type}: ${msg}`),
    refreshUI: () => {}
};

/**
 * Register bridge callbacks from the main tracker
 * @param {Object} customBridge
 */
export function registerQuickActionsBridge(customBridge = {}) {
    quickActionsBridge = { ...quickActionsBridge, ...customBridge };
}

/**
 * Determine whether a liability entry is marked as paid for the given month
 * @param {Object} item
 * @param {string} month - YYYY-MM
 * @returns {boolean}
 */
export function isItemPaidForMonth(item, month) {
    if (!item) return false;
    if (item.paymentStatusByMonth && month && item.paymentStatusByMonth[month] !== undefined) {
        return Boolean(item.paymentStatusByMonth[month]);
    }
    return Boolean(item.isPaid);
}

/**
 * Render the inline quick payment status dropdown HTML
 * @param {Object} item - Card, loan, or expense object
 * @param {string} itemId - ID of the item
 * @param {string} month - Target month (YYYY-MM)
 * @param {string} itemType - 'credit-card' | 'loan' | 'general-expense'
 * @returns {string} HTML string for the select dropdown
 */
export function renderLiabilityStatusDropdown(item, itemId, month, itemType = 'credit-card') {
    const isPaid = isItemPaidForMonth(item, month);
    const safeId = String(itemId).replace(/"/g, '&quot;');
    const statusClass = isPaid ? 'status-paid' : 'status-unpaid';

    return `
        <div class="finance-status-dropdown-wrap" onclick="event.stopPropagation()">
            <select class="finance-status-select ${statusClass}" 
                    data-card-id="${safeId}" 
                    data-item-type="${itemType}" 
                    onchange="window.updateLiabilityPaymentStatus('${safeId}', this.value, event)"
                    onclick="event.stopPropagation()"
                    title="Change payment status for ${month}"
                    aria-label="Payment Status">
                <option value="unpaid" ${!isPaid ? 'selected' : ''}>Unpaid</option>
                <option value="paid" ${isPaid ? 'selected' : ''}>Paid</option>
            </select>
        </div>
    `;
}

/**
 * Handle user selection change in the status dropdown
 * @param {string} itemId
 * @param {string} newStatusValue - 'paid' | 'unpaid'
 * @param {Event} [event]
 */
export async function updateLiabilityPaymentStatus(itemId, newStatusValue, event) {
    if (event) {
        event.stopPropagation();
    }

    const selectEl = event?.target || document.querySelector(`select[data-card-id="${itemId}"]`);
    const isPaid = newStatusValue === 'paid';
    const currentMonth = quickActionsBridge.getCurrentMonth();
    const financeData = quickActionsBridge.getFinanceData();

    // Look for record in creditCards, loans, or expenses
    const card = financeData?.creditCards?.[itemId] || 
                 financeData?.loans?.[itemId] || 
                 financeData?.expenses?.[itemId] || 
                 financeData?.insurance?.[itemId];

    const cardName = card?.name || 'Entry';
    const previousPaidState = isItemPaidForMonth(card, currentMonth);

    // Instant optimistic visual feedback
    if (selectEl) {
        selectEl.classList.remove('status-paid', 'status-unpaid');
        selectEl.classList.add(isPaid ? 'status-paid' : 'status-unpaid');
    }

    // Update local state in memory
    if (card) {
        if (!card.paymentStatusByMonth) {
            card.paymentStatusByMonth = {};
        }
        card.paymentStatusByMonth[currentMonth] = isPaid;
    }

    // Recalculate summary metrics immediately without re-rendering active select
    try {
        quickActionsBridge.refreshUI();
    } catch (err) {
        console.warn('Quick actions UI refresh warning:', err);
    }

    if (!quickActionsBridge.updateCreditCard) {
        console.error('updateCreditCard function is missing from quickActionsBridge');
        return;
    }

    try {
        const result = await quickActionsBridge.updateCreditCard(itemId, { isPaid }, currentMonth);
        if (result && result.success) {
            quickActionsBridge.showToast(`${cardName} marked as ${isPaid ? 'Paid' : 'Unpaid'}`, isPaid ? 'success' : 'info');
        } else {
            throw new Error(result?.error || 'Failed to update payment status');
        }
    } catch (error) {
        console.error('Failed to update status in backend:', error);
        
        // Revert local state and UI on error
        if (card) {
            card.paymentStatusByMonth[currentMonth] = previousPaidState;
        }
        if (selectEl) {
            selectEl.value = previousPaidState ? 'paid' : 'unpaid';
            selectEl.classList.remove('status-paid', 'status-unpaid');
            selectEl.classList.add(previousPaidState ? 'status-paid' : 'status-unpaid');
        }
        try {
            quickActionsBridge.refreshUI();
        } catch (_) {}

        quickActionsBridge.showToast('Could not update status: ' + error.message, 'error');
    }
}

// Attach globally for inline HTML event binding
if (typeof window !== 'undefined') {
    window.renderLiabilityStatusDropdown = renderLiabilityStatusDropdown;
    window.updateLiabilityPaymentStatus = updateLiabilityPaymentStatus;
    window.registerQuickActionsBridge = registerQuickActionsBridge;
}

