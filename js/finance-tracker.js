/**
 * Finance Tracker - Main Page Logic
 * 
 * Handles:
 * - Month navigation and filtering
 * - Income entry and management
 * - Category management with items
 * - Bank accounts management
 * - Credit cards management
 * - Financial summary computation
 * - Chart.js analytics (spending breakdown, net worth growth, income vs expense)
 * - Excel export using SheetJS
 * - Toast notifications
 * 
 * @module finance-tracker
 */

import { auth, database } from '../js/firebase-config.js';
import { escapeHtml } from '../js/utils.js';
import { 
    initAuthListener, 
    getCurrentUser, 
    waitForAuthReady,
    onAuthStateChange,
    signInUser,
    signUpUser,
    signInWithGoogle,
    signOutUser,
    resetPassword,
    changePassword
} from '../js/firebase-auth-service.js';

import {
    addCategory,
    updateCategory,
    deleteCategory,
    addCategoryItem,
    updateCategoryItem,
    deleteCategoryItem,
    addBank,
    updateBank,
    deleteBank,
    addCreditCard,
    updateCreditCard,
    deleteCreditCard,
    saveIncome,
    saveTax,
    getIncome,
    saveMonthlySnapshot,
    listenToFinanceData,
    createDefaultCategories,
    computeFinancialSummary,
    copyPreviousMonthData
} from '../js/firebase-finance-service.js';

// ========================================
// State
// ========================================

let currentMonth = getCurrentMonthKey();
let financeData = {
    categories: {},
    banks: {},
    creditCards: {},
    income: {},
    taxes: {},
    snapshots: {}
};
let charts = {};
let unsubscribeFinance = null;
let renderDebounceTimer = null;
let snapshotSaveTimer = null;
let isRendering = false;
let lastRenderedDataJSON = ''; // Track if data actually changed
let isInitialLoad = true;      // Prevent snapshot save on first render
let chartRenderRAF = null;     // requestAnimationFrame handle for chart rendering

// ========================================
// Month Helpers
// ========================================

