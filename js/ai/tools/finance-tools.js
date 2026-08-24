/**
 * Finance Tracker Tools
 * 
 * Tool definitions that map to existing Firebase Finance Service CRUD functions.
 * These tools allow the AI agent to read and modify the user's finance data.
 * 
 * @module finance-tools
 */

import {
    addCategory,
    updateCategory,
    addCategoryItem,
    updateCategoryItem,
    deleteCategoryItem,
    addBank,
    updateBank,
    addCreditCard,
    updateCreditCard,
    saveIncome,
    saveTax,
    saveEPFO,
    getFinanceRawData,
    computeFinancialSummary
} from '../../firebase-finance-service.js';

/**
 * Helper: Get the current month key from the page's month selector
 * or derive from the current date.
 * @returns {string} YYYY-MM
 */
function getCurrentMonthFromPage() {
    // Try to read from the page's month display element
    const monthInput = document.getElementById('monthPicker');
    if (monthInput && monthInput.value) {
        return monthInput.value;
    }
    // Fallback: try to read from the bridge
    if (window.equityLabsFinance && window.equityLabsFinance.getCurrentMonth) {
        return window.equityLabsFinance.getCurrentMonth();
    }
    // Final fallback: current date
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Helper: Get finance data from the page's state bridge
 * @returns {Object}
 */
function getFinanceDataFromBridge() {
    if (window.equityLabsFinance && window.equityLabsFinance.getData) {
        return window.equityLabsFinance.getData();
    }
    return null;
}

/**
 * Helper: Resolve a category by name (case-insensitive partial match)
 * @param {string} categoryName 
 * @param {Object} categories 
 * @returns {{ id: string, category: Object }|null}
 */
function findCategoryByName(categoryName, categories) {
    if (!categories || !categoryName) return null;
    const lowerName = categoryName.toLowerCase().trim();

    // Exact match first
    for (const [id, cat] of Object.entries(categories)) {
        if (cat.name && cat.name.toLowerCase().trim() === lowerName) {
            return { id, category: cat };
        }
    }

    // Partial match
    for (const [id, cat] of Object.entries(categories)) {
        if (cat.name && cat.name.toLowerCase().includes(lowerName)) {
            return { id, category: cat };
        }
    }

    return null;
}

/**
 * Helper: Resolve a bank by name
 * @param {string} bankName 
 * @param {Object} banks 
 * @returns {{ id: string, bank: Object }|null}
 */
function findBankByName(bankName, banks) {
    if (!banks || !bankName) return null;
    const lowerName = bankName.toLowerCase().trim();

    for (const [id, bank] of Object.entries(banks)) {
        const name = (bank.name || bank.bankName || '').toLowerCase();
        if (name === lowerName || name.includes(lowerName)) {
            return { id, bank };
        }
    }
    return null;
}

/**
 * Helper: Resolve a credit card by name
 * @param {string} cardName 
 * @param {Object} creditCards 
 * @returns {{ id: string, card: Object }|null}
 */
function findCreditCardByName(cardName, creditCards) {
    if (!creditCards || !cardName) return null;
    const lowerName = cardName.toLowerCase().trim();

    for (const [id, card] of Object.entries(creditCards)) {
        if (card.name && card.name.toLowerCase().includes(lowerName)) {
            return { id, card };
        }
    }
    return null;
}

/**
 * Helper: Find a category item by name within a category
 * @param {string} itemName 
 * @param {Object} items 
 * @param {string} [month] - Optional month filter
 * @returns {{ id: string, item: Object }|null}
 */
function findItemByName(itemName, items, month) {
    if (!items || !itemName) return null;
    const lowerName = itemName.toLowerCase().trim();

    for (const [id, item] of Object.entries(items)) {
        const nameMatch = item.name && item.name.toLowerCase().includes(lowerName);
        const monthMatch = !month || item.month === month;
        if (nameMatch && monthMatch) {
            return { id, item };
        }
    }
    return null;
}

/**
 * Format currency for display in responses
 * @param {number} amount 
 * @returns {string}
 */
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0
    }).format(amount);
}

/**
 * Format month key for display
 * @param {string} monthKey - YYYY-MM
 * @returns {string}
 */
