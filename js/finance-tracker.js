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
        currentMonth = getNextMonth(currentMonth);
        updateMonthDisplay();
        renderAll();
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
    const isCurrentMonth = currentMonth === getCurrentMonthKey();
    const btn = document.getElementById('monthCurrentBtn');
    btn.classList.toggle('active', isCurrentMonth);
    btn.textContent = isCurrentMonth ? '● Current' : 'Today';
}

// ========================================
// Income Section
// ========================================

function initIncomeSection() {
    document.getElementById('incomeForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const salary = parseFloat(document.getElementById('incomeSalary').value) || 0;
        const otherIncome = parseFloat(document.getElementById('incomeOther').value) || 0;
        
        const result = await saveIncome(currentMonth, { salary, otherIncome });
        if (result.success) {
            showToast('Income saved successfully!', 'success');
        } else {
            showToast('Failed to save income. ' + (result.error || ''), 'error');
        }
    });
}

function renderIncome() {
    const monthIncome = financeData.income[currentMonth];
    document.getElementById('incomeSalary').value = monthIncome?.salary || '';
    document.getElementById('incomeOther').value = monthIncome?.otherIncome || '';
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

    // Expenditure — new formula: prevMonth CC bills + bank spends
    document.getElementById('summaryExpenditure').textContent = formatCurrency(summary.expenditure);
    if (summary.expenditure > 0) {
        const parts = [];
        if (summary.prevMonthCCOutstanding > 0) parts.push(`CC Bills: ${formatCurrency(summary.prevMonthCCOutstanding)}`);
        if (summary.bankSpends > 0) parts.push(`Bank Spends: ${formatCurrency(summary.bankSpends)}`);
        document.getElementById('summaryExpenditureSub').textContent = parts.join(' + ') || 'Tracked spending';
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
    if (!isInitialLoad) {
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

    container.innerHTML = Object.entries(categories).map(([catId, cat]) => {
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
                    <form class="add-item-form" onsubmit="addFinanceCategoryItem(event, '${catId}')">
                        <input type="text" placeholder="Item name" required class="item-name-input">
                        <input type="number" placeholder="Amount" required min="0" step="0.01" class="item-amount-input" style="max-width:120px;">
                        <button type="submit"><i class="bi bi-plus"></i> Add</button>
                    </form>
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
                    <i class="bi bi-credit-card" style="font-size:2rem;display:block;margin-bottom:8px;opacity:0.4;"></i>
                    <span style="color:var(--text-muted);">No credit cards added yet</span>
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

        const utilization = card.creditLimit > 0 ? ((outstanding / card.creditLimit) * 100).toFixed(1) : 0;
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

        return `
        <tr>
            <td>
                <div style="display:flex;align-items:center;gap:8px;">
                    <span style="width:8px;height:8px;border-radius:50%;background:${card.color || '#ff6b6b'};display:inline-block;"></span>
                    <strong>${escapeHtml(card.name)}</strong>
                </div>
            </td>
            <td>${escapeHtml(card.issuer || '-')}</td>
            <td class="amount-cell amount-negative">${formatCurrency(outstanding)}</td>
            <td class="amount-cell">${formatCurrency(card.creditLimit)}</td>
            <td>
                <div class="utilization-bar-wrapper">
                    <div class="utilization-bar">
                        <div class="utilization-bar-fill ${utilClass}" style="width:${Math.min(utilization, 100)}%"></div>
                    </div>
                    <span class="utilization-percent">${utilization}%</span>
                </div>
            </td>
            <td>${dueDateHtml}</td>
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
    renderSpendingBreakdownChart();
    renderNetWorthChart();
    renderIncomeExpenseChart();
    renderCategoryTrendChart();
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
                        label: (ctx) => `${ctx.label}: ${formatCurrency(ctx.raw)}`
                    }
                }
            },
            cutout: '65%'
        }
    });
}

function renderNetWorthChart() {
    const ctx = document.getElementById('netWorthChart');
    if (!ctx) return;

    if (charts.netWorth) charts.netWorth.destroy();

    const snapshots = financeData.snapshots;
    const months = Object.keys(snapshots).sort();
    const last6 = months.slice(-6);

    const labels = last6.map(m => getMonthDisplay(m).replace(/ \d{4}/, ''));
    const netWorthData = last6.map(m => snapshots[m]?.netWorth || 0);
    const assetsData = last6.map(m => snapshots[m]?.totalAssets || 0);
    const liabilitiesData = last6.map(m => snapshots[m]?.totalLiabilities || 0);

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

function renderIncomeExpenseChart() {
    const ctx = document.getElementById('incomeExpenseChart');
    if (!ctx) return;

    if (charts.incomeExpense) charts.incomeExpense.destroy();

    const snapshots = financeData.snapshots;
    const months = Object.keys(snapshots).sort();
    const last6 = months.slice(-6);

    const labels = last6.map(m => getMonthDisplay(m).replace(/ \d{4}/, ''));
    const incomeArr = last6.map(m => snapshots[m]?.income || 0);
    const expenseArr = last6.map(m => snapshots[m]?.totalExpenses || 0);
    const investedArr = last6.map(m => snapshots[m]?.invested || 0);

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

function renderCategoryTrendChart() {
    const ctx = document.getElementById('categoryTrendChart');
    if (!ctx) return;

    if (charts.categoryTrend) charts.categoryTrend.destroy();

    const snapshots = financeData.snapshots;
    const months = Object.keys(snapshots).sort();
    const last6 = months.slice(-6);
    const labels = last6.map(m => getMonthDisplay(m).replace(/ \d{4}/, ''));

    const categories = financeData.categories;
    const datasets = [];
    const catEntries = Object.entries(categories);

    catEntries.forEach(([catId, cat]) => {
        const data = last6.map(m => {
            const bd = snapshots[m]?.categoryBreakdown;
            return bd ? (bd[catId] || 0) : 0;
        });
        if (data.some(v => v > 0)) {
            datasets.push({
                label: cat.name,
                data,
                borderColor: cat.color || '#7289ff',
                backgroundColor: (cat.color || '#7289ff') + '33',
                fill: false,
                tension: 0.4,
                borderWidth: 2,
                pointRadius: 4,
                pointBackgroundColor: cat.color || '#7289ff'
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
        color: selectedColor?.dataset.color || '#7289ff'
    });

    if (result.success) {
        showToast(`Category "${name}" added!`, 'success');
        closeModal('addCategoryModal');
    } else {
        showToast('Failed to add category. ' + (result.error || ''), 'error');
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

    const name = nameInput.value.trim();
    const amount = parseFloat(amountInput.value);

    if (!name || isNaN(amount)) { showToast('Enter item name and amount', 'warning'); return; }

    const result = await addCategoryItem(catId, {
        name,
        amount,
        month: currentMonth,
        date: new Date().toISOString().split('T')[0]
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
window.openAddCreditCardModal = function() {
    document.getElementById('addCreditCardForm').reset();
    document.getElementById('editCardId').value = '';
    document.getElementById('addCreditCardModalTitle').textContent = 'Add Credit Card';
    openModal('addCreditCardModal');
};

window.submitAddCreditCard = async function() {
    const editId = document.getElementById('editCardId').value;
    const data = {
        name: document.getElementById('cardName').value.trim(),
        issuer: document.getElementById('cardIssuer').value.trim(),
        outstandingBalance: parseFloat(document.getElementById('cardOutstanding').value) || 0,
        creditLimit: parseFloat(document.getElementById('cardLimit').value) || 0,
        dueDate: document.getElementById('cardDueDate').value
    };

    if (!data.name) { showToast('Enter card name', 'warning'); return; }

    let result;
    if (editId) {
        result = await updateCreditCard(editId, data, currentMonth);
    } else {
        result = await addCreditCard(data, currentMonth);
    }

    if (result.success) {
        showToast(editId ? 'Card updated!' : 'Card added!', 'success');
        closeModal('addCreditCardModal');
    } else {
        showToast('Failed. ' + (result.error || ''), 'error');
    }
};

window.editFinanceCreditCard = function(cardId) {
    const card = financeData.creditCards[cardId];
    if (!card) return;
    // New format: show month-specific outstanding, or 0 if not entered
    const outstanding = card.balances
        ? (card.balances[currentMonth] || 0)
        : (card.outstandingBalance || 0);
    document.getElementById('editCardId').value = cardId;
    document.getElementById('cardName').value = card.name || '';
    document.getElementById('cardIssuer').value = card.issuer || '';
    document.getElementById('cardOutstanding').value = outstanding || '';
    document.getElementById('cardLimit').value = card.creditLimit || '';
    document.getElementById('cardDueDate').value = card.dueDate || '';
    document.getElementById('addCreditCardModalTitle').textContent = 'Edit Credit Card';
    openModal('addCreditCardModal');
};

window.deleteFinanceCreditCard = async function(cardId) {
    const confirmed = await showConfirmModal('Delete Credit Card', 'Are you sure you want to delete this credit card?');
    if (!confirmed) return;
    const result = await deleteCreditCard(cardId);
    if (result.success) showToast('Card deleted', 'success');
    else showToast('Failed', 'error');
};

// --- Copy Previous Month ---
window.copyFromPreviousMonth = async function() {
    const confirmed = await showConfirmModal(
        'Copy Previous Month',
        `This will copy bank balances, credit card outstanding amounts, and income from the previous month to ${getMonthDisplay(currentMonth)}. Existing entries for this month will NOT be overwritten. Continue?`
    );
    if (!confirmed) return;

    showToast('Copying data from previous month...', 'info');
    const result = await copyPreviousMonthData(currentMonth);
    if (result.success) {
        const msg = `Copied ${result.banksCopied} bank(s) and ${result.cardsCopied} card(s) from ${getMonthDisplay(result.prevMonth)}`;
        showToast(msg, 'success');
    } else {
        showToast('Failed to copy. ' + (result.error || ''), 'error');
    }
};

// --- Excel Export ---
window.exportFinanceData = async function() {
    showToast('Preparing Excel export...', 'info');

    try {
        // Load SheetJS dynamically
        if (!window.XLSX) {
            await new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = 'https://cdn.sheetjs.com/xlsx-0.20.1/package/dist/xlsx.full.min.js';
                script.onload = resolve;
                script.onerror = reject;
                document.head.appendChild(script);
            });
        }

        const wb = XLSX.utils.book_new();

        // --- Sheet 1: Financial Overview (current month snapshot) ---
        const summary = computeFinancialSummary(financeData, currentMonth);
        const overviewRows = [
            ['Financial Overview - ' + getMonthDisplay(currentMonth)],
            [],
            ['Metric', 'Amount (₹)'],
            ['Total Income', summary.monthIncome.totalIncome || 0],
            ['  Salary', summary.monthIncome.salary || 0],
            ['  Other Income', summary.monthIncome.otherIncome || 0],
            [],
            ['Total Invested (This Month)', summary.investedThisMonth],
            ['Expenditure', summary.expenditure],
            ['  CC Bills (prev month)', summary.prevMonthCCOutstanding],
            ['  Bank Spends', summary.bankSpends],
            [],
            ['Total Assets', summary.totalAssets],
            ['  Bank Balances', summary.totalBankBalance],
            ['  Cumulative Investments', summary.cumulativeCategoryTotal],
            ['Total Liabilities', summary.totalLiabilities],
            ['Net Worth', summary.netWorth],
            [],
            ['Savings', summary.savings],
            ['Savings Rate', summary.savingsRate > 0 ? summary.savingsRate.toFixed(1) + '%' : 'N/A']
        ];
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(overviewRows), 'Overview');

        // --- Sheet 2: Investment Categories ---
        const catRows = [['Category', 'Icon', 'Color', 'Item Name', 'Amount (₹)', 'Month', 'Date', 'Notes']];
        Object.values(financeData.categories).forEach(cat => {
            if (cat.items && Object.keys(cat.items).length > 0) {
                Object.values(cat.items).forEach(item => {
                    catRows.push([cat.name, cat.icon, cat.color, item.name, item.amount, item.month, item.date, item.notes || '']);
                });
            } else {
                catRows.push([cat.name, cat.icon, cat.color, '', '', '', '', '']);
            }
        });
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(catRows), 'Investments');

        // --- Sheet 3: Category by Month Pivot ---
        const catNames = Object.values(financeData.categories).map(c => c.name);
        const allMonths = new Set();
        Object.values(financeData.categories).forEach(cat => {
            if (cat.items) Object.values(cat.items).forEach(item => allMonths.add(item.month));
        });
        const sortedMonths = Array.from(allMonths).sort();
        const pivotHeader = ['Category', ...sortedMonths.map(m => getMonthDisplay(m)), 'Total'];
        const pivotRows = [pivotHeader];
        Object.values(financeData.categories).forEach(cat => {
            const row = [cat.name];
            let catTotal = 0;
            sortedMonths.forEach(month => {
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
        // Add totals row
        const totalsRow = ['TOTAL'];
        let grandTotal = 0;
        sortedMonths.forEach((month, i) => {
            const monthSum = pivotRows.slice(1).reduce((sum, row) => sum + (row[i + 1] || 0), 0);
            totalsRow.push(monthSum);
            grandTotal += monthSum;
        });
        totalsRow.push(grandTotal);
        pivotRows.push(totalsRow);
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(pivotRows), 'Category by Month');

        // --- Sheet 4: Bank Accounts (current month) ---
        const bankRows = [['Account Name', 'Bank', 'Type', `Balance - ${getMonthDisplay(currentMonth)} (₹)`, 'Color']];
        let totalBankBal = 0;
        Object.values(financeData.banks).forEach(bank => {
            const bal = bank.balances
                ? (bank.balances[currentMonth] || 0)
                : (bank.balance || 0);
            bankRows.push([bank.name, bank.bankName, bank.accountType, bal, bank.color || '']);
            totalBankBal += bal;
        });
        bankRows.push([]);
        bankRows.push(['Total Bank Balance', '', '', totalBankBal]);
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(bankRows), 'Bank Accounts');

        // --- Sheet 5: Credit Cards (current month) ---
        const cardRows = [['Card Name', 'Issuer', `Outstanding - ${getMonthDisplay(currentMonth)} (₹)`, 'Credit Limit (₹)', 'Utilization %', 'Due Date', 'Color']];
        let totalCC = 0;
        Object.values(financeData.creditCards).forEach(card => {
            const outstanding = card.balances
                ? (card.balances[currentMonth] || 0)
                : (card.outstandingBalance || 0);
            const util = card.creditLimit > 0 ? ((outstanding / card.creditLimit) * 100).toFixed(1) : 0;
            cardRows.push([card.name, card.issuer, outstanding, card.creditLimit, util + '%', card.dueDate || '', card.color || '']);
            totalCC += outstanding;
        });
        cardRows.push([]);
        cardRows.push(['Total Outstanding', '', totalCC]);
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(cardRows), 'Credit Cards');

        // --- Sheet 6: Income History ---
        const incRows = [['Month', 'Salary (₹)', 'Other Income (₹)', 'Total Income (₹)']];
        Object.entries(financeData.income).sort().forEach(([month, inc]) => {
            incRows.push([getMonthDisplay(month), inc.salary, inc.otherIncome, inc.totalIncome]);
        });
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(incRows), 'Income History');

        // --- Sheet 7: Monthly Summary / Net Worth History ---
        const sumRows = [['Month', 'Income (₹)', 'Invested (₹)', 'Expenses (₹)', 'Assets (₹)', 'Liabilities (₹)', 'Net Worth (₹)']];
        Object.entries(financeData.snapshots).sort().forEach(([month, snap]) => {
            sumRows.push([getMonthDisplay(month), snap.income || 0, snap.invested || 0, snap.totalExpenses || 0, snap.totalAssets || 0, snap.totalLiabilities || 0, snap.netWorth || 0]);
        });
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(sumRows), 'Net Worth History');

        XLSX.writeFile(wb, `Finance_Tracker_${currentMonth}.xlsx`);
        showToast('Excel exported successfully!', 'success');
    } catch (error) {
        console.error('Export error:', error);
        showToast('Export failed. Please try again.', 'error');
    }
};

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
// Escape HTML
// ========================================

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
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