function getCurrentMonthKey() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function getMonthDisplay(monthKey) {
    const [year, month] = monthKey.split('-');
    const date = new Date(year, month - 1, 1);
    return date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

function getMonthFromTimestamp(timestamp) {
    const value = Number(timestamp) ? new Date(Number(timestamp)) : new Date(timestamp);
    if (Number.isNaN(value.getTime())) return null;
    return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}`;
}

function getPreviousMonth(monthKey) {
    const [year, month] = monthKey.split('-').map(Number);
    const d = new Date(year, month - 2, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function getNextMonth(monthKey) {
    const [year, month] = monthKey.split('-').map(Number);
    const d = new Date(year, month, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
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
    toast.innerHTML = `<i class="bi ${icons[type] || icons.info}"></i> ${message}`;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
    return toast;
}

function clearToasts() {
    const container = document.getElementById('financeToastContainer');
    if (!container) return;
    Array.from(container.children).forEach(child => child.remove());
}

// ========================================
// Currency Formatter
// ========================================

function formatCurrency(amount) {
    if (amount === undefined || amount === null || isNaN(amount)) return '₹0';
    return '₹' + Math.abs(amount).toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

function formatCurrencyWithSign(amount) {
    if (amount >= 0) return formatCurrency(amount);
    return '-' + formatCurrency(amount);
}

// ========================================
// Month Navigation
// ========================================

function initMonthNavigator() {
    document.getElementById('monthPrevBtn').addEventListener('click', () => {
        currentMonth = getPreviousMonth(currentMonth);
        updateMonthDisplay();
        renderAll();
    });

    document.getElementById('monthNextBtn').addEventListener('click', () => {
        const next = getNextMonth(currentMonth);
        if (next <= getCurrentMonthKey()) {
            currentMonth = next;
            updateMonthDisplay();
            renderAll();
        }
    });

    document.getElementById('monthCurrentBtn').addEventListener('click', () => {
        currentMonth = getCurrentMonthKey();
        updateMonthDisplay();
        renderAll();
    });

    updateMonthDisplay();
}

function updateMonthDisplay() {
    document.getElementById('monthDisplay').textContent = getMonthDisplay(currentMonth);
    const currentKey = getCurrentMonthKey();
    const isCurrentMonth = currentMonth === currentKey;
    const nextButton = document.getElementById('monthNextBtn');
    nextButton.disabled = isCurrentMonth || currentMonth > currentKey;
    nextButton.classList.toggle('disabled', nextButton.disabled);

    const btn = document.getElementById('monthCurrentBtn');
    btn.classList.toggle('active', isCurrentMonth);
    btn.textContent = isCurrentMonth ? '● Current' : 'Today';
}

// ========================================
// Income Section
// ========================================

function initIncomeSection() {
    document.getElementById('editIncomeForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        await submitEditIncome();
    });
    document.getElementById('editTaxForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        await submitEditTax();
    });
    document.querySelectorAll('.summary-metric.clickable').forEach(el => {
        el.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                el.click();
            }
        });
    });
}

window.openEditIncomeModal = function() {
    const monthIncome = financeData.income[currentMonth] || { salary: 0, otherIncome: 0 };
    document.getElementById('modalIncomeSalary').value = monthIncome.salary || 0;
    document.getElementById('modalIncomeOther').value = monthIncome.otherIncome || 0;
    openModal('editIncomeModal');
    setTimeout(() => document.getElementById('modalIncomeSalary').focus(), 100);
};

window.submitEditIncome = async function() {
    const salary = parseFloat(document.getElementById('modalIncomeSalary').value) || 0;
    const otherIncome = parseFloat(document.getElementById('modalIncomeOther').value) || 0;

    const result = await saveIncome(currentMonth, { salary, otherIncome });
    if (result.success) {
        closeModal('editIncomeModal');
        showToast('Income updated successfully!', 'success');
    } else {
        showToast('Failed to save income. ' + (result.error || ''), 'error');
    }
};

window.openEditTaxModal = function() {
    const monthTax = financeData.taxes?.[currentMonth] || { tax: 0 };
    document.getElementById('modalTaxAmount').value = monthTax.tax || 0;
    openModal('editTaxModal');
    setTimeout(() => document.getElementById('modalTaxAmount').focus(), 100);
};

window.submitEditTax = async function() {
    const tax = parseFloat(document.getElementById('modalTaxAmount').value) || 0;
    const result = await saveTax(currentMonth, { tax });
    if (result.success) {
        closeModal('editTaxModal');
        showToast('Tax updated successfully!', 'success');
    } else {
        showToast('Failed to save tax. ' + (result.error || ''), 'error');
    }
};

function renderIncome() {
    const monthIncome = financeData.income[currentMonth] || { salary: 0, otherIncome: 0, totalIncome: 0 };
    const monthTax = financeData.taxes?.[currentMonth] || { tax: 0 };

    const incomeSalaryElem = document.getElementById('incomeSalaryDisplay');
    const incomeOtherElem = document.getElementById('incomeOtherDisplay');
    const incomeTaxElem = document.getElementById('incomeTaxDisplay');

    if (incomeSalaryElem) {
        incomeSalaryElem.textContent = formatCurrency(monthIncome.salary || 0);
    }
    if (incomeOtherElem) {
        incomeOtherElem.textContent = formatCurrency(monthIncome.otherIncome || 0);
    }
    if (incomeTaxElem) {
        incomeTaxElem.textContent = formatCurrency(monthTax.tax || 0);
    }
}

// ========================================
// Financial Summary
// ========================================

function renderFinancialSummary() {
    const summary = computeFinancialSummary(financeData, currentMonth);

    // Income
    const monthIncome = summary.monthIncome;
    document.getElementById('summaryIncome').textContent = formatCurrency(monthIncome.totalIncome || 0);
    document.getElementById('summaryIncomeSub').textContent = monthIncome.totalIncome > 0 
        ? `Salary: ${formatCurrency(monthIncome.salary)} + Other: ${formatCurrency(monthIncome.otherIncome)}`
        : 'No income recorded';

    // Expenditure — current month all expenses
    document.getElementById('summaryExpenditure').textContent = formatCurrency(summary.expenditure);
    if (summary.expenditure > 0) {
        const paidText = summary.totalPaidCharges > 0 ? `Paid: ${formatCurrency(summary.totalPaidCharges)}` : '';
        const unpaidText = summary.totalUnpaidCharges > 0 ? `Unpaid: ${formatCurrency(summary.totalUnpaidCharges)}` : '';
        const breakdown = [paidText, unpaidText].filter(Boolean).join(' | ');
        document.getElementById('summaryExpenditureSub').textContent = breakdown || 'Tracked spending';
    } else {
        document.getElementById('summaryExpenditureSub').textContent = 'No expenditure tracked';
    }

    // Invested
    document.getElementById('summaryInvested').textContent = formatCurrency(summary.investedThisMonth);
    const investGrowth = summary.investedThisMonth - summary.prevMonthCategoryTotal;
    document.getElementById('summaryInvestedSub').textContent = 
        investGrowth >= 0 
            ? `↑ ${formatCurrency(investGrowth)} vs last month` 
            : `↓ ${formatCurrency(Math.abs(investGrowth))} vs last month`;

    // Bank Balance & Tax cards
    document.getElementById('summaryBankBalance').textContent = formatCurrency(summary.totalBankBalance);
    document.getElementById('summaryBankBalanceSub').textContent = 'Total bank balances';
    document.getElementById('summaryTax').textContent = formatCurrency(summary.tax || 0);
    document.getElementById('summaryTaxSub').textContent = summary.tax > 0 ? 'Estimated tax' : 'Tax tracking not enabled';

    // Net Worth Cards
    document.getElementById('totalAssetsValue').textContent = formatCurrency(summary.totalAssets);
    document.getElementById('totalLiabilitiesValue').textContent = formatCurrency(summary.totalLiabilities);
    document.getElementById('netWorthValue').textContent = formatCurrencyWithSign(summary.netWorth);

    // Header savings rate badge — meaningful breakdown
    const badge = document.getElementById('savingsRateValue');
    if (monthIncome.totalIncome > 0) {
        const rate = summary.savingsRate.toFixed(1);
        let badgeClass = 'bg-success'; // > 30%
        if (summary.savingsRate < 10) badgeClass = 'bg-danger';
        else if (summary.savingsRate < 30) badgeClass = 'bg-warning text-dark';

        let comparisonText = '';
        if (summary.prevSavingsRate !== null) {
            const diff = summary.savingsRate - summary.prevSavingsRate;
            if (diff >= 0) comparisonText = ` ↑${Math.abs(diff).toFixed(1)}%`;
            else comparisonText = ` ↓${Math.abs(diff).toFixed(1)}%`;
        }

        badge.className = `badge ${badgeClass}`;
        badge.innerHTML = `<i class="bi bi-piggy-bank"></i> Savings: ${rate}%${comparisonText}`;
        badge.title = `Savings = Income (${formatCurrency(monthIncome.totalIncome)}) - Expenditure (${formatCurrency(summary.expenditure)}) = ${formatCurrency(summary.savings)}`;
        badge.style.display = '';
    } else {
        badge.style.display = 'none';
    }

    // Only save snapshot after initial load to avoid write storms on page load
    // AND only if the month has actual data (not an empty month)
    if (!isInitialLoad && !summary.isEmptyMonth) {
        debouncedSnapshotSave(currentMonth, {
            totalExpenses: summary.expenditure,
            totalAssets: summary.totalAssets,
            totalLiabilities: summary.totalLiabilities,
            netWorth: summary.netWorth,
            invested: summary.investedThisMonth,
            income: monthIncome.totalIncome || 0,
            bankSpends: summary.bankSpends,
            prevCCBills: summary.prevMonthCCOutstanding,
            savingsRate: summary.savingsRate,
            categoryBreakdown: summary.categoryBreakdown
        });
    }
}

/**
 * Save snapshot to Firebase, debounced to avoid write storms
 */
function debouncedSnapshotSave(month, data) {
    if (snapshotSaveTimer) clearTimeout(snapshotSaveTimer);
    snapshotSaveTimer = setTimeout(() => {
        saveMonthlySnapshot(month, data).catch(() => {});
    }, 3000);
}

// ========================================
// Categories Rendering
// ========================================

function getCategoryIntroducedMonth(category) {
    if (category.createdMonth) return category.createdMonth;
    if (category.createdAt) return getMonthFromTimestamp(category.createdAt);
    return null;
}

function getCategoryDisplayKey(category) {
    return `${(category.name || '').trim().toLowerCase()}|${category.icon || ''}|${category.color || ''}`;
}

function getCreditCardLimit(card, month) {
    if (card.monthlyLimits && month && card.monthlyLimits[month] !== undefined) {
        return parseFloat(card.monthlyLimits[month]) || 0;
    }
    return parseFloat(card.creditLimit) || 0;
}

function dedupeCategoriesByName(categories) {
    const representatives = new Map();

    Object.entries(categories).forEach(([catId, cat]) => {
        const key = getCategoryDisplayKey(cat);
        const items = Object.values(cat.items || {});
        const hasCurrentMonthItem = items.some(item => item.month === currentMonth);
        const introducedMonth = getCategoryIntroducedMonth(cat);
        const existing = representatives.get(key);

        if (!existing) {
            representatives.set(key, { catId, cat, hasCurrentMonthItem, introducedMonth });
            return;
        }

        if (hasCurrentMonthItem && !existing.hasCurrentMonthItem) {
            representatives.set(key, { catId, cat, hasCurrentMonthItem, introducedMonth });
            return;
        }

        if (hasCurrentMonthItem === existing.hasCurrentMonthItem) {
            const getCreatedMetric = (category) => {
                if (category.createdAt) return Number(category.createdAt);
                if (category.createdMonth) return Number(category.createdMonth.replace('-', ''));
                return 0;
            };
            const existingCreated = getCreatedMetric(existing.cat);
            const currentCreated = getCreatedMetric(cat);
            if (currentCreated > existingCreated) {
                representatives.set(key, { catId, cat, hasCurrentMonthItem, introducedMonth });
            }
        }
    });

    return Array.from(representatives.values()).map(({ catId, cat }) => [catId, cat]);
}

function renderCategories() {
    const container = document.getElementById('categoriesGrid');
    const categories = financeData.categories;

    if (!categories || Object.keys(categories).length === 0) {
        container.innerHTML = `
            <div class="finance-empty-state" style="grid-column: 1/-1;">
                <i class="bi bi-folder-plus"></i>
                <p>No categories yet. Add your first investment category!</p>
            </div>`;
        return;
    }

    const dedupedCategories = dedupeCategoriesByName(categories);
    const visibleCategories = dedupedCategories.filter(([catId, cat]) => {
        const items = cat.items ? Object.values(cat.items) : [];
        const itemsThisMonth = items.filter(item => item.month === currentMonth);
        const hasItemsAnyMonth = items.length > 0;
        const introducedMonth = getCategoryIntroducedMonth(cat);
        const introducedInCurrentOrBefore = introducedMonth && introducedMonth <= currentMonth;
        return itemsThisMonth.length > 0 || (hasItemsAnyMonth && introducedInCurrentOrBefore) || introducedMonth === null;
    });

    if (visibleCategories.length === 0) {
        container.innerHTML = `
            <div class="finance-empty-state" style="grid-column: 1/-1;">
                <i class="bi bi-folder-plus"></i>
                <p>No categories available for ${getMonthDisplay(currentMonth)}. Add a category or copy from previous month.</p>
            </div>`;
        return;
    }

    container.innerHTML = visibleCategories.map(([catId, cat]) => {
        const items = cat.items ? Object.entries(cat.items)
            .filter(([, item]) => item.month === currentMonth)
            .map(([itemId, item]) => ({ id: itemId, ...item })) : [];
        
        const totalAmount = items.reduce((sum, item) => sum + (item.amount || 0), 0);

        return `
            <div class="category-card" data-cat-id="${catId}">
                <div class="category-card-header" style="border-left: 4px solid ${cat.color || '#7289ff'};">
                    <div class="category-card-info">
                        <div class="category-icon" style="background: ${cat.color || '#7289ff'}">
                            <i class="bi ${cat.icon || 'bi-folder'}"></i>
                        </div>
                        <div>
                            <div class="category-card-name">${escapeHtml(cat.name)}</div>
                            <div class="category-card-total">${formatCurrency(totalAmount)} this month</div>
                        </div>
                    </div>
                    <div class="category-card-actions">
                        <button class="category-action-btn add-item-btn" onclick="openAddCategoryItemModal('${catId}')" title="Add item">
                            <i class="bi bi-plus-lg"></i>
                        </button>
                        <button class="category-action-btn edit-btn" onclick="openEditCategoryModal('${catId}')" title="Edit category">
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button class="category-action-btn delete-btn" onclick="deleteFinanceCategory('${catId}')" title="Delete category">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </div>
                <div class="category-card-body">
                    ${items.length > 0 ? `
                        <ul class="category-items-list">
                            ${items.map(item => `
                                <li class="category-item">
                                    <span class="category-item-name">${escapeHtml(item.name)}</span>
                                    <span class="category-item-amount">${formatCurrency(item.amount)}</span>
                                    <div class="category-item-actions">
                                        <button class="edit-item-btn" onclick="editFinanceCategoryItem('${catId}', '${item.id}', '${escapeHtml(item.name)}', ${item.amount})" title="Edit">
                                            <i class="bi bi-pencil"></i>
                                        </button>
                                        <button class="delete-item-btn" onclick="deleteFinanceCategoryItem('${catId}', '${item.id}')" title="Delete">
                                            <i class="bi bi-x-lg"></i>
                                        </button>
                                    </div>
                                </li>
                            `).join('')}
                        </ul>
                    ` : `
                        <div class="category-empty-state">
                            <i class="bi bi-inbox" style="font-size:1.5rem;display:block;margin-bottom:4px;"></i>
                            No items for ${getMonthDisplay(currentMonth)}
                        </div>
                    `}
                </div>
            </div>
        `;
    }).join('');
}

// ========================================
// Bank Accounts Rendering
// ========================================

function renderBanks() {
    const container = document.getElementById('banksTableBody');
    const banks = financeData.banks;

    if (!banks || Object.keys(banks).length === 0) {
        container.innerHTML = `
            <tr>
                <td colspan="5" style="text-align:center;padding:30px;">
                    <i class="bi bi-bank" style="font-size:2rem;display:block;margin-bottom:8px;opacity:0.4;"></i>
                    <span style="color:var(--text-muted);">No bank accounts added yet</span>
                </td>
            </tr>`;
        return;
    }

    container.innerHTML = Object.entries(banks).map(([bankId, bank]) => {
        // New format: show month-specific balance, or 0 if not entered yet
        // Old format (no balances obj): use global balance
        const balance = bank.balances
            ? (bank.balances[currentMonth] || 0)
            : (bank.balance || 0);

        return `
        <tr>
            <td>
                <div style="display:flex;align-items:center;gap:8px;">
                    <span style="width:8px;height:8px;border-radius:50%;background:${bank.color || '#3ddc84'};display:inline-block;"></span>
                    <strong>${escapeHtml(bank.name)}</strong>
                </div>
            </td>
            <td>${escapeHtml(bank.bankName || '-')}</td>
            <td><span class="badge bg-secondary" style="text-transform:capitalize;">${bank.accountType || 'savings'}</span></td>
            <td class="amount-cell amount-positive">${formatCurrency(balance)}</td>
            <td>
                <div class="table-actions">
                    <button onclick="editFinanceBank('${bankId}')" title="Edit"><i class="bi bi-pencil"></i></button>
                    <button class="delete-row-btn" onclick="deleteFinanceBank('${bankId}')" title="Delete"><i class="bi bi-trash"></i></button>
                </div>
            </td>
        </tr>
        `;
    }).join('');
}

// ========================================
// Credit Cards Rendering
// ========================================

function renderCreditCards() {
    const container = document.getElementById('creditCardsTableBody');
    const cards = financeData.creditCards;

    if (!cards || Object.keys(cards).length === 0) {
        container.innerHTML = `
            <tr>
                <td colspan="7" style="text-align:center;padding:30px;">
                    <i class="bi bi-wallet2" style="font-size:2rem;display:block;margin-bottom:8px;opacity:0.4;"></i>
                    <span style="color:var(--text-muted);">No expenses added yet</span>
                </td>
            </tr>`;
        return;
    }

    const today = new Date();

    container.innerHTML = Object.entries(cards).map(([cardId, card]) => {
        // New format: show month-specific outstanding, or 0 if not entered yet
        // Old format (no balances obj): use global outstandingBalance
        const outstanding = card.balances
            ? (card.balances[currentMonth] || 0)
            : (card.outstandingBalance || 0);

        const limit = getCreditCardLimit(card, currentMonth);
        const utilization = limit > 0 ? ((outstanding / limit) * 100).toFixed(1) : 0;
        const utilClass = utilization <= 30 ? 'low' : utilization <= 70 ? 'medium' : 'high';
        
        // Due date warning
        let dueDateHtml = '-';
        if (card.dueDate) {
            const due = new Date(card.dueDate);
            const daysUntilDue = Math.ceil((due - today) / (1000 * 60 * 60 * 24));
            let warningIcon = '';
            if (daysUntilDue < 0) {
                warningIcon = '<i class="bi bi-exclamation-circle-fill due-overdue" title="Overdue!"></i>';
            } else if (daysUntilDue <= 7) {
                warningIcon = '<i class="bi bi-exclamation-triangle-fill due-warning" title="Due soon!"></i>';
            }
            dueDateHtml = `<div class="due-date-cell">${warningIcon} ${card.dueDate}</div>`;
        }

        const expenseType = card.type || 'credit-card';
        const typeLabel = expenseType === 'loan' ? 'Loan' : expenseType === 'general-expense' ? 'General' : 'Credit Card';
        const typeMeta = escapeHtml(card.issuer || '-');
        const limitOrRate = expenseType === 'loan'
            ? (card.interestRate ? `${card.interestRate}%` : '-')
            : expenseType === 'credit-card'
                ? formatCurrency(limit)
                : '-';
        const dueLabel = expenseType === 'general-expense'
            ? (card.expenseDate || '-')
            : (card.dueDate || '-');
        const statusLabel = card.isPaid ? 'Paid' : 'Unpaid';

        return `
        <tr>
            <td>
                <div style="display:flex;align-items:center;gap:8px;">
                    <span style="width:8px;height:8px;border-radius:50%;background:${card.color || '#ff6b6b'};display:inline-block;"></span>
                    <strong>${escapeHtml(card.name)}</strong>
                </div>
            </td>
            <td>
                <div style="display:flex;flex-direction:column;gap:4px;">
                    <span class="badge bg-secondary text-uppercase">${typeLabel}</span>
                    <span>${typeMeta}</span>
                </div>
            </td>
            <td class="amount-cell amount-negative">${formatCurrency(outstanding)}</td>
            <td class="amount-cell">${limitOrRate}</td>
            <td>${dueLabel}</td>
            <td>${statusLabel}</td>
            <td>
                <div class="table-actions">
                    <button onclick="editFinanceCreditCard('${cardId}')" title="Edit"><i class="bi bi-pencil"></i></button>
                    <button class="delete-row-btn" onclick="deleteFinanceCreditCard('${cardId}')" title="Delete"><i class="bi bi-trash"></i></button>
                </div>
            </td>
        </tr>
        `;
    }).join('');
}

// ========================================
// Charts
// ========================================

function renderCharts() {
    const currentSummary = computeFinancialSummary(financeData, currentMonth);
    renderSpendingBreakdownChart();
    renderNetWorthChart(currentSummary);
    renderIncomeExpenseChart(currentSummary);
    renderCategoryTrendChart(currentSummary);
}

function buildChartSnapshots() {
    const snapshots = {};
    const months = new Set(Object.keys(financeData.snapshots || {}));

    Object.keys(financeData.income || {}).forEach(month => months.add(month));
    Object.keys(financeData.taxes || {}).forEach(month => months.add(month));
    Object.values(financeData.banks || {}).forEach(bank => {
        Object.keys(bank.balances || {}).forEach(month => months.add(month));
    });
    Object.values(financeData.creditCards || {}).forEach(card => {
        Object.keys(card.balances || {}).forEach(month => months.add(month));
    });
    Object.values(financeData.categories || {}).forEach(category => {
        Object.values(category.items || {}).forEach(item => {
            if (item.month) months.add(item.month);
        });
    });

    Array.from(months).sort().forEach(month => {
        const summary = computeFinancialSummary(financeData, month);
        
        // Only include months with actual data in the snapshots
        if (!summary.isEmptyMonth) {
            snapshots[month] = {
                totalExpenses: summary.expenditure,
                totalAssets: summary.totalAssets,
                totalLiabilities: summary.totalLiabilities,
                netWorth: summary.netWorth,
                invested: summary.investedThisMonth,
                income: summary.monthIncome.totalIncome || 0,
                bankSpends: summary.bankSpends,
                prevCCBills: summary.prevMonthCCOutstanding,
                savingsRate: summary.savingsRate,
                categoryBreakdown: summary.categoryBreakdown
            };
        }
    });

    return snapshots;
}

function renderSpendingBreakdownChart() {
    const ctx = document.getElementById('spendingBreakdownChart');
    if (!ctx) return;

    if (charts.spending) charts.spending.destroy();

    const categories = financeData.categories;
    const labels = [];
    const data = [];
    const colors = [];

    Object.entries(categories).forEach(([catId, cat]) => {
        let total = 0;
        if (cat.items) {
            Object.values(cat.items).forEach(item => {
                if (item.month === currentMonth) total += (item.amount || 0);
            });
        }
        if (total > 0) {
            labels.push(cat.name);
            data.push(total);
            colors.push(cat.color || '#7289ff');
        }
    });

    if (data.length === 0) {
        labels.push('No Data');
        data.push(1);
        colors.push('#333');
    }

    // Calculate total for percentage calculation
    const total = data.reduce((sum, val) => sum + val, 0);

    charts.spending = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels,
            datasets: [{
                data,
                backgroundColor: colors,
                borderWidth: 0,
                hoverBorderWidth: 3,
                hoverBorderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: getComputedStyle(document.body).getPropertyValue('--text-primary').trim() || '#e9ecef',
                        padding: 15,
                        usePointStyle: true,
                        pointStyleWidth: 12,
                        font: { family: 'Inter', size: 12 }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: (ctx) => {
                            const amount = formatCurrency(ctx.raw);
                            const percentage = total > 0 ? ((ctx.raw / total) * 100).toFixed(1) : '0.0';
                            return `${ctx.label}: ${amount} (${percentage}%)`;
                        }
                    }
                }
            },
            cutout: '65%'
        }
    });
}

function renderNetWorthChart(currentSummary) {
    const ctx = document.getElementById('netWorthChart');
    if (!ctx) return;

    if (charts.netWorth) charts.netWorth.destroy();

    const snapshots = buildChartSnapshots();
    const months = Object.keys(snapshots).sort();
    const chartMonths = [...new Set([...months, currentMonth])].sort();
    const last6 = chartMonths.slice(-6);

    const labels = last6.map(m => getMonthDisplay(m).replace(/ \d{4}/, ''));
    const netWorthData = last6.map(m => m === currentMonth ? currentSummary.netWorth : snapshots[m]?.netWorth || 0);
    const assetsData = last6.map(m => m === currentMonth ? currentSummary.totalAssets : snapshots[m]?.totalAssets || 0);
    const liabilitiesData = last6.map(m => m === currentMonth ? currentSummary.totalLiabilities : snapshots[m]?.totalLiabilities || 0);

    const textColor = getComputedStyle(document.body).getPropertyValue('--text-primary').trim() || '#e9ecef';
    const gridColor = getComputedStyle(document.body).getPropertyValue('--border-color').trim() || '#1f2229';

    charts.netWorth = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels.length > 0 ? labels : ['No Data'],
            datasets: labels.length > 0 ? [
                {
                    label: 'Net Worth',
                    data: netWorthData,
                    borderColor: '#7289ff',
                    backgroundColor: 'rgba(114, 137, 255, 0.1)',
                    fill: true,
                    tension: 0.4,
                    borderWidth: 3,
                    pointRadius: 5,
                    pointBackgroundColor: '#7289ff'
                },
                {
                    label: 'Assets',
                    data: assetsData,
                    borderColor: '#3ddc84',
                    borderWidth: 2,
                    borderDash: [5, 5],
                    tension: 0.4,
                    pointRadius: 3,
                    pointBackgroundColor: '#3ddc84'
                },
                {
                    label: 'Liabilities',
                    data: liabilitiesData,
                    borderColor: '#ff6b6b',
                    borderWidth: 2,
                    borderDash: [5, 5],
                    tension: 0.4,
                    pointRadius: 3,
                    pointBackgroundColor: '#ff6b6b'
                }
            ] : [{ label: 'No Data', data: [0], borderColor: '#444', borderWidth: 1 }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: { color: textColor, font: { family: 'Inter', size: 12 }, usePointStyle: true }
                },
                tooltip: {
                    callbacks: { label: (ctx) => `${ctx.dataset.label}: ${formatCurrency(ctx.raw)}` }
                }
            },
            scales: {
                x: { ticks: { color: textColor }, grid: { color: gridColor } },
                y: {
                    ticks: {
                        color: textColor,
                        callback: (val) => formatCurrency(val)
                    },
                    grid: { color: gridColor }
                }
            }
        }
    });
}

function renderIncomeExpenseChart(currentSummary) {
    const ctx = document.getElementById('incomeExpenseChart');
    if (!ctx) return;

    if (charts.incomeExpense) charts.incomeExpense.destroy();

    const snapshots = buildChartSnapshots();
    const months = Object.keys(snapshots).sort();
    const chartMonths = [...new Set([...months, currentMonth])].sort();
    const last6 = chartMonths.slice(-6);

    const labels = last6.map(m => getMonthDisplay(m).replace(/ \d{4}/, ''));
    const incomeArr = last6.map(m => m === currentMonth ? currentSummary.monthIncome.totalIncome : snapshots[m]?.income || 0);
    const expenseArr = last6.map(m => m === currentMonth ? currentSummary.expenditure : snapshots[m]?.totalExpenses || 0);
    const investedArr = last6.map(m => m === currentMonth ? currentSummary.investedThisMonth : snapshots[m]?.invested || 0);

    const textColor = getComputedStyle(document.body).getPropertyValue('--text-primary').trim() || '#e9ecef';
    const gridColor = getComputedStyle(document.body).getPropertyValue('--border-color').trim() || '#1f2229';

    charts.incomeExpense = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels.length > 0 ? labels : ['No Data'],
            datasets: labels.length > 0 ? [
                {
                    label: 'Income',
                    data: incomeArr,
                    backgroundColor: 'rgba(61, 220, 132, 0.7)',
                    borderRadius: 6,
                    barPercentage: 0.7
                },
                {
                    label: 'Expenditure',
                    data: expenseArr,
                    backgroundColor: 'rgba(255, 107, 107, 0.7)',
                    borderRadius: 6,
                    barPercentage: 0.7
                },
                {
                    label: 'Invested',
                    data: investedArr,
                    backgroundColor: 'rgba(114, 137, 255, 0.7)',
                    borderRadius: 6,
                    barPercentage: 0.7
                }
            ] : [{ label: 'No Data', data: [0], backgroundColor: '#333' }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: { color: textColor, font: { family: 'Inter', size: 12 }, usePointStyle: true }
                },
                tooltip: {
                    callbacks: { label: (ctx) => `${ctx.dataset.label}: ${formatCurrency(ctx.raw)}` }
                }
            },
            scales: {
                x: { ticks: { color: textColor }, grid: { display: false } },
                y: {
                    ticks: { color: textColor, callback: (val) => formatCurrency(val) },
                    grid: { color: gridColor }
                }
            }
        }
    });
}

function renderCategoryTrendChart(currentSummary) {
    const ctx = document.getElementById('categoryTrendChart');
    if (!ctx) return;

    if (charts.categoryTrend) charts.categoryTrend.destroy();

    const snapshots = buildChartSnapshots();
    const months = Object.keys(snapshots).sort();
    const chartMonths = [...new Set([...months, currentMonth])].sort();
    const last6 = chartMonths.slice(-6);
    const labels = last6.map(m => getMonthDisplay(m).replace(/ \d{4}/, ''));

    const categories = financeData.categories;
    const categoryMap = new Map();

    Object.values(categories).forEach(cat => {
        const key = getCategoryDisplayKey(cat);
        if (!categoryMap.has(key)) {
            categoryMap.set(key, {
                label: cat.name || 'Unnamed',
                color: cat.color || '#7289ff',
                totals: new Map()
            });
        }
        const category = categoryMap.get(key);
        Object.values(cat.items || {}).forEach(item => {
            if (!item.month) return;
            const existing = category.totals.get(item.month) || 0;
            category.totals.set(item.month, existing + (parseFloat(item.amount) || 0));
        });
    });

    const datasets = [];
    categoryMap.forEach((category, key) => {
        const data = last6.map(month => category.totals.get(month) || 0);
        const firstPositiveIndex = data.findIndex(value => value > 0);
        if (firstPositiveIndex > 0) {
            for (let i = 0; i < firstPositiveIndex; i += 1) {
                data[i] = null;
            }
        }
        if (data.some(value => value > 0)) {
            datasets.push({
                label: category.label,
                data,
                borderColor: category.color,
                backgroundColor: category.color + '33',
                fill: false,
                tension: 0.4,
                spanGaps: true,
                borderWidth: 2,
                pointRadius: 4,
                pointBackgroundColor: category.color
            });
        }
    });

    const textColor = getComputedStyle(document.body).getPropertyValue('--text-primary').trim() || '#e9ecef';
    const gridColor = getComputedStyle(document.body).getPropertyValue('--border-color').trim() || '#1f2229';

    charts.categoryTrend = new Chart(ctx, {
        type: 'line',
        data: { labels, datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: { color: textColor, font: { family: 'Inter', size: 11 }, usePointStyle: true }
                },
                tooltip: {
                    callbacks: { label: (ctx) => `${ctx.dataset.label}: ${formatCurrency(ctx.raw)}` }
                }
            },
            scales: {
                x: { ticks: { color: textColor }, grid: { display: false } },
                y: {
                    ticks: { color: textColor, callback: (val) => formatCurrency(val) },
                    grid: { color: gridColor }
                }
            }
        }
    });
}

// ========================================
// Render All (debounced to prevent rapid re-renders)
// ========================================

function renderAll() {
    // Guard against re-entrant renders
    if (isRendering) return;
    isRendering = true;
    try {
        renderIncome();
        renderFinancialSummary();
        renderCategories();
        renderBanks();
        renderCreditCards();
        // Defer chart rendering to next animation frame to avoid blocking UI
        if (chartRenderRAF) cancelAnimationFrame(chartRenderRAF);
        chartRenderRAF = requestAnimationFrame(() => {
            renderCharts();
            // Mark initial load as complete after first full render cycle
            if (isInitialLoad) {
                isInitialLoad = false;
            }
        });
    } finally {
        isRendering = false;
    }
}

function debouncedRenderAll() {
    if (renderDebounceTimer) clearTimeout(renderDebounceTimer);
    renderDebounceTimer = setTimeout(() => {
        // Skip render if data hasn't changed (prevent redundant re-renders)
        const dataJSON = JSON.stringify(financeData);
        if (dataJSON === lastRenderedDataJSON) return;
        lastRenderedDataJSON = dataJSON;
        renderAll();
    }, 250);
}

// ========================================
// Modal Helpers
// ========================================

function openModal(modalId) {
    document.getElementById(modalId).classList.add('active');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

window.openExportModal = function() {
    const modal = document.getElementById('exportModal');

    if (!modal) {
        console.warn('Export modal element not found');
        return;
    }

    const today = new Date();
    const currentMonthValue = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

    document.getElementById('exportFromMonth').value = currentMonthValue;
    document.getElementById('exportToMonth').value = currentMonthValue;
    document.getElementById('exportFormatSelect').value = 'xlsx';
    modal.classList.add('active');
};

window.closeExportModal = function() {
    closeModal('exportModal');
};

// ========================================
// Global Functions (called from HTML onclick)
// ========================================

// --- Category ---
window.openAddCategoryModal = function() {
    document.getElementById('addCategoryForm').reset();
    document.querySelectorAll('#addCategoryModal .icon-option').forEach(el => el.classList.remove('selected'));
    document.querySelectorAll('#addCategoryModal .color-option').forEach(el => el.classList.remove('selected'));
    document.querySelector('#addCategoryModal .icon-option[data-icon="bi-folder"]')?.classList.add('selected');
    document.querySelector('#addCategoryModal .color-option[data-color="#7289ff"]')?.classList.add('selected');
    openModal('addCategoryModal');
};

window.submitAddCategory = async function() {
    const name = document.getElementById('categoryNameInput').value.trim();
    if (!name) { showToast('Please enter a category name', 'warning'); return; }

    const selectedIcon = document.querySelector('#addCategoryModal .icon-option.selected');
    const selectedColor = document.querySelector('#addCategoryModal .color-option.selected');

    const result = await addCategory({
        name,
        icon: selectedIcon?.dataset.icon || 'bi-folder',
        color: selectedColor?.dataset.color || '#7289ff',
        createdMonth: currentMonth
    });

    if (result.success) {
        showToast(`Category "${name}" added!`, 'success');
        closeModal('addCategoryModal');
    } else {
        showToast('Failed to add category. ' + (result.error || ''), 'error');
    }
};

window.openAddCategoryItemModal = function(catId) {
    document.getElementById('categoryItemForm').reset();
    document.getElementById('categoryItemCategoryId').value = catId;
    document.getElementById('categoryItemMonthSelect').innerHTML = `
        <option value="${currentMonth}" selected>${getMonthDisplay(currentMonth)}</option>
        <option value="${getPreviousMonth(currentMonth)}">${getMonthDisplay(getPreviousMonth(currentMonth))}</option>
        <option value="${getPreviousMonth(getPreviousMonth(currentMonth))}">${getMonthDisplay(getPreviousMonth(getPreviousMonth(currentMonth)))}</option>
    `;
    openModal('categoryItemModal');
    setTimeout(() => document.getElementById('categoryItemNameInput').focus(), 100);
};

window.submitCategoryItemModal = async function() {
    const catId = document.getElementById('categoryItemCategoryId').value;
    const name = document.getElementById('categoryItemNameInput').value.trim();
    const amount = parseFloat(document.getElementById('categoryItemAmountInput').value);
    const month = document.getElementById('categoryItemMonthSelect').value;

    if (!name || isNaN(amount)) {
        showToast('Enter item name and amount', 'warning');
        return;
    }

    const result = await addCategoryItem(catId, {
        name,
        amount,
        month,
        date: month === currentMonth ? new Date().toISOString().split('T')[0] : `${month}-01`
    });

    if (result.success) {
        showToast(`Item "${name}" added!`, 'success');
        closeModal('categoryItemModal');
    } else {
        showToast('Failed to add item. ' + (result.error || ''), 'error');
    }
};

window.openEditCategoryModal = function(catId) {
    const category = financeData.categories[catId];
    if (!category) return;

    document.getElementById('editCategoryId').value = catId;
    document.getElementById('editCategoryNameInput').value = category.name || '';

    document.querySelectorAll('#editCategoryModal .icon-option').forEach(el => el.classList.remove('selected'));
    document.querySelectorAll('#editCategoryModal .color-option').forEach(el => el.classList.remove('selected'));
    document.querySelector(`#editCategoryModal .icon-option[data-icon="${category.icon || 'bi-folder'}"]`)?.classList.add('selected');
    document.querySelector(`#editCategoryModal .color-option[data-color="${category.color || '#7289ff'}"]`)?.classList.add('selected');

    openModal('editCategoryModal');
    setTimeout(() => document.getElementById('editCategoryNameInput').focus(), 100);
};