function formatMonth(monthKey) {
    if (!monthKey) return 'current month';
    const [year, month] = monthKey.split('-');
    const date = new Date(year, month - 1, 1);
    return date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

/**
 * All finance tracker tool definitions
 */
export const financeTools = [
    // ==========================================
    // READ TOOLS
    // ==========================================
    {
        name: 'get_financial_summary',
        description: 'Get the complete financial summary for the current or specified month including income, expenditure, investments, bank balances, net worth, assets, liabilities, savings rate, and category breakdown.',
        parameters: {
            month: {
                type: 'string',
                description: 'Month in YYYY-MM format (e.g., "2026-07"). If not provided, uses the currently selected month on the page.',
                required: false
            }
        },
        handler: async (params) => {
            const data = getFinanceDataFromBridge();
            if (!data) {
                // Fallback: fetch from Firebase
                const rawResult = await getFinanceRawData();
                if (!rawResult.success) {
                    return { error: 'Could not fetch finance data. Please ensure you are logged in.' };
                }
                const month = params.month || getCurrentMonthFromPage();
                const summary = computeFinancialSummary(rawResult.data, month);
                return { summary, month: formatMonth(month) };
            }

            const month = params.month || getCurrentMonthFromPage();
            const summary = computeFinancialSummary(data, month);

            return {
                month: formatMonth(month),
                monthKey: month,
                income: {
                    salary: summary.monthIncome?.salary || 0,
                    otherIncome: summary.monthIncome?.otherIncome || 0,
                    totalIncome: summary.monthIncome?.totalIncome || 0,
                    formatted: formatCurrency(summary.monthIncome?.totalIncome || 0)
                },
                expenditure: {
                    total: summary.expenditure,
                    formatted: formatCurrency(summary.expenditure)
                },
                investments: {
                    thisMonth: summary.investedThisMonth,
                    cumulative: summary.cumulativeCategoryTotal,
                    formattedThisMonth: formatCurrency(summary.investedThisMonth),
                    formattedCumulative: formatCurrency(summary.cumulativeCategoryTotal)
                },
                bankBalance: {
                    total: summary.totalBankBalance,
                    formatted: formatCurrency(summary.totalBankBalance)
                },
                netWorth: {
                    assets: summary.totalAssets,
                    liabilities: summary.totalLiabilities,
                    total: summary.netWorth,
                    formattedAssets: formatCurrency(summary.totalAssets),
                    formattedLiabilities: formatCurrency(summary.totalLiabilities),
                    formattedTotal: formatCurrency(summary.netWorth)
                },
                tax: {
                    amount: summary.tax,
                    formatted: formatCurrency(summary.tax)
                },
                epfo: {
                    value: summary.epfoValue,
                    formatted: formatCurrency(summary.epfoValue)
                },
                savingsRate: `${summary.savingsRate.toFixed(1)}%`,
                isEmptyMonth: summary.isEmptyMonth
            };
        },
        pages: ['finance-tracker'],
        requiresConfirmation: false,
        category: 'read'
    },

    {
        name: 'list_investment_categories',
        description: 'List all investment categories with their names, item counts, and this month\'s total. Use this to discover category names and IDs before making updates.',
        parameters: {
            month: {
                type: 'string',
                description: 'Month in YYYY-MM format to filter items by. Defaults to current month.',
                required: false
            }
        },
        handler: async (params) => {
            const data = getFinanceDataFromBridge();
            const categories = data?.categories || {};
            const month = params.month || getCurrentMonthFromPage();

            const result = Object.entries(categories).map(([id, cat]) => {
                const items = cat.items || {};
                const monthItems = Object.entries(items)
                    .filter(([, item]) => item.month === month)
                    .map(([itemId, item]) => ({
                        id: itemId,
                        name: item.name,
                        amount: item.amount,
                        formatted: formatCurrency(item.amount || 0)
                    }));

                const monthTotal = monthItems.reduce((sum, item) => sum + (item.amount || 0), 0);

                return {
                    id,
                    name: cat.name,
                    icon: cat.icon,
                    color: cat.color,
                    itemCount: monthItems.length,
                    monthTotal,
                    formattedTotal: formatCurrency(monthTotal),
                    items: monthItems
                };
            });

            return {
                month: formatMonth(month),
                monthKey: month,
                categoryCount: result.length,
                categories: result
            };
        },
        pages: ['finance-tracker'],
        requiresConfirmation: false,
        category: 'read'
    },

    {
        name: 'list_bank_accounts',
        description: 'List all bank accounts with their names, types, and current month balances.',
        parameters: {
            month: {
                type: 'string',
                description: 'Month in YYYY-MM format. Defaults to current month.',
                required: false
            }
        },
        handler: async (params) => {
            const data = getFinanceDataFromBridge();
            const banks = data?.banks || {};
            const month = params.month || getCurrentMonthFromPage();

            const result = Object.entries(banks).map(([id, bank]) => {
                const balance = bank.balances?.[month] ?? 0;
                return {
                    id,
                    name: bank.name || bank.bankName || 'Unnamed',
                    accountType: bank.accountType || 'savings',
                    balance,
                    formattedBalance: formatCurrency(balance)
                };
            });

            const totalBalance = result.reduce((sum, b) => sum + b.balance, 0);

            return {
                month: formatMonth(month),
                monthKey: month,
                accountCount: result.length,
                totalBalance,
                formattedTotal: formatCurrency(totalBalance),
                accounts: result
            };
        },
        pages: ['finance-tracker'],
        requiresConfirmation: false,
        category: 'read'
    },

    {
        name: 'list_credit_cards',
        description: 'List all credit cards and liabilities with their names, outstanding balances, and payment status for the current month.',
        parameters: {
            month: {
                type: 'string',
                description: 'Month in YYYY-MM format. Defaults to current month.',
                required: false
            }
        },
        handler: async (params) => {
            const data = getFinanceDataFromBridge();
            const creditCards = data?.creditCards || {};
            const month = params.month || getCurrentMonthFromPage();

            const result = Object.entries(creditCards).map(([id, card]) => {
                const balance = card.balances?.[month] ?? 0;
                const isPaid = card.paymentStatusByMonth?.[month] ?? card.isPaid ?? false;
                return {
                    id,
                    name: card.name || 'Unnamed Card',
                    type: card.type || 'credit-card',
                    balance,
                    formattedBalance: formatCurrency(balance),
                    isPaid: Boolean(isPaid),
                    creditLimit: card.creditLimit || 0
                };
            });

            return {
                month: formatMonth(month),
                monthKey: month,
                cardCount: result.length,
                cards: result
            };
        },
        pages: ['finance-tracker'],
        requiresConfirmation: false,
        category: 'read'
    },

    {
        name: 'get_income_details',
        description: 'Get the income details (salary and other income) for the current or specified month.',
        parameters: {
            month: {
                type: 'string',
                description: 'Month in YYYY-MM format. Defaults to current month.',
                required: false
            }
        },
        handler: async (params) => {
            const data = getFinanceDataFromBridge();
            const month = params.month || getCurrentMonthFromPage();
            const income = data?.income?.[month] || { salary: 0, otherIncome: 0, totalIncome: 0 };

            return {
                month: formatMonth(month),
                monthKey: month,
                salary: income.salary || 0,
                otherIncome: income.otherIncome || 0,
                totalIncome: income.totalIncome || 0,
                formattedSalary: formatCurrency(income.salary || 0),
                formattedOtherIncome: formatCurrency(income.otherIncome || 0),
                formattedTotal: formatCurrency(income.totalIncome || 0)
            };
        },
        pages: ['finance-tracker'],
        requiresConfirmation: false,
        category: 'read'
    },

    // ==========================================
    // WRITE TOOLS
    // ==========================================
    {
        name: 'update_income',
        description: 'Update the user\'s monthly salary and/or other income for a specific month. Provide at least one of salary or otherIncome.',
        parameters: {
            month: {
                type: 'string',
                description: 'Month in YYYY-MM format (e.g., "2026-07"). If not provided, uses the current month on the page.',
                required: false
            },
            salary: {
                type: 'number',
                description: 'Monthly salary amount in INR',
                required: false
            },
            otherIncome: {
                type: 'number',
                description: 'Other income amount in INR',
                required: false
            }
        },
        handler: async (params) => {
            const month = params.month || getCurrentMonthFromPage();

            // Get existing income to merge
            const data = getFinanceDataFromBridge();
            const existingIncome = data?.income?.[month] || {};

            const salary = params.salary !== undefined ? params.salary : (existingIncome.salary || 0);
            const otherIncome = params.otherIncome !== undefined ? params.otherIncome : (existingIncome.otherIncome || 0);

            const result = await saveIncome(month, { salary, otherIncome });

            if (!result.success) {
                return { error: result.error || 'Failed to update income' };
            }

            return {
                message: `Income updated for ${formatMonth(month)}`,
                month: formatMonth(month),
                monthKey: month,
                salary,
                otherIncome,
                totalIncome: salary + otherIncome,
                formattedSalary: formatCurrency(salary),
                formattedOtherIncome: formatCurrency(otherIncome),
                formattedTotal: formatCurrency(salary + otherIncome)
            };
        },
        pages: ['finance-tracker'],
        requiresConfirmation: true,
        category: 'write'
    },

    {
        name: 'update_tax',
        description: 'Update the tax amount for a specific month.',
        parameters: {
            month: {
                type: 'string',
                description: 'Month in YYYY-MM format. Defaults to current month.',
                required: false
            },
            tax: {
                type: 'number',
                description: 'Tax amount in INR',
                required: true
            }
        },
        handler: async (params) => {
            const month = params.month || getCurrentMonthFromPage();
            const result = await saveTax(month, { tax: params.tax });

            if (!result.success) {
                return { error: result.error || 'Failed to update tax' };
            }

            return {
                message: `Tax updated to ${formatCurrency(params.tax)} for ${formatMonth(month)}`,
                month: formatMonth(month),
                tax: params.tax,
                formattedTax: formatCurrency(params.tax)
            };
        },
        pages: ['finance-tracker'],
        requiresConfirmation: true,
        category: 'write'
    },

    {
        name: 'update_epfo',
        description: 'Update the EPFO (Employee Provident Fund) value for a specific month.',
        parameters: {
            month: {
                type: 'string',
                description: 'Month in YYYY-MM format. Defaults to current month.',
                required: false
            },
            value: {
                type: 'number',
                description: 'EPFO balance value in INR',
                required: true
            }
        },
        handler: async (params) => {
            const month = params.month || getCurrentMonthFromPage();
            const result = await saveEPFO(month, { value: params.value });

            if (!result.success) {
                return { error: result.error || 'Failed to update EPFO' };
            }

            return {
                message: `EPFO updated to ${formatCurrency(params.value)} for ${formatMonth(month)}`,
                month: formatMonth(month),
                value: params.value,
                formattedValue: formatCurrency(params.value)
            };
        },
        pages: ['finance-tracker'],
        requiresConfirmation: true,
        category: 'write'
    },

    {
        name: 'add_investment_category',
        description: 'Create a new investment category (e.g., "Mutual Funds", "Gold", "Stocks"). Returns the new category ID.',
        parameters: {
            name: {
                type: 'string',
                description: 'Category name (e.g., "Mutual Funds", "Gold", "Fixed Deposits")',
                required: true
            },
            icon: {
                type: 'string',
                description: 'Bootstrap icon class (e.g., "bi-coin", "bi-graph-up-arrow", "bi-safe"). Defaults to "bi-folder".',
                required: false
            },
            color: {
                type: 'string',
                description: 'Hex color code (e.g., "#7289ff", "#ffd700"). Defaults to "#7289ff".',
                required: false
            }
        },
        handler: async (params) => {
            const result = await addCategory({
                name: params.name,
                icon: params.icon || 'bi-folder',
                color: params.color || '#7289ff'
            });

            if (!result.success) {
                return { error: result.error || 'Failed to create category' };
            }

            return {
                message: `Created new category "${params.name}"`,
                categoryId: result.id,
                name: params.name
            };
        },
        pages: ['finance-tracker'],
        requiresConfirmation: true,
        category: 'write'
    },

    {
        name: 'add_investment_item',
        description: 'Add a new investment item to an existing category. Requires the category name and item details.',
        parameters: {
            categoryName: {
                type: 'string',
                description: 'Name of the category to add the item to (e.g., "Mutual Funds")',
                required: true
            },
            itemName: {
                type: 'string',
                description: 'Name of the investment item (e.g., "Nifty 50 Index Fund")',
                required: true
            },
            amount: {
                type: 'number',
                description: 'Investment amount in INR',
                required: true
            },
            month: {
                type: 'string',
                description: 'Month in YYYY-MM format. Defaults to current month.',
                required: false
            },
            notes: {
                type: 'string',
                description: 'Optional notes for the investment',
                required: false
            }
        },
        handler: async (params) => {
            const data = getFinanceDataFromBridge();
            const categories = data?.categories || {};
            const month = params.month || getCurrentMonthFromPage();

            const found = findCategoryByName(params.categoryName, categories);
            if (!found) {
                return {
                    error: `Category "${params.categoryName}" not found. Available categories: ${Object.values(categories).map(c => c.name).join(', ') || 'none'}. You can create a new category using add_investment_category.`
                };
            }

            const result = await addCategoryItem(found.id, {
                name: params.itemName,
                amount: params.amount,
                month,
                notes: params.notes || ''
            });

            if (!result.success) {
                return { error: result.error || 'Failed to add item' };
            }

            return {
                message: `Added "${params.itemName}" (${formatCurrency(params.amount)}) to ${found.category.name} for ${formatMonth(month)}`,
                categoryName: found.category.name,
                itemId: result.id,
                itemName: params.itemName,
                amount: params.amount,
                formattedAmount: formatCurrency(params.amount)
            };
        },
        pages: ['finance-tracker'],
        requiresConfirmation: true,
        category: 'write'
    },

    {
        name: 'update_investment_item',
        description: 'Update an existing investment item\'s amount, name, or notes. You need to specify the category name and item name to identify it.',
        parameters: {
            categoryName: {
                type: 'string',
                description: 'Name of the category the item belongs to',
                required: true
            },
            itemName: {
                type: 'string',
                description: 'Current name of the item to update',
                required: true
            },
            newAmount: {
                type: 'number',
                description: 'New amount in INR',
                required: false
            },
            newName: {
                type: 'string',
                description: 'New name for the item',
                required: false
            },
            notes: {
                type: 'string',
                description: 'Updated notes',
                required: false
            },
            month: {
                type: 'string',
                description: 'Month filter in YYYY-MM format. Defaults to current month.',
                required: false
            }
        },
        handler: async (params) => {
            const data = getFinanceDataFromBridge();
            const categories = data?.categories || {};
            const month = params.month || getCurrentMonthFromPage();

            const foundCat = findCategoryByName(params.categoryName, categories);
            if (!foundCat) {
                return {
                    error: `Category "${params.categoryName}" not found. Available: ${Object.values(categories).map(c => c.name).join(', ') || 'none'}`
                };
            }

            const foundItem = findItemByName(params.itemName, foundCat.category.items, month);
            if (!foundItem) {
                return {
                    error: `Item "${params.itemName}" not found in "${foundCat.category.name}" for ${formatMonth(month)}.`
                };
            }

            const updates = {};
            if (params.newAmount !== undefined) updates.amount = params.newAmount;
            if (params.newName !== undefined) updates.name = params.newName;
            if (params.notes !== undefined) updates.notes = params.notes;

            const result = await updateCategoryItem(foundCat.id, foundItem.id, updates);

            if (!result.success) {
                return { error: result.error || 'Failed to update item' };
            }

            return {
                message: `Updated "${params.itemName}" in ${foundCat.category.name}${params.newAmount !== undefined ? ` → ${formatCurrency(params.newAmount)}` : ''}`,
                categoryName: foundCat.category.name,
                itemName: params.newName || params.itemName,
                updates
            };
        },
        pages: ['finance-tracker'],
        requiresConfirmation: true,
        category: 'write'
    },

    {
        name: 'delete_investment_item',
        description: 'Delete an investment item from a category. Requires the category name and item name.',
        parameters: {
            categoryName: {
                type: 'string',
                description: 'Name of the category',
                required: true
            },
            itemName: {
                type: 'string',
                description: 'Name of the item to delete',
                required: true
            },
            month: {
                type: 'string',
                description: 'Month filter in YYYY-MM format. Defaults to current month.',
                required: false
            }
        },
        handler: async (params) => {
            const data = getFinanceDataFromBridge();
            const categories = data?.categories || {};
            const month = params.month || getCurrentMonthFromPage();

            const foundCat = findCategoryByName(params.categoryName, categories);
            if (!foundCat) {
                return {
                    error: `Category "${params.categoryName}" not found.`
                };
            }

            const foundItem = findItemByName(params.itemName, foundCat.category.items, month);
            if (!foundItem) {
                return {
                    error: `Item "${params.itemName}" not found in "${foundCat.category.name}" for ${formatMonth(month)}.`
                };
            }

            const result = await deleteCategoryItem(foundCat.id, foundItem.id);

            if (!result.success) {
                return { error: result.error || 'Failed to delete item' };
            }

            return {
                message: `Deleted "${foundItem.item.name}" (${formatCurrency(foundItem.item.amount || 0)}) from ${foundCat.category.name}`,
                categoryName: foundCat.category.name,
                itemName: foundItem.item.name
            };
        },
        pages: ['finance-tracker'],
        requiresConfirmation: true,
        category: 'write'
    },

    {
        name: 'update_bank_balance',
        description: 'Update the balance of an existing bank account for the current or specified month.',
        parameters: {
            bankName: {
                type: 'string',
                description: 'Name of the bank account (e.g., "SBI Savings", "HDFC")',
                required: true
            },
            balance: {
                type: 'number',
                description: 'New balance amount in INR',
                required: true
            },
            month: {
                type: 'string',
                description: 'Month in YYYY-MM format. Defaults to current month.',
                required: false
            }
        },
        handler: async (params) => {
            const data = getFinanceDataFromBridge();
            const banks = data?.banks || {};
            const month = params.month || getCurrentMonthFromPage();

            const bankList = Object.values(banks);
            if (bankList.length === 0) {
                return { error: 'No bank accounts found in your tracker. Please add a bank account first.' };
            }

            let found = null;
            if (!params.bankName || params.bankName.trim() === '') {
                if (bankList.length === 1) {
                    // Auto-select the only bank account
                    const onlyBankId = Object.keys(banks)[0];
                    found = { id: onlyBankId, bank: bankList[0] };
                } else {
                    return {
                        error: `Please specify which bank account to update. Available accounts: ${bankList.map(b => b.name || b.bankName).join(', ')}`
                    };
                }
            } else {
                found = findBankByName(params.bankName, banks);
            }

            if (!found) {
                return {
                    error: `Bank account "${params.bankName || ''}" not found. Available accounts: ${bankList.map(b => b.name || b.bankName).join(', ')}`
                };
            }

            const result = await updateBank(found.id, { balance: params.balance }, month);

            if (!result.success) {
                return { error: result.error || 'Failed to update bank balance' };
            }

            return {
                message: `Updated ${found.bank.name} balance to ${formatCurrency(params.balance)} for ${formatMonth(month)}`,
                bankName: found.bank.name,
                balance: params.balance,
                formattedBalance: formatCurrency(params.balance),
                month: formatMonth(month)
            };
        },
        pages: ['finance-tracker'],
        requiresConfirmation: true,
        category: 'write'
    },

    {
        name: 'add_bank_account',
        description: 'Add a new bank account to the finance tracker.',
        parameters: {
            name: {
                type: 'string',
                description: 'Account display name (e.g., "SBI Savings")',
                required: true
            },
            bankName: {
                type: 'string',
                description: 'Bank institution name (e.g., "State Bank of India")',
                required: false
            },
            accountType: {
                type: 'string',
                description: 'Account type',
                required: false,
                enum: ['savings', 'current', 'fd', 'rd', 'ppf', 'nps', 'other']
            },
            balance: {
                type: 'number',
                description: 'Initial balance in INR',
                required: false
            },
            month: {
                type: 'string',
                description: 'Month in YYYY-MM format for the initial balance. Defaults to current month.',
                required: false
            }
        },
        handler: async (params) => {
            const month = params.month || getCurrentMonthFromPage();
            const result = await addBank({
                name: params.name,
                bankName: params.bankName || params.name,
                accountType: params.accountType || 'savings',
                balance: params.balance || 0
            }, month);

            if (!result.success) {
                return { error: result.error || 'Failed to add bank account' };
            }

            return {
                message: `Added bank account "${params.name}"${params.balance ? ` with balance ${formatCurrency(params.balance)}` : ''}`,
                bankId: result.id,
                name: params.name,
                balance: params.balance || 0
            };
        },
        pages: ['finance-tracker'],
        requiresConfirmation: true,
        category: 'write'
    },

    {
        name: 'update_credit_card_balance',
        description: 'Update the outstanding balance and/or payment status of a credit card for the current month.',
        parameters: {
            cardName: {
                type: 'string',
                description: 'Name of the credit card (e.g., "Amazon Pay ICICI")',
                required: true
            },
            balance: {
                type: 'number',
                description: 'Outstanding balance amount in INR',
                required: false
            },
            isPaid: {
                type: 'boolean',
                description: 'Whether the credit card bill has been paid this month',
                required: false
            },
            month: {
                type: 'string',
                description: 'Month in YYYY-MM format. Defaults to current month.',
                required: false
            }
        },
        handler: async (params) => {
            const data = getFinanceDataFromBridge();
            const creditCards = data?.creditCards || {};
            const month = params.month || getCurrentMonthFromPage();

            const found = findCreditCardByName(params.cardName, creditCards);
            if (!found) {
                return {
                    error: `Credit card "${params.cardName}" not found. Available: ${Object.values(creditCards).map(c => c.name).join(', ') || 'none'}`
                };
            }

            const updates = {};
            if (params.balance !== undefined) {
                updates[`balances/${month}`] = params.balance;
            }
            if (params.isPaid !== undefined) {
                updates[`paymentStatusByMonth/${month}`] = params.isPaid;
            }

            const result = await updateCreditCard(found.id, updates);

            if (!result.success) {
                return { error: result.error || 'Failed to update credit card' };
            }

            return {
                message: `Updated ${found.card.name}${params.balance !== undefined ? ` balance: ${formatCurrency(params.balance)}` : ''}${params.isPaid !== undefined ? ` (${params.isPaid ? 'Paid' : 'Unpaid'})` : ''}`,
                cardName: found.card.name,
                balance: params.balance,
                isPaid: params.isPaid
            };
        },
        pages: ['finance-tracker'],
        requiresConfirmation: true,
        category: 'write'
    },

    // ==========================================
    // NAVIGATION / UI TOOLS
    // ==========================================
    {
        name: 'navigate_to_month',
        description: 'Navigate the finance tracker to a different month. Use this when the user wants to see data for a specific month.',
        parameters: {
            month: {
                type: 'string',
                description: 'Month in YYYY-MM format (e.g., "2026-01" for January 2026)',
                required: true
            }
        },
        handler: async (params) => {
            const monthPicker = document.getElementById('monthPicker');
            if (monthPicker) {
                monthPicker.value = params.month;
                monthPicker.dispatchEvent(new Event('change', { bubbles: true }));
                return {
                    message: `Navigated to ${formatMonth(params.month)}`,
                    month: formatMonth(params.month)
                };
            }

            // Alternative: try the bridge
            if (window.equityLabsFinance && window.equityLabsFinance.setMonth) {
                window.equityLabsFinance.setMonth(params.month);
                return {
                    message: `Navigated to ${formatMonth(params.month)}`,
                    month: formatMonth(params.month)
                };
            }

            return { error: 'Could not change month. Month picker not found.' };
        },
        pages: ['finance-tracker'],
        requiresConfirmation: false,
        category: 'navigate'
    },

    {
        name: 'navigate_to_page',
        description: 'Navigate the user to a different page of the Equity Labs website.',
        parameters: {
            page: {
                type: 'string',
                description: 'The page to navigate to',
                required: true,
                enum: ['home', 'analysis', 'stock-manager', 'news', 'finance-tracker', 'budget-planner', 'profile']
            }
        },
        handler: async (params) => {
            const pageMap = {
                'home': '../index.html',
                'analysis': 'analysis.html',
                'stock-manager': 'stock-manager.html',
                'news': 'news.html',
                'finance-tracker': 'finance-tracker.html',
                'budget-planner': 'budget-planner.html',
                'profile': 'profile.html'
            };

            // Adjust paths based on current location
            const isSubfolder = window.location.pathname.includes('/pages/');
            let target = pageMap[params.page];

            if (!target) {
                return { error: `Unknown page: "${params.page}"` };
            }

            if (!isSubfolder && params.page !== 'home') {
                target = `pages/${target}`;
            } else if (isSubfolder && params.page === 'home') {
                target = '../index.html';
            }

            window.location.href = target;
            return {
                message: `Navigating to ${params.page}...`
            };
        },
        pages: ['*'],
        requiresConfirmation: false,
        category: 'navigate'
    }
];
