/**
 * Context Engine
 * 
 * Reads the current page's live state and builds a compact context
 * object that is included in the LLM system prompt. This makes the
 * AI agent aware of what the user is viewing.
 * 
 * @module context-engine
 */

/**
 * Detect the current page from the URL
 * @returns {string} Page identifier (e.g., 'finance-tracker', 'home')
 */
export function getCurrentPage() {
    const path = window.location.pathname;
    const filename = path.split('/').pop() || 'index.html';
    const nameWithoutExt = filename.replace('.html', '');

    const pageMap = {
        'index': 'home',
        'finance-tracker': 'finance-tracker',
        'stock-manager': 'stock-manager',
        'analysis': 'analysis',
        'news': 'news',
        'budget-planner': 'budget-planner',
        'admin': 'admin',
        'profile': 'profile'
    };

    return pageMap[nameWithoutExt] || 'home';
}

/**
 * Get the current month key from the page or derive from date
 * @returns {string} YYYY-MM
 */
function getCurrentMonth() {
    if (window.equityLabsFinance && window.equityLabsFinance.getCurrentMonth) {
        return window.equityLabsFinance.getCurrentMonth();
    }

    const monthInput = document.getElementById('monthPicker');
    if (monthInput && monthInput.value) {
        return monthInput.value;
    }

    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Format month key for display
 * @param {string} monthKey 
 * @returns {string}
 */
function formatMonth(monthKey) {
    const [year, month] = monthKey.split('-');
    const date = new Date(year, month - 1, 1);
    return date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

/**
 * Format currency for context
 * @param {number} amount 
 * @returns {string}
 */
function fmtCurrency(amount) {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0
    }).format(amount || 0);
}

/**
 * Build a compact context summary for the Finance Tracker page
 * @returns {Object}
 */
function buildFinanceTrackerContext() {
    const data = window.equityLabsFinance?.getData?.();
    const month = getCurrentMonth();

    if (!data) {
        return {
            page: 'Finance Tracker',
            currentMonth: formatMonth(month),
            monthKey: month,
            status: 'Data not yet loaded. The user may not be logged in or data is loading.'
        };
    }

    const categories = data.categories || {};
    const banks = data.banks || {};
    const creditCards = data.creditCards || {};
    const income = data.income || {};
    const monthIncome = income[month] || {};

    // Build category summary
    const categorySummary = Object.entries(categories).map(([id, cat]) => {
        const items = cat.items || {};
        const monthItems = Object.values(items).filter(i => i.month === month);
        const monthTotal = monthItems.reduce((sum, item) => sum + (item.amount || 0), 0);
        return {
            name: cat.name,
            id,
            monthItemCount: monthItems.length,
            monthTotal,
            items: monthItems.map(i => `${i.name}: ${fmtCurrency(i.amount)}`)
        };
    });

    // Build bank summary
    const bankSummary = Object.entries(banks).map(([id, bank]) => ({
        name: bank.name || bank.bankName,
        id,
        balance: bank.balances?.[month] ?? 0,
        type: bank.accountType || 'savings'
    }));

    // Build credit card summary
    const ccSummary = Object.entries(creditCards).map(([id, card]) => ({
        name: card.name,
        id,
        balance: card.balances?.[month] ?? 0,
        isPaid: card.paymentStatusByMonth?.[month] ?? card.isPaid ?? false,
        type: card.type || 'credit-card'
    }));

    const totalBankBalance = bankSummary.reduce((sum, b) => sum + b.balance, 0);
    const totalInvested = categorySummary.reduce((sum, c) => sum + c.monthTotal, 0);

    return {
        page: 'Finance Tracker',
        currentMonth: formatMonth(month),
        monthKey: month,
        income: {
            salary: fmtCurrency(monthIncome.salary || 0),
            otherIncome: fmtCurrency(monthIncome.otherIncome || 0),
            total: fmtCurrency(monthIncome.totalIncome || 0)
        },
        investmentCategories: categorySummary.map(c => 
            `${c.name} (${c.monthItemCount} items, total: ${fmtCurrency(c.monthTotal)}): ${c.items.join(', ') || 'no items this month'}`
        ),
        bankAccounts: bankSummary.map(b =>
            `${b.name} (${b.type}): ${fmtCurrency(b.balance)}`
        ),
        totalBankBalance: fmtCurrency(totalBankBalance),
        creditCards: ccSummary.map(c =>
            `${c.name} (${c.type}): ${fmtCurrency(c.balance)} [${c.isPaid ? 'Paid' : 'Unpaid'}]`
        ),
        totalMonthlyInvestment: fmtCurrency(totalInvested)
    };
}

/**
 * Build page context based on the current page
 * Returns a compact object that will be serialized into the LLM prompt
 * @returns {Object}
 */
export function getPageContext() {
    const page = getCurrentPage();

    switch (page) {
        case 'finance-tracker':
            return buildFinanceTrackerContext();

        case 'home':
            return {
                page: 'Home',
                description: 'Landing page with overview of Equity Labs features.'
            };

        case 'stock-manager':
            return {
                page: 'Stock Manager',
                description: 'Portfolio tracker for stocks with buy/sell transaction management.'
            };

        case 'analysis':
            return {
                page: 'Fundamental Analysis',
                description: 'Stock fundamental analysis tool with metrics like P/E, ROE, etc.'
            };

        case 'budget-planner':
            return {
                page: 'Budget & Events Planner',
                description: 'Annual budget planning with projected vs actual variance and events.'
            };

        case 'news':
            return {
                page: 'News',
                description: 'Financial news aggregator.'
            };

        default:
            return { page: page || 'Unknown' };
    }
}

/**
 * Build the full system instruction for the LLM including context
 * @returns {string}
 */
export function buildSystemPrompt() {
    const context = getPageContext();
    const page = getCurrentPage();

    return `You are EquityBot, a friendly and intelligent AI assistant built into the Equity Labs personal finance platform. You help users manage their finances, understand their data, and navigate the app.

## Your Capabilities
- You can READ financial data (income, investments, bank balances, credit cards, net worth)
- You can WRITE/UPDATE financial data (update income, add investments, change bank balances, etc.)
- You can NAVIGATE between pages and months
- You provide financial insights, explanations, and suggestions

## Important Rules
1. Always use the tools provided to read or modify data — never make up numbers.
2. When the user mentions an amount, assume INR (Indian Rupees) unless stated otherwise.
3. For write operations, always confirm what you're about to do before executing.
4. If a user says "this month" or similar, use the currently selected month from context.
5. When listing data, use clean formatting with currency values.
6. Be concise but helpful. Use emojis sparingly for visual clarity (✅, 📊, 💰, etc.).
7. If the user asks about features you cannot help with (e.g., stock analysis), guide them to the right page.
8. Always respond in a conversational, friendly tone.
9. When asked to update values, call the appropriate tool — do not just describe what you would do.
10. If you need to know existing values before updating (like salary when only otherIncome is given), use a read tool first.

## Current Page Context
The user is currently on: **${context.page || page}**

\`\`\`json
${JSON.stringify(context, null, 2)}
\`\`\`

Use this context to provide relevant, page-aware responses. Reference actual data in your replies when possible.`;
}