window.submitEditCategory = async function() {
    const catId = document.getElementById('editCategoryId').value;
    const name = document.getElementById('editCategoryNameInput').value.trim();
    const selectedIcon = document.querySelector('#editCategoryModal .icon-option.selected');
    const selectedColor = document.querySelector('#editCategoryModal .color-option.selected');

    if (!name) {
        showToast('Please enter a category name', 'warning');
        return;
    }

    const result = await updateCategory(catId, {
        name,
        icon: selectedIcon?.dataset.icon || 'bi-folder',
        color: selectedColor?.dataset.color || '#7289ff'
    });

    if (result.success) {
        showToast('Category updated successfully!', 'success');
        closeModal('editCategoryModal');
    } else {
        showToast('Failed to update category. ' + (result.error || ''), 'error');
    }
};

window.deleteFinanceCategory = async function(catId) {
    const catName = financeData.categories[catId]?.name || 'this category';
    const confirmed = await showConfirmModal(
        'Delete Category',
        `Delete "${catName}" and all its items? This cannot be undone.`
    );
    if (!confirmed) return;
    const result = await deleteCategory(catId);
    if (result.success) showToast(`Category deleted`, 'success');
    else showToast('Failed to delete. ' + (result.error || ''), 'error');
};

// --- Category Items ---
window.addFinanceCategoryItem = async function(event, catId) {
    event.preventDefault();
    const form = event.target;
    const nameInput = form.querySelector('.item-name-input');
    const amountInput = form.querySelector('.item-amount-input');
    const monthSelect = form.querySelector('.item-month-select');

    const name = nameInput.value.trim();
    const amount = parseFloat(amountInput.value);
    const selectedMonth = monthSelect ? monthSelect.value : currentMonth;

    if (!name || isNaN(amount)) { showToast('Enter item name and amount', 'warning'); return; }

    const result = await addCategoryItem(catId, {
        name,
        amount,
        month: selectedMonth,
        date: selectedMonth === currentMonth ? new Date().toISOString().split('T')[0] : `${selectedMonth}-01`
    });

    if (result.success) {
        nameInput.value = '';
        amountInput.value = '';
        showToast(`Item "${name}" added!`, 'success');
    } else {
        showToast('Failed to add item. ' + (result.error || ''), 'error');
    }
};

window.editFinanceCategoryItem = async function(catId, itemId, name, amount) {
    const newAmount = await showEditItemModal(`Update amount for "${name}":`, amount);
    if (newAmount === null) return;
    const parsed = parseFloat(newAmount);
    if (isNaN(parsed)) { showToast('Invalid amount', 'warning'); return; }
    updateCategoryItem(catId, itemId, { amount: parsed })
        .then(r => r.success ? showToast('Updated!', 'success') : showToast('Failed', 'error'));
};

window.deleteFinanceCategoryItem = async function(catId, itemId) {
    const confirmed = await showConfirmModal('Delete Item', 'Are you sure you want to delete this item?');
    if (!confirmed) return;
    const result = await deleteCategoryItem(catId, itemId);
    if (result.success) showToast('Item removed', 'success');
    else showToast('Failed to delete', 'error');
};

// --- Banks ---
window.openAddBankModal = function() {
    document.getElementById('addBankForm').reset();
    document.getElementById('editBankId').value = '';
    document.getElementById('addBankModalTitle').textContent = 'Add Bank Account';
    openModal('addBankModal');
};

window.submitAddBank = async function() {
    const editId = document.getElementById('editBankId').value;
    const data = {
        name: document.getElementById('bankAccountName').value.trim(),
        bankName: document.getElementById('bankBankName').value.trim(),
        accountType: document.getElementById('bankAccountType').value,
        balance: parseFloat(document.getElementById('bankBalance').value) || 0
    };

    if (!data.name) { showToast('Enter account name', 'warning'); return; }

    let result;
    if (editId) {
        result = await updateBank(editId, data, currentMonth);
    } else {
        result = await addBank(data, currentMonth);
    }

    if (result.success) {
        showToast(editId ? 'Bank updated!' : 'Bank added!', 'success');
        closeModal('addBankModal');
    } else {
        showToast('Failed. ' + (result.error || ''), 'error');
    }
};

window.editFinanceBank = function(bankId) {
    const bank = financeData.banks[bankId];
    if (!bank) return;
    // New format: show month-specific balance, or 0 if not entered
    const balance = bank.balances
        ? (bank.balances[currentMonth] || 0)
        : (bank.balance || 0);
    document.getElementById('editBankId').value = bankId;
    document.getElementById('bankAccountName').value = bank.name || '';
    document.getElementById('bankBankName').value = bank.bankName || '';
    document.getElementById('bankAccountType').value = bank.accountType || 'savings';
    document.getElementById('bankBalance').value = balance || '';
    document.getElementById('addBankModalTitle').textContent = 'Edit Bank Account';
    openModal('addBankModal');
};

window.deleteFinanceBank = async function(bankId) {
    const confirmed = await showConfirmModal('Delete Bank Account', 'Are you sure you want to delete this bank account?');
    if (!confirmed) return;
    const result = await deleteBank(bankId);
    if (result.success) showToast('Bank deleted', 'success');
    else showToast('Failed', 'error');
};

// --- Credit Cards ---
window.setExpenseFormFields = function(type) {
    const creditFields = document.querySelectorAll('.credit-card-fields');
    const loanFields = document.querySelectorAll('.loan-fields');
    const generalFields = document.querySelectorAll('.general-fields');

    creditFields.forEach(el => el.style.display = type === 'credit-card' ? '' : 'none');
    loanFields.forEach(el => el.style.display = type === 'loan' ? '' : 'none');
    generalFields.forEach(el => el.style.display = type === 'general-expense' ? '' : 'none');
};

window.onExpenseTypeChange = function() {
    const type = document.getElementById('expenseTypeSelect').value;
    setExpenseFormFields(type);
};

window.openAddCreditCardModal = function() {
    document.getElementById('addCreditCardForm').reset();
    document.getElementById('editCardId').value = '';
    document.getElementById('expenseTypeSelect').value = 'credit-card';
    setExpenseFormFields('credit-card');
    document.getElementById('addCreditCardModalTitle').textContent = 'Add Expense';
    openModal('addCreditCardModal');
};

window.submitAddCreditCard = async function() {
    const editId = document.getElementById('editCardId').value;
    const type = document.getElementById('expenseTypeSelect').value;
    const paymentStatus = type === 'loan'
        ? document.getElementById('loanPaymentStatus').value
        : type === 'general-expense'
            ? document.getElementById('generalPaymentStatus').value
            : document.getElementById('cardPaymentStatus').value;

    const data = {
        type,
        name: document.getElementById('cardName').value.trim(),
        issuer: type === 'loan'
            ? document.getElementById('cardIssuerLoan').value.trim()
            : type === 'general-expense'
                ? document.getElementById('cardIssuerGeneral').value.trim()
                : document.getElementById('cardIssuer').value.trim(),
        outstandingBalance: parseFloat(document.getElementById('cardOutstanding').value) || 0,
        creditLimit: type === 'credit-card' ? parseFloat(document.getElementById('cardLimit').value) || 0 : 0,
        dueDate: type === 'loan'
            ? document.getElementById('loanDueDate').value
            : document.getElementById('cardDueDate').value,
        isPaid: paymentStatus === 'paid',
        interestRate: 0, // Removed for all
        expenseDate: document.getElementById('cardExpenseDate')?.value || '',
        notes: document.getElementById('cardNotes')?.value.trim() || ''
    };

    if (!data.name) { showToast('Enter expense name', 'warning'); return; }

    let result;
    if (editId) {
        result = await updateCreditCard(editId, data, currentMonth);
    } else {
        result = await addCreditCard(data, currentMonth);
    }

    if (result.success) {
        showToast(editId ? 'Expense updated!' : 'Expense added!', 'success');
        closeModal('addCreditCardModal');
    } else {
        showToast('Failed. ' + (result.error || ''), 'error');
    }
};

window.editFinanceCreditCard = function(cardId) {
    const card = financeData.creditCards[cardId];
    if (!card) return;
    const outstanding = card.balances
        ? (card.balances[currentMonth] || 0)
        : (card.outstandingBalance || 0);
    const type = card.type || 'credit-card';
    document.getElementById('editCardId').value = cardId;
    document.getElementById('expenseTypeSelect').value = type;
    setExpenseFormFields(type);
    document.getElementById('cardName').value = card.name || '';
    document.getElementById('cardOutstanding').value = outstanding || '';
    document.getElementById('cardLimit').value = getCreditCardLimit(card, currentMonth) || '';
    document.getElementById('cardDueDate').value = card.dueDate || '';
    document.getElementById('cardExpenseDate').value = card.expenseDate || '';
    document.getElementById('cardNotes').value = card.notes || '';
    if (type === 'loan') {
        document.getElementById('loanPaymentStatus').value = card.isPaid ? 'paid' : 'unpaid';
        document.getElementById('loanDueDate').value = card.dueDate || '';
        document.getElementById('cardIssuerLoan').value = card.issuer || '';
    } else if (type === 'general-expense') {
        document.getElementById('generalPaymentStatus').value = card.isPaid ? 'paid' : 'unpaid';
        document.getElementById('cardIssuerGeneral').value = card.issuer || '';
    } else {
        document.getElementById('cardPaymentStatus').value = card.isPaid ? 'paid' : 'unpaid';
        document.getElementById('cardIssuer').value = card.issuer || '';
    }
    document.getElementById('addCreditCardModalTitle').textContent = 'Edit Expense';
    openModal('addCreditCardModal');
};

window.deleteFinanceCreditCard = async function(cardId) {
    const confirmed = await showConfirmModal('Delete Expense', 'Are you sure you want to delete this expense?');
    if (!confirmed) return;
    const result = await deleteCreditCard(cardId);
    if (result.success) showToast('Card deleted', 'success');
    else showToast('Failed', 'error');
};

// --- Copy Previous Month ---
window.copyFromPreviousMonth = async function() {
    const confirmed = await showConfirmModal(
        'Copy Previous Month',
        `This will copy bank balances, outstanding expenses, and income from the previous month to ${getMonthDisplay(currentMonth)}. Existing entries for this month will NOT be overwritten. Continue?`
    );
    if (!confirmed) return;

    showToast('Copying data from previous month...', 'info');
    const result = await copyPreviousMonthData(currentMonth);
    if (result.success) {
        let msg = `Copied ${result.banksCopied} bank(s) and ${result.cardsCopied} card(s) from ${getMonthDisplay(result.prevMonth)}`;
        if (result.taxesCopied) {
            msg += `, plus ${result.taxesCopied} tax entr${result.taxesCopied === 1 ? 'y' : 'ies'}`;
        }
        if (result.categoryItemsCopied) {
            msg += `, plus ${result.categoryItemsCopied} investment item(s)`;
        }
        showToast(msg, 'success');
    } else {
        showToast('Failed to copy. ' + (result.error || ''), 'error');
    }
};

function getMonthsBetween(fromMonth, toMonth) {
    const [fromYear, fromMon] = fromMonth.split('-').map(Number);
    const [toYear, toMon] = toMonth.split('-').map(Number);
    const months = [];
    let year = fromYear;
    let month = fromMon;
    while (year < toYear || (year === toYear && month <= toMon)) {
        months.push(`${year}-${String(month).padStart(2, '0')}`);
        month += 1;
        if (month > 12) {
            month = 1;
            year += 1;
        }
    }
    return months;
}

function sanitizeCsvCell(value) {
    return `"${String(value ?? '').replace(/"/g, '""')}"`;
}

function downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

function getExportRange() {
    const fromMonth = document.getElementById('exportFromMonth')?.value;
    const toMonth = document.getElementById('exportToMonth')?.value;
    if (!fromMonth || !toMonth) return null;
    if (fromMonth > toMonth) return null;
    return {
        fromMonth,
        toMonth,
        months: getMonthsBetween(fromMonth, toMonth)
    };
}

async function loadScript(src) {
    if (document.querySelector(`script[src="${src}"]`)) return;
    await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

async function ensureSheetJS() {
    if (!window.XLSX) {
        await loadScript('https://cdn.sheetjs.com/xlsx-0.20.1/package/dist/xlsx.full.min.js');
    }
    return window.XLSX;
}

async function ensureJsPDF() {
    if (!window.jsPDF && !window.jspdf) {
        await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
    }
    const jsPDFCtor = window.jsPDF || window.jspdf?.jsPDF || window.jspdf;
    if (!jsPDFCtor) {
        throw new Error('Failed to load jsPDF');
    }

    if (!jsPDFCtor.autoTable && !window.jspdf?.autoTable) {
        await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.29/jspdf.plugin.autotable.min.js');
    }

    return window.jsPDF || window.jspdf?.jsPDF || window.jspdf;
}

function buildExportData(months) {
    const dateRangeLabel = months.length === 1
        ? getMonthDisplay(months[0])
        : `${getMonthDisplay(months[0])} - ${getMonthDisplay(months[months.length - 1])}`;

    // ========================================
    // OVERVIEW (Month-by-Month Detail)
    // ========================================
    const overviewRows = [
        ['Financial Overview'],
        ['Report Range', dateRangeLabel],
        []
    ];

    const monthlyOverviewSections = [];
    months.forEach(month => {
        const summary = computeFinancialSummary(financeData, month);
        const monthIncome = summary.monthIncome;
        const rows = [
            ['Total Income', monthIncome.totalIncome || 0],
            ['  Salary', monthIncome.salary || 0],
            ['  Other Income', monthIncome.otherIncome || 0],
            ['Expenditure', summary.expenditure],
            ['  Credit Card Charges', summary.currentMonthCCOutstanding],
            ['  Bank Spends', summary.bankSpends],
            ['Savings', summary.savings],
            ['Savings Rate', summary.savingsRate > 0 ? summary.savingsRate.toFixed(1) + '%' : 'N/A'],
            ['Total Assets', summary.totalAssets],
            ['  Bank Balances', summary.totalBankBalance],
            ['  Cumulative Investments', summary.cumulativeCategoryTotal],
            ['Total Liabilities', summary.totalLiabilities],
            ['Net Worth', summary.netWorth],
            ['Tax', summary.tax || 0]
        ];

        overviewRows.push([`${getMonthDisplay(month)} Summary`]);
        overviewRows.push(['Metric', 'Amount (₹)']);
        rows.forEach(row => overviewRows.push(row));
        overviewRows.push([]);
        monthlyOverviewSections.push({ title: `${getMonthDisplay(month)} Summary`, rows });
    });

    // ========================================
    // AGGREGATE SUMMARY
    // ========================================
    const aggregateSummary = [['AGGREGATE SUMMARY FOR PERIOD']];
    let totalIncome = 0, totalExpenditure = 0, totalInvested = 0, totalTax = 0;
    let maxAssets = 0, maxLiabilities = 0, finalNetWorth = 0;
    const lastSummary = computeFinancialSummary(financeData, months[months.length - 1]);
    
    months.forEach(month => {
        const summary = computeFinancialSummary(financeData, month);
        totalIncome += summary.monthIncome.totalIncome || 0;
        totalExpenditure += summary.expenditure;
        totalInvested += summary.investedThisMonth;
        totalTax += summary.tax || 0;
    });
    maxAssets = lastSummary.totalAssets;
    maxLiabilities = lastSummary.totalLiabilities;
    finalNetWorth = lastSummary.netWorth;

    aggregateSummary.push(['Metric', 'Amount (₹)']);
    aggregateSummary.push(['Total Income (All Months)', totalIncome]);
    aggregateSummary.push(['Total Expenditure (All Months)', totalExpenditure]);
    aggregateSummary.push(['Total Invested (All Months)', totalInvested]);
    aggregateSummary.push(['Total Tax (All Months)', totalTax]);
    aggregateSummary.push(['Average Monthly Income', months.length > 0 ? (totalIncome / months.length).toFixed(0) : 0]);
    aggregateSummary.push(['Average Monthly Expenditure', months.length > 0 ? (totalExpenditure / months.length).toFixed(0) : 0]);
    aggregateSummary.push(['Current Total Assets', maxAssets]);
    aggregateSummary.push(['Current Total Liabilities', maxLiabilities]);
    aggregateSummary.push(['Current Net Worth', finalNetWorth]);
    aggregateSummary.push([]);

    // ========================================
    // FINANCIAL HEALTH METRICS
    // ========================================
    const healthMetrics = [['FINANCIAL HEALTH METRICS']];
    healthMetrics.push(['Metric', 'Value']);
    
    const debtToAssetRatio = maxAssets > 0 ? ((maxLiabilities / maxAssets) * 100).toFixed(1) : 0;
    const debtToIncomeRatio = totalIncome > 0 ? ((maxLiabilities / (totalIncome / months.length)) * 100).toFixed(1) : 0;
    const investmentRatio = maxAssets > 0 ? ((lastSummary.cumulativeCategoryTotal / maxAssets) * 100).toFixed(1) : 0;
    const avgSavingsRate = months.length > 0 ? ((totalIncome - totalExpenditure - totalInvested) / totalIncome * 100).toFixed(1) : 0;
    
    healthMetrics.push(['Debt-to-Asset Ratio', debtToAssetRatio + '%']);
    healthMetrics.push(['Debt-to-Income Ratio', debtToIncomeRatio + '%']);
    healthMetrics.push(['Investment Ratio', investmentRatio + '%']);
    healthMetrics.push(['Average Savings Rate', avgSavingsRate + '%']);
    healthMetrics.push(['Total Months Tracked', months.length]);
    healthMetrics.push([]);

    // ========================================
    // EXPENSE BREAKDOWN
    // ========================================
    const expenseBreakdown = [['EXPENSE BREAKDOWN']];
    expenseBreakdown.push(['Credit Card', 'Month', 'Outstanding (₹)', 'Utilization %', 'Status']);
    Object.values(financeData.creditCards).forEach(card => {
        months.forEach(month => {
            const outstanding = card.balances ? (card.balances[month] || 0) : 0;
            const limit = card.creditLimit || 0;
            const util = limit > 0 ? ((outstanding / limit) * 100).toFixed(1) : 0;
            const status = outstanding > 0 ? (card.isPaid ? 'PAID' : 'UNPAID') : 'NO CHARGES';
            if (outstanding > 0 || card.isPaid) {
                expenseBreakdown.push([card.name, getMonthDisplay(month), outstanding, util + '%', status]);
            }
        });
    });
    expenseBreakdown.push([]);

    // ========================================
    // INVESTMENT ALLOCATION
    // ========================================
    const investmentAlloc = [['INVESTMENT ALLOCATION ANALYSIS']];
    const categoryTotals = {};
    Object.entries(financeData.categories).forEach(([catId, cat]) => {
        let catTotal = 0;
        if (cat.items) {
            Object.values(cat.items).forEach(item => {
                if (months.includes(item.month)) catTotal += (item.amount || 0);
            });
        }
        if (catTotal > 0) categoryTotals[cat.name] = catTotal;
    });
    
    investmentAlloc.push(['Category', 'Amount (₹)', 'Percentage']);
    const investmentTotal = Object.values(categoryTotals).reduce((a, b) => a + b, 0);
    Object.entries(categoryTotals).forEach(([cat, amount]) => {
        const pct = investmentTotal > 0 ? ((amount / investmentTotal) * 100).toFixed(1) : 0;
        investmentAlloc.push([cat, amount, pct + '%']);
    });
    investmentAlloc.push(['TOTAL', investmentTotal, '100%']);
    investmentAlloc.push([]);

    // ========================================
    // RISK ASSESSMENT & RECOMMENDATIONS
    // ========================================
    const recommendations = [['RISK ASSESSMENT & FINANCIAL RECOMMENDATIONS']];
    recommendations.push([]);
    
    const risks = [];
    const suggestions = [];
    
    // Risk Assessment
    if (debtToAssetRatio > 50) {
        risks.push(`⚠️  HIGH DEBT LEVEL: Your debt-to-asset ratio is ${debtToAssetRatio}% (>50% threshold). Consider reducing credit card balances.`);
        suggestions.push(`• Pay off high-interest credit cards aggressively. Prioritize cards with >30% utilization.`);
    } else if (debtToAssetRatio > 30) {
        risks.push(`⚠️  MODERATE DEBT: Your debt-to-asset ratio is ${debtToAssetRatio}% (30-50% range). Monitor closely.`);
        suggestions.push(`• Work on reducing outstanding balances systematically.`);
    }

    if (debtToIncomeRatio > 50) {
        risks.push(`⚠️  HIGH DEBT-TO-INCOME: Monthly debt is ${debtToIncomeRatio}% of income. This is concerning.`);
        suggestions.push(`• Increase income or reduce expenses to lower this ratio below 30%.`);
    }

    if (avgSavingsRate < 10) {
        risks.push(`⚠️  LOW SAVINGS RATE: You're saving only ${avgSavingsRate}% of income. This is below recommended 20%.`);
        suggestions.push(`• Review spending patterns and identify areas to cut expenses.`);
        suggestions.push(`• Set a target to increase savings to at least 20% of monthly income.`);
    } else if (avgSavingsRate < 20) {
        suggestions.push(`• Aim to increase savings rate from ${avgSavingsRate}% to at least 20%.`);
        suggestions.push(`• Look for recurring expenses that can be eliminated or reduced.`);
    }

    if (investmentRatio < 20) {
        suggestions.push(`• Your investment ratio is low (${investmentRatio}%). Consider increasing monthly investments.`);
        suggestions.push(`• Allocate more surplus to equities or mutual funds for long-term growth.`);
    }

    if (investmentRatio > 70) {
        suggestions.push(`• Your investment ratio is high (${investmentRatio}%). Ensure adequate emergency fund (3-6 months expenses).`);
    }

    // Credit Card analysis
    Object.values(financeData.creditCards).forEach(card => {
        const latestMonth = months[months.length - 1];
        const outstanding = card.balances ? (card.balances[latestMonth] || 0) : 0;
        const limit = card.creditLimit || 0;
        const util = limit > 0 ? (outstanding / limit) * 100 : 0;
        
        if (util > 80) {
            risks.push(`⚠️  HIGH UTILIZATION: ${card.name} is ${util.toFixed(1)}% utilized. Keep below 30% for better credit.`);
            suggestions.push(`• Reduce balance on ${card.name} to below 30% of credit limit (${(limit * 0.3).toFixed(0)} ₹).`);
        }
    });

    if (risks.length === 0) {
        risks.push('✅ NO MAJOR RISKS IDENTIFIED: Your financial health appears stable.');
    }

    recommendations.push(['IDENTIFIED RISKS']);
    risks.forEach(risk => recommendations.push([risk]));
    recommendations.push([]);
    
    recommendations.push(['ACTIONABLE SUGGESTIONS']);
    suggestions.forEach(suggestion => recommendations.push([suggestion]));
    recommendations.push([]);
    
    recommendations.push(['PRIORITY ACTIONS']);
    if (debtToAssetRatio > 50 || debtToIncomeRatio > 50) {
        recommendations.push(['1. Prioritize debt reduction - focus on highest interest rate cards first']);
    }
    if (avgSavingsRate < 10) {
        recommendations.push(['1. Increase savings rate by cutting discretionary spending']);
    } else {
        recommendations.push(['1. Maintain current savings rate and increase investments']);
    }
    recommendations.push(['2. Review monthly spending patterns and identify optimization opportunities']);
    recommendations.push(['3. Build emergency fund to 6 months of expenses if not already done']);
    recommendations.push(['4. Consider diversifying investments across asset classes']);

    const categoryRows = [['Category', 'Icon', 'Color', 'Item Name', 'Amount (₹)', 'Month', 'Date', 'Notes']];
    const pdfCategoryRows = [['Category', 'Item Name', 'Amount (₹)', 'Month', 'Date', 'Notes']];
    Object.values(financeData.categories).forEach(cat => {
        const items = cat.items ? Object.values(cat.items).filter(item => months.includes(item.month)) : [];
        if (items.length > 0) {
            items.forEach(item => {
                categoryRows.push([cat.name, cat.icon, cat.color, item.name, item.amount, item.month, item.date, item.notes || '']);
                pdfCategoryRows.push([cat.name, item.name, item.amount, item.month, item.date, item.notes || '']);
            });
        } else {
            categoryRows.push([cat.name, cat.icon, cat.color, '', '', '', '', '']);
            pdfCategoryRows.push([cat.name, '', '', '', '', '']);
        }
    });

    const pivotHeader = ['Category', ...months.map(getMonthDisplay), 'Total'];
    const pivotRows = [pivotHeader];
    Object.values(financeData.categories).forEach(cat => {
        const row = [cat.name];
        let catTotal = 0;
        months.forEach(month => {
            let monthTotal = 0;
            if (cat.items) {
                Object.values(cat.items).forEach(item => {
                    if (item.month === month) monthTotal += (item.amount || 0);
                });
            }
            row.push(monthTotal);
            catTotal += monthTotal;
        });
        row.push(catTotal);
        pivotRows.push(row);
    });
    const totalsRow = ['TOTAL'];
    let grandTotal = 0;
    months.forEach((month, index) => {
        const monthSum = pivotRows.slice(1).reduce((sum, row) => sum + (row[index + 1] || 0), 0);
        totalsRow.push(monthSum);
        grandTotal += monthSum;
    });
    totalsRow.push(grandTotal);
    pivotRows.push(totalsRow);

    const bankHeader = ['Account Name', 'Bank', 'Type', ...months.map(month => `${getMonthDisplay(month)} Balance (₹)`), 'Color'];
    const bankRows = [bankHeader];
    const pdfBankHeader = ['Account Name', 'Bank', 'Type', ...months.map(month => `${getMonthDisplay(month)} Balance (₹)`), 'Total Balance (₹)'];
    const pdfBankRows = [pdfBankHeader];
    Object.values(financeData.banks).forEach(bank => {
        const row = [bank.name, bank.bankName, bank.accountType];
        const pdfRow = [bank.name, bank.bankName, bank.accountType];
        let total = 0;
        months.forEach(month => {
            const balance = bank.balances ? (bank.balances[month] || 0) : (month === months[months.length - 1] ? (bank.balance || 0) : 0);
            row.push(balance);
            pdfRow.push(balance);
            total += balance;
        });
        row.push(bank.color || '');
        pdfRow.push(total);
        bankRows.push(row);
        pdfBankRows.push(pdfRow);
    });

    const cardHeader = ['Card Name', 'Issuer', ...months.map(month => `${getMonthDisplay(month)} Outstanding (₹)`), 'Credit Limit (₹)', 'Utilization %', 'Due Date', 'Color'];
    const cardRows = [cardHeader];
    const pdfCardHeader = ['Card Name', 'Issuer', ...months.map(month => `${getMonthDisplay(month)} Outstanding (₹)`), 'Credit Limit (₹)', 'Utilization %', 'Due Date'];
    const pdfCardRows = [pdfCardHeader];
    Object.values(financeData.creditCards).forEach(card => {
        const row = [card.name, card.issuer];
        const pdfRow = [card.name, card.issuer];
        let total = 0;
        months.forEach(month => {
            const outstanding = card.balances ? (card.balances[month] || 0) : (month === months[months.length - 1] ? (card.outstandingBalance || 0) : 0);
            row.push(outstanding);
            pdfRow.push(outstanding);
            total += outstanding;
        });
        const limit = getCreditCardLimit(card, currentMonth);
        const util = limit > 0 ? ((total / limit) * 100).toFixed(1) : '0.0';
        row.push(limit || 0, util + '%', card.dueDate || '', card.color || '');
        pdfRow.push(limit || 0, util + '%', card.dueDate || '');
        cardRows.push(row);
        pdfCardRows.push(pdfRow);
    });

    const incomeRows = [['Month', 'Salary (₹)', 'Other Income (₹)', 'Tax (₹)', 'Total Income (₹)']];
    months.forEach(month => {
        const income = financeData.income[month] || { salary: 0, otherIncome: 0, totalIncome: 0 };
        const tax = financeData.taxes?.[month]?.tax || 0;
        incomeRows.push([getMonthDisplay(month), income.salary, income.otherIncome, tax, income.totalIncome]);
    });

    const summaryRows = [['Month', 'Income (₹)', 'Invested (₹)', 'Expenses (₹)', 'Assets (₹)', 'Liabilities (₹)', 'Net Worth (₹)']];
    months.forEach(month => {
        const summary = computeFinancialSummary(financeData, month);
        summaryRows.push([
            getMonthDisplay(month),
            summary.monthIncome.totalIncome || 0,
            summary.investedThisMonth || 0,
            summary.expenditure || 0,
            summary.totalAssets || 0,
            summary.totalLiabilities || 0,
            summary.netWorth || 0
        ]);
    });

    const chartRows = [['Month', 'Income (₹)', 'Expenses (₹)', 'Invested (₹)', 'Assets (₹)', 'Liabilities (₹)', 'Net Worth (₹)']];
    months.forEach(month => {
        const summary = computeFinancialSummary(financeData, month);
        chartRows.push([
            getMonthDisplay(month),
            summary.monthIncome.totalIncome || 0,
            summary.expenditure || 0,
            summary.investedThisMonth || 0,
            summary.totalAssets || 0,
            summary.totalLiabilities || 0,
            summary.netWorth || 0
        ]);
    });

    return {
        overviewRows,
        monthlyOverviewSections,
        aggregateSummary,
        healthMetrics,
        expenseBreakdown,
        investmentAlloc,
        recommendations,
        categoryRows,
        pdfCategoryRows,
        pivotRows,
        bankRows,
        pdfBankRows,
        cardRows,
        pdfCardRows,
        incomeRows,
        summaryRows,
        chartRows,
        dateRangeLabel
    };
}

function buildCsvSection(title, rows) {
    return [title, ...rows.map(row => row.map(sanitizeCsvCell).join(','))].join('\r\n');
}

window.exportFinanceData = async function() {
    const range = getExportRange();
    if (!range) {
        showToast('Please select a valid export range.', 'error');
        return;
    }

    const format = document.getElementById('exportFormatSelect')?.value || 'xlsx';
    clearToasts();
    showToast('Preparing export...', 'info');

    try {
        const exportData = buildExportData(range.months);
        const filenameBase = `Finance_Export_${range.fromMonth}_to_${range.toMonth}`;

        if (format === 'csv') {
            const sections = [
                buildCsvSection('Overview', exportData.overviewRows),
                buildCsvSection('Aggregate Summary', exportData.aggregateSummary),
                buildCsvSection('Financial Health Metrics', exportData.healthMetrics),
                buildCsvSection('Expense Breakdown', exportData.expenseBreakdown),
                buildCsvSection('Investment Allocation', exportData.investmentAlloc),
                buildCsvSection('Risk Assessment & Recommendations', exportData.recommendations),
                buildCsvSection('Investments', exportData.categoryRows),
                buildCsvSection('Category by Month', exportData.pivotRows),
                buildCsvSection('Bank Accounts', exportData.bankRows),
                buildCsvSection('Expenses', exportData.cardRows),
                buildCsvSection('Income History', exportData.incomeRows),
                buildCsvSection('Net Worth History', exportData.summaryRows)
            ];
            downloadFile(sections.join('\r\n\r\n'), `${filenameBase}.csv`, 'text/csv;charset=utf-8;');
        } else if (format === 'pdf') {
            const PDF = await ensureJsPDF();
            const doc = new PDF({ unit: 'pt', format: 'a4' });
            const margin = 40;
            const pageHeight = 842;
            const lineHeight = 12;
            let y = 50;
            const hasAutoTable = typeof doc.autoTable === 'function';

            doc.setFontSize(16);
            doc.text('Finance Export Report', margin, y);
            y += 20;
            doc.setFontSize(10);
            doc.text(`Report range: ${exportData.dateRangeLabel}`, margin, y);
            y += 20;

            const ensurePage = () => {
                if (y > pageHeight - 100) {
                    doc.addPage();
                    y = margin;
                }
            };

            const renderTextSection = (title, rows) => {
                ensurePage();
                doc.setFontSize(12);
                doc.text(title, margin, y);
                y += 16;
                doc.setFontSize(9);
                rows.forEach(row => {
                    if (!row || row.length === 0) {
                        y += 6;
                        return;
                    }
                    const text = row.join(' : ');
                    doc.text(text, margin, y);
                    y += lineHeight;
                    if (y > pageHeight - 60) ensurePage();
                });
                y += 10;
            };

            const renderTableSection = (title, head, body, opts = {}) => {
                if (hasAutoTable) {
                    ensurePage();
                    doc.setFontSize(12);
                    doc.text(title, margin, y);
                    y += 14;
                    doc.autoTable({
                        startY: y,
                        head: [head],
                        body,
                        theme: opts.theme || 'grid',
                        styles: { fontSize: opts.fontSize || 8 },
                        columnStyles: opts.columnStyles || {}
                    });
                    y = doc.lastAutoTable.finalY + 10;
                } else {
                    renderTextSection(title, [head, ...body]);
                }
            };

            exportData.monthlyOverviewSections.forEach(section => {
                renderTableSection(section.title, ['Metric', 'Amount (₹)'], section.rows, { theme: 'grid' });
            });

            renderTableSection('Aggregate Summary', ['Metric', 'Amount (₹)'], exportData.aggregateSummary.slice(1), { theme: 'striped' });
            renderTableSection('Financial Health Metrics', ['Metric', 'Value'], exportData.healthMetrics.slice(1), { theme: 'grid' });

            if (exportData.recommendations.length > 1) {
                renderTableSection('Risk Assessment & Recommendations', ['Recommendation'], exportData.recommendations.slice(1), { theme: 'plain', columnStyles: { 0: { cellWidth: 500 } } });
            }

            if (hasAutoTable) {
                renderTableSection('Investments', exportData.pdfCategoryRows[0], exportData.pdfCategoryRows.slice(1), { theme: 'striped', fontSize: 7 });
                renderTableSection('Bank Accounts', exportData.pdfBankRows[0], exportData.pdfBankRows.slice(1), { theme: 'grid', fontSize: 7 });
                renderTableSection('Credit Card Expenses', exportData.pdfCardRows[0], exportData.pdfCardRows.slice(1), { theme: 'grid', fontSize: 7 });
            }

            doc.save(`${filenameBase}.pdf`);
        } else {
            const XLSX = await ensureSheetJS();
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(exportData.overviewRows), 'Overview');
            XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(exportData.aggregateSummary), 'Aggregate Summary');
            XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(exportData.healthMetrics), 'Health Metrics');
            XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(exportData.expenseBreakdown), 'Expenses');
            XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(exportData.investmentAlloc), 'Investment Allocation');
            XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(exportData.recommendations), 'Recommendations');
            XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(exportData.categoryRows), 'Investments');
            XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(exportData.pivotRows), 'Category by Month');
            XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(exportData.bankRows), 'Bank Accounts');
            XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(exportData.cardRows), 'Credit Cards');
            XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(exportData.incomeRows), 'Income History');
            XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(exportData.summaryRows), 'Net Worth History');
            XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(exportData.chartRows), 'Chart Data');
            XLSX.writeFile(wb, `${filenameBase}.xlsx`);
        }

        clearToasts();
        showToast('Export completed successfully!', 'success');
        closeExportModal();
    } catch (error) {
        console.error('Export failed:', error);
        clearToasts();
        showToast('Export failed. Please try again.', 'error');
    }
}

// --- Modal close handlers ---
window.closeFinanceModal = function(modalId) {
    closeModal(modalId);
};

// ========================================
// Confirmation & Edit Modal Helpers
// ========================================

/**
 * Show a custom confirmation modal (replaces browser confirm())
 * @returns {Promise<boolean>} true if confirmed, false if cancelled
 */
function showConfirmModal(title, message) {
    return new Promise((resolve) => {
        document.getElementById('confirmModalTitle').textContent = title;
        document.getElementById('confirmModalMessage').textContent = message;
        openModal('confirmModal');

        const okBtn = document.getElementById('confirmModalOk');
        const cancelBtn = document.getElementById('confirmModalCancel');

        function cleanup() {
            okBtn.removeEventListener('click', onOk);
            cancelBtn.removeEventListener('click', onCancel);
            closeModal('confirmModal');
        }

        function onOk() {
            cleanup();
            resolve(true);
        }

        function onCancel() {
            cleanup();
            resolve(false);
        }

        okBtn.addEventListener('click', onOk);
        cancelBtn.addEventListener('click', onCancel);
    });
}

/**
 * Show a custom edit-item modal (replaces browser prompt())
 * @returns {Promise<string|null>} entered value or null if cancelled
 */
function showEditItemModal(label, currentValue) {
    return new Promise((resolve) => {
        document.getElementById('editItemLabel').textContent = label;
        const input = document.getElementById('editItemAmountInput');
        input.value = currentValue;
        openModal('editItemModal');
        setTimeout(() => input.focus(), 100);

        const saveBtn = document.getElementById('editItemModalSave');
        const overlay = document.getElementById('editItemModal');

        function cleanup() {
            saveBtn.removeEventListener('click', onSave);
            input.removeEventListener('keydown', onKeydown);
            closeModal('editItemModal');
        }

        function onSave() {
            const val = input.value;
            cleanup();
            resolve(val);
        }

        function onKeydown(e) {
            if (e.key === 'Enter') { e.preventDefault(); onSave(); }
            if (e.key === 'Escape') { cleanup(); resolve(null); }
        }

        saveBtn.addEventListener('click', onSave);
        input.addEventListener('keydown', onKeydown);
    });
}

// ========================================
// Icon & Color Selector Setup
// ========================================

function setupSelectors() {
    // Icon selector
    document.querySelectorAll('.icon-option').forEach(el => {
        el.addEventListener('click', function() {
            this.closest('.icon-selector').querySelectorAll('.icon-option').forEach(o => o.classList.remove('selected'));
            this.classList.add('selected');
        });
    });

    // Color selector
    document.querySelectorAll('.color-option').forEach(el => {
        el.addEventListener('click', function() {
            this.closest('.color-selector').querySelectorAll('.color-option').forEach(o => o.classList.remove('selected'));
            this.classList.add('selected');
        });
    });

    // Export modal defaults
    const exportFrom = document.getElementById('exportFromMonth');
    const exportTo = document.getElementById('exportToMonth');
    const formatSelect = document.getElementById('exportFormatSelect');
    if (exportFrom && exportTo) {
        exportFrom.value = currentMonth;
        exportTo.value = currentMonth;
        exportFrom.addEventListener('change', () => {
            if (exportTo.value < exportFrom.value) exportTo.value = exportFrom.value;
        });
        exportTo.addEventListener('change', () => {
            if (exportTo.value < exportFrom.value) exportFrom.value = exportTo.value;
        });
    }
    if (formatSelect) {
        formatSelect.value = 'xlsx';
    }

    // Modal close on overlay click
    document.querySelectorAll('.finance-modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) overlay.classList.remove('active');
        });
    });
}

// ========================================
// Auth UI (duplicated from other pages for consistency)
// ========================================

function setupAuth() {
    initAuthListener();

    onAuthStateChange((user) => {
        const authButtons = document.getElementById('authButtons');
        const userProfile = document.getElementById('userProfile');
        const userEmail = document.getElementById('userEmail');
        const mainContent = document.getElementById('financeMainContent');
        const loginPrompt = document.getElementById('loginPrompt');

        if (user) {
            if (authButtons) authButtons.style.setProperty('display', 'none', 'important');
            if (userProfile) userProfile.style.setProperty('display', 'flex', 'important');
            if (userEmail) userEmail.textContent = user.displayName || user.email;
            if (mainContent) mainContent.style.display = '';
            if (loginPrompt) loginPrompt.style.display = 'none';

            // Reset state for new user session
            isInitialLoad = true;
            lastRenderedDataJSON = '';

            // Setup finance data listener
            if (unsubscribeFinance) unsubscribeFinance();
            unsubscribeFinance = listenToFinanceData((data) => {
                financeData = data;
                debouncedRenderAll();
            });

            // Create default categories for new users (delayed to avoid racing with listeners)
            setTimeout(() => createDefaultCategories(), 1500);
        } else {
            if (authButtons) authButtons.style.setProperty('display', 'flex', 'important');
            if (userProfile) userProfile.style.setProperty('display', 'none', 'important');
            if (mainContent) mainContent.style.display = 'none';
            if (loginPrompt) loginPrompt.style.display = '';
            if (unsubscribeFinance) { unsubscribeFinance(); unsubscribeFinance = null; }
            // Reset state on logout
            isInitialLoad = true;
            lastRenderedDataJSON = '';
        }
    });

    // Login form
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('loginEmail').value;
            const password = document.getElementById('loginPassword').value;
            const result = await signInUser(email, password);
            if (result.success) {
                const modal = bootstrap.Modal.getInstance(document.getElementById('authModal'));
                if (modal) modal.hide();
            } else {
                const container = document.getElementById('authAlertContainer');
                if (container) container.innerHTML = `<div class="alert alert-danger">${result.error}</div>`;
            }
        });
    }

    // Signup form
    const signupForm = document.getElementById('signupForm');
    if (signupForm) {
        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('signupName').value;
            const email = document.getElementById('signupEmail').value;
            const password = document.getElementById('signupPassword').value;
            const confirm = document.getElementById('signupConfirmPassword').value;
            if (password !== confirm) {
                document.getElementById('authAlertContainer').innerHTML = '<div class="alert alert-danger">Passwords do not match</div>';
                return;
            }
            const result = await signUpUser(email, password, name);
            if (result.success) {
                const modal = bootstrap.Modal.getInstance(document.getElementById('authModal'));
                if (modal) modal.hide();
            } else {
                document.getElementById('authAlertContainer').innerHTML = `<div class="alert alert-danger">${result.error}</div>`;
            }
        });
    }

    // Google sign in
    const googleBtn = document.getElementById('googleSignInBtn');
    if (googleBtn) googleBtn.addEventListener('click', async () => {
        const result = await signInWithGoogle();
        if (result.success) {
            const modal = bootstrap.Modal.getInstance(document.getElementById('authModal'));
            if (modal) modal.hide();
        } else {
            document.getElementById('authAlertContainer').innerHTML = `<div class="alert alert-danger">${result.error}</div>`;
        }
    });

    const googleUpBtn = document.getElementById('googleSignUpBtn');
    if (googleUpBtn) googleUpBtn.addEventListener('click', async () => {
        const result = await signInWithGoogle();
        if (result.success) {
            const modal = bootstrap.Modal.getInstance(document.getElementById('authModal'));
            if (modal) modal.hide();
        }
    });

    // Login/Signup btn triggers
    document.getElementById('loginBtn')?.addEventListener('click', () => {
        document.getElementById('loginForm').style.display = 'block';
        document.getElementById('signupForm').style.display = 'none';
        document.getElementById('forgotPasswordForm').style.display = 'none';
        document.getElementById('authModalTitle').textContent = 'Sign In';
        new bootstrap.Modal(document.getElementById('authModal')).show();
    });

    document.getElementById('signupBtn')?.addEventListener('click', () => {
        document.getElementById('loginForm').style.display = 'none';
        document.getElementById('signupForm').style.display = 'block';
        document.getElementById('forgotPasswordForm').style.display = 'none';
        document.getElementById('authModalTitle').textContent = 'Create Account';
        new bootstrap.Modal(document.getElementById('authModal')).show();
    });

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

    document.getElementById('sendResetEmailBtn')?.addEventListener('click', async () => {
        const email = document.getElementById('resetEmail').value;
        const result = await resetPassword(email);
        const container = document.getElementById('authAlertContainer');
        if (result.success) {
            container.innerHTML = `<div class="alert alert-success">${result.message}</div>`;
        } else {
            container.innerHTML = `<div class="alert alert-danger">${result.error}</div>`;
        }
    });

    // Logout
    document.getElementById('logoutBtn')?.addEventListener('click', async (e) => {
        e.preventDefault();
        await signOutUser();
        showToast('Logged out successfully', 'info');
    });

    // Change password
    const changePwForm = document.getElementById('changePasswordForm');
    if (changePwForm) {
        changePwForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const current = document.getElementById('currentPassword').value;
            const newPw = document.getElementById('newPassword').value;
            const confirmPw = document.getElementById('confirmNewPassword').value;
            if (newPw !== confirmPw) {
                document.getElementById('profileAlertContainer').innerHTML = '<div class="alert alert-danger">Passwords do not match</div>';
                return;
            }
            const result = await changePassword(current, newPw);
            const container = document.getElementById('profileAlertContainer');
            if (result.success) {
                container.innerHTML = `<div class="alert alert-success">${result.message}</div>`;
                changePwForm.reset();
            } else {
                container.innerHTML = `<div class="alert alert-danger">${result.error}</div>`;
            }
        });
    }

    // Toggle password visibility
    document.querySelectorAll('.toggle-password').forEach(btn => {
        btn.addEventListener('click', function() {
            const target = document.getElementById(this.dataset.target);
            if (target) {
                target.type = target.type === 'password' ? 'text' : 'password';
                this.querySelector('i').className = target.type === 'password' ? 'bi bi-eye' : 'bi bi-eye-slash';
            }
        });
    });
}

// ========================================
// Init
// ========================================

document.addEventListener('DOMContentLoaded', () => {
    initMonthNavigator();
    initIncomeSection();
    setupSelectors();
    setupAuth();
});
